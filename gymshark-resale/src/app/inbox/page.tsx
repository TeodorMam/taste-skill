"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import {
  type Item,
  type Message,
  type Offer,
  type Profile,
  formatPrice,
  itemImages,
  profileDisplayName,
} from "@/lib/supabase";

type FavoriteRow = {
  user_id: string;
  item_id: string | number;
  created_at: string;
};

type Tab = "innboks" | "favoritter";

type ActivityEntry = {
  item: Item;
  latestAt: string;
  previewText: string;
  isUnread: boolean;
  contactCount: number;
};

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

export default function InboxPage() {
  const supabase = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const [tab, setTab] = useState<Tab>("innboks");
  const [error, setError] = useState<string | null>(null);

  const [offers, setOffers] = useState<Offer[]>([]);
  const [favorites, setFavorites] = useState<FavoriteRow[]>([]);
  const [threads, setThreads] = useState<{ item: Item; lastMessage: Message; buyerId: string; role: "buyer" | "seller" }[]>([]);

  const [itemsMap, setItemsMap] = useState<Record<string, Item>>({});
  const [profilesMap, setProfilesMap] = useState<Record<string, Profile>>({});
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
      const { data: myItemsData } = await supabase.from("items").select("*").eq("seller_id", userId);
      const myItems = (myItemsData ?? []) as Item[];
      const myItemIds = myItems.map((i) => i.id);

      const [offersRes, favoritesRes, msgRes] = await Promise.all([
        myItemIds.length > 0
          ? supabase.from("offers").select("*").in("item_id", myItemIds).neq("buyer_id", userId)
              .order("created_at", { ascending: false }).limit(50)
          : Promise.resolve({ data: [] as Offer[], error: null }),
        myItemIds.length > 0
          ? supabase.from("favorites").select("*").in("item_id", myItemIds).neq("user_id", userId)
              .order("created_at", { ascending: false }).limit(50)
          : Promise.resolve({ data: [] as FavoriteRow[], error: null }),
        supabase.from("messages").select("*").order("created_at", { ascending: false }),
      ]);

      if (offersRes.error) setError(`Tilbud: ${offersRes.error.message}`);
      if (favoritesRes.error) setError(`Favoritter: ${favoritesRes.error.message}`);

      setOffers((offersRes.data ?? []) as Offer[]);
      setFavorites((favoritesRes.data ?? []) as FavoriteRow[]);

      const iMap: Record<string, Item> = {};
      for (const it of myItems) iMap[String(it.id)] = it;

      if (!msgRes.error) {
        const messages = (msgRes.data ?? []) as Message[];
        const byThread = new Map<string, Message>();
        for (const m of messages) {
          const key = `${m.item_id}:${m.buyer_id}`;
          if (!byThread.has(key)) byThread.set(key, m);
        }
        const missing = Array.from(new Set([...byThread.values()].map((m) => m.item_id))).filter(
          (id) => !iMap[String(id)],
        );
        if (missing.length > 0) {
          const { data: extra } = await supabase.from("items").select("*").in("id", missing);
          for (const it of (extra ?? []) as Item[]) iMap[String(it.id)] = it;
        }
        const rows: typeof threads = [];
        for (const m of byThread.values()) {
          const item = iMap[String(m.item_id)];
          if (!item) continue;
          rows.push({
            item,
            lastMessage: m,
            buyerId: m.buyer_id,
            role: item.seller_id === userId ? "seller" : "buyer",
          });
        }
        setThreads(rows);
      }

      setItemsMap(iMap);

      const personIds = new Set<string>();
      for (const o of (offersRes.data ?? []) as Offer[]) personIds.add(o.buyer_id);
      for (const f of (favoritesRes.data ?? []) as FavoriteRow[]) personIds.add(f.user_id);
      for (const m of (msgRes.data ?? []) as Message[]) {
        const item = iMap[String(m.item_id)];
        if (!item) continue;
        const other = item.seller_id === userId ? m.buyer_id : item.seller_id;
        if (other) personIds.add(other);
      }
      const personList = Array.from(personIds);
      if (personList.length > 0) {
        const { data: pData } = await supabase.from("profiles").select("*").in("user_id", personList);
        const pMap: Record<string, Profile> = {};
        for (const p of (pData ?? []) as Profile[]) pMap[p.user_id] = p;
        setProfilesMap(pMap);
      }
    })();
  }, [userId, supabase]);

  if (userId === undefined) return <p className="py-6 text-sm text-stone-500">Laster…</p>;
  if (userId === null) {
    return (
      <section className="space-y-3 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">Innboks</h1>
        <p className="text-sm text-stone-600">Logg inn for å se innboksen din.</p>
        <Link href="/login?next=/inbox" className="inline-block rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-stone-50 hover:bg-black">
          Logg inn
        </Link>
      </section>
    );
  }

  // Build one entry per item — combining offers + messages
  const activityByItem: Record<string, ActivityEntry> = {};
  const buyersByItem: Record<string, Set<string>> = {};

  const touch = (key: string, item: Item, at: string, preview: string, unread: boolean, personId: string) => {
    if (!buyersByItem[key]) buyersByItem[key] = new Set();
    buyersByItem[key].add(personId);
    if (!activityByItem[key] || at > activityByItem[key].latestAt) {
      activityByItem[key] = { item, latestAt: at, previewText: preview, isUnread: unread, contactCount: 0 };
    }
    if (unread) activityByItem[key].isUnread = true;
  };

  for (const o of offers) {
    const key = String(o.item_id);
    const item = itemsMap[key];
    if (!item) continue;
    const name = profileDisplayName(profilesMap[o.buyer_id], o.buyer_id);
    touch(key, item, o.created_at, `${name} la inn et bud på ${formatPrice(o.amount)}`, new Date(o.created_at).getTime() > lastVisit, o.buyer_id);
  }

  for (const t of threads) {
    if (t.role === "seller") {
      const key = String(t.item.id);
      const name = profileDisplayName(profilesMap[t.buyerId], t.buyerId);
      const isOther = t.lastMessage.sender_id !== userId;
      const preview = isOther ? `${name}: ${t.lastMessage.body}` : `Du: ${t.lastMessage.body}`;
      touch(key, t.item, t.lastMessage.created_at, preview, isOther && new Date(t.lastMessage.created_at).getTime() > lastVisit, t.buyerId);
    } else {
      // buyer side — one entry per item showing seller thread
      const key = `buyer:${t.item.id}`;
      const sellerName = t.item.seller_id ? profileDisplayName(profilesMap[t.item.seller_id], t.item.seller_id) : "Selger";
      const isOther = t.lastMessage.sender_id !== userId;
      const preview = isOther ? `${sellerName}: ${t.lastMessage.body}` : `Du: ${t.lastMessage.body}`;
      if (!activityByItem[key] || t.lastMessage.created_at > activityByItem[key].latestAt) {
        activityByItem[key] = {
          item: t.item,
          latestAt: t.lastMessage.created_at,
          previewText: preview,
          isUnread: isOther && new Date(t.lastMessage.created_at).getTime() > lastVisit,
          contactCount: 1,
        };
      }
    }
  }

  for (const key of Object.keys(activityByItem)) {
    activityByItem[key].contactCount = buyersByItem[key]?.size ?? activityByItem[key].contactCount;
  }

  const activityList = Object.values(activityByItem).sort(
    (a, b) => new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime(),
  );

  const newActivity = activityList.filter((a) => a.isUnread).length;
  const newFavorites = favorites.filter((f) => new Date(f.created_at).getTime() > lastVisit).length;

  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-semibold tracking-tight">Innboks</h1>
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="flex gap-1 border-b border-stone-200">
        <TabButton label="Innboks" badge={newActivity} active={tab === "innboks"} onClick={() => setTab("innboks")} />
        <TabButton label="Favoritter" badge={newFavorites} active={tab === "favoritter"} onClick={() => setTab("favoritter")} />
      </div>

      {tab === "innboks" && <ActivityTab activities={activityList} />}
      {tab === "favoritter" && (
        <FavoritesTab favorites={favorites} items={itemsMap} profiles={profilesMap} lastVisit={lastVisit} />
      )}
    </section>
  );
}

