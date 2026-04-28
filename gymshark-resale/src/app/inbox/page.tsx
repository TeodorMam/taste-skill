"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import {
  type Item,
  type Message,
  type Notification,
  type Profile,
  formatPrice,
  itemImages,
  profileDisplayName,
} from "@/lib/supabase";

function fmtTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 86400000);
  if (d >= todayStart)
    return d.toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" });
  if (d >= yesterdayStart) return "I går";
  if (now.getFullYear() === d.getFullYear())
    return d.toLocaleDateString("nb-NO", { day: "numeric", month: "short" });
  return d.toLocaleDateString("nb-NO", { day: "numeric", month: "short", year: "numeric" });
}

type ThreadRow = {
  item: Item;
  lastMessage: Message;
  role: "buyer" | "seller";
  buyerId: string;
};

export default function InboxPage() {
  const supabase = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const [threads, setThreads] = useState<ThreadRow[] | null>(null);
  const [otherProfiles, setOtherProfiles] = useState<Record<string, Profile>>({});
  const [reviewedItemIds, setReviewedItemIds] = useState<Set<string>>(new Set());
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifItems, setNotifItems] = useState<Record<string, Item>>({});
  const [notifProfiles, setNotifProfiles] = useState<Record<string, Profile>>({});
  const [unreadNotifIds, setUnreadNotifIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, [supabase]);

  useEffect(() => {
    if (!userId) return;
    localStorage.setItem("lastInboxVisit", Date.now().toString());

    (async () => {
      // Fetch notifications + messages in parallel
      const [notifRes, msgRes] = await Promise.all([
        supabase
          .from("notifications")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(30),
        supabase.from("messages").select("*").order("created_at", { ascending: false }),
      ]);

      // Handle notifications
      const notifs = (notifRes.data ?? []) as Notification[];
      setNotifications(notifs);
      const unread = new Set(notifs.filter((n) => !n.read_at).map((n) => n.id));
      setUnreadNotifIds(unread);

      // Mark unread notifications as read
      if (unread.size > 0) {
        void supabase
          .from("notifications")
          .update({ read_at: new Date().toISOString() })
          .in("id", Array.from(unread))
          .then(() => null);
      }

      // Fetch items + profiles for notifications
      const nItemIds = Array.from(new Set(notifs.map((n) => n.item_id).filter(Boolean)));
      const nFromIds = Array.from(new Set(notifs.map((n) => n.from_user_id).filter(Boolean))) as string[];
      const [nItemsRes, nProfilesRes] = await Promise.all([
        nItemIds.length > 0 ? supabase.from("items").select("*").in("id", nItemIds) : Promise.resolve({ data: [] }),
        nFromIds.length > 0 ? supabase.from("profiles").select("*").in("user_id", nFromIds) : Promise.resolve({ data: [] }),
      ]);
      const nItemMap: Record<string, Item> = {};
      for (const it of (nItemsRes.data ?? []) as Item[]) nItemMap[String(it.id)] = it;
      const nProfileMap: Record<string, Profile> = {};
      for (const p of (nProfilesRes.data ?? []) as Profile[]) nProfileMap[p.user_id] = p;
      setNotifItems(nItemMap);
      setNotifProfiles(nProfileMap);

      // Handle messages
      if (msgRes.error) { setError(msgRes.error.message); return; }
      const messages = (msgRes.data ?? []) as Message[];
      const byThread = new Map<string, Message>();
      for (const m of messages) {
        const key = `${m.item_id}:${m.buyer_id}`;
        if (!byThread.has(key)) byThread.set(key, m);
      }
      const itemIds = Array.from(new Set([...byThread.values()].map((m) => m.item_id)));
      if (itemIds.length === 0) { setThreads([]); return; }

      const { data: items, error: iErr } = await supabase.from("items").select("*").in("id", itemIds);
      if (iErr) { setError(iErr.message); return; }
      const itemMap = new Map(((items ?? []) as Item[]).map((i) => [i.id, i]));
      const rows: ThreadRow[] = [];
      for (const m of byThread.values()) {
        const item = itemMap.get(m.item_id);
        if (!item) continue;
        const role: "buyer" | "seller" = item.seller_id === userId ? "seller" : "buyer";
        rows.push({ item, lastMessage: m, role, buyerId: m.buyer_id });
      }
      rows.sort((a, b) => new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime());
      setThreads(rows);

      const soldItemIds = rows.filter((r) => r.item.is_sold).map((r) => r.item.id);
      if (soldItemIds.length > 0) {
        const { data: rData } = await supabase.from("reviews").select("item_id").eq("reviewer_id", userId).in("item_id", soldItemIds);
        setReviewedItemIds(new Set((rData ?? []).map((r: { item_id: string }) => r.item_id)));
      }

      const otherIds = Array.from(new Set(rows.map((r) =>
        r.role === "seller" ? r.buyerId : r.item.seller_id
      ).filter((x): x is string => !!x)));
      if (otherIds.length === 0) return;
      const { data: pData } = await supabase.from("profiles").select("*").in("user_id", otherIds);
      const pMap: Record<string, Profile> = {};
      for (const p of (pData ?? []) as Profile[]) pMap[p.user_id] = p;
      setOtherProfiles(pMap);
    })();
  }, [userId, supabase]);

  if (userId === undefined) return <p className="py-6 text-sm text-stone-500">Laster…</p>;
  if (userId === null) {
    return (
      <section className="space-y-3 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">Innboks</h1>
        <p className="text-sm text-stone-600">Logg inn for å se meldingene dine.</p>
        <Link href="/login?next=/inbox" className="inline-block rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-stone-50 hover:bg-black">Logg inn</Link>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <h1 className="text-3xl font-semibold tracking-tight">Innboks</h1>
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {/* Notifications: offers + favorites */}
      {notifications.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-medium uppercase tracking-wider text-stone-500">Tilbud og favoritter</h2>
          <ul className="divide-y divide-stone-200 overflow-hidden rounded-2xl border border-stone-200 bg-white">
            {notifications.map((n) => {
              const notifItem = notifItems[String(n.item_id)];
              const fromProfile = n.from_user_id ? notifProfiles[n.from_user_id] : null;
              const fromName = profileDisplayName(fromProfile, n.from_user_id);
              const cover = notifItem ? itemImages(notifItem)[0] : null;
              const wasUnread = unreadNotifIds.has(n.id);
              const text = n.type === "offer"
                ? `${fromName} la inn et bud på ${formatPrice((n.metadata.amount ?? 0))} på «${n.metadata.item_title ?? notifItem?.title ?? ""}»`
                : `${fromName} la til «${n.metadata.item_title ?? notifItem?.title ?? ""}» i favorittene sine`;

              return (
                <li key={n.id} className={wasUnread ? "bg-[#5a6b32]/5" : ""}>
                  <Link href={n.item_id ? `/item/${n.item_id}` : "/inbox"} className="flex items-center gap-3 p-3 hover:bg-stone-50">
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-stone-100">
                      {cover && <img src={cover} alt="" className="h-full w-full object-cover" />}
                      <div className={`absolute inset-0 flex items-center justify-center text-lg ${!cover ? "opacity-100" : "opacity-0"}`}>
                        {n.type === "offer" ? "💰" : "♡"}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-xs text-stone-700">{text}</p>
                      <p className="mt-0.5 text-[10px] text-stone-400">{fmtTime(n.created_at)}</p>
                    </div>
                    {wasUnread && (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-[#5a6b32]" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Message threads */}
      <div className="space-y-2">
        {notifications.length > 0 && (
          <h2 className="text-xs font-medium uppercase tracking-wider text-stone-500">Meldinger</h2>
        )}
        {threads === null && !error && <p className="text-sm text-stone-500">Laster…</p>}
        {threads && threads.length === 0 && notifications.length === 0 && (
          <div className="rounded-2xl border border-dashed border-stone-300 p-10 text-center text-sm text-stone-500">
            Ingen samtaler enda. Send melding til en selger fra en annonse.
          </div>
        )}
        {threads && threads.length > 0 && (
          <ul className="divide-y divide-stone-200 overflow-hidden rounded-2xl border border-stone-200 bg-white">
            {threads.map(({ item, lastMessage, role, buyerId }) => {
              const otherId = role === "seller" ? buyerId : item.seller_id;
              const otherName = otherId ? profileDisplayName(otherProfiles[otherId], otherId) : "";
              const senderPrefix = lastMessage.sender_id === userId ? "Du" : otherName;
              return (
                <li key={`${item.id}:${lastMessage.buyer_id}`}>
                  <Link href={`/item/${item.id}`} className="flex items-center gap-3 p-3 hover:bg-stone-50">
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-stone-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {itemImages(item)[0] && (
                        <img src={itemImages(item)[0]} alt={item.title} className={`h-full w-full object-cover ${item.is_sold ? "opacity-50 grayscale" : ""}`} />
                      )}
                      {item.is_sold && (
                        <div className="absolute inset-0 flex items-end justify-center pb-1">
                          <span className="rounded bg-stone-900/80 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-white">Solgt</span>
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate text-sm font-medium">{item.title}</p>
                        <span className="shrink-0 text-[10px] text-stone-400">{fmtTime(lastMessage.created_at)}</span>
                      </div>
                      <div className="mt-0.5 flex items-center justify-between gap-2">
                        <p className="line-clamp-1 text-xs text-stone-500">
                          <span className="font-medium text-stone-700">{senderPrefix}:</span>{" "}{lastMessage.body}
                        </p>
                        <span className="shrink-0 text-[10px] uppercase tracking-wider text-[#5a6b32]">
                          {role === "seller" ? "Du selger" : "Du kjøper"}
                        </span>
                      </div>
                      {item.is_sold && !reviewedItemIds.has(item.id) &&
                        (role === "seller" || item.sold_to_buyer_id === userId) && (
                        <div className="mt-1.5">
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#5a6b32]/10 px-2 py-0.5 text-[10px] font-medium text-[#5a6b32]">★ Gi en vurdering</span>
                        </div>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
