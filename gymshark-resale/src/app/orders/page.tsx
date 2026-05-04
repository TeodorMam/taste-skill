"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { formatPrice } from "@/lib/supabase";
import { useToast } from "@/components/ToastProvider";

type OrderStatus =
  | "pending" | "paid" | "shipped" | "delivered"
  | "confirmed" | "disputed" | "paid_out" | "cancelled" | "refunded";

type Order = {
  id: string;
  status: OrderStatus;
  amount_nok: number;
  platform_fee_nok: number;
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
  item: { id: number; title: string; image_urls: string[] | null } | null;
};

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Venter på betaling",
  paid: "Betalt — ikke sendt enda",
  shipped: "Sendt — under transport",
  delivered: "Mottatt — venter på bekreftelse",
  confirmed: "Bekreftet mottatt",
  disputed: "Tvist åpnet",
  paid_out: "Fullført",
  cancelled: "Avbrutt",
  refunded: "Refundert",
};

const STATUS_COLOR: Record<OrderStatus, string> = {
  pending: "bg-stone-100 text-stone-600",
  paid: "bg-amber-100 text-amber-800",
  shipped: "bg-blue-100 text-blue-800",
  delivered: "bg-indigo-100 text-indigo-800",
  confirmed: "bg-emerald-100 text-emerald-800",
  disputed: "bg-red-100 text-red-700",
  paid_out: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-stone-100 text-stone-500",
  refunded: "bg-stone-100 text-stone-500",
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
  return <span className="text-xs text-stone-500">{left}</span>;
}