function TabButton({ label, badge, active, onClick }: { label: string; badge: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`relative px-4 py-2.5 text-sm font-medium transition ${
        active ? "border-b-2 border-[#5a6b32] text-stone-900" : "text-stone-500 hover:text-stone-800"
      }`}
    >
      {label}
      {badge > 0 && (
        <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#5a6b32] px-1.5 text-[10px] font-semibold text-white">
          {badge}
        </span>
      )}
    </button>
  );
}

function ActivityTab({ activities }: { activities: ActivityEntry[] }) {
  if (activities.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-stone-300 p-10 text-center text-sm text-stone-500">
        Ingen aktivitet enda. Når noen byr eller sender melding om annonsene dine, dukker de opp her.
      </div>
    );
  }
  return (
    <ul className="divide-y divide-stone-200 overflow-hidden rounded-2xl border border-stone-200 bg-white">
      {activities.map(({ item, latestAt, previewText, isUnread, contactCount }) => {
        const cover = itemImages(item)[0];
        return (
          <li key={item.id} className={isUnread ? "bg-[#5a6b32]/5" : ""}>
            <Link href={`/item/${item.id}`} className="flex items-center gap-3 p-3 hover:bg-stone-50">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-stone-100">
                {cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={cover} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-stone-200" />
                )}
                {item.is_sold && (
                  <div className="absolute inset-0 flex items-end justify-center pb-1">
                    <span className="rounded bg-stone-900/80 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-white">
                      Solgt
                    </span>
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-stone-900">{item.title}</p>
                  <span className="shrink-0 text-[10px] text-stone-400">{fmtTime(latestAt)}</span>
                </div>
                <p className="mt-0.5 line-clamp-1 text-xs text-stone-500">{previewText}</p>
                {contactCount > 1 && (
                  <p className="mt-0.5 text-[10px] font-medium text-[#5a6b32]">{contactCount} interesserte</p>
                )}
              </div>
              {isUnread && <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" />}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function FavoritesTab({
  favorites,
  items,
  profiles,
  lastVisit,
}: {
  favorites: FavoriteRow[];
  items: Record<string, Item>;
  profiles: Record<string, Profile>;
  lastVisit: number;
}) {
  if (favorites.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-stone-300 p-10 text-center text-sm text-stone-500">
        Ingen har favorittmerket annonsene dine enda.
      </div>
    );
  }
  return (
    <ul className="divide-y divide-stone-200 overflow-hidden rounded-2xl border border-stone-200 bg-white">
      {favorites.map((f, i) => {
        const item = items[String(f.item_id)];
        const name = profileDisplayName(profiles[f.user_id], f.user_id);
        const cover = item ? itemImages(item)[0] : null;
        const isUnread = new Date(f.created_at).getTime() > lastVisit;
        return (
          <li key={`${f.user_id}:${f.item_id}:${i}`} className={isUnread ? "bg-[#5a6b32]/5" : ""}>
            <Link href={item ? `/item/${item.id}` : "/inbox"} className="flex items-center gap-3 p-3 hover:bg-stone-50">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-stone-100">
                {cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={cover} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-stone-400">♡</div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">
                  <span className="font-medium text-stone-900">{name}</span>
                  <span className="text-stone-500"> la til </span>
                  {item && <span className="font-medium text-stone-900">«{item.title}»</span>}
                  <span className="text-stone-500"> i favorittene sine</span>
                </p>
                <p className="mt-0.5 text-xs text-stone-400">{fmtTime(f.created_at)}</p>
              </div>
              {isUnread && <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" />}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
