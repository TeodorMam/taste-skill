import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient as createServerClient } from "@/utils/supabase/server";
import { createClient } from "@supabase/supabase-js";
import {
  type Item,
  type Message,
  type Profile,
  formatPrice,
  profileDisplayName,
} from "@/lib/supabase";

// Never cached, never prerendered. This reads live data behind an auth gate,
// so a cached copy would be both stale and a leak.
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Belt and braces alongside Disallow: /admin in robots.txt.
export const metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_USER_ID = process.env.ADMIN_USER_ID;

const DAY = 86_400_000;
const sinceIso = (ms: number) => new Date(Date.now() - ms).toISOString();

/** Server renders in UTC on Netlify, so the timezone has to be explicit. */
const osloTime = new Intl.DateTimeFormat("nb-NO", {
  timeZone: "Europe/Oslo",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function fmtWhen(iso: string | null): string {
  if (!iso) return "–";
  return osloTime.format(new Date(iso));
}

function fmtAgo(iso: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60_000);
  if (mins < 1) return "nå";
  if (mins < 60) return `${mins} min siden`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} t siden`;
  return `${Math.round(hours / 24)} d siden`;
}

const STATUS: Record<string, { label: string; className: string }> = {
  pending:   { label: "Venter",     className: "bg-stone-100 text-stone-600" },
  paid:      { label: "Betalt",     className: "bg-[#5a6b32]/10 text-[#435022]" },
  shipped:   { label: "Sendt",      className: "bg-[#5a6b32]/10 text-[#435022]" },
  delivered: { label: "Levert",     className: "bg-[#5a6b32]/10 text-[#435022]" },
  confirmed: { label: "Bekreftet",  className: "bg-[#5a6b32]/15 text-[#435022]" },
  paid_out:  { label: "Utbetalt",   className: "bg-[#5a6b32] text-white" },
  disputed:  { label: "Tvist",      className: "bg-red-100 text-red-700" },
  cancelled: { label: "Kansellert", className: "bg-stone-100 text-stone-500" },
  refunded:  { label: "Refundert",  className: "bg-amber-100 text-amber-800" },
};

type Order = {
  id: string;
  item_id: string | number | null;
  buyer_id: string;
  seller_id: string;
  amount_nok: number;
  status: string;
  created_at: string;
};

function StatTile({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-stone-400">{label}</p>
      <p className="mt-1.5 text-3xl font-semibold tracking-tight text-stone-900">{value}</p>
      <p className="mt-0.5 text-xs text-stone-500">{hint}</p>
    </div>
  );
}

function SectionHeading({ title, sub }: { title: string; sub: string }) {
  return (
    <div>
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <p className="mt-0.5 text-sm text-stone-500">{sub}</p>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-stone-200 bg-white px-4 py-8 text-center text-sm text-stone-400">
      {children}
    </div>
  );
}

export default async function AdminPage() {
  // Gate first, on the session cookie, before any privileged client exists.
  const supabase = createServerClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();

  // Fails closed: a missing ADMIN_USER_ID locks the page rather than opening it.
  if (!ADMIN_USER_ID || !user || user.id !== ADMIN_USER_ID) redirect("/");

  if (!SERVICE_ROLE_KEY) {
    return (
      <div className="space-y-4 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        <Empty>SUPABASE_SERVICE_ROLE_KEY mangler i miljøet, så dashboardet kan ikke lese data.</Empty>
      </div>
    );
  }

  // Only reached by the admin. Orders and messages are behind RLS that scopes
  // them to their own participants, so a platform-wide view needs this key.
  const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  const since7d = sinceIso(7 * DAY);
  const since24h = sinceIso(DAY);

  const [activeItemsRes, recentItemsRes, ordersRes, paidRes, messagesRes] = await Promise.all([
    db.from("items").select("id", { count: "exact", head: true }).eq("is_sold", false),
    db.from("items").select("*", { count: "exact" }).gte("created_at", since7d).order("created_at", { ascending: false }),
    db.from("orders").select("*").order("created_at", { ascending: false }).limit(10),
    db.from("orders").select("id", { count: "exact", head: true }).gte("paid_at", since7d),
    db.from("messages").select("*").gte("created_at", since7d).order("created_at", { ascending: false }),
  ]);

  const activeItems = activeItemsRes.count ?? 0;
  const newItems7d = recentItemsRes.count ?? 0;
  const paidOrders7d = paidRes.count ?? 0;
  const recentItems = (recentItemsRes.data ?? []) as Item[];
  const orders = (ordersRes.data ?? []) as Order[];
  const messages = (messagesRes.data ?? []) as Message[];

  const newItems24h = recentItems.filter((i) => i.created_at >= since24h);

  // A thread is (item_id, buyer_id). Messages arrive newest first, so the first
  // one seen for a key is that thread's latest.
  type Thread = { itemId: string; buyerId: string; last: Message; count: number };
  const threadMap = new Map<string, Thread>();
  for (const m of messages) {
    const itemId = String(m.item_id);
    const key = `${itemId}:${m.buyer_id}`;
    const existing = threadMap.get(key);
    if (existing) existing.count += 1;
    else threadMap.set(key, { itemId, buyerId: m.buyer_id, last: m, count: 1 });
  }
  const threads = [...threadMap.values()].sort((a, b) =>
    a.last.created_at < b.last.created_at ? 1 : -1,
  );

  // Titles for items referenced by orders and threads but not in the 7d window.
  const itemMap: Record<string, Item> = {};
  for (const i of recentItems) itemMap[String(i.id)] = i;
  const missingItemIds = [
    ...new Set([
      ...orders.map((o) => o.item_id).filter((x): x is string | number => x !== null),
      ...threads.map((t) => t.itemId),
    ].map(String)),
  ].filter((id) => !itemMap[id]);
  if (missingItemIds.length > 0) {
    // Tolerated rather than awaited on: a lookup that fails degrades to a
    // missing title, it does not take the dashboard down.
    const { data } = await db.from("items").select("*").in("id", missingItemIds);
    for (const i of (data ?? []) as Item[]) itemMap[String(i.id)] = i;
  }

  // profiles_public, not profiles: the dashboard has no business holding
  // addresses and phone numbers just to print a display name.
  const userIds = [
    ...new Set([
      ...orders.flatMap((o) => [o.buyer_id, o.seller_id]),
      ...recentItems.map((i) => i.seller_id),
      ...threads.flatMap((t) => [t.buyerId, t.last.sender_id]),
    ].filter((x): x is string => !!x)),
  ];
  const profileMap: Record<string, Profile> = {};
  if (userIds.length > 0) {
    const { data } = await db.from("profiles_public").select("*").in("user_id", userIds);
    for (const p of (data ?? []) as Profile[]) profileMap[p.user_id] = p;
  }

  const name = (id: string | null) => profileDisplayName(id ? profileMap[id] : null, id);
  const title = (id: string | number | null) =>
    (id !== null && itemMap[String(id)]?.title) || "Slettet vare";

  return (
    <div className="space-y-10 py-8 sm:py-10">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-stone-900">
            Admin<span className="text-[#5a6b32]">.</span>
          </h1>
          <p className="mt-1 text-sm text-stone-500">Live oversikt over Aktivbruk</p>
        </div>
        <p className="text-xs text-stone-400">Oppdatert {fmtWhen(new Date().toISOString())}</p>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Aktive" value={activeItems} hint="varer til salgs" />
        <StatTile label="Solgt" value={paidOrders7d} hint="betalt siste 7 d" />
        <StatTile label="Nye" value={newItems7d} hint="annonser siste 7 d" />
        <StatTile label="Chats" value={threads.length} hint="aktive siste 7 d" />
      </section>

      <section className="space-y-4">
        <SectionHeading title="Nyeste ordre" sub="De 10 siste, uansett status" />
        {orders.length === 0 ? (
          <Empty>Ingen ordre ennå.</Empty>
        ) : (
          <div className="divide-y divide-stone-200 overflow-hidden rounded-2xl border border-stone-200 bg-white">
            {orders.map((o) => {
              const s = STATUS[o.status] ?? { label: o.status, className: "bg-stone-100 text-stone-600" };
              return (
                <div key={o.id} className="flex items-start justify-between gap-3 p-4">
                  <div className="min-w-0 space-y-1">
                    <p className="line-clamp-1 text-sm font-medium">{title(o.item_id)}</p>
                    <p className="line-clamp-1 text-xs text-stone-500">
                      {name(o.buyer_id)} <span className="text-stone-300">kjøpte av</span> {name(o.seller_id)}
                    </p>
                    <p className="text-xs text-stone-400">
                      {fmtWhen(o.created_at)} · {fmtAgo(o.created_at)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <p className="text-sm font-semibold">{formatPrice(o.amount_nok)}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${s.className}`}>
                      {s.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <SectionHeading title="Nye annonser" sub="Lagt ut siste 24 timer" />
        {newItems24h.length === 0 ? (
          <Empty>Ingen nye annonser det siste døgnet.</Empty>
        ) : (
          <div className="divide-y divide-stone-200 overflow-hidden rounded-2xl border border-stone-200 bg-white">
            {newItems24h.map((item) => (
              <Link
                key={item.id}
                href={`/item/${item.id}`}
                className="flex items-center justify-between gap-3 p-4 transition hover:bg-stone-50"
              >
                <div className="min-w-0 space-y-1">
                  <p className="line-clamp-1 text-sm font-medium">{item.title}</p>
                  <p className="line-clamp-1 text-xs text-stone-500">
                    {name(item.seller_id)} · {fmtAgo(item.created_at)}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold">{formatPrice(item.price)}</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <SectionHeading title="Aktive chats" sub="Tråder med melding siste 7 døgn, nyeste først" />
        {threads.length === 0 ? (
          <Empty>Ingen aktive samtaler.</Empty>
        ) : (
          <div className="divide-y divide-stone-200 overflow-hidden rounded-2xl border border-stone-200 bg-white">
            {threads.map((t) => {
              const item = itemMap[t.itemId];
              const sellerId = item?.seller_id ?? null;
              return (
                <Link
                  key={`${t.itemId}:${t.buyerId}`}
                  href={`/chat/${t.itemId}/${t.buyerId}`}
                  className="flex items-start justify-between gap-3 p-4 transition hover:bg-stone-50"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="line-clamp-1 text-sm font-medium">{title(t.itemId)}</p>
                    <p className="line-clamp-1 text-xs text-stone-500">
                      {name(t.buyerId)} <span className="text-stone-300">og</span> {name(sellerId)}
                    </p>
                    <p className="line-clamp-1 text-xs text-stone-400">
                      {t.count} {t.count === 1 ? "melding" : "meldinger"} · {fmtAgo(t.last.created_at)}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-medium text-[#5a6b32]">Åpne</span>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
