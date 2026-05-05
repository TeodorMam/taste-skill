"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  type Item,
  type Offer,
  type Profile,
  formatPrice,
  itemImages,
  profileDisplayName,
} from "@/lib/supabase";
import { getPackageOption } from "@/lib/shipping";
import { ReportButton } from "@/components/ReportButton";
import { Avatar } from "@/components/Avatar";
import { createClient } from "@/utils/supabase/client";
import { ItemCard } from "@/components/ItemCard";
import { Carousel } from "@/components/Carousel";
import { ShareButton } from "@/components/ShareButton";
import { SellerRating } from "@/components/SellerRating";
import { ReviewForm } from "@/components/ReviewForm";
import { FavoriteButton } from "@/components/FavoriteButton";
import { ItemLikes } from "@/components/ItemLikes";
import { FirstListingSuccess } from "@/components/FirstListingSuccess";
import { useToast } from "@/components/ToastProvider";
import { BidModal } from "@/components/BidModal";


function fmtLastSeen(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days === 0) return "Aktiv i dag";
  if (days === 1) return "Aktiv i går";
  if (days < 30) return `Aktiv for ${days} dager siden`;
  return null;
}

function fmtLastEdited(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (d.getFullYear() === now.getFullYear()) {
    return d.toLocaleDateString("no-NO", { day: "numeric", month: "long" });
  }
  return d.toLocaleDateString("no-NO", { day: "numeric", month: "long", year: "numeric" });
}

