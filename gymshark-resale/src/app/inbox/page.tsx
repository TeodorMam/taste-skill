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
  id: string;
  user_id: string;
  item_id: string | number;
  created_at: string;
};

type ThreadRow = {
  item: Item;
  lastMessage: Message;
  role: "buyer" | "seller";
  buyerId: string;
};

type Tab = "tilbud" | "favoritter" | "meldinger";

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
  const [tab, setTab] = useState<Tab>("tilbud");
  const [error, setError] = useState<string | null>(null);

  const [offers, setOffers] = useState<Offer[]>([]);
  const [favorites, setFavorites] = useState<FavoriteRow[]>([]);
  const [threads, setThreads] = useState<ThreadRow[] | null>(null);

  const [itemsMap, setItemsMap] = useState<Record<string, Item>>({});
  const [profilesMap, setProfilesMap] = useState<Record<string, Profile>>({});
  const [reviewedItemIds, setReviewedItemIds] = useState<Set<string>>(new Set());
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
      // 1. Items I am selling
      const { data: myItemsData } = await supabase
        .from("items")
        .select("*")
        .eq("seller_id", userId);
      const myItems = (myItemsData ?? []) as Item[];
      const myItemIds = myItems.map((i) => i.id);

      // 2. Offers and favorites on my items, plus all messages I'm part of, in parallel
      const [offersRes, favoritesRes, msgRes] = await Promise.all([
        myItemIds.length > 0
          ? supabase
              .from("offers")
              .select("*")
              .in("item_id", myItemIds)
              .neq("buyer_id", userId)
              .order("created_at", { ascending: false })
              .limit(50)
          : Promise.resolve({ data: [] as Offer[], error: null }),
        myItemIds.length > 0
          ? supabase
              .from("favorites")
              .select("*")
              .in("item_id", myItemIds)
              .neq("user_id", userId)
              .order("created_at", { ascending: false })
              .limit(50)
          : Promise.resolve({ data: [] as FavoriteRow[], error: null }),
        supabase.from("messages").select("*").order("created_at", { ascending: false }),
      ]);

      if (offersRes.error) setError(`Tilbud: ${offersRes.error.message}`);
      if (favoritesRes.error) setError(`Favoritter: ${favoritesRes.error.message}`);

      const offersList = (offersRes.data ?? []) as Offer[];
      const favoritesList = (favoritesRes.data ?? []) as FavoriteRow[];
      setOffers(offersList);
      setFavorites(favoritesList);

      // Items map (start with my items, add more as needed for messages)
      const iMap: Record<string, Item> = {};
      for (const it of myItems) iMap[String(it.id)] = it;

      // 3. Messages → thread rows
      if (msgRes.error) {
        setError(msgRes.error.message);
      } else {
        const messages = (msgRes.data ?? []) as Message[];
        const byThread = new Map<string, Message>();
        for (const m of messages) {
          const key = `${m.item_id}:${m.buyer_id}`;
          if (!byThread.has(key)) byThread.set(key, m);
        }
        const threadItemIds = Array.from(new Set([...byThread.values()].map((m) => m.item_id)));
        const missing = threadItemIds.filter((id) => !iMap[String(id)]);
        if (missing.length > 0) {
          const { data: extra } = await supabase.from("items").select("*").in("id", missing);
          for (const it of (extra ?? []) as Item[]) iMap[String(it.id)] = it;
        }
        const rows: ThreadRow[] = [];
        for (const m of byThread.values()) {
          const item = iMap[String(m.item_id)];
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
      }

      setItemsMap(iMap);

      // 4. Profiles for everyone shown
      const personIds = new Set<string>();
      for (const o of offersList) personIds.add(o.buyer_id);
      for (const f of favoritesList) personIds.add(f.user_id);
      // also collect message-thread other parties
      for (const m of (msgRes.data ?? []) as Message[]) {
        const item = iMap[String(m.item_id)];
        if (!item) continue;
        const otherId = item.seller_id === userId ? m.buyer_id : item.seller_id;
        if (otherId) personIds.add(otherId);
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
        <Link href="/login?next=/inbox" className="inline-block rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-stone-50 hover:bg-black">Logg inn</Link>
      </section>
    );
  }

  const newOffers = offers.filter((o) => new Date(o.created_at).getTime() > lastVisit).length;
  const newFavorites = favorites.filter((f) => new Date(f.created_at).getTime() > lastVisit).length;
  const newMessages = (threads ?? []).filter(
    (t) => t.lastMessage.sender_id !== userId && new Date(t.lastMessage.created_at).getTime() > lastVisit,
  ).length;

  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-semibold tracking-tight">Innboks</h1>
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="flex gap-1 border-b border-stone-200">
        <TabButton label="Tilbud" badge={newOffers} active={tab === "tilbud"} onClick={() => setTab("tilbud")} />
        <TabButton label="Favoritter" badge={newFavorites} active={tab === "favoritter"} onClick={() => setTab("favoritter")} />
        <TabButton label="Meldinger" badge={newMessages} active={tab === "meldinger"} onClick={() => setTab("meldinger")} />
      </div>

      {tab === "tilbud" && (
        <OffersTab offers={offers} items={itemsMap} profiles={profilesMap} lastVisit={lastVisit} />
      )}

      {tab === "favoritter" && (
        <FavoritesTab favorites={favorites} items={itemsMap} profiles={profilesMap} lastVisit={lastVisit} />
      )}

      {tab === "meldinger" && (
        <MessagesTab threads={threads} userId={userId} reviewedItemIds={reviewedItemIds} profiles={profilesMap} />
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

function OffersTab({
  offers,
  items,
  profiles,
  lastVisit,
}: {
  offers: Offer[];
  items: Record<string, Item>;
  profiles: Record<string, Profile>;
  lastVisit: number;
}) {
  if (offers.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-stone-300 p-10 text-center text-sm text-stone-500">
        Ingen tilbud enda. Når noen byr på annonsene dine, dukker de opp her.
      </div>
    );
  }
  return (
    <ul className="divide-y divide-stone-200 overflow-hidden rounded-2xl border border-stone-200 bg-white">
      {offers.map((o) => {
        const item = items[String(o.item_id)];
        const profile = profiles[o.buyer_id];
        const name = profileDisplayName(profile, o.buyer_id);
        const cover = item ? itemImages(item)[0] : null;
        const isUnread = new Date(o.created_at).getTime() > lastVisit;
        const statusLabel =
          o.status === "accepted" ? "Godtatt" : o.status === "declined" ? "Avslått" : "Avventer svar";
        return (
          <li key={o.id} className={isUnread ? "bg-[#5a6b32]/5" : ""}>
            <Link href={item ? `/item/${item.id}` : "/inbox"} className="flex items-center gap-3 p-3 hover:bg-stone-50">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-stone-100">
                {cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={cover} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-lg">💰</div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">
                  <span className="font-medium text-stone-900">{name}</span>
                  <span className="text-stone-700"> bød </span>
                  <span className="font-semibold text-stone-900">{formatPrice(o.amount)}</span>
                  {item && <span className="text-stone-700"> på «{item.title}»</span>}
                </p>
                <p className="mt-0.5 text-xs text-stone-500">{fmtTime(o.created_at)} · {statusLabel}</p>
              </div>
              {isUnread && <span className="h-2 w-2 shrink-0 rounded-full bg-[#5a6b32]" />}
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
      {favorites.map((f) => {
        const item = items[String(f.item_id)];
        const profile = profiles[f.user_id];
        const name = profileDisplayName(profile, f.user_id);
        const cover = item ? itemImages(item)[0] : null;
        const isUnread = new Date(f.created_at).getTime() > lastVisit;
        return (
          <li key={f.id} className={isUnread ? "bg-[#5a6b32]/5" : ""}>
            <Link href={item ? `/item/${item.id}` : "/inbox"} className="flex items-center gap-3 p-3 hover:bg-stone-50">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-stone-100">
                {cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={cover} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-lg">♡</div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">
                  <span className="font-medium text-stone-900">{name}</span>
                  <span className="text-stone-700"> la til </span>
                  {item && <span className="font-medium text-stone-900">«{item.title}»</span>}
                  <span className="text-stone-700"> i favoritter</span>
                </p>
                <p className="mt-0.5 text-xs text-stone-500">{fmtTime(f.created_at)}</p>
              </div>
              {isUnread && <span className="h-2 w-2 shrink-0 rounded-full bg-[#5a6b32]" />}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function MessagesTab({
  threads,
  userId,
  reviewedItemIds,
  profiles,
}: {
  threads: ThreadRow[] | null;
  userId: string;
  reviewedItemIds: Set<string>;
  profiles: Record<string, Profile>;
}) {
  if (threads === null) return <p className="text-sm text-stone-500">Laster…</p>;
  if (threads.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-stone-300 p-10 text-center text-sm text-stone-500">
        Ingen samtaler enda. Send melding til en selger fra en annonse.
      </div>
    );
  }
  return (
    <ul className="divide-y divide-stone-200 overflow-hidden rounded-2xl border border-stone-200 bg-white">
      {threads.map(({ item, lastMessage, role, buyerId }) => {
        const otherId = role === "seller" ? buyerId : item.seller_id;
        const otherName = otherId ? profileDisplayName(profiles[otherId], otherId) : "";
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
                    <span className="font-medium text-stone-700">{senderPrefix}:</span> {lastMessage.body}
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
  );
}
