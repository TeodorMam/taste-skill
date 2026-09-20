import Link from "next/link";
import { requireAdminDb, fmtAgo } from "@/lib/admin";
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

const DAY = 86_400_000;
const sinceIso = (ms: number) => new Date(Date.now() - ms).toISOString();

/**
 * A sale is an order that was actually paid for and not undone. Everything
 * else (abandoned checkouts, cancellations, refunds) is noise in a total.
 */
const isSale = (o: OrderRow) =>
  !!o.paid_at && o.status !== "cancelled" && o.status !== "refunded";

type OrderRow = {
  id: string;
  item_id: string | number | null;
  buyer_id: string;
  seller_id: string;
  amount_nok: number;
  platform_fee_nok: number;
  status: string;
  created_at: string;
  paid_at: string | null;
  shipped_at: string | null;
};

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

/** What is wrong with this order, if anything, in the order it matters. */
function needsAction(o: OrderRow): { label: string; className: string } | null {
  if (o.status === "disputed")
    return { label: "Tvist, må løses", className: "bg-red-100 text-red-700" };
  if (o.status === "paid" && !o.shipped_at && Date.now() - new Date(o.created_at).getTime() > 2 * DAY)
    return { label: "Betalt, ikke sendt", className: "bg-amber-100 text-amber-800" };
  if (o.status === "pending" && Date.now() - new Date(o.created_at).getTime() > DAY)
    return { label: "Betaling ikke fullført", className: "bg-stone-100 text-stone-600" };
  return null;
}

function Stat({
  label,
  value,
  sub,
  accent = false,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-stone-400">{label}</p>
      <p
        className={`mt-1.5 text-3xl font-semibold tracking-tight ${
          accent ? "text-[#5a6b32]" : "text-stone-900"
        }`}
      >
        {value}
      </p>
      <p className="mt-0.5 text-xs text-stone-500">{sub}</p>
    </div>
  );
}

function Section({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {sub && <p className="mt-0.5 text-sm text-stone-500">{sub}</p>}
      </div>
      {children}
    </section>
  );
}

function Quiet({ children }: { children: React.ReactNode }) {
  return <p className="px-1 text-sm text-stone-400">{children}</p>;
}

function Rows({ children }: { children: React.ReactNode }) {
  return (
    <div className="divide-y divide-stone-200 overflow-hidden rounded-2xl border border-stone-200 bg-white">
      {children}
    </div>
  );
}

