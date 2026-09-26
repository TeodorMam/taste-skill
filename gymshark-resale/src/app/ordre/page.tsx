"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { formatPrice } from "@/lib/supabase";
import { getPackageOption } from "@/lib/shipping";
import { ReviewForm } from "@/components/ReviewForm";
import { useToast } from "@/components/ToastProvider";

type OrderStatus =
  | "pending" | "paid" | "shipped" | "delivered"
  | "confirmed" | "disputed" | "paid_out" | "cancelled" | "refunded";

type Order = {
  id: string;
  status: OrderStatus;
  amount_nok: number;
  platform_fee_nok: number;
  shipping_cost_nok: number;
  delivery_method: "shipping" | "meetup" | null;
  created_at: string;
  shipped_at: string | null;
  delivered_at: string | null;
  review_deadline: string | null;
  confirmed_at: string | null;
  disputed_at: string | null;
  payout_amount_nok: number | null;
  tracking_info: string | null;
  buyer_id: string;
  seller_id: string;
  buyer_name: string | null;
  buyer_address: string | null;
  buyer_postal_code: string | null;
  buyer_city: string | null;
  buyer_phone: string | null;
  item: { id: number; title: string; image_urls: string[] | null; package_size: string | null } | null;
  item_title: string | null;
  item_image: string | null;
};

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Venter på betaling",
  paid: "Betalt, ikke sendt enda",
  shipped: "Sendt, under transport",
  delivered: "Mottatt, venter på bekreftelse",
  confirmed: "Bekreftet mottatt",
  disputed: "Tvist åpnet",
  paid_out: "Fullført",
  cancelled: "Avbrutt",
  refunded: "Refundert",
};

const STATUS_COLOR: Record<OrderStatus, string> = {
  pending: "bg-sunk text-ink-2",
  paid: "bg-ochre-soft text-ochre",
  shipped: "bg-sunk text-ink-2",
  delivered: "bg-sunk text-ink-2",
  confirmed: "bg-olive-soft text-olive",
  disputed: "bg-clay-soft text-clay",
  paid_out: "bg-olive-soft text-olive",
  cancelled: "bg-sunk text-ink-3",
  refunded: "bg-sunk text-ink-3",
};

