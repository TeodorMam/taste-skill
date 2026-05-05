"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

type PendingOffer = {
  id: string;
  amount: number;
  buyerName: string;
  createdAt: string;
};

type ActivityEntry = {
  item: Item;
  latestAt: string;
  messagePreview?: string;
  latestFav?: { name: string; createdAt: string; isUnread: boolean };
  pendingOffer?: PendingOffer;
  acceptedOffer?: { id: string; amount: number };
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
  const [error, setError] = useState<string | null>(null);

  const [offers, setOffers] = useState<Offer[]>([]);
  const [myAcceptedOffers, setMyAcceptedOffers] = useState<Offer[]>([]);
  const [threads, setThreads] = useState<{ item: Item; lastMessage: Message; buyerId: string; role: "buyer" | "seller" }[]>([]);
  const [favsByItem, setFavsByItem] = useState<Record<string, { userId: string; createdAt: string }[]>>({});

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

      const [offersRes, msgRes, myOffersRes, favsRes] = await Promise.all([
        myItemIds.length > 0
          ? supabase.from("offers").select("*").in("item_id", myItemIds).neq("buyer_id", userId)
              .order("created_at", { ascending: false }).limit(50)
          : Promise.resolve({ data: [] as Offer[], error: null }),
        supabase.from("messages").select("*").order("created_at", { ascending: false }),
        supabase.from("offers").select("*").eq("buyer_id", userId).eq("status", "accepted"),
        myItemIds.length > 0
          ? supabase.from("favorites").select("user_id, item_id, created_at")
              .in("item_id", myItemIds).neq("user_id", userId)
              .order("created_at", { ascending: false })
          : Promise.resolve({ data: [] as FavoriteRow[], error: null }),
      ]);

      // Group favorites by item
      const fMap: Record<string, { userId: string; createdAt: string }[]> = {};
      for (const f of (favsRes.data ?? []) as FavoriteRow[]) {
        const key = String(f.item_id);
        if (!fMap[key]) fMap[key] = [];
        fMap[key].push({ userId: f.user_id, createdAt: f.created_at });
      }
      setFavsByItem(fMap);
      setMyAcceptedOffers((myOffersRes.data ?? []) as Offer[]);

      if (offersRes.error) setError(`Tilbud: ${offersRes.error.message}`);

      setOffers((offersRes.data ?? []) as Offer[]);

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
          rows.push({ item, lastMessage: m, buyerId: m.buyer_id, role: item.seller_id === userId ? "seller" : "buyer" });
        }
        setThreads(rows);
      }

      setItemsMap(iMap);

      const personIds = new Set<string>();
      for (const o of (offersRes.data ?? []) as Offer[]) personIds.add(o.buyer_id);
      for (const m of (msgRes.data ?? []) as Message[]) {
        const item = iMap[String(m.item_id)];
        if (!item) continue;
        const other = item.seller_id === userId ? m.buyer_id : item.seller_id;
        if (other) personIds.add(other);
      }
      for (const f of (favsRes.data ?? []) as FavoriteRow[]) personIds.add(f.user_id);
      const personList = Array.from(personIds);
      if (personList.length > 0) {
        const { data: pData } = await supabase.from("profiles").select("*").in("user_id", personList);
        const pMap: Record<string, Profile> = {};
        for (const p of (pData ?? []) as Profile[]) pMap[p.user_id] = p;
        setProfilesMap(pMap);
      }
    })();
  }, [userId, supabase]);

  const handleOfferAction = async (offerId: string, action: "accepted" | "declined") => {
    await supabase.from("offers").update({ status: action }).eq("id", offerId);
    setOffers((prev) => prev.map((o) => (o.id === offerId ? { ...o, status: action } : o)));
  };

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

  // Build one ActivityEntry per item
  const activityByItem: Record<string, ActivityEntry> = {};
  const buyersByItem: Record<string, Set<string>> = {};

  // Best pending offer per item (most recent)
  const pendingOfferByItem: Record<string, PendingOffer> = {};
  for (const o of offers) {
    if (o.status !== "pending") continue;
    const key = String(o.item_id);
    if (!pendingOfferByItem[key] || o.created_at > pendingOfferByItem[key].createdAt) {
      const name = profileDisplayName(profilesMap[o.buyer_id], o.buyer_id);
      pendingOfferByItem[key] = { id: o.id, amount: o.amount, buyerName: name, createdAt: o.created_at };
    }
  }

  // Seed from all offers (including non-pending, for latestAt tracking)
  for (const o of offers) {
    const key = String(o.item_id);
    const item = itemsMap[key];
    if (!item) continue;
    if (!buyersByItem[key]) buyersByItem[key] = new Set();
    buyersByItem[key].add(o.buyer_id);
    const isUnread = new Date(o.created_at).getTime() > lastVisit;
    if (!activityByItem[key] || o.created_at > activityByItem[key].latestAt) {
      activityByItem[key] = { item, latestAt: o.created_at, isUnread, contactCount: 0 };
    }
    if (isUnread) activityByItem[key].isUnread = true;
  }

  // Overlay message previews
  for (const t of threads) {
    if (t.role === "seller") {
      const key = String(t.item.id);
      const item = itemsMap[key] ?? t.item;
      if (!buyersByItem[key]) buyersByItem[key] = new Set();
      buyersByItem[key].add(t.buyerId);
      const isOther = t.lastMessage.sender_id !== userId;
      const name = profileDisplayName(profilesMap[t.buyerId], t.buyerId);
      const msgText = t.lastMessage.image_url && !t.lastMessage.body.trim() ? "📷 Bilde" : t.lastMessage.body;
      const preview = isOther ? `${name}: ${msgText}` : `Du: ${msgText}`;
      const isUnread = isOther && new Date(t.lastMessage.created_at).getTime() > lastVisit;
      if (!activityByItem[key]) activityByItem[key] = { item, latestAt: t.lastMessage.created_at, isUnread, contactCount: 0 };
      // Always update messagePreview to the latest message
      if (!activityByItem[key].messagePreview || t.lastMessage.created_at > (activityByItem[key].latestAt)) {
        activityByItem[key].messagePreview = preview;
      }
      if (t.lastMessage.created_at > activityByItem[key].latestAt) activityByItem[key].latestAt = t.lastMessage.created_at;
      if (isUnread) activityByItem[key].isUnread = true;
    } else {
      // Buyer side
      const key = `buyer:${t.item.id}`;
      const isOther = t.lastMessage.sender_id !== userId;
      const sellerName = t.item.seller_id ? profileDisplayName(profilesMap[t.item.seller_id], t.item.seller_id) : "Selger";
      const msgText = t.lastMessage.image_url && !t.lastMessage.body.trim() ? "📷 Bilde" : t.lastMessage.body;
      const preview = isOther ? `${sellerName}: ${msgText}` : `Du: ${msgText}`;
      if (!activityByItem[key] || t.lastMessage.created_at > activityByItem[key].latestAt) {
        activityByItem[key] = {
          item: t.item, latestAt: t.lastMessage.created_at, messagePreview: preview,
          isUnread: isOther && new Date(t.lastMessage.created_at).getTime() > lastVisit, contactCount: 1,
        };
      }
    }
  }

  // Attach pending offers + contact counts
  for (const key of Object.keys(activityByItem)) {
    activityByItem[key].pendingOffer = pendingOfferByItem[key];
    activityByItem[key].contactCount = buyersByItem[key]?.size ?? activityByItem[key].contactCount;
  }

  // Attach buyer's accepted offers to buyer-side entries
  for (const o of myAcceptedOffers) {
    const key = `buyer:${o.item_id}`;
    if (activityByItem[key]) {
      activityByItem[key].acceptedOffer = { id: o.id, amount: o.amount };
    }
  }

  // Overlay latest favorite per item
  for (const [key, favs] of Object.entries(favsByItem)) {
    const item = itemsMap[key];
    if (!item) continue;
    const latest = favs[0];
    if (!latest) continue;
    const name = profileDisplayName(profilesMap[latest.userId], latest.userId);
    const isUnread = new Date(latest.createdAt).getTime() > lastVisit;
    if (!activityByItem[key]) {
      activityByItem[key] = { item, latestAt: latest.createdAt, isUnread, contactCount: 0 };
    }
    activityByItem[key].latestFav = { name, createdAt: latest.createdAt, isUnread };
    if (latest.createdAt > activityByItem[key].latestAt) activityByItem[key].latestAt = latest.createdAt;
    if (isUnread) activityByItem[key].isUnread = true;
  }

  const activityList = Object.values(activityByItem).sort(
    (a, b) => new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime(),
  );

  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-semibold tracking-tight">Innboks</h1>
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <ActivityTab activities={activityList} onOfferAction={handleOfferAction} />
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