export default async function AdminPage() {
  // Redirects anyone who is not the admin before a privileged client exists.
  const db = await requireAdminDb();

  if (!db) {
    return (
      <div className="space-y-4 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        <Quiet>SUPABASE_SERVICE_ROLE_KEY mangler i miljøet, så dashboardet kan ikke lese data.</Quiet>
      </div>
    );
  }

  const since7d = sinceIso(7 * DAY);
  const since30d = sinceIso(30 * DAY);

  const [activeRes, itemsRes, ordersRes, usersRes, newUsersRes, messagesRes] = await Promise.all([
    db.from("items").select("id", { count: "exact", head: true }).eq("is_sold", false),
    db.from("items").select("*", { count: "exact" }).gte("created_at", since30d).order("created_at", { ascending: false }),
    // Every order, so lifetime totals are lifetime totals. Narrow columns keep
    // it small; at a few thousand orders this is still a trivial payload.
    db.from("orders")
      .select("id,item_id,buyer_id,seller_id,amount_nok,platform_fee_nok,status,created_at,paid_at,shipped_at")
      .order("created_at", { ascending: false })
      .limit(5000),
    db.from("profiles").select("user_id", { count: "exact", head: true }),
    db.from("profiles").select("user_id", { count: "exact", head: true }).gte("created_at", since30d),
    db.from("messages").select("*").gte("created_at", since30d).order("created_at", { ascending: false }),
  ]);

  const activeItems = activeRes.count ?? 0;
  const recentItems = (itemsRes.data ?? []) as Item[];
  const newItems30d = itemsRes.count ?? 0;
  const orders = (ordersRes.data ?? []) as OrderRow[];
  const users = usersRes.count ?? 0;
  const newUsers30d = newUsersRes.count ?? 0;
  const messages = (messagesRes.data ?? []) as Message[];

  const sales = orders.filter(isSale);
  const revenue = sales.reduce((sum, o) => sum + (o.amount_nok ?? 0), 0);
  const income = sales.reduce((sum, o) => sum + (o.platform_fee_nok ?? 0), 0);
  const sales30d = sales.filter((o) => (o.paid_at ?? "") >= since30d);
  const income30d = sales30d.reduce((sum, o) => sum + (o.platform_fee_nok ?? 0), 0);

  const actionable = orders.filter((o) => needsAction(o) !== null);
  const recentSales = sales.slice(0, 8);
  const hiddenOrders = orders.length - sales.length - actionable.filter((o) => !isSale(o)).length;

  const newItems7d = recentItems.filter((i) => i.created_at >= since7d);

  // A thread is (item_id, buyer_id). Messages arrive newest first, so the
  // first one seen for a key is that thread's latest.
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

  // Titles for items referenced by orders and threads but outside the 30d window.
  const itemMap: Record<string, Item> = {};
  for (const i of recentItems) itemMap[String(i.id)] = i;
  const shownOrders = [...actionable, ...recentSales];
  const missingItemIds = [
    ...new Set(
      [
        ...shownOrders.map((o) => o.item_id).filter((x): x is string | number => x !== null),
        ...threads.map((t) => t.itemId),
      ].map(String),
    ),
  ].filter((id) => !itemMap[id]);
  if (missingItemIds.length > 0) {
    const { data } = await db.from("items").select("*").in("id", missingItemIds);
    for (const i of (data ?? []) as Item[]) itemMap[String(i.id)] = i;
  }

  // profiles_public, not profiles: the dashboard has no business holding
  // addresses and phone numbers just to print a display name.
  const userIds = [
    ...new Set(
      [
        ...shownOrders.flatMap((o) => [o.buyer_id, o.seller_id]),
        ...recentItems.map((i) => i.seller_id),
        ...threads.flatMap((t) => [t.buyerId, t.last.sender_id]),
      ].filter((x): x is string => !!x),
    ),
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
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-stone-900">
          Admin<span className="text-[#5a6b32]">.</span>
        </h1>
        <p className="mt-1 text-sm text-stone-500">Oppdatert {fmtAgo(new Date().toISOString())}</p>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label="Aktive"
          value={String(activeItems)}
          sub={`${newItems30d} nye siste 30 d`}
        />
        <Stat
          label="Salg"
          value={String(sales.length)}
          sub={`${sales30d.length} siste 30 d`}
        />
        <Stat
          label="Omsetning"
          value={formatPrice(revenue)}
          sub="gjennom plattformen"
        />
        <Stat
          label="Inntekt"
          value={formatPrice(income)}
          sub={`${formatPrice(income30d)} siste 30 d`}
          accent
        />
        <div className="col-span-2 sm:col-span-4">
          <p className="px-1 text-xs text-stone-400">
            {users} registrerte brukere, {newUsers30d} nye siste 30 dager. Inntekt er
            kjøperbeskyttelse-gebyret, altså din andel.
          </p>
        </div>
      </section>

      {actionable.length > 0 && (
        <Section title="Krever handling" sub="Det eneste her som haster">
          <Rows>
            {actionable.map((o) => {
              const flag = needsAction(o)!;
              return (
                <div key={o.id} className="flex items-start justify-between gap-3 p-4">
                  <div className="min-w-0 space-y-1">
                    <p className="line-clamp-1 text-sm font-medium">{title(o.item_id)}</p>
                    <p className="line-clamp-1 text-xs text-stone-500">
                      {name(o.buyer_id)} kjøpte av {name(o.seller_id)}
                    </p>
                    <div className="flex items-center gap-2 pt-0.5">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${flag.className}`}>
                        {flag.label}
                      </span>
                      <span className="text-xs text-stone-400">{fmtAgo(o.created_at)}</span>
                    </div>
                  </div>
                  <p className="shrink-0 text-sm font-semibold">{formatPrice(o.amount_nok)}</p>
                </div>
              );
            })}
          </Rows>
        </Section>
      )}

      <Section title="Siste salg" sub="Betalte ordre, nyeste først">
        {recentSales.length === 0 ? (
          <Quiet>Ingen salg ennå.</Quiet>
        ) : (
          <>
            <Rows>
              {recentSales.map((o) => {
                const s = STATUS[o.status] ?? { label: o.status, className: "bg-stone-100 text-stone-600" };
                return (
                  <div key={o.id} className="flex items-start justify-between gap-3 p-4">
                    <div className="min-w-0 space-y-1">
                      <p className="line-clamp-1 text-sm font-medium">{title(o.item_id)}</p>
                      <p className="line-clamp-1 text-xs text-stone-500">
                        {name(o.buyer_id)} kjøpte av {name(o.seller_id)}
                      </p>
                      <div className="flex items-center gap-2 pt-0.5">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${s.className}`}>
                          {s.label}
                        </span>
                        <span className="text-xs text-stone-400">{fmtAgo(o.paid_at ?? o.created_at)}</span>
                      </div>
                    </div>
                    <p className="shrink-0 text-sm font-semibold">{formatPrice(o.amount_nok)}</p>
                  </div>
                );
              })}
            </Rows>
            {hiddenOrders > 0 && (
              <Quiet>
                {hiddenOrders} kansellerte eller ufullførte ordre er ikke vist.
              </Quiet>
            )}
          </>
        )}
      </Section>

      <Section title="Nye annonser" sub="Lagt ut siste 7 dager">
        {newItems7d.length === 0 ? (
          <Quiet>Ingen nye annonser denne uka.</Quiet>
        ) : (
          <Rows>
            {newItems7d.map((item) => (
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
          </Rows>
        )}
      </Section>

      <Section title="Aktive chats" sub="Tråder med melding siste 30 dager">
        {threads.length === 0 ? (
          <Quiet>Ingen aktive samtaler.</Quiet>
        ) : (
          <Rows>
            {threads.map((t) => {
              const item = itemMap[t.itemId];
              return (
                <Link
                  key={`${t.itemId}:${t.buyerId}`}
                  href={`/admin/chat/${t.itemId}/${t.buyerId}`}
                  className="flex items-start justify-between gap-3 p-4 transition hover:bg-stone-50"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="line-clamp-1 text-sm font-medium">{title(t.itemId)}</p>
                    <p className="line-clamp-1 text-xs text-stone-500">
                      {name(t.buyerId)} og {name(item?.seller_id ?? null)}
                    </p>
                    <p className="text-xs text-stone-400">
                      {t.count} {t.count === 1 ? "melding" : "meldinger"} · {fmtAgo(t.last.created_at)}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-medium text-[#5a6b32]">Åpne</span>
                </Link>
              );
            })}
          </Rows>
        )}
      </Section>
    </div>
  );
}