function OrderCard({ order, role, onAction }: {
  order: Order;
  role: "buyer" | "seller";
  onAction: (orderId: string, action: string, extra?: Record<string, string>) => Promise<void>;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [trackingInput, setTrackingInput] = useState("");
  const [showTracking, setShowTracking] = useState(false);
  const [showDispute, setShowDispute] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");

  const imgSrc = order.item?.image_urls?.[0] ?? null;

  async function act(action: string, extra?: Record<string, string>) {
    setBusy(action);
    try {
      await onAction(order.id, action, extra);
    } catch {
      toast("Noe gikk galt, prøv igjen");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden">
      <div className="flex gap-3 p-4">
        {imgSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imgSrc} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-2xl">📦</div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-stone-900">
            {order.item ? (
              <Link href={`/item/${order.item.id}`} className="hover:underline">{order.item.title}</Link>
            ) : (
              <span className="text-stone-400">Annonse slettet</span>
            )}
          </p>
          <p className="text-sm text-stone-700">{formatPrice(order.amount_nok)}</p>
          <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_COLOR[order.status]}`}>
            {STATUS_LABEL[order.status]}
          </span>
        </div>
      </div>

      {order.tracking_info && (
        <div className="border-t border-stone-100 px-4 py-2">
          <p className="text-xs text-stone-500">Sporing: <span className="font-medium text-stone-700">{order.tracking_info}</span></p>
        </div>
      )}

      {/* Seller actions */}
      {role === "seller" && order.status === "paid" && (
        <div className="border-t border-stone-100 p-4 space-y-2">
          <p className="text-xs text-stone-600">Send varen til kjøper, deretter marker som sendt.</p>
          {showTracking ? (
            <div className="space-y-2">
              <input
                type="text"
                value={trackingInput}
                onChange={(e) => setTrackingInput(e.target.value)}
                placeholder="Sporingsnummer / fraktinfo (valgfritt)"
                className="block w-full rounded-full border border-stone-300 bg-white px-4 py-2 text-sm outline-none focus:border-[#5a6b32] focus:ring-1 focus:ring-[#5a6b32]/30"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => act("ship", trackingInput ? { tracking_info: trackingInput } : {})}
                  disabled={!!busy}
                  className="flex-1 rounded-full bg-[#5a6b32] px-4 py-2 text-sm font-medium text-white hover:bg-[#435022] disabled:opacity-50"
                >
                  {busy === "ship" ? "Lagrer…" : "Marker som sendt"}
                </button>
                <button onClick={() => setShowTracking(false)} className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-600 hover:border-stone-500">
                  Avbryt
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowTracking(true)}
              className="w-full rounded-full bg-[#5a6b32] px-4 py-2 text-sm font-medium text-white hover:bg-[#435022]"
            >
              Marker som sendt →
            </button>
          )}
        </div>
      )}

      {role === "seller" && order.status === "shipped" && (
        <div className="border-t border-stone-100 px-4 py-3">
          <p className="text-xs text-stone-500">Varen er sendt — venter på at kjøper bekrefter mottak.</p>
        </div>
      )}

      {role === "seller" && order.status === "delivered" && (
        <div className="border-t border-stone-100 px-4 py-3">
          <p className="text-xs text-stone-500">
            Kjøper har mottatt varen og har {order.review_deadline && <><Countdown deadline={order.review_deadline} /></>} på å bekrefte. Betaling frigjøres automatisk etter fristen.
          </p>
        </div>
      )}

      {role === "seller" && order.status === "confirmed" && (
        <div className="border-t border-stone-100 px-4 py-3">
          <p className="text-xs text-emerald-700 font-medium">✓ Kjøper bekreftet — betaling overføres til deg</p>
        </div>
      )}

      {role === "seller" && order.status === "paid_out" && (
        <div className="border-t border-stone-100 px-4 py-3">
          <p className="text-xs text-emerald-700 font-medium">✓ Utbetalt {order.payout_amount_nok ? formatPrice(order.payout_amount_nok) : ""}</p>
          <a href="https://dashboard.stripe.com/express" target="_blank" rel="noopener noreferrer" className="mt-1 block text-xs font-medium text-[#5a6b32] underline underline-offset-2 hover:text-[#435022]">
            Åpne Stripe-dashboard ↗
          </a>
        </div>
      )}

      {role === "seller" && order.status === "disputed" && (
        <div className="border-t border-stone-100 px-4 py-3">
          <p className="text-xs font-medium text-red-700">⚠ Kjøper har meldt problem — betaling er satt på vent</p>
          <p className="mt-1 text-xs text-stone-500">Aktivbruk behandler saken. Ingen automatisk refusjon skjer.</p>
        </div>
      )}

      {/* Buyer actions */}
      {role === "buyer" && order.status === "paid" && (
        <div className="border-t border-stone-100 px-4 py-3">
          <p className="text-xs text-stone-500">Betalt og bekreftet — venter på at selger sender varen.</p>
        </div>
      )}

      {role === "buyer" && order.status === "shipped" && (
        <div className="border-t border-stone-100 p-4 space-y-2">
          <p className="text-xs text-stone-600">Har du mottatt pakken?</p>
          <button
            onClick={() => act("deliver")}
            disabled={!!busy}
            className="w-full rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-50"
          >
            {busy === "deliver" ? "Lagrer…" : "Jeg har mottatt varen →"}
          </button>
        </div>
      )}

      {role === "buyer" && order.status === "delivered" && (
        <div className="border-t border-stone-100 p-4 space-y-3">
          {order.review_deadline && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-stone-600">Bekreft mottak eller meld problem</p>
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
                className="block w-full resize-none rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-400 focus:ring-1 focus:ring-red-300"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => act("dispute", disputeReason ? { reason: disputeReason } : {})}
                  disabled={!!busy}
                  className="flex-1 rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {busy === "dispute" ? "Sender…" : "Send tvist"}
                </button>
                <button onClick={() => setShowDispute(false)} className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-600 hover:border-stone-500">
                  Avbryt
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => act("confirm")}
                disabled={!!busy}
                className="flex-1 rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {busy === "confirm" ? "Bekrefter…" : "Alt OK ✓"}
              </button>
              <button
                onClick={() => setShowDispute(true)}
                className="flex-1 rounded-full border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:border-red-400 hover:bg-red-50"
              >
                Meld problem
              </button>
            </div>
          )}
        </div>
      )}

      {role === "buyer" && order.status === "confirmed" && (
        <div className="border-t border-stone-100 px-4 py-3">
          <p className="text-xs text-emerald-700 font-medium">✓ Du bekreftet mottak — betaling er frigjort til selger</p>
        </div>
      )}

      {role === "buyer" && order.status === "paid_out" && (
        <div className="border-t border-stone-100 px-4 py-3">
          <p className="text-xs text-emerald-700 font-medium">✓ Ordre fullført</p>
        </div>
      )}

      {role === "buyer" && order.status === "disputed" && (
        <div className="border-t border-stone-100 px-4 py-3">
          <p className="text-xs font-medium text-red-700">⚠ Tvist åpnet — betaling er satt på vent</p>
          <p className="mt-1 text-xs text-stone-500">Vi behandler saken og tar kontakt. Ingen automatisk refusjon skjer.</p>
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
      .select("*, item:item_id(id, title, image_urls)")
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
      .select("*, item:item_id(id, title, image_urls)")
      .neq("status", "pending")
      .neq("status", "cancelled")
      .order("created_at", { ascending: false });
    setOrders((data ?? []) as Order[]);

    const messages: Record<string, string> = {
      ship: "Merket som sendt",
      deliver: "Merket som levert — kjøper har 48 timer på å bekrefte",
      confirm: "Mottak bekreftet — betaling frigjøres til selger",
      dispute: "Problem meldt — betaling satt på vent",
    };
    toast(messages[action] ?? "Oppdatert");
  }

  if (userId === undefined) return <p className="py-6 text-sm text-stone-500">Laster…</p>;
  if (userId === null) {
    return (
      <section className="space-y-3 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">Mine ordre</h1>
        <p className="text-sm text-stone-600">Logg inn for å se dine ordre.</p>
        <Link href="/login?next=/orders" className="inline-block rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-stone-50 hover:bg-black">
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
        <p className="mt-1 text-sm text-stone-500">Oversikt over kjøp og salg.</p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setTab("buyer")}
          className={`relative rounded-full border px-4 py-1.5 text-xs font-medium transition ${tab === "buyer" ? "border-[#5a6b32] bg-[#5a6b32] text-white" : "border-stone-300 bg-white text-stone-700 hover:border-stone-500"}`}
        >
          Kjøp ({buyerOrders.length})
          {activeCount(buyerOrders) > 0 && tab !== "buyer" && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">{activeCount(buyerOrders)}</span>
          )}
        </button>
        <button
          onClick={() => setTab("seller")}
          className={`relative rounded-full border px-4 py-1.5 text-xs font-medium transition ${tab === "seller" ? "border-[#5a6b32] bg-[#5a6b32] text-white" : "border-stone-300 bg-white text-stone-700 hover:border-stone-500"}`}
        >
          Salg ({sellerOrders.length})
          {activeCount(sellerOrders) > 0 && tab !== "seller" && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">{activeCount(sellerOrders)}</span>
          )}
        </button>
      </div>

      {orders === null && (
        <div className="space-y-3">
          {[1, 2].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-stone-100" />)}
        </div>
      )}

      {orders !== null && shown.length === 0 && (
        <div className="rounded-2xl border border-dashed border-stone-300 p-10 text-center text-sm text-stone-500">
          <p className="font-medium text-stone-700">{tab === "buyer" ? "Ingen kjøp enda" : "Ingen salg via Aktivbruk enda"}</p>
          {tab === "buyer" && (
            <Link href="/browse" className="mt-4 inline-block rounded-full bg-stone-900 px-5 py-2.5 text-xs font-medium text-stone-50 hover:bg-black">
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