function ActivityTab({
  activities,
  onOfferAction,
}: {
  activities: ActivityEntry[];
  onOfferAction: (id: string, action: "accepted" | "declined") => Promise<void>;
}) {
  const router = useRouter();
  const [acting, setActing] = useState<string | null>(null);
  const [paying, setPaying] = useState<string | null>(null);

  async function handlePay(itemId: string | number, offerId: string) {
    setPaying(offerId);
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item_id: String(itemId), offer_id: offerId }),
    });
    const json = await res.json() as { url?: string; error?: string };
    if (json.url) {
      window.location.href = json.url;
    } else {
      alert(json.error ?? "Noe gikk galt");
      setPaying(null);
    }
  }

  if (activities.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-stone-300 p-10 text-center text-sm text-stone-500">
        Ingen aktivitet enda. Når noen byr eller sender melding om annonsene dine, dukker de opp her.
      </div>
    );
  }

  return (
    <ul className="divide-y divide-stone-200 overflow-hidden rounded-2xl border border-stone-200 bg-white">
      {activities.map(({ item, latestAt, messagePreview, latestFav, pendingOffer, acceptedOffer, isUnread, contactCount }) => {
        const cover = itemImages(item)[0];
        return (
          <li
            key={item.id}
            className={`cursor-pointer ${isUnread ? "bg-[#5a6b32]/5" : ""} hover:bg-stone-50`}
            onClick={() => router.push(`/item/${item.id}`)}
          >
            <div className="flex items-start gap-3 p-3">
              {/* Thumbnail */}
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-stone-100">
                {cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={cover} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-stone-200" />
                )}
                {item.is_sold && (
                  <div className="absolute inset-0 flex items-end justify-center pb-1">
                    <span className="rounded bg-stone-900/80 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-white">Solgt</span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-stone-900">{item.title}</p>
                  <span className="shrink-0 text-[10px] text-stone-400">{fmtTime(latestAt)}</span>
                </div>

                {/* Message preview */}
                {messagePreview && (
                  <p className="mt-0.5 line-clamp-1 text-xs text-stone-500">{messagePreview}</p>
                )}

                {/* Pending offer — always shown if exists, with inline action buttons */}
                {pendingOffer && (
                  <div className="mt-1.5" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-[#5a6b32] px-2 py-0.5 text-[11px] font-semibold text-white">
                        Bud
                      </span>
                      <span className="text-sm font-bold text-stone-900">{formatPrice(pendingOffer.amount)}</span>
                      <span className="text-xs text-stone-400">fra {pendingOffer.buyerName}</span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <button
                        disabled={acting === pendingOffer.id}
                        onClick={async () => { setActing(pendingOffer.id); await onOfferAction(pendingOffer.id, "accepted"); setActing(null); }}
                        className="rounded-full bg-[#5a6b32] px-3 py-0.5 text-xs font-semibold text-white hover:bg-[#4a5828] disabled:opacity-50"
                      >
                        Godta
                      </button>
                      <button
                        disabled={acting === pendingOffer.id}
                        onClick={async () => { setActing(pendingOffer.id); await onOfferAction(pendingOffer.id, "declined"); setActing(null); }}
                        className="rounded-full border border-stone-300 px-3 py-0.5 text-xs font-semibold text-stone-600 hover:bg-stone-100 disabled:opacity-50"
                      >
                        Avslå
                      </button>
                    </div>
                  </div>
                )}

                {/* Buyer-side: accepted offer with payment button */}
                {acceptedOffer && !item.is_sold && (
                  <div className="mt-1.5" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-semibold text-white">✓ Godtatt</span>
                      <span className="text-sm font-bold text-stone-900">{formatPrice(acceptedOffer.amount)}</span>
                    </div>
                    <button
                      disabled={paying === acceptedOffer.id}
                      onClick={() => handlePay(item.id, acceptedOffer.id)}
                      className="mt-1.5 rounded-full bg-[#5a6b32] px-3 py-0.5 text-xs font-semibold text-white hover:bg-[#4a5828] disabled:opacity-50"
                    >
                      {paying === acceptedOffer.id ? "Sender…" : `Betal nå — ${formatPrice(acceptedOffer.amount)}`}
                    </button>
                  </div>
                )}

                {latestFav && (
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-stone-500">
                    <span className="text-rose-400">♥</span>
                    <span className={latestFav.isUnread ? "font-medium text-stone-700" : ""}>
                      {latestFav.name} favoriserte annonsen
                    </span>
                  </p>
                )}

                {contactCount > 1 && (
                  <p className="mt-0.5 text-[10px] font-medium text-[#5a6b32]">{contactCount} interesserte</p>
                )}
              </div>

              {isUnread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-red-500" />}
            </div>
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
              {/* Item thumbnail */}
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-stone-100">
                {cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={cover} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-stone-200" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                {/* Item title + time */}
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-stone-900">
                    {item?.title ?? "Annonse"}
                  </p>
                  <span className="shrink-0 text-[10px] text-stone-400">{fmtTime(f.created_at)}</span>
                </div>
                {/* Who favorited */}
                <p className="mt-0.5 flex items-center gap-1 text-xs text-stone-500">
                  <span className="text-rose-400">♥</span>
                  <span className="font-medium text-stone-700">{name}</span>
                  <span>la dette til i favorittene sine</span>
                </p>
              </div>

              {isUnread && <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" />}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
