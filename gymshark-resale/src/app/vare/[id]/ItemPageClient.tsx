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
import { calcBuyerFee } from "@/lib/fees";
import { ReportButton } from "@/components/ReportButton";
import { Avatar } from "@/components/Avatar";
import { createClient } from "@/utils/supabase/client";
import { ItemCard } from "@/components/ItemCard";
import { Carousel } from "@/components/Carousel";
import { ShareButton } from "@/components/ShareButton";
import { SellerRating } from "@/components/SellerRating";
import { ReviewForm } from "@/components/ReviewForm";
import { FavoriteButton } from "@/components/FavoriteButton";
import { brandPageFor } from "@/lib/brand-pages";
import { ItemLikes } from "@/components/ItemLikes";
import { FirstListingSuccess } from "@/components/FirstListingSuccess";
import { useToast } from "@/components/ToastProvider";
import { BidModal } from "@/components/BidModal";
import { Icon } from "@/components/Icon";
import { Sep } from "@/components/Sep";
import { BackLink } from "@/components/BackLink";


function fmtLastSeen(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days === 0) return "Aktiv i dag";
  if (days === 1) return "Aktiv i går";
  if (days < 30) return `Aktiv for ${days} dager siden`;
  return null;
}

// Delivery choice for "Begge" listings: radio rows split by hairlines. The
// chosen row gets the ink fill, like every other "what have I picked" state.
function DeliveryChoice({
  value,
  onChange,
  shippingLabel,
}: {
  value: "shipping" | "meetup" | null;
  onChange: (v: "shipping" | "meetup") => void;
  shippingLabel: string;
}) {
  const rows = [
    { key: "shipping" as const, icon: "pakke" as const, label: shippingLabel },
    { key: "meetup" as const, icon: "moetes" as const, label: "Møt selger" },
  ];
  return (
    <div role="radiogroup" className="border-t border-line">
      {rows.map((r) => {
        const on = value === r.key;
        return (
          <button
            key={r.key}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(r.key)}
            className="flex min-h-[52px] w-full items-center gap-3 border-b border-line text-left text-[15px] font-medium"
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-circle shadow-[inset_0_0_0_1.5px_#1C1E18]">
              {on && <span className="h-2.5 w-2.5 rounded-circle bg-ink" />}
            </span>
            <Icon name={r.icon} size={18} className="text-ink-2" />
            <span className={on ? "font-[650]" : ""}>{r.label}</span>
          </button>
        );
      })}
    </div>
  );
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
    supabase.from("items").select("*").eq("id", params.id).maybeSingle()
      .then(({ data, error }) => {
        // The server component already 404s missing items, so a null row
        // here only happens in rare race conditions (deleted between the
        // server render and this hydration). Show a friendly line instead
        // of the raw Supabase error string.
        if (error) setError("Kunne ikke laste varen. Prøv å oppdatere siden.");
        else if (!data) setError("Denne varen finnes ikke lenger.");
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
      const { data: pData } = await supabase.from("profiles_public").select("*").in("user_id", allBuyers);
      const map: Record<string, Profile> = {};
      for (const p of (pData ?? []) as Profile[]) map[p.user_id] = p;
      setBuyerProfiles(map);
    })();
  }, [item, isSeller, supabase]);

  useEffect(() => {
    if (!item?.seller_id) { setSeller(null); return; }
    supabase.from("profiles_public").select("*").eq("user_id", item.seller_id).maybeSingle()
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
      const { data: pData } = await supabase.from("profiles_public").select("*").in("user_id", ids);
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
    // Server side, so the photos go with the row. A plain delete from here
    // removed the listing and left every image in the bucket, still public.
    const res = await fetch(`/api/items/${item.id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setDeleting(false);
      setError(body.error ?? "Klarte ikke slette annonsen");
      return;
    }
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
      toast("Bud sendt");
      setShowBidModal(false);
      router.push(`/meldinger/${item.id}/${userId}`);
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
    if (!myOffer || !item || !userId) return;
    const offerId = myOffer.id;
    await supabase.from("offers").delete().eq("id", offerId);
    await supabase.from("messages").insert({
      item_id: String(item.id),
      buyer_id: myOffer.buyer_id,
      sender_id: userId,
      body: "🚫 Kjøper trakk tilbake budet",
      message_type: "text",
    });
    void notifyOfferCancel(offerId, "buyer", false);
    setMyOffer(null);
  }

  async function cancelAcceptedOffer() {
    if (!myOffer || !item || !userId) return;
    if (!window.confirm("Avbryte det godkjente budet? Selger må godta et nytt bud hvis du ombestemmer deg.")) return;
    const offerId = myOffer.id;
    // Cancel any pending checkout that referenced this offer
    await supabase
      .from("orders")
      .update({ status: "cancelled" })
      .eq("offer_id", offerId)
      .eq("status", "pending");
    await supabase.from("offers").update({ status: "declined" }).eq("id", offerId);
    await supabase.from("messages").insert({
      item_id: String(item.id),
      buyer_id: myOffer.buyer_id,
      sender_id: userId,
      body: "🚫 Kjøper avbrøt det godkjente budet",
      message_type: "text",
    });
    void notifyOfferCancel(offerId, "buyer", true);
    setMyOffer({ ...myOffer, status: "declined" });
    toast("Bud avbrutt");
  }

  async function notifyOfferCancel(offerId: string, cancelledBy: "buyer" | "seller", wasAccepted: boolean) {
    try {
      await fetch("/api/offer-cancel-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offer_id: offerId, cancelled_by: cancelledBy, was_accepted: wasAccepted }),
      });
    } catch (e) {
      console.warn("[notifyOfferCancel]", e);
    }
  }


  if (error) return <p className="rounded-sm bg-clay-soft p-3 text-sm text-clay">{error}</p>;
  if (!item) return <p className="text-sm text-ink-3">Laster…</p>;

  return (
    <article>
      <FirstListingSuccess itemId={item.id} itemTitle={item.title} shareUrl={shareUrl} isSeller={isSeller} />

      {paymentStatus === "success" && (
        <div className="mb-6 flex gap-3 rounded-sm bg-olive-soft p-4 text-olive">
          <Icon name="hake" size={20} className="mt-px" />
          <div>
            <p className="font-semibold">Betaling gjennomført!</p>
            <p className="mt-1 text-sm">Du vil motta en bekreftelse på e-post. Kontakt selger i chatten for å avtale levering.</p>
          </div>
        </div>
      )}
      {paymentStatus === "cancelled" && (
        <div className="mb-6 rounded-sm bg-ochre-soft p-3 text-sm text-ochre">
          Betalingen ble avbrutt, varen er fortsatt tilgjengelig.
        </div>
      )}

      <BackLink href="/varer">Tilbake</BackLink>

      <div className="mt-1 lg:mt-3 lg:grid lg:grid-cols-12 lg:gap-x-6">
        <div className="-mx-4 sm:mx-0 lg:col-span-7">
          <div className="relative">
            <Carousel images={itemImages(item)} alt={item.title} />
            {item.is_sold && (
              <div className="pointer-events-none absolute bottom-3 left-3 flex h-[22px] items-center rounded-sm bg-ink px-[7px] text-xs font-semibold text-paper">Solgt</div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-6 pt-6 lg:col-span-4 lg:col-start-9 lg:pt-4">
          <div>
            <h1 className="text-[28px] leading-[1.05] lg:text-[40px]">{item.title}</h1>
            <p className="price mt-2 text-[34px] leading-none lg:text-[44px]">{formatPrice(item.price)}</p>
            <div className="mt-1.5">
              <ItemLikes itemId={item.id} />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-6">
              {!isSeller && <FavoriteButton itemId={item.id} currentPrice={item.price} sellerId={item.seller_id} itemTitle={item.title} variant="inline" />}
              {shareUrl && <ShareButton url={shareUrl} title={item.title} />}
              {isSeller && (
                <Link href={`/vare/${item.id}/rediger`} className="tbtn">
                  <Icon name="rediger" size={18} />
                  Rediger
                </Link>
              )}
            </div>
          </div>

          {item.description && (
            <p className="whitespace-pre-line text-base leading-[1.55] text-ink-2">{item.description}</p>
          )}

          <div>
            <dl className="grid grid-cols-[auto_1fr] border-t border-ink text-[15px] leading-[1.35] [&>dd]:border-b [&>dd]:border-line [&>dd]:py-[11px] [&>dd]:text-right [&>dd]:font-[550] [&>dt]:border-b [&>dt]:border-line [&>dt]:py-[11px] [&>dt]:pr-4 [&>dt]:text-ink-3">
              {item.brand && (<><dt>Merke</dt><dd>{brandPageFor(item.brand) ? <Link href={`/brukt/${brandPageFor(item.brand)!.slug}`} className="underline decoration-1 underline-offset-[3px] hover:text-olive">{item.brand}</Link> : item.brand}</dd></>)}
              {item.category && (<><dt>Kategori</dt><dd>{item.category}</dd></>)}
              <dt>Størrelse</dt><dd>{item.size}</dd>
              <dt>Tilstand</dt><dd>{item.condition}</dd>
              {item.gender && (<><dt>Kjønn</dt><dd>{item.gender}</dd></>)}
              <dt>Sted</dt><dd>{item.location}</dd>
              {item.shipping && (<><dt>Frakt</dt><dd>{item.shipping}</dd></>)}
            </dl>
            <p className="mt-3 text-[13px] text-ink-3">
              Sist endret {fmtLastEdited(item.updated_at || item.created_at)}
            </p>
          </div>

          {item.seller_id && !isSeller && (
            <div className="lg:order-last">
            <Link href={`/selger/${item.seller_id}`} className="flex items-center gap-3 border-y border-line py-3.5">
              <Avatar profile={seller} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[17px] font-[620] leading-[1.3]">{profileDisplayName(seller, item.seller_id)}</p>
                <p className="flex items-center gap-1.5 text-[13px] text-ink-3">
                  {fmtLastSeen(seller?.last_seen_at) ?? <>Se profil og flere annonser <Icon name="pil-h" size={14} /></>}
                </p>
              </div>
              <SellerRating sellerId={item.seller_id} size="sm" />
              <Icon name="chevron-h" size={18} className="text-ink-2" />
            </Link>
            <div className="flex gap-5 pt-1">
              <ReportButton type="listing" targetId={String(item.id)} />
              <ReportButton type="user" targetId={item.seller_id} />
            </div>
            </div>
          )}

          {/* Kjøp nå, hidden when buyer already has an accepted bid (use Betal nå instead) */}
          {userId && !isSeller && !item.is_sold && sellerChargesEnabled && myOffer?.status !== "accepted" && (() => {
            const pkg = getPackageOption(item.package_size);
            const canShip = item.shipping !== "Kun henting" && !!pkg;
            const canMeet = item.shipping !== "Kan sendes";
            const showToggle = canShip && canMeet;
            const effectiveDm = item.shipping === "Kun henting" ? "meetup"
              : item.shipping === "Kan sendes" ? "shipping"
              : deliveryMethod;
            const shippingCost = effectiveDm === "shipping" && pkg ? pkg.price : 0;
            const buyerFee = calcBuyerFee(item.price);
            const totalPrice = item.price + shippingCost + buyerFee;
            const canCheckout = item.shipping !== "Begge" || deliveryMethod !== null;

            return (
              <div className="flex flex-col gap-4">
                {showToggle && (
                  <DeliveryChoice value={deliveryMethod} onChange={setDeliveryMethod} shippingLabel="Frakt" />
                )}

                {(effectiveDm === "shipping" || (!showToggle && canShip)) && pkg && (
                  <div className="flex items-start gap-3 border-b border-line pb-4 text-sm">
                    <Icon name="pakke" size={18} className="mt-px text-ink-2" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-[620] text-ink">Frakt via Posten</p>
                      <p className="mt-0.5 text-[13px] text-ink-3">{pkg.label}<Sep />opp til {pkg.maxWeight}</p>
                      <p className="mt-1 text-xs text-ink-3">Selger dropper pakken på nærmeste Posten-punkt etter betaling.</p>
                    </div>
                    <p className="price ml-3 shrink-0 text-[15px] text-ink">+{pkg.price} kr</p>
                  </div>
                )}

                {(effectiveDm === "meetup" || item.shipping === "Kun henting") && (
                  <div className="flex items-start gap-3 border-b border-line pb-4">
                    <Icon name="moetes" size={18} className="mt-px text-ink-2" />
                    <div>
                      <p className="text-[15px] font-[620] text-ink">Møt selger</p>
                      <p className="mt-0.5 text-[13px] text-ink-3">Avtal tid og sted i chatten etter betaling. Pengene holdes trygt hos Aktivbruk til handelen er fullført.</p>
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => { if (canCheckout) handleCheckout(); }}
                    disabled={!canCheckout || buyingNow}
                    className="btn btn-olive btn-lg w-full"
                  >
                    {buyingNow ? "Sender til betaling…" : canCheckout ? `Kjøp nå, ${formatPrice(totalPrice)}` : "Kjøp nå"}
                  </button>
                  <p className="num text-center text-xs text-ink-3">
                    {!canCheckout
                      ? "Velg leveringsmetode for å fortsette"
                      : <>{formatPrice(item.price)} vare{shippingCost > 0 ? ` + ${formatPrice(shippingCost)} frakt` : ""} + {formatPrice(buyerFee)} <Link href="/kjoperbeskyttelse" className="underline underline-offset-2 hover:text-ink-2">kjøperbeskyttelse</Link></>
                    }
                  </p>
                </div>
              </div>
            );
          })()}

          {userId === null && (
            <Link href={`/logg-inn?next=/vare/${item.id}`} className="btn btn-ink btn-lg w-full">
              Logg inn for å chatte med selger
            </Link>
          )}

          {userId && !item.seller_id && (
            <p className="rounded-sm bg-ochre-soft p-3 text-[13px] text-ochre">Denne annonsen ble lagt ut før brukerkontoer, så chat er ikke tilgjengelig. Bruk kontaktinfo nedenfor i stedet.</p>
          )}

          {userId && item.seller_id && !isSeller && !item.is_sold && myOffer !== undefined && (
            <>
              {myOffer === null ? (
                <button
                  onClick={() => setShowBidModal(true)}
                  className="btn btn-line w-full"
                >
                  <Icon name="bud" size={18} />
                  Gi bud
                </button>
              ) : myOffer.status === "pending" ? (
                <div className="flex items-center justify-between border-y border-line py-3.5">
                  <div>
                    <p className="text-[13px] font-medium text-ink-2">Ditt bud</p>
                    <p className="price text-lg">{formatPrice(myOffer.amount)}</p>
                    <p className="text-xs text-ink-3">Venter på svar fra selger</p>
                  </div>
                  <button onClick={withdrawOffer} className="tbtn tbtn-u text-sm font-medium text-ink-2 hover:text-clay">Trekk tilbake</button>
                </div>
              ) : myOffer.status === "accepted" ? (
                <div className="flex flex-col gap-4 rounded-sm bg-olive-soft p-4">
                  <div className="flex items-start gap-3 text-olive">
                    <Icon name="hake" size={20} className="mt-px" />
                    <div>
                      <p className="text-[15px] font-semibold">Bud godtatt!</p>
                      <p className="text-[13px]">Selger godtok {formatPrice(myOffer.amount)}</p>
                    </div>
                  </div>
                  {sellerChargesEnabled && (() => {
                    const pkg = getPackageOption(item.package_size);
                    const canShip = item.shipping !== "Kun henting" && !!pkg;
                    const canMeet = item.shipping !== "Kan sendes";
                    const showToggle = canShip && canMeet;
                    const effectiveDm = item.shipping === "Kun henting" ? "meetup"
                      : item.shipping === "Kan sendes" ? "shipping"
                      : deliveryMethod;
                    const shippingCost = effectiveDm === "shipping" && pkg ? pkg.price : 0;
                    const buyerFee = calcBuyerFee(myOffer.amount);
                    const canCheckout = item.shipping !== "Begge" || deliveryMethod !== null;
                    return (
                      <>
                        {showToggle && (
                          <DeliveryChoice value={deliveryMethod} onChange={setDeliveryMethod} shippingLabel={`Frakt ${pkg ? `(+${pkg.price} kr)` : ""}`} />
                        )}
                        <button
                          onClick={() => { if (canCheckout) handleCheckout(myOffer.id); }}
                          disabled={!canCheckout || payingOffer}
                          className="btn btn-olive btn-lg w-full"
                        >
                          {payingOffer ? "Sender til betaling…" : canCheckout ? `Betal nå, ${formatPrice(myOffer.amount + shippingCost + buyerFee)}` : "Betal nå"}
                        </button>
                        <p className="num -mt-2 text-center text-xs text-ink-3">
                          {!canCheckout
                            ? "Velg leveringsmetode for å fortsette"
                            : <>{formatPrice(myOffer.amount)} bud{shippingCost > 0 ? ` + ${formatPrice(shippingCost)} frakt` : ""} + {formatPrice(buyerFee)} <Link href="/kjoperbeskyttelse" className="underline underline-offset-2 hover:text-ink-2">kjøperbeskyttelse</Link></>}
                        </p>
                      </>
                    );
                  })()}
                  <button
                    onClick={cancelAcceptedOffer}
                    className="mx-auto block text-[13px] text-ink-2 underline underline-offset-2 hover:text-clay"
                  >
                    Avbryt bud
                  </button>
                </div>
              ) : (
                <div className="border-y border-line py-3.5">
                  <p className="text-sm text-ink-2">Budet på {formatPrice(myOffer.amount)} er ikke lenger aktivt.</p>
                  <button onClick={() => { setMyOffer(null); setShowBidModal(true); }} className="mt-1 text-sm font-semibold text-ink underline underline-offset-4">Gi nytt bud</button>
                </div>
              )}
            </>
          )}

          {userId && item.seller_id && !isSeller && (
            <Link
              href={`/meldinger/${item.id}/${userId}`}
              className="tbtn -my-2 w-full justify-center"
            >
              <Icon name="chat" size={18} />
              Skriv til selger
            </Link>
          )}

          {isSeller && item.seller_id && (
            <div className="flex flex-col gap-3">
              {!item.is_sold && (
                showSoldPicker ? (
                  <div className="flex flex-col">
                    <p className="pb-2 text-sm font-[620] text-ink">Hva skjedde?</p>
                    <div className="border-t border-line">
                      {buyerThreads.map((b) => (
                        <button key={b} onClick={() => markSold(b)} disabled={saving} className="flex min-h-[48px] w-full items-center border-b border-line text-left text-[15px] font-medium text-ink hover:bg-ink/5 disabled:opacity-45">
                          Solgt til {profileDisplayName(buyerProfiles[b], b)}
                        </button>
                      ))}
                      <button onClick={() => markSold(null)} disabled={saving} className="flex min-h-[48px] w-full items-center border-b border-line text-left text-[15px] font-medium text-ink-2 hover:bg-ink/5 disabled:opacity-45">Jeg solgte et annet sted</button>
                      <button onClick={() => markSold(null)} disabled={saving} className="flex min-h-[48px] w-full items-center border-b border-line text-left text-[15px] font-medium text-ink-2 hover:bg-ink/5 disabled:opacity-45">Jeg bestemte meg for å ikke selge</button>
                    </div>
                    <button onClick={() => setShowSoldPicker(false)} className="tbtn mx-auto text-sm font-medium text-ink-2">Avbryt</button>
                  </div>
                ) : (
                  <button onClick={() => setShowSoldPicker(true)} disabled={saving} className="btn btn-ink w-full">{saving ? "Lagrer…" : "Marker som solgt"}</button>
                )
              )}
              {item.is_sold && soldToBuyer && userId && (
                <div className="space-y-2 border-t border-line pt-3">
                  <p className="text-sm font-[620] text-ink">Vurder kjøperen</p>
                  <p className="text-[13px] font-medium text-ink-2">{profileDisplayName(buyerProfiles[soldToBuyer], soldToBuyer)}</p>
                  <ReviewForm itemId={item.id} reviewerId={userId} sellerId={soldToBuyer} label="Hvordan var kjøperen?" />
                </div>
              )}
            </div>
          )}

          {item.is_sold && userId && !isSeller && hasChatted && item.seller_id && (
            <ReviewForm itemId={item.id} reviewerId={userId} sellerId={item.seller_id} />
          )}

          {item.contact && (
            <details className="border-y border-line py-3 text-sm">
              <summary className="cursor-pointer text-ink-2">Kontakt utenfor Aktivbruk (eldre annonse)</summary>
              <p className="mt-2 break-all font-medium">{item.contact}</p>
            </details>
          )}

          {isSeller && (
            <div className="flex flex-col gap-2">
              {item.is_sold && (
                <button onClick={toggleSold} disabled={saving || deleting} className="btn btn-line w-full">{saving ? "Lagrer…" : "Marker som tilgjengelig"}</button>
              )}
              <button onClick={onDelete} disabled={saving || deleting} className="tbtn w-full justify-center text-clay">
                <Icon name="slett" size={18} />
                {deleting ? "Sletter…" : "Slett annonsen"}
              </button>
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
        <section className="mt-14 border-t border-ink pb-4 lg:mt-24">
          <div className="flex items-baseline justify-between gap-4 pb-5 pt-3.5 lg:pb-7 lg:pt-4">
            <h2 className="text-[26px] leading-[1.08] lg:text-[32px]">Lignende annonser</h2>
            {(item.brand || item.category) && (
              <Link href={brandPageFor(item.brand) ? `/brukt/${brandPageFor(item.brand)!.slug}` : item.brand ? `/varer?brand=${encodeURIComponent(item.brand)}` : `/varer?sub=${encodeURIComponent(item.category!)}`} className="tbtn text-sm">Se alle <Icon name="pil-h" size={16} /></Link>
            )}
          </div>
          <div className="item-grid">
            {similar.map((s) => <ItemCard key={s.id} item={s} seller={s.seller_id ? similarSellers[s.seller_id] : null} />)}
          </div>
        </section>
      )}
    </article>
  );
}
