"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import {
  type Item,
  type Message,
  type Profile,
  itemImages,
  profileDisplayName,
} from "@/lib/supabase";

type Thread = {
  key: string;          // `${itemId}:${buyerId}`
  item: Item;
  otherId: string;
  lastMessage: Message;
  isUnread: boolean;
};

function fmtTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 86400000);
  const hm = d.toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" });
  if (d >= todayStart) return hm;
  if (d >= yesterdayStart) return "I går";
  if (now.getFullYear() === d.getFullYear())
    return d.toLocaleDateString("nb-NO", { day: "numeric", month: "short" });
  return d.toLocaleDateString("nb-NO", { day: "numeric", month: "short", year: "numeric" });
}

function msgPreview(msg: Message, meId: string): string {
  const mine = msg.sender_id === meId;
  const prefix = mine ? "Du: " : "";
  if (msg.image_url && !msg.body.trim()) return `${prefix}📷 Bilde`;
  return `${prefix}${msg.body}`;
}

export default function InboxPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [profilesMap, setProfilesMap] = useState<Record<string, Profile>>({});
  const [itemsMap, setItemsMap] = useState<Record<string, Item>>({});
  const [lastVisit, setLastVisit] = useState<number>(0);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, [supabase]);

  useEffect(() => {
    if (!userId) return;
    const stored = localStorage.getItem("lastInboxVisit");
    setLastVisit(stored ? Number(stored) : 0);
    localStorage.setItem("lastInboxVisit", Date.now().toString());

    (async () => {
      // Fetch seller's items to know which items user owns
      const { data: myItemsData } = await supabase
        .from("items").select("*").eq("seller_id", userId);
      const myItems = (myItemsData ?? []) as Item[];
      const myItemIds = myItems.map((i) => i.id);

      const iMap: Record<string, Item> = {};
      for (const it of myItems) iMap[String(it.id)] = it;

      // Fetch all messages (both directions)
      const { data: msgData } = await supabase
        .from("messages")
        .select("*")
        .order("created_at", { ascending: false });

      const messages = (msgData ?? []) as Message[];

      // Keep only the latest message per thread key
      const byThread = new Map<string, Message>();
      for (const m of messages) {
        const key = `${m.item_id}:${m.buyer_id}`;
        if (!byThread.has(key)) byThread.set(key, m);
      }

      // Fetch any missing items (items the user bought from others)
      const missingIds = Array.from(
        new Set([...byThread.values()].map((m) => String(m.item_id)))
      ).filter((id) => !iMap[id]);
      if (missingIds.length > 0) {
        const { data: extra } = await supabase
          .from("items").select("*").in("id", missingIds);
        for (const it of (extra ?? []) as Item[]) iMap[String(it.id)] = it;
      }
      setItemsMap(iMap);

      // Build thread list — only threads this user is part of
      const rawThreads: Thread[] = [];
      const otherIds = new Set<string>();

      for (const [key, m] of byThread) {
        const item = iMap[String(m.item_id)];
        if (!item) continue;

        const isSeller = myItemIds.some((id) => String(id) === String(m.item_id));
        const isBuyer = m.buyer_id === userId;
        if (!isSeller && !isBuyer) continue; // unrelated thread

        const otherId = isSeller ? m.buyer_id : item.seller_id ?? m.buyer_id;
        const isUnread =
          m.sender_id !== userId &&
          new Date(m.created_at).getTime() > lastVisit;

        rawThreads.push({ key, item, otherId, lastMessage: m, isUnread });
        if (otherId) otherIds.add(otherId);
      }

      // Sort by most recent message
      rawThreads.sort(
        (a, b) =>
          new Date(b.lastMessage.created_at).getTime() -
          new Date(a.lastMessage.created_at).getTime()
      );
      setThreads(rawThreads);

      // Fetch profiles for all other people
      if (otherIds.size > 0) {
        const { data: pData } = await supabase
          .from("profiles").select("*").in("user_id", [...otherIds]);
        const pMap: Record<string, Profile> = {};
        for (const p of (pData ?? []) as Profile[]) pMap[p.user_id] = p;
        setProfilesMap(pMap);
      }
    })();
  }, [userId, supabase]);

  if (userId === undefined)
    return <p className="py-6 text-sm text-stone-500">Laster…</p>;

  if (userId === null) {
    return (
      <section className="space-y-3 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">Innboks</h1>
        <p className="text-sm text-stone-600">Logg inn for å se innboksen din.</p>
        <Link
          href="/login?next=/inbox"
          className="inline-block rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-stone-50 hover:bg-black"
        >
          Logg inn
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-semibold tracking-tight">Innboks</h1>

      {threads.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 p-10 text-center text-sm text-stone-500">
          Ingen samtaler ennå. Når du sender eller mottar en melding, dukker den opp her.
        </div>
      ) : (
        <ul className="divide-y divide-stone-100 overflow-hidden rounded-2xl border border-stone-200 bg-white">
          {threads.map(({ key, item, otherId, lastMessage, isUnread }) => {
            const profile = profilesMap[otherId] ?? null;
            const name = profileDisplayName(profile, otherId);
            const cover = itemImages(item)[0];
            const preview = msgPreview(lastMessage, userId);

            return (
              <li
                key={key}
                onClick={() => router.push(`/item/${item.id}`)}
                className="flex cursor-pointer items-center gap-3 px-4 py-3 transition hover:bg-stone-50 active:bg-stone-100"
              >
                {/* User avatar */}
                <div className="relative shrink-0">
                  <UserAvatar profile={profile} name={name} />
                  {isUnread && (
                    <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-[#5a6b32]" />
                  )}
                </div>

                {/* Text area */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span
                      className={`truncate text-sm ${
                        isUnread ? "font-bold text-stone-900" : "font-semibold text-stone-800"
                      }`}
                    >
                      {name}
                    </span>
                    <span className="shrink-0 text-[11px] text-stone-400">
                      {fmtTime(lastMessage.created_at)}
                    </span>
                  </div>
                  <p
                    className={`truncate text-xs ${
                      isUnread ? "font-medium text-stone-700" : "text-stone-500"
                    }`}
                  >
                    {preview}
                  </p>
                </div>

                {/* Item thumbnail */}
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-stone-100">
                  {cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cover} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full bg-stone-200" />
                  )}
                  {item.is_sold && (
                    <div className="absolute inset-0 flex items-end justify-center pb-0.5">
                      <span className="rounded bg-stone-900/75 px-1 py-px text-[7px] font-bold uppercase tracking-wide text-white">
                        Solgt
                      </span>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function UserAvatar({ profile, name }: { profile: Profile | null; name: string }) {
  if (profile?.avatar_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={profile.avatar_url}
        alt=""
        className="h-11 w-11 rounded-full object-cover"
      />
    );
  }
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-stone-200">
      {initials ? (
        <span className="text-sm font-semibold text-stone-600">{initials}</span>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-stone-400">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      )}
    </div>
  );
}