export default function ItemPageClient() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const supabase = useMemo(() => createClient(), []);
  const [item, setItem] = useState<Item | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [userId, setUserId] = useState<string | null | undefined>(undefined);

  const [buyerThreads, setBuyerThreads] = useState<string[]>([]);
  const [buyerProfiles, setBuyerProfiles] = useState<Record<string, Profile>>({});
  const [showSoldPicker, setShowSoldPicker] = useState(false);
  const [soldToBuyer, setSoldToBuyer] = useState<string | null>(null);
  const [hasChatted, setHasChatted] = useState(false);
  const [myOffer, setMyOffer] = useState<Offer | null | undefined>(undefined);
  const [showBidModal, setShowBidModal] = useState(false);
  const [submittingOffer, setSubmittingOffer] = useState(false);

  const [similar, setSimilar] = useState<Item[]>([]);
  const [similarSellers, setSimilarSellers] = useState<Record<string, Profile>>({});
  const [seller, setSeller] = useState<Profile | null>(null);
  const [sellerChargesEnabled, setSellerChargesEnabled] = useState(false);
  const [shareUrl, setShareUrl] = useState<string>("");
  const [buyingNow, setBuyingNow] = useState(false);
  const [payingOffer, setPayingOffer] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"success" | "cancelled" | null>(null);
  const [deliveryMethod, setDeliveryMethod] = useState<"shipping" | "meetup" | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setShareUrl(window.location.href);
      const sp = new URLSearchParams(window.location.search);
      if (sp.get("payment") === "success") setPaymentStatus("success");
      else if (sp.get("payment") === "cancelled") setPaymentStatus("cancelled");
    }
  }, [params.id]);

  useEffect(() => {
    if (!params.id) return;
    supabase.from("items").select("*").eq("id", params.id).single()
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setItem(data as Item);
      });
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, [params.id, supabase]);

  const isSeller = !!item && !!userId && userId === item.seller_id;

  useEffect(() => {
    if (!item || !isSeller) return;
    (async () => {
      const { data: msgData } = await supabase
        .from("messages").select("buyer_id").eq("item_id", item.id);
      const allBuyers = [...new Set((msgData ?? []).map((r) => (r as { buyer_id: string }).buyer_id))];
      setBuyerThreads(allBuyers);
      if (allBuyers.length === 0) return;
      const { data: pData } = await supabase.from("profiles").select("*").in("user_id", allBuyers);
      const map: Record<string, Profile> = {};
      for (const p of (pData ?? []) as Profile[]) map[p.user_id] = p;
      setBuyerProfiles(map);
    })();
  }, [item, isSeller, supabase]);

  useEffect(() => {
    if (!item?.seller_id) { setSeller(null); return; }
    supabase.from("profiles").select("*").eq("user_id", item.seller_id).maybeSingle()
      .then(({ data }) => {
        const p = (data ?? null) as Profile | null;
        setSeller(p);
        setSellerChargesEnabled(p?.stripe_charges_enabled ?? false);
      });
  }, [item?.seller_id, supabase]);

  useEffect(() => {
    if (!item || (!item.brand && !item.category)) return;
    (async () => {
      const base = supabase.from("items").select("*").neq("id", item.id).eq("is_sold", false);
      let rows: Item[] = [];
      if (item.brand) {
        const { data } = await base.eq("brand", item.brand).limit(12);
        rows = (data ?? []) as Item[];
      }
      if (rows.length < 3 && item.category) {
        const seen = new Set(rows.map((r) => r.id));
        const { data } = await base.eq("category", item.category).limit(12);
        rows = [...rows, ...((data ?? []) as Item[]).filter((r) => !seen.has(r.id))];
      }
      const slice = rows.slice(0, 6);
      setSimilar(slice);
      const ids = Array.from(new Set(slice.map((r) => r.seller_id).filter((x): x is string => !!x)));
      if (ids.length === 0) return;
      const { data: pData } = await supabase.from("profiles").select("*").in("user_id", ids);
      const map: Record<string, Profile> = {};
      for (const p of (pData ?? []) as Profile[]) map[p.user_id] = p;
      setSimilarSellers(map);
    })();
  }, [item, supabase]);

  useEffect(() => {
    if (!item || !userId || isSeller) return;
    supabase.from("messages").select("id").eq("item_id", item.id).eq("buyer_id", userId).limit(1)
      .then(({ data }) => setHasChatted((data ?? []).length > 0));
  }, [item, userId, isSeller, supabase]);

  useEffect(() => {
    if (!item || !userId || isSeller) return;
    supabase.from("offers").select("*").eq("item_id", item.id).eq("buyer_id", userId)
      .order("created_at", { ascending: false }).limit(1).maybeSingle()
      .then(({ data }) => setMyOffer((data as Offer | null) ?? null));
  }, [item, userId, isSeller, supabase]);


  useEffect(() => {
    if (!item?.id || !item.is_sold) return;
    const stored = localStorage.getItem(`soldToBuyer:${item.id}`);
    if (stored) setSoldToBuyer(stored);
  }, [item?.id, item?.is_sold]);

  async function markSold(buyerId: string | null) {
    if (!item) return;
    setSaving(true);
    const update: Record<string, unknown> = { is_sold: true };
    if (buyerId) update.sold_to_buyer_id = buyerId;
    const { data, error } = await supabase.from("items").update(update).eq("id", item.id).select("*").single();
    setSaving(false);
    if (error) { setError(error.message); return; }
    if (data) setItem(data as Item);
    setShowSoldPicker(false);
    toast("Annonsen er markert som solgt");
    if (buyerId) { setSoldToBuyer(buyerId); localStorage.setItem(`soldToBuyer:${item.id}`, buyerId); }
  }

  async function toggleSold() {
    if (!item) return;
    setSaving(true);
    const { data, error } = await supabase.from("items").update({ is_sold: !item.is_sold }).eq("id", item.id).select("*").single();
    setSaving(false);
    if (error) setError(error.message);
    else if (data) setItem(data as Item);
  }

  async function onDelete() {
    if (!item) return;
    if (!window.confirm("Er du sikker på at du vil slette denne annonsen? Dette kan ikke angres.")) return;
    setDeleting(true);
    const { error } = await supabase.from("items").delete().eq("id", item.id);
    if (error) { setDeleting(false); setError(error.message); return; }
    router.push("/mine");
  }

  async function submitOffer(amount: number) {
    if (!item || !userId || amount <= 0) return;
    setSubmittingOffer(true);
    const { data, error: oErr } = await supabase.from("offers").insert({ item_id: item.id, buyer_id: userId, amount }).select("*").single();
    if (!oErr && data) {
      const offer = data as Offer;
      setMyOffer(offer);
      await supabase.from("messages").insert({
        item_id: item.id,
        buyer_id: userId,
        sender_id: userId,
        body: "",
        message_type: "bid",
        metadata: { offer_id: offer.id, amount },
      }).then(() => null);
      void supabase.rpc("notify_seller_of_offer", { p_item_id: String(item.id), p_amount: amount }).then(() => null);
      toast("💸 Bud sendt");
      setShowBidModal(false);
      router.push(`/chat/${item.id}/${userId}`);
    } else if (oErr) { toast(`Feil: ${oErr.message}`); }
    setSubmittingOffer(false);
  }

  async function handleCheckout(offerId?: string) {
    const setter = offerId ? setPayingOffer : setBuyingNow;
    setter(true);
    const dm = item?.shipping === "Kun henting" ? "meetup"
      : item?.shipping === "Kan sendes" ? "shipping"
      : deliveryMethod ?? "shipping";
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: String(item!.id), delivery_method: dm, ...(offerId ? { offer_id: offerId } : {}) }),
      });
      const json = await res.json() as { url?: string; error?: string };
      if (json.url) {
        window.location.href = json.url;
      } else {
        toast(json.error ?? "Noe gikk galt");
        if (json.error?.includes("leveringsinformasjon")) {
          setTimeout(() => router.push("/profil"), 1200);
        }
        setter(false);
      }
    } catch {
      toast("Noe gikk galt, prøv igjen");
      setter(false);
    }
  }

  async function withdrawOffer() {
    if (!myOffer) return;
    await supabase.from("offers").delete().eq("id", myOffer.id);
    setMyOffer(null);
  }


