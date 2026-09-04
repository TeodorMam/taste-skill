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

type Role = "buyer" | "seller";

type Thread = {
  key: string;          // `${itemId}:${buyerId}`
  item: Item;
  otherId: string;
  role: Role;           // this user's role in the thread
  lastMessage: Message;
  unread: number;
};

type Tab = "alle" | "kjop" | "salg";

function fmtAmount(n: number): string {
  return `${new Intl.NumberFormat("nb-NO").format(n)} kr`;
}

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
  const type = msg.message_type ?? "text";

  if (type === "bid") {
    const amount = (msg.metadata as { amount?: number } | null)?.amount;
    return `${prefix}💸 Bud: ${amount ? fmtAmount(amount) : "?"}`;
  }
  if (type === "bid_accepted") return mine ? "✅ Du godtok budet" : "✅ Budet ble godtatt";
  if (type === "payment") return "✅ Betaling gjennomført";
  if (type === "shipped") return "📦 Varen er sendt";
  if (type === "delivered") return "📬 Varen er levert";
  if (type === "payout") return "💰 Utbetaling sendt";

  if (msg.image_url && !msg.body.trim()) return `${prefix}📷 Bilde`;
  return `${prefix}${msg.body}`;
}

export default function InboxPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [profilesMap, setProfilesMap] = useState<Record<string, Profile>>({});
  const [tab, setTab] = useState<Tab>("alle");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, [supabase]);

  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    function onFocus() { setRefreshTick((t) => t + 1); }
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, []);

  useEffect(() => {
    if (!userId) return;

    (async () => {
      // Fetch seller's items to know which items user owns
      const { data: myItemsData } = await supabase
        .from("items").select("*").eq("seller_id", userId);
      const myItems = (myItemsData ?? []) as Item[];
      const myItemIds = new Set(myItems.map((i) => String(i.id)));

      const iMap: Record<string, Item> = {};
      for (const it of myItems) iMap[String(it.id)] = it;

      // Fetch all messages (both directions), ordered newest first
      const { data: msgData } = await supabase
        .from("messages")
        .select("*")
        .order("created_at", { ascending: false });

      const messages = (msgData ?? []) as Message[];

      // Fetch this user's per-thread last-read timestamps
      const { data: readsData } = await supabase
        .from("chat_reads")
        .select("item_id, buyer_id, last_read_at")
        .eq("user_id", userId);
      const readsMap = new Map<string, string>();
      for (const r of (readsData ?? []) as { item_id: string; buyer_id: string; last_read_at: string }[]) {
        readsMap.set(`${r.item_id}:${r.buyer_id}`, r.last_read_at);
      }

      // Group messages by thread: latest message + count of unread
      type Agg = { latest: Message; unread: number };
      const byThread = new Map<string, Agg>();
      for (const m of messages) {
        const key = `${m.item_id}:${m.buyer_id}`;
        const lastRead = readsMap.get(key);
        const isUnreadMsg =
          m.sender_id !== userId &&
          (!lastRead || new Date(m.created_at).getTime() > new Date(lastRead).getTime());
        const existing = byThread.get(key);
        if (!existing) {
          byThread.set(key, { latest: m, unread: isUnreadMsg ? 1 : 0 });
        } else if (isUnreadMsg) {
          existing.unread += 1;
        }
      }

      // Fetch any missing items (items the user bought from others)
      const missingIds = Array.from(
        new Set([...byThread.values()].map((a) => String(a.latest.item_id)))
      ).filter((id) => !iMap[id]);
      if (missingIds.length > 0) {
        const { data: extra } = await supabase
          .from("items").select("*").in("id", missingIds);
        for (const it of (extra ?? []) as Item[]) iMap[String(it.id)] = it;
      }

      // Build thread list — only threads this user is part of
      const rawThreads: Thread[] = [];
      const otherIds = new Set<string>();

      for (const [key, agg] of byThread) {
        const m = agg.latest;
        const item = iMap[String(m.item_id)];
        if (!item) continue;

        const isSeller = myItemIds.has(String(m.item_id));
        const isBuyer = m.buyer_id === userId;
        if (!isSeller && !isBuyer) continue;

        const otherId = isSeller ? m.buyer_id : item.seller_id ?? m.buyer_id;

        rawThreads.push({
          key,
          item,
          otherId,
          role: isSeller ? "seller" : "buyer",
          lastMessage: m,
          unread: agg.unread,
        });
        if (otherId) otherIds.add(otherId);
      }

      rawThreads.sort(
        (a, b) =>
          new Date(b.lastMessage.created_at).getTime() -
          new Date(a.lastMessage.created_at).getTime()
      );
      setThreads(rawThreads);

      if (otherIds.size > 0) {
        const { data: pData } = await supabase
          .from("profiles_public").select("*").in("user_id", [...otherIds]);
        const pMap: Record<string, Profile> = {};
        for (const p of (pData ?? []) as Profile[]) pMap[p.user_id] = p;
        setProfilesMap(pMap);
      }
    })();
  }, [userId, supabase, refreshTick]);

  async function openThread(item: Item, buyerId: string, key: string) {
    if (!userId) return;
    // Optimistically clear the unread badge so returning to inbox shows read state instantly
    setThreads((prev) => prev.map((t) => (t.key === key ? { ...t, unread: 0 } : t)));
    // Persist the read state BEFORE navigating so the next inbox re-fetch sees it.
    // Chat page also upserts on mount but that race lost sometimes.
    await supabase.from("chat_reads").upsert(
      { user_id: userId, item_id: String(item.id), buyer_id: buyerId, last_read_at: new Date().toISOString() },
      { onConflict: "user_id,item_id,buyer_id" },
    );
    router.push(`/chat/${item.id}/${buyerId}`);
  }

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

  const filtered = threads.filter((t) => {
    if (tab === "alle") return true;
    if (tab === "kjop") return t.role === "buyer";
    return t.role === "seller";
  });

  const counts = {
    alle: threads.length,
    kjop: threads.filter((t) => t.role === "buyer").length,
    salg: threads.filter((t) => t.role === "seller").length,
  };

  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-semibold tracking-tight">Innboks</h1>

      <div className="flex gap-1 rounded-full bg-stone-100 p-1">
        <TabButton active={tab === "alle"} onClick={() => setTab("alle")}>
          Alle {counts.alle > 0 && <span className="opacity-60">({counts.alle})</span>}
        </TabButton>
        <TabButton active={tab === "kjop"} onClick={() => setTab("kjop")}>
          Kjøp {counts.kjop > 0 && <span className="opacity-60">({counts.kjop})</span>}
        </TabButton>
        <TabButton active={tab === "salg"} onClick={() => setTab("salg")}>
          Salg {counts.salg > 0 && <span className="opacity-60">({counts.salg})</span>}
        </TabButton>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 p-10 text-center text-sm text-stone-500">
          {tab === "alle"
            ? "Ingen samtaler ennå. Når du sender eller mottar en melding, dukker den opp her."
            : tab === "kjop"
              ? "Ingen kjøpssamtaler ennå."
              : "Ingen salgssamtaler ennå."}
        </div>
      ) : (
        <ul className="divide-y divide-stone-100 overflow-hidden rounded-2xl border border-stone-200 bg-white">
          {filtered.map(({ key, item, otherId, lastMessage, unread }) => {
            const profile = profilesMap[otherId] ?? null;
            const name = profileDisplayName(profile, otherId);
            const cover = itemImages(item)[0];
            const preview = msgPreview(lastMessage, userId);
            const isUnread = unread > 0;

            return (
              <li
                key={key}
                onClick={() => openThread(item, lastMessage.buyer_id, key)}
                className="flex cursor-pointer items-center gap-3 px-4 py-3 transition hover:bg-stone-50 active:bg-stone-100"
              >
                {/* User avatar */}
                <div className="shrink-0">
                  <UserAvatar profile={profile} name={name} />
                </div>

                {/* Text area */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span
                      className={`truncate text-sm ${
                        isUnread ? "font-bold text-stone-900" : "font-medium text-stone-700"
                      }`}
                    >
                      {name}
                    </span>
                    <span
                      className={`shrink-0 text-[11px] ${
                        isUnread ? "font-semibold text-[#5a6b32]" : "text-stone-400"
                      }`}
                    >
                      {fmtTime(lastMessage.created_at)}
                    </span>
                  </div>
                  <p
                    className={`truncate text-xs ${
                      isUnread ? "font-semibold text-stone-800" : "text-stone-500"
                    }`}
                  >
                    {preview}
                  </p>
                </div>

                {/* Unread badge OR item thumbnail */}
                {isUnread ? (
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#5a6b32] px-1.5 text-[11px] font-semibold leading-none text-white">
                      {unread > 9 ? "9+" : unread}
                    </span>
                    <div className="relative h-12 w-12 overflow-hidden rounded-lg bg-stone-100">
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
                  </div>
                ) : (
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
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition ${
        active
          ? "bg-white text-stone-900 shadow-sm"
          : "text-stone-500 hover:text-stone-800"
      }`}
    >
      {children}
    </button>
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