function Countdown({ deadline }: { deadline: string }) {
  const [left, setLeft] = useState("");
  useEffect(() => {
    function calc() {
      const diff = new Date(deadline).getTime() - Date.now();
      if (diff <= 0) { setLeft("Utløpt"); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setLeft(`${h}t ${m}m igjen`);
    }
    calc();
    const t = setInterval(calc, 60000);
    return () => clearInterval(t);
  }, [deadline]);
  return <span className="text-xs text-ink-3">{left}</span>;
}

function OrderCard({ order, role, onAction }: {
  order: Order;
  role: "buyer" | "seller";
  onAction: (orderId: string, action: string, extra?: Record<string, string>) => Promise<void>;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [trackingInput, setTrackingInput] = useState("");
  const [showDispute, setShowDispute] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");

  const imgSrc = order.item?.image_urls?.[0] ?? order.item_image ?? null;

  async function act(action: string, extra?: Record<string, string>) {
    setBusy(action);
    try {
      await onAction(order.id, action, extra);
    } catch (err) {
      const msg = err instanceof Error && err.message ? err.message : "Noe gikk galt, prøv igjen";
      toast(msg);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-sm border border-line bg-raised overflow-hidden">
      <div className="flex gap-3 p-4">
        {imgSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imgSrc} alt="" loading="lazy" decoding="async" className="h-16 w-16 shrink-0 rounded-sm object-cover" />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-sm bg-sunk text-2xl">📦</div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-ink">
            {order.item ? (
              <Link href={`/vare/${order.item.id}`} className="hover:underline">{order.item.title}</Link>
            ) : order.item_title ? (
              <span>{order.item_title}</span>
            ) : (
              <span className="text-ink-3">Annonse slettet</span>
            )}
          </p>
          <p className="text-sm text-ink-2">
            {formatPrice(order.amount_nok + (order.shipping_cost_nok ?? 0))}
            {order.shipping_cost_nok > 0 && <span className="ml-1 text-xs text-ink-3">inkl. frakt</span>}
          </p>
          <span className={`mt-1 inline-block rounded-sm px-2 py-0.5 text-[11px] font-medium ${STATUS_COLOR[order.status]}`}>
            {STATUS_LABEL[order.status]}
          </span>
        </div>
      </div>

      {/* Once the trade is finished, ask. The form used to live only on the
          listing page, below the fold, and nothing in this flow pointed at it,
          so nobody was ever asked. A finished order is the moment people have
          an opinion, and this is the page they are already on. */}
      {(order.status === "confirmed" || order.status === "paid_out") && order.item && (
        <div className="border-t border-line bg-paper/60 px-4 py-3">
          <ReviewForm
            itemId={String(order.item.id)}
            reviewerId={role === "buyer" ? order.buyer_id : order.seller_id}
            sellerId={role === "buyer" ? order.seller_id : order.buyer_id}
            label={role === "buyer" ? "Hvordan var selgeren?" : "Hvordan var kjøperen?"}
          />
        </div>
      )}

      {order.tracking_info && (
        <div className="border-t border-line px-4 py-2">
          <p className="text-xs text-ink-3">
            Sporing:{" "}
            <a
              href={`https://sporing.posten.no/sporing/${order.tracking_info}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-olive underline underline-offset-2 hover:text-olive-press"
            >
              {order.tracking_info} ↗
            </a>
          </p>
        </div>
      )}

      {/* Seller actions */}
      {role === "seller" && order.status === "paid" && order.delivery_method !== "meetup" && (() => {
        const pkg = getPackageOption(order.item?.package_size);
        return (
        <div className="border-t border-line p-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-ink">Send pakken</p>
            <span className="rounded-sm bg-ochre-soft px-2 py-0.5 text-[11px] font-medium text-ochre">Send innen 7 dager</span>
          </div>

          {pkg && (
            <div className="rounded-sm border border-olive/30 bg-olive/5 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-olive">Kjøp denne pakken</p>
              <p className="mt-0.5 text-sm font-semibold text-ink">Posten {pkg.label}, {pkg.price} kr</p>
              <p className="text-[11px] text-ink-3">Inntil {pkg.maxWeight} · {pkg.dimensions}</p>
              <p className="mt-1.5 text-[11px] text-ink-3">Ikke velg noen annen størrelse, kjøper har betalt for akkurat denne.</p>
            </div>
          )}

          <div className="flex gap-4">
            <div className="flex-1 space-y-3">
              <ol className="space-y-1.5 text-xs text-ink-2">
                <li className="flex gap-2"><span className="font-semibold text-ink">1.</span><span>Gå til posten.no og velg «Send i Norge»</span></li>
                <li className="flex gap-2"><span className="font-semibold text-ink">2.</span><span>{pkg ? <>Trykk «Kjøp sendekode» og velg <strong>{pkg.label} ({pkg.price} kr)</strong></> : <>Velg pakkestørrelse ved å trykke «Kjøp sendekode»</>}</span></li>
                <li className="flex gap-2"><span className="font-semibold text-ink">3.</span><span>Fyll inn avsender- og mottakerinformasjon, og innleveringsmåte</span></li>
                <li className="flex gap-2"><span className="font-semibold text-ink">4.</span><span>Betal frakt og send inn</span></li>
              </ol>
              <div className="space-y-0.5 text-xs text-ink-3">
                <p>Frakten er allerede betalt av kjøper, du får dette tilbake i utbetalingen.</p>
                <p>Levering tar vanligvis 2–5 virkedager.</p>
              </div>
            </div>

            {order.buyer_name && (
              <div className="w-40 shrink-0 rounded-sm border border-line bg-paper p-3">
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-3">Mottaker</p>
                <p className="text-xs font-medium text-ink">{order.buyer_name}</p>
                <p className="text-xs text-ink-2">{order.buyer_address}</p>
                <p className="text-xs text-ink-2">{order.buyer_postal_code} {order.buyer_city}</p>
                {order.buyer_phone && <p className="text-xs text-ink-2">{order.buyer_phone}</p>}
                <button
                  type="button"
                  onClick={() => {
                    const text = [order.buyer_name, order.buyer_address, `${order.buyer_postal_code} ${order.buyer_city}`, order.buyer_phone].filter(Boolean).join("\n");
                    void navigator.clipboard.writeText(text);
                    toast("Kopiert!");
                  }}
                  className="mt-2 text-[10px] font-medium text-olive underline underline-offset-2 hover:text-olive-press"
                >
                  Kopier alt
                </button>
              </div>
            )}
          </div>

          <div className="space-y-2 pt-1">
            <input
              type="text"
              value={trackingInput}
              onChange={(e) => setTrackingInput(e.target.value)}
              placeholder="Sporingsnummer (påkrevd)"
              className="block w-full rounded-sm border border-line-2 bg-raised px-4 py-2 text-sm outline-none focus:border-olive focus:ring-1 focus:ring-olive/30"
            />
            <button
              onClick={() => act("ship", { tracking_info: trackingInput })}
              disabled={!!busy || !trackingInput.trim()}
              className="w-full rounded-sm bg-olive px-4 py-2 text-sm font-medium text-raised hover:bg-olive-press disabled:opacity-50"
            >
              {busy === "ship" ? "Lagrer…" : "Marker som sendt →"}
            </button>
          </div>
        </div>
        );
      })()}

      {role === "seller" && order.status === "paid" && order.delivery_method === "meetup" && (
        <div className="border-t border-line p-4 space-y-3">
          <p className="text-xs text-ink-2">Avtal tid og sted med kjøper i chatten, og bekreft overlevering når dere møtes.</p>
          <button
            onClick={() => act("handover")}
            disabled={!!busy}
            className="w-full rounded-sm bg-olive px-4 py-2 text-sm font-medium text-raised hover:bg-olive-press disabled:opacity-50"
          >
            {busy === "handover" ? "Lagrer…" : "Bekreft overlevering →"}
          </button>
        </div>
      )}

      {role === "seller" && order.status === "shipped" && (
        <div className="border-t border-line px-4 py-3">
          <p className="text-xs text-ink-3">Vi sporer pakken automatisk og varsler kjøper ved levering.</p>
        </div>
      )}

      {role === "seller" && order.status === "delivered" && (
        <div className="border-t border-line px-4 py-3">
          <p className="text-xs text-ink-3">
            Kjøper har mottatt varen og har {order.review_deadline && <><Countdown deadline={order.review_deadline} /></>} på å bekrefte. Betaling frigjøres automatisk etter fristen.
          </p>
        </div>
      )}

      {role === "seller" && order.status === "confirmed" && (
        <div className="border-t border-line px-4 py-3">
          <p className="text-xs text-olive font-medium">✓ Kjøper bekreftet, betaling overføres til deg</p>
        </div>
      )}

      {role === "seller" && order.status === "paid_out" && (
        <div className="border-t border-line px-4 py-3">
          <p className="text-xs text-olive font-medium">✓ Utbetalt {order.payout_amount_nok ? formatPrice(order.payout_amount_nok) : ""}</p>
          <a href="https://dashboard.stripe.com/express" target="_blank" rel="noopener noreferrer" className="mt-1 block text-xs font-medium text-olive underline underline-offset-2 hover:text-olive-press">
            Åpne Stripe-dashboard ↗
          </a>
        </div>
      )}

      {role === "seller" && order.status === "disputed" && (
        <div className="border-t border-line px-4 py-3">
          <p className="text-xs font-medium text-clay">⚠ Kjøper har meldt problem, betaling er satt på vent</p>
          <p className="mt-1 text-xs text-ink-3">Aktivbruk behandler saken. Ingen automatisk refusjon skjer.</p>
        </div>
      )}

      {/* Buyer actions */}
      {role === "buyer" && order.status === "paid" && (
        <div className="border-t border-line px-4 py-3">
          <p className="text-xs text-ink-3">
            {order.delivery_method === "meetup"
              ? "Betalt, avtal tid og sted med selger i chatten."
              : "Betalt og bekreftet, venter på at selger sender varen."}
          </p>
        </div>
      )}

      {role === "buyer" && order.status === "shipped" && (
        <div className="border-t border-line px-4 py-3">
          <p className="text-xs text-ink-3">Varen er sendt, vi følger pakken og varsler deg når den er levert.</p>
        </div>
      )}

      {role === "buyer" && order.status === "delivered" && (
        <div className="border-t border-line p-4 space-y-3">
          {order.review_deadline && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-ink-2">Bekreft mottak eller meld problem</p>
              <Countdown deadline={order.review_deadline} />
            </div>
          )}
          {showDispute ? (
            <div className="space-y-2">
              <textarea
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                rows={3}
                placeholder="Beskriv problemet (valgfritt men anbefalt)"
                className="block w-full resize-none rounded-sm border border-line-2 bg-raised px-3 py-2 text-sm outline-none focus:border-clay/40 focus:ring-1 focus:ring-clay/40"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => act("dispute", disputeReason ? { reason: disputeReason } : {})}
                  disabled={!!busy}
                  className="flex-1 rounded-sm bg-clay px-4 py-2 text-sm font-medium text-raised hover:bg-clay disabled:opacity-50"
                >
                  {busy === "dispute" ? "Sender…" : "Send tvist"}
                </button>
                <button onClick={() => setShowDispute(false)} className="rounded-sm border border-line-2 px-4 py-2 text-sm font-medium text-ink-2 hover:border-ink">
                  Avbryt
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => act("confirm")}
                disabled={!!busy}
                className="flex-1 rounded-sm bg-olive px-4 py-2 text-sm font-medium text-raised hover:bg-olive disabled:opacity-50"
              >
                {busy === "confirm" ? "Bekrefter…" : "Alt OK ✓"}
              </button>
              <button
                onClick={() => setShowDispute(true)}
                className="flex-1 rounded-sm border border-clay/40 bg-raised px-4 py-2 text-sm font-medium text-clay hover:border-clay/40 hover:bg-clay-soft"
              >
                Meld problem
              </button>
            </div>
          )}
        </div>
      )}

      {role === "buyer" && order.status === "confirmed" && (
        <div className="border-t border-line px-4 py-3">
          <p className="text-xs text-olive font-medium">✓ Du bekreftet mottak, betaling er frigjort til selger</p>
        </div>
      )}

      {role === "buyer" && order.status === "paid_out" && (
        <div className="border-t border-line px-4 py-3">
          <p className="text-xs text-olive font-medium">✓ Ordre fullført</p>
        </div>
      )}

      {role === "buyer" && order.status === "disputed" && (
        <div className="border-t border-line px-4 py-3">
          <p className="text-xs font-medium text-clay">⚠ Tvist åpnet, betaling er satt på vent</p>
          <p className="mt-1 text-xs text-ink-3">Vi behandler saken og tar kontakt. Ingen automatisk refusjon skjer.</p>
        </div>
      )}
    </div>
  );
}

export default function OrdersPage() {
  const supabase = useMemo(() => createClient(), []);
  const toast = useToast();
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [tab, setTab] = useState<"buyer" | "seller">("buyer");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, [supabase]);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from("orders")
      .select("*, item:item_id(id, title, image_urls, package_size)")
      .neq("status", "pending")
      .neq("status", "cancelled")
      .order("created_at", { ascending: false })
      .then(({ data }) => setOrders((data ?? []) as Order[]));
  }, [userId, supabase]);

  async function handleAction(orderId: string, action: string, extra: Record<string, string> = {}) {
    const res = await fetch(`/api/orders/${orderId}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(extra),
    });
    const json = await res.json() as { error?: string };
    if (!res.ok) throw new Error(json.error ?? "Ukjent feil");

    // Re-fetch orders to update status
    const { data } = await supabase
      .from("orders")
      .select("*, item:item_id(id, title, image_urls, package_size)")
      .neq("status", "pending")
      .neq("status", "cancelled")
      .order("created_at", { ascending: false });
    setOrders((data ?? []) as Order[]);

    const messages: Record<string, string> = {
      ship: "Merket som sendt",
      handover: "Overlevering bekreftet, kjøper har 48 timer på å bekrefte",
      deliver: "Merket som levert, kjøper har 48 timer på å bekrefte",
      confirm: "Mottak bekreftet, betaling frigjøres til selger",
      dispute: "Problem meldt, betaling satt på vent",
    };
    toast(messages[action] ?? "Oppdatert");
  }

  if (userId === undefined) return <p className="py-6 text-sm text-ink-3">Laster…</p>;
  if (userId === null) {
    return (
      <section className="space-y-3 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">Mine ordre</h1>
        <p className="text-sm text-ink-2">Logg inn for å se dine ordre.</p>
        <Link href="/logg-inn?next=/ordre" className="inline-block rounded-sm bg-ink px-5 py-3 text-sm font-medium text-paper hover:bg-ink">
          Logg inn
        </Link>
      </section>
    );
  }

  const buyerOrders = (orders ?? []).filter((o) => o.buyer_id === userId);
  const sellerOrders = (orders ?? []).filter((o) => o.seller_id === userId);
  const shown = tab === "buyer" ? buyerOrders : sellerOrders;

  const activeCount = (o: Order[]) =>
    o.filter((x) => !["paid_out", "cancelled", "refunded"].includes(x.status)).length;

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Mine ordre</h1>
        <p className="mt-1 text-sm text-ink-3">Oversikt over kjøp og salg.</p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setTab("buyer")}
          className={`relative rounded-sm border px-4 py-1.5 text-xs font-medium transition ${tab === "buyer" ? "border-olive bg-olive text-raised" : "border-line-2 bg-raised text-ink-2 hover:border-ink"}`}
        >
          Kjøp ({buyerOrders.length})
          {activeCount(buyerOrders) > 0 && tab !== "buyer" && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-sm bg-clay px-1 text-[9px] font-bold text-raised">{activeCount(buyerOrders)}</span>
          )}
        </button>
        <button
          onClick={() => setTab("seller")}
          className={`relative rounded-sm border px-4 py-1.5 text-xs font-medium transition ${tab === "seller" ? "border-olive bg-olive text-raised" : "border-line-2 bg-raised text-ink-2 hover:border-ink"}`}
        >
          Salg ({sellerOrders.length})
          {activeCount(sellerOrders) > 0 && tab !== "seller" && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-sm bg-clay px-1 text-[9px] font-bold text-raised">{activeCount(sellerOrders)}</span>
          )}
        </button>
      </div>

      {orders === null && (
        <div className="space-y-3">
          {[1, 2].map((i) => <div key={i} className="h-28 animate-pulse rounded-sm bg-sunk" />)}
        </div>
      )}

      {orders !== null && shown.length === 0 && (
        <div className="rounded-sm border border-dashed border-line-2 p-10 text-center text-sm text-ink-3">
          <p className="font-medium text-ink-2">{tab === "buyer" ? "Ingen kjøp enda" : "Ingen salg via Aktivbruk enda"}</p>
          {tab === "buyer" && (
            <Link href="/varer" className="mt-4 inline-block rounded-sm bg-ink px-5 py-2.5 text-xs font-medium text-paper hover:bg-ink">
              Utforsk varer
            </Link>
          )}
        </div>
      )}

      {shown.length > 0 && (
        <div className="space-y-3">
          {shown.map((order) => (
            <OrderCard key={order.id} order={order} role={tab} onAction={handleAction} />
          ))}
        </div>
      )}
    </section>
  );
}