if (error) return <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>;
  if (!item) return <p className="text-sm text-stone-500">Laster…</p>;

  return (
    <article className="space-y-8">
      <FirstListingSuccess itemId={item.id} itemTitle={item.title} shareUrl={shareUrl} isSeller={isSeller} />

      {paymentStatus === "success" && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="font-semibold text-emerald-800">✓ Betaling gjennomført!</p>
          <p className="mt-1 text-sm text-emerald-700">Du vil motta en bekreftelse på e-post. Kontakt selger i chatten for å avtale levering.</p>
        </div>
      )}
      {paymentStatus === "cancelled" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Betalingen ble avbrutt — varen er fortsatt tilgjengelig.
        </div>
      )}

      <Link href="/browse" className="text-sm text-stone-500 hover:text-black">← Tilbake</Link>

      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
        <div className="relative">
          <Carousel images={itemImages(item)} alt={item.title} />
          {item.brand && (
            <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-[#5a6b32] backdrop-blur">{item.brand}</div>
          )}
          {item.is_sold && (
            <div className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-stone-900 px-3 py-1 text-xs font-medium text-stone-50">Solgt</div>
          )}
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight">{item.title}</h1>
              <ItemLikes itemId={item.id} />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {!isSeller && <FavoriteButton itemId={item.id} currentPrice={item.price} sellerId={item.seller_id} itemTitle={item.title} variant="inline" />}
                {shareUrl && <ShareButton url={shareUrl} title={item.title} />}
                {isSeller && (
                  <Link href={`/item/${item.id}/edit`} className="inline-flex items-center gap-1.5 rounded-full border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:border-stone-500">
                    ✎ Rediger
                  </Link>
                )}
              </div>
            </div>
            <p className="text-2xl font-semibold">{formatPrice(item.price)}</p>
          </div>

          {item.description && (
            <p className="whitespace-pre-line text-sm leading-relaxed text-stone-700">{item.description}</p>
          )}

          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            {item.brand && (<><dt className="text-stone-500">Merke</dt><dd className="text-right font-medium">{item.brand}</dd></>)}
            {item.category && (<><dt className="text-stone-500">Kategori</dt><dd className="text-right">{item.category}</dd></>)}
            <dt className="text-stone-500">Størrelse</dt><dd className="text-right">{item.size}</dd>
            <dt className="text-stone-500">Tilstand</dt><dd className="text-right">{item.condition}</dd>
            <dt className="text-stone-500">Sted</dt><dd className="text-right">{item.location}</dd>
            {item.shipping && (<><dt className="text-stone-500">Frakt</dt><dd className="text-right font-medium">{item.shipping}</dd></>)}
          </dl>

          <p className="text-xs text-stone-400">
            Sist endret {fmtLastEdited(item.updated_at || item.created_at)}
          </p>

          {item.seller_id && !isSeller && (
            <div className="space-y-2">
            <Link href={`/seller/${item.seller_id}`} className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-3 transition hover:border-stone-400">
              <Avatar profile={seller} size="md" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{profileDisplayName(seller, item.seller_id)}</p>
                <p className="text-xs text-stone-500">
                  {fmtLastSeen(seller?.last_seen_at) ?? "Se profil og flere annonser →"}
                </p>
              </div>
              <SellerRating sellerId={item.seller_id} size="md" />
            </Link>
            <div className="flex gap-3 px-1">
              <ReportButton type="listing" targetId={String(item.id)} />
              <ReportButton type="user" targetId={item.seller_id} />
            </div>
            </div>
          )}

          {/* Kjøp nå — hidden when buyer already has an accepted bid (use Betal nå instead) */}
          {userId && !isSeller && !item.is_sold && sellerChargesEnabled && myOffer?.status !== "accepted" && (() => {
            const pkg = getPackageOption(item.package_size);
            const canShip = item.shipping !== "Kun henting" && !!pkg;
            const canMeet = item.shipping !== "Kan sendes";
            const showToggle = canShip && canMeet;
            const effectiveDm = item.shipping === "Kun henting" ? "meetup"
              : item.shipping === "Kan sendes" ? "shipping"
              : deliveryMethod;
            const shippingCost = effectiveDm === "shipping" && pkg ? pkg.price : 0;
            const totalPrice = item.price + shippingCost;
            const canCheckout = item.shipping !== "Begge" || deliveryMethod !== null;

            return (
              <div className="space-y-3">
                {showToggle && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setDeliveryMethod("shipping")}
                      className={`flex flex-col items-center gap-1 rounded-xl border py-3 transition ${deliveryMethod === "shipping" ? "border-[#5a6b32] bg-[#5a6b32]/5 ring-1 ring-[#5a6b32]" : "border-stone-200 hover:border-stone-400"}`}
                    >
                      <span className="text-xl">📦</span>
                      <span className="text-sm font-medium">Frakt</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeliveryMethod("meetup")}
                      className={`flex flex-col items-center gap-1 rounded-xl border py-3 transition ${deliveryMethod === "meetup" ? "border-[#5a6b32] bg-[#5a6b32]/5 ring-1 ring-[#5a6b32]" : "border-stone-200 hover:border-stone-400"}`}
                    >
                      <span className="text-xl">🤝</span>
                      <span className="text-sm font-medium">Møt selger</span>
                    </button>
                  </div>
                )}

                {(effectiveDm === "shipping" || (!showToggle && canShip)) && pkg && (
                  <div className="flex items-center justify-between rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm">
                    <div>
                      <p className="font-medium text-stone-800">📦 Frakt via Posten</p>
                      <p className="text-xs text-stone-500">{pkg.label} · opp til {pkg.maxWeight}</p>
                      <p className="mt-1 text-[11px] text-stone-400">Selger dropper pakken på nærmeste Posten-punkt etter betaling.</p>
                    </div>
                    <p className="ml-3 shrink-0 font-semibold text-stone-800">+{pkg.price} kr</p>
                  </div>
                )}

                {(effectiveDm === "meetup" || item.shipping === "Kun henting") && (
                  <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm">
                    <p className="font-medium text-stone-800">🤝 Møt selger</p>
                    <p className="mt-0.5 text-xs text-stone-500">Avtal tid og sted i chatten etter betaling. Pengene holdes trygt hos Aktivbruk til handelen er fullført.</p>
                  </div>
                )}

                {!canCheckout && (
                  <p className="text-center text-xs text-stone-400">Velg leveringsmetode for å fortsette</p>
                )}

                {canCheckout && (
                  <div className="space-y-1">
                    <button
                      onClick={() => handleCheckout()}
                      disabled={buyingNow}
                      className="w-full rounded-full bg-[#5a6b32] px-5 py-3 text-sm font-medium text-white hover:bg-[#435022] disabled:opacity-50"
                    >
                      {buyingNow ? "Sender til betaling…" : `Kjøp nå — ${formatPrice(totalPrice)}`}
                    </button>
                    <p className="text-center text-[11px] text-stone-400">
                      {shippingCost > 0 ? `${formatPrice(item.price)} vare + ${formatPrice(shippingCost)} frakt · ` : ""}Sikker betaling via Stripe · <Link href="/kjoperbeskyttelse" className="underline underline-offset-2 hover:text-stone-600">Kjøperbeskyttelse</Link>
                    </p>
                  </div>
                )}
              </div>
            );
          })()}

          {userId === null && (
            <Link href={`/login?next=/item/${item.id}`} className="block w-full rounded-full bg-stone-900 px-5 py-3 text-center text-sm font-medium text-stone-50 hover:bg-black">
              Logg inn for å chatte med selger
            </Link>
          )}

          {userId && !item.seller_id && (
            <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">Denne annonsen ble lagt ut før brukerkontoer, så chat er ikke tilgjengelig. Bruk kontaktinfo nedenfor i stedet.</p>
          )}

          {userId && item.seller_id && !isSeller && !item.is_sold && myOffer !== undefined && (
            <>
              {myOffer === null ? (
                <button
                  onClick={() => setShowBidModal(true)}
                  className="w-full rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-stone-50 hover:bg-black"
                >
                  💸 Gi bud
                </button>
              ) : myOffer.status === "pending" ? (
                <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-stone-600">Ditt bud</p>
                      <p className="text-sm font-semibold">{formatPrice(myOffer.amount)}</p>
                      <p className="text-[11px] text-stone-400">Venter på svar fra selger</p>
                    </div>
                    <button onClick={withdrawOffer} className="text-xs text-stone-400 hover:text-red-600 underline underline-offset-2">Trekk tilbake</button>
                  </div>
                </div>
              ) : myOffer.status === "accepted" ? (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-700">
                    <span className="text-lg">✓</span>
                    <div>
                      <p className="text-sm font-semibold">Bud godtatt!</p>
                      <p className="text-xs text-emerald-600">Selger godtok {formatPrice(myOffer.amount)}</p>
                    </div>
                  </div>
                  {sellerChargesEnabled && (() => {
                    const pkg = getPackageOption(item.package_size);
                    const effectiveDm = item.shipping === "Kun henting" ? "meetup"
                      : item.shipping === "Kan sendes" ? "shipping"
                      : deliveryMethod;
                    const shippingCost = effectiveDm === "shipping" && pkg ? pkg.price : 0;
                    return (
                      <button
                        onClick={() => handleCheckout(myOffer.id)}
                        disabled={payingOffer}
                        className="w-full rounded-full bg-[#5a6b32] px-5 py-3 text-sm font-medium text-white hover:bg-[#435022] disabled:opacity-50"
                      >
                        {payingOffer ? "Sender til betaling…" : `Betal nå — ${formatPrice(myOffer.amount + shippingCost)}`}
                      </button>
                    );
                  })()}
                  <p className="text-center text-[11px] text-stone-400">Sikker betaling via Stripe · 7% plattformavgift inkludert</p>
                </div>
              ) : (
                <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
                  <p className="text-sm text-stone-600">Budet på {formatPrice(myOffer.amount)} ble avslått.</p>
                  <button onClick={() => { setMyOffer(null); setShowBidModal(true); }} className="mt-1 text-xs font-medium text-[#5a6b32] underline underline-offset-2">Gi nytt bud</button>
                </div>
              )}
            </>
          )}

          {userId && item.seller_id && !isSeller && (
            <Link
              href={`/chat/${item.id}/${userId}`}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-medium text-stone-800 hover:border-stone-500 hover:bg-stone-50"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z" />
              </svg>
              Skriv til selger
            </Link>
          )}

          {isSeller && item.seller_id && (
            <div className="space-y-3">
              {!item.is_sold && (
                showSoldPicker ? (
                  <div className="space-y-2 rounded-xl border border-stone-200 bg-stone-50 p-3">
                    <p className="text-xs font-medium text-stone-700">Hva skjedde?</p>
                    {buyerThreads.map((b) => (
                      <button key={b} onClick={() => markSold(b)} disabled={saving} className="w-full rounded-full border border-stone-300 bg-white px-4 py-2 text-left text-sm font-medium text-stone-800 hover:border-[#5a6b32] hover:bg-[#5a6b32]/5 disabled:opacity-50">
                        Solgt til {profileDisplayName(buyerProfiles[b], b)}
                      </button>
                    ))}
                    <button onClick={() => markSold(null)} disabled={saving} className="w-full rounded-full border border-stone-300 bg-white px-4 py-2 text-left text-sm font-medium text-stone-600 hover:border-stone-500 disabled:opacity-50">Jeg solgte et annet sted</button>
                    <button onClick={() => markSold(null)} disabled={saving} className="w-full rounded-full border border-stone-300 bg-white px-4 py-2 text-left text-sm font-medium text-stone-600 hover:border-stone-500 disabled:opacity-50">Jeg bestemte meg for å ikke selge</button>
                    <button onClick={() => setShowSoldPicker(false)} className="w-full pt-1 text-center text-xs text-stone-400 hover:text-stone-600">Avbryt</button>
                  </div>
                ) : (
                  <button onClick={() => setShowSoldPicker(true)} disabled={saving} className="w-full rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-stone-50 hover:bg-black disabled:opacity-50">{saving ? "Lagrer…" : "Marker som solgt"}</button>
                )
              )}
              {item.is_sold && soldToBuyer && userId && (
                <div className="space-y-2 border-t border-stone-100 pt-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-stone-500">Vurder kjøperen</p>
                  <p className="text-xs font-medium text-stone-700">{profileDisplayName(buyerProfiles[soldToBuyer], soldToBuyer)}</p>
                  <ReviewForm itemId={item.id} reviewerId={userId} sellerId={soldToBuyer} label="Hvordan var kjøperen?" />
                </div>
              )}
            </div>
          )}

          {item.is_sold && userId && !isSeller && hasChatted && item.seller_id && (
            <ReviewForm itemId={item.id} reviewerId={userId} sellerId={item.seller_id} />
          )}

          {item.contact && (
            <details className="rounded-lg border border-stone-200 bg-stone-50 p-3 text-sm">
              <summary className="cursor-pointer text-stone-600">Kontakt utenfor Aktivbruk (eldre annonse)</summary>
              <p className="mt-2 break-all font-medium">{item.contact}</p>
            </details>
          )}

          {isSeller && (
            <div className="space-y-2">
              {item.is_sold && (
                <button onClick={toggleSold} disabled={saving || deleting} className="w-full rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-medium hover:border-stone-500 disabled:opacity-50">{saving ? "Lagrer…" : "Marker som tilgjengelig"}</button>
              )}
              <button onClick={onDelete} disabled={saving || deleting} className="w-full rounded-full border border-red-200 bg-white px-5 py-3 text-sm font-medium text-red-700 hover:border-red-400 hover:bg-red-50 disabled:opacity-50">{deleting ? "Sletter…" : "Slett annonsen"}</button>
            </div>
          )}
        </div>
      </div>

      {showBidModal && item && userId && (
        <BidModal
          item={item}
          onClose={() => setShowBidModal(false)}
          onSubmit={submitOffer}
          submitting={submittingOffer}
        />
      )}

      {similar.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-end justify-between">
            <h2 className="text-lg font-semibold tracking-tight">Lignende annonser</h2>
            {(item.brand || item.category) && (
              <Link href={item.brand ? `/browse?brand=${encodeURIComponent(item.brand)}` : `/browse?sub=${encodeURIComponent(item.category!)}`} className="text-xs font-medium text-[#5a6b32] hover:text-[#435022]">Se alle →</Link>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {similar.map((s) => <ItemCard key={s.id} item={s} seller={s.seller_id ? similarSellers[s.seller_id] : null} />)}
          </div>
        </section>
      )}
    </article>
  );
}
