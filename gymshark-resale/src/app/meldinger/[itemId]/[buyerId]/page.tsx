"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import {
  type Item,
  type Message,
  type MessageType,
  type Offer,
  type Profile,
  formatPrice,
  itemImages,
  profileDisplayName,
} from "@/lib/supabase";
import { useToast } from "@/components/ToastProvider";
import { BidModal } from "@/components/BidModal";
import { Icon, type IconName } from "@/components/Icon";
import { prepareImageForUpload } from "@/lib/image";

function fmtTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 86400000);
  const hm = d.toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" });
  if (d >= todayStart) return hm;
  if (d >= yesterdayStart) return `I går ${hm}`;
  return d.toLocaleDateString("nb-NO", { day: "numeric", month: "short" }) + ` ${hm}`;
}

// iMessage-style jumbo emoji: when a message is only 1–3 emoji graphemes and
// nothing else, we drop the bubble and render them large. Returns 0 for
// anything else so the caller can render the normal bubble.
function jumboEmojiCount(text: string): 0 | 1 | 2 | 3 {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  try {
    // Intl.Segmenter groups things like flags, skin-tone modifiers and ZWJ
    // sequences into single "visual" graphemes, Array.from would split a
    // Norwegian flag or 🤝🏻 into pieces and miscount.
    const seg = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    const parts = Array.from(seg.segment(trimmed), (s) => s.segment.trim()).filter(Boolean);
    if (parts.length === 0 || parts.length > 3) return 0;
    const allEmoji = parts.every((g) => /\p{Extended_Pictographic}/u.test(g));
    return allEmoji ? (parts.length as 1 | 2 | 3) : 0;
  } catch {
    return 0;
  }
}

// ─── Event card config ────────────────────────────────────────────────────────

// `locked` puts a padlock in front of the subtitle, where the text used to
// start with a padlock emoji.
type EventConfig = { icon: IconName; title: string; sub: string; locked?: boolean };

const EVENT_CONFIGS: Partial<Record<MessageType, EventConfig>> = {
  bid_accepted: { icon: "feiring",    title: "Bud akseptert!", sub: "Kjøper kan nå gå til annonsen for å betale" },
  payment:      { icon: "betaling",   title: "Betaling gjennomført", sub: "Pengene holdes trygt til varen er mottatt", locked: true },
  shipped:      { icon: "sendt",      title: "Varen er sendt", sub: "Du får beskjed når varen er registrert levert" },
  delivered:    { icon: "levert",     title: "Varen er levert", sub: "Kjøper har bekreftet mottak" },
  payout:       { icon: "utbetaling", title: "Utbetaling sendt", sub: "Pengene er overført til selger" },
};

// Older system notes were stored with a "🚫 " prefix. The stored text is left
// alone; the prefix is drawn as the cross icon when shown.
const CANCEL_PREFIX = "🚫 ";

function eventCardConfig(type: MessageType, metadata: Record<string, unknown> | null) {
  const base = EVENT_CONFIGS[type];
  if (!base) return null;
  const isMeetup = metadata?.delivery_method === "meetup";
  if (type === "payment" && isMeetup) {
    return { ...base, sub: "Pengene holdes trygt til dere har møttes" };
  }
  return base;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ChatPage() {
  const params = useParams<{ itemId: string; buyerId: string }>();
  const router = useRouter();
  const toast = useToast();
  const supabase = useMemo(() => createClient(), []);
  const { itemId, buyerId } = params;

  const [meId, setMeId] = useState<string | null | undefined>(undefined);
  const [item, setItem] = useState<Item | null>(null);
  const [otherProfile, setOtherProfile] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [offersMap, setOffersMap] = useState<Record<string, Offer>>({});
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showBidModal, setShowBidModal] = useState(false);
  const [submittingBid, setSubmittingBid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otherLastRead, setOtherLastRead] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  // Auth
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMeId(data.user?.id ?? null));
  }, [supabase]);

  // Item
  useEffect(() => {
    supabase.from("items").select("*").eq("id", itemId).single()
      .then(({ data }) => setItem(data as Item));
  }, [supabase, itemId]);

  const isSeller = !!meId && !!item && meId === item.seller_id;
  const otherId = meId ? (isSeller ? buyerId : (item?.seller_id ?? "")) : "";

  // Other user's profile
  useEffect(() => {
    if (!meId || !item) return;
    const id = isSeller ? buyerId : (item.seller_id ?? "");
    if (!id) return;
    supabase.from("profiles_public").select("*").eq("user_id", id).maybeSingle()
      .then(({ data }) => setOtherProfile(data as Profile | null));
  }, [meId, item, isSeller, buyerId, supabase]);

  // Messages + real-time subscription
  useEffect(() => {
    if (!meId) return;
    let cancelled = false;
    supabase
      .from("messages")
      .select("*")
      .eq("item_id", itemId)
      .eq("buyer_id", buyerId)
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) setError(error.message);
        else setMessages((data ?? []) as Message[]);
      });
    const channel = supabase
      .channel(`chat:${itemId}:${buyerId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `item_id=eq.${itemId}` }, (payload) => {
        const m = payload.new as Message;
        if (m.buyer_id !== buyerId) return;
        setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter: `item_id=eq.${itemId}` }, (payload) => {
        const m = payload.new as Message;
        if (m.buyer_id !== buyerId) return;
        // Edits sync live to the other side, swap the row in-place.
        setMessages((prev) => prev.map((x) => (x.id === m.id ? m : x)));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "messages", filter: `item_id=eq.${itemId}` }, (payload) => {
        const oldRow = payload.old as { id?: string; buyer_id?: string };
        if (!oldRow?.id) return;
        // Silent delete, the row just disappears for both parties, matching
        // Signal / iMessage's "delete for everyone".
        setMessages((prev) => prev.filter((x) => x.id !== oldRow.id));
      })
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [supabase, itemId, buyerId, meId]);

  // Offers + real-time subscription (for bid card status)
  useEffect(() => {
    if (!meId) return;
    let cancelled = false;
    supabase
      .from("offers")
      .select("*")
      .eq("item_id", itemId)
      .eq("buyer_id", buyerId)
      .then(({ data }) => {
        if (cancelled) return;
        const map: Record<string, Offer> = {};
        for (const o of (data ?? []) as Offer[]) map[o.id] = o;
        setOffersMap(map);
      });
    const channel = supabase
      .channel(`offers:${itemId}:${buyerId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "offers", filter: `item_id=eq.${itemId}` }, (payload) => {
        const o = payload.new as Offer;
        if (o.buyer_id === buyerId) setOffersMap((prev) => ({ ...prev, [o.id]: o }));
      })
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [supabase, itemId, buyerId, meId]);

  // Other person's last_read + subscription
  useEffect(() => {
    if (!meId || !otherId) return;
    let cancelled = false;
    supabase
      .from("chat_reads")
      .select("last_read_at")
      .eq("user_id", otherId)
      .eq("item_id", itemId)
      .eq("buyer_id", buyerId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setOtherLastRead((data as { last_read_at: string } | null)?.last_read_at ?? null);
      });
    const channel = supabase
      .channel(`reads:${itemId}:${buyerId}:${otherId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_reads", filter: `user_id=eq.${otherId}` }, (payload) => {
        const row = payload.new as { item_id: string; buyer_id: string; last_read_at: string } | null;
        if (row && row.item_id === itemId && row.buyer_id === buyerId) setOtherLastRead(row.last_read_at);
      })
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [supabase, itemId, buyerId, otherId, meId]);

  // Mark conversation as read whenever it's open or new messages arrive
  useEffect(() => {
    if (!meId) return;
    supabase.from("chat_reads").upsert(
      { user_id: meId, item_id: itemId, buyer_id: buyerId, last_read_at: new Date().toISOString() },
      { onConflict: "user_id,item_id,buyer_id" },
    );
  }, [supabase, itemId, buyerId, meId, messages.length]);

  // Scroll to bottom on new messages
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages.length]);

  // Auto-grow the message textarea as the user types, capped at ~5 lines so
  // long drafts don't push the whole conversation out of view.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 140) + "px";
  }, [body]);

  // Grow the inline edit textarea to fit its content while editing.
  useEffect(() => {
    const el = editTextareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, [editingId, editingText]);

  // Close the message action menu when clicking outside of it.
  useEffect(() => {
    if (!openMenuId) return;
    const close = () => setOpenMenuId(null);
    // Delay one tick so the click that opened the menu doesn't immediately
    // close it.
    const t = setTimeout(() => document.addEventListener("click", close), 0);
    return () => { clearTimeout(t); document.removeEventListener("click", close); };
  }, [openMenuId]);

  // ─── Actions ───────────────────────────────────────────────────────────────

  function beginEdit(m: Message) {
    setEditingId(m.id);
    setEditingText(m.body);
    setOpenMenuId(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingText("");
  }

  async function saveEdit(id: string) {
    const text = editingText.trim();
    if (!text) return;
    const prev = messages.find((m) => m.id === id);
    if (prev && prev.body === text) { cancelEdit(); return; }
    // Optimistic: swap locally, then persist. Realtime UPDATE echoes back
    // for the other side.
    setMessages((rows) => rows.map((m) => (m.id === id ? { ...m, body: text, edited_at: new Date().toISOString() } : m)));
    cancelEdit();
    const { error } = await supabase
      .from("messages")
      .update({ body: text, edited_at: new Date().toISOString() })
      .eq("id", id);
    if (error) toast(error.message || "Kunne ikke redigere meldingen");
  }

  async function deleteMessage(id: string) {
    setOpenMenuId(null);
    // Silent delete: no confirm dialog and no "melding slettet" placeholder.
    // The row just leaves the list on both sides.
    setMessages((rows) => rows.filter((m) => m.id !== id));
    const { error } = await supabase.from("messages").delete().eq("id", id);
    if (error) toast(error.message || "Kunne ikke slette meldingen");
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text || !meId) return;
    setSending(true);
    setError(null);
    const { data, error } = await supabase
      .from("messages")
      .insert({ item_id: itemId, buyer_id: buyerId, sender_id: meId, body: text })
      .select("*")
      .single();
    setSending(false);
    if (error) { setError(error.message); return; }
    setBody("");
    const m = data as Message;
    setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
  }

  async function sendImage(rawFile: File) {
    if (!meId) return;
    setUploading(true);
    setError(null);
    // Convert HEIC (iPhone default) to JPEG so the image renders on every
    // device, desktop browsers can't display HEIC natively.
    const file = await prepareImageForUpload(rawFile);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `chat/${itemId}-${buyerId}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("item-images").upload(path, file, { cacheControl: "3600", upsert: true });
    if (upErr) { setError(upErr.message); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("item-images").getPublicUrl(path);
    const { data, error } = await supabase
      .from("messages")
      .insert({ item_id: itemId, buyer_id: buyerId, sender_id: meId, body: "", image_url: urlData.publicUrl })
      .select("*")
      .single();
    setUploading(false);
    if (error) { setError(error.message); return; }
    const m = data as Message;
    setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
  }

  async function submitBid(amount: number) {
    if (!meId || isSeller || amount <= 0) return;
    setSubmittingBid(true);
    const { data, error } = await supabase
      .from("offers")
      .insert({ item_id: itemId, buyer_id: buyerId, amount })
      .select("*")
      .single();
    if (error) { toast(`Feil: ${error.message}`); setSubmittingBid(false); return; }
    const offer = data as Offer;
    setOffersMap((prev) => ({ ...prev, [offer.id]: offer }));
    await supabase.from("messages").insert({
      item_id: itemId,
      buyer_id: buyerId,
      sender_id: meId,
      body: "",
      message_type: "bid",
      metadata: { offer_id: offer.id, amount },
    }).then(() => null);
    setShowBidModal(false);
    setSubmittingBid(false);
    toast("Bud sendt");
  }

  async function respondOffer(offerId: string, amount: number, status: "accepted" | "declined") {
    const { data, error } = await supabase
      .from("offers")
      .update({ status })
      .eq("id", offerId)
      .select("*")
      .single();
    if (error) { toast(`Feil: ${error.message}`); return; }
    if (data) setOffersMap((prev) => ({ ...prev, [offerId]: data as Offer }));

    if (status === "accepted") {
      // Insert a bid_accepted event message, silently skipped if migration not yet applied
      await supabase.from("messages").insert({
        item_id: itemId,
        buyer_id: buyerId,
        sender_id: meId,
        body: "",
        message_type: "bid_accepted",
        metadata: { offer_id: offerId, amount },
      }).then(() => null);
      toast("Bud godtatt");
    } else {
      toast("Bud avslått");
    }
  }

  async function cancelAcceptedOffer(offerId: string) {
    if (!meId) return;
    const confirmMsg = isSeller
      ? "Avbryte det godkjente budet? Kjøperen kan ikke lenger fullføre betalingen."
      : "Avbryte det godkjente budet? Selger må godta et nytt bud hvis du ombestemmer deg.";
    if (!window.confirm(confirmMsg)) return;
    await supabase
      .from("orders")
      .update({ status: "cancelled" })
      .eq("offer_id", offerId)
      .eq("status", "pending");
    const { data } = await supabase
      .from("offers")
      .update({ status: "declined" })
      .eq("id", offerId)
      .select("*")
      .single();
    if (data) setOffersMap((prev) => ({ ...prev, [offerId]: data as Offer }));
    const body = isSeller ? "🚫 Selger avbrøt det godkjente budet" : "🚫 Kjøper avbrøt det godkjente budet";
    await supabase.from("messages").insert({
      item_id: itemId,
      buyer_id: buyerId,
      sender_id: meId,
      body,
      message_type: "text",
    });
    void notifyOfferCancel(offerId, isSeller ? "seller" : "buyer", true);
    toast("Bud avbrutt");
  }

  async function withdrawPendingOffer(offerId: string) {
    if (!meId || isSeller) return;
    if (!window.confirm("Trekke tilbake budet?")) return;
    await supabase.from("offers").delete().eq("id", offerId);
    setOffersMap((prev) => {
      const next = { ...prev };
      delete next[offerId];
      return next;
    });
    await supabase.from("messages").insert({
      item_id: itemId,
      buyer_id: buyerId,
      sender_id: meId,
      body: "🚫 Kjøper trakk tilbake budet",
      message_type: "text",
    });
    void notifyOfferCancel(offerId, "buyer", false);
    toast("Bud trukket tilbake");
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

  // ─── Derived values ────────────────────────────────────────────────────────

  const lastSentIdx = messages.reduce((acc, m, i) => (m.sender_id === meId ? i : acc), -1);
  const cover = item ? itemImages(item)[0] : null;
  const otherName = profileDisplayName(otherProfile, otherId);

  // ─── Render ────────────────────────────────────────────────────────────────

  if (meId === undefined) return <p className="py-6 text-sm text-ink-3">Laster…</p>;

  if (meId === null) {
    return (
      <section className="space-y-3 py-10">
        <p className="text-sm text-ink-2">Logg inn for å se chatten.</p>
        <Link
          href={`/logg-inn?next=/meldinger/${itemId}/${buyerId}`}
          className="btn btn-ink"
        >
          Logg inn
        </Link>
      </section>
    );
  }

  return (
    <div
      className="-mx-4 -mt-6 flex flex-col bg-paper"
      style={{ height: "calc(100dvh - 3.5rem)" }}
    >
      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center gap-2 border-b border-line py-2 pl-2 pr-4">
        <button
          onClick={() => router.push("/meldinger")}
          className="flex h-11 w-11 shrink-0 items-center justify-center text-ink hover:bg-ink/5"
          aria-label="Tilbake til innboks"
        >
          <Icon name="pil-v" size={20} />
        </button>
        {otherId ? (
          <Link
            href={`/selger/${otherId}`}
            className="flex min-w-0 flex-1 items-center gap-2.5 py-1 hover:underline"
            aria-label={`Se profil til ${otherName}`}
          >
            <OtherAvatar profile={otherProfile} name={otherName} />
            <p className="truncate text-[17px] font-[620] text-ink">{otherName}</p>
          </Link>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <OtherAvatar profile={otherProfile} name={otherName} />
            <p className="truncate text-[17px] font-[620] text-ink">{otherName}</p>
          </div>
        )}
        {item && (
          <Link href={`/vare/${itemId}`} className="shrink-0" aria-label="Gå til annonse">
            <div className="h-12 w-9 overflow-hidden bg-sunk">
              {cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cover} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full bg-line" />
              )}
            </div>
          </Link>
        )}
      </div>

      {/* ── Messages ─────────────────────────────────────────────────────── */}
      <div ref={listRef} className="flex-1 space-y-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <p className="py-10 text-center text-[13px] text-ink-3">
            {isSeller
              ? "Ingen meldinger fra denne kjøperen enda."
              : "Si hei, spør om størrelse, henting eller tilstand."}
          </p>
        )}

        {messages.map((m, i) => {
          const mine = m.sender_id === meId;
          const type = m.message_type ?? "text";
          const isLastSent = mine && i === lastSentIdx;
          const isSeen =
            isLastSent &&
            otherLastRead !== null &&
            new Date(m.created_at) <= new Date(otherLastRead);

          // ── Lifecycle event cards (centered) ──
          if (type in EVENT_CONFIGS) {
            return (
              <div key={m.id} className="py-2">
                <EventCard type={type as MessageType} metadata={m.metadata} time={fmtTime(m.created_at)} />
              </div>
            );
          }

          // ── Bid card (positioned as a message bubble) ──
          if (type === "bid") {
            const meta = m.metadata as { offer_id: string; amount: number } | null;
            const offer = meta?.offer_id ? offersMap[meta.offer_id] : undefined;
            // Fallback: if offersMap hasn't updated yet (e.g. realtime hiccup),
            // scan the message timeline for a matching bid_accepted event
            const acceptedInTimeline = !!meta?.offer_id && messages.some(
              (m2) => m2.message_type === "bid_accepted"
                && (m2.metadata as { offer_id?: string } | null)?.offer_id === meta.offer_id
            );
            const derivedStatus: "pending" | "accepted" | "declined" =
              offer?.status ?? (acceptedInTimeline ? "accepted" : "pending");
            return (
              <div key={m.id} className={`flex flex-col pb-1 ${mine ? "items-end" : "items-start"}`}>
                <BidCard
                  amount={meta?.amount ?? 0}
                  status={derivedStatus}
                  isSeller={isSeller}
                  onRespond={(status) =>
                    respondOffer(meta!.offer_id, meta?.amount ?? 0, status)
                  }
                  onCancel={meta?.offer_id ? () => cancelAcceptedOffer(meta.offer_id) : undefined}
                  onWithdraw={meta?.offer_id ? () => withdrawPendingOffer(meta.offer_id) : undefined}
                />
                <span className="mt-0.5 px-1 text-xs text-ink-3">{fmtTime(m.created_at)}</span>
              </div>
            );
          }

          // ── Image ──
          if (type === "image" || (m.image_url && !m.body.trim())) {
            return (
              <div key={m.id} className={`flex flex-col pb-1 ${mine ? "items-end" : "items-start"}`}>
                <a href={m.image_url!} target="_blank" rel="noopener noreferrer" className="max-w-[75%]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.image_url!} alt="" className="max-h-56 w-full rounded-chat object-cover" />
                </a>
                <span className="mt-0.5 px-1 text-xs text-ink-3">
                  {fmtTime(m.created_at)}{isSeen ? " · Sett" : ""}
                </span>
              </div>
            );
          }

          // ── Regular text bubble (or jumbo emoji) ──
          const jumbo = jumboEmojiCount(m.body);
          const isEditing = editingId === m.id;
          const menuOpen = openMenuId === m.id;
          const wasEdited = !!m.edited_at;

          if (isEditing) {
            return (
              <div key={m.id} className={`flex flex-col pb-1 ${mine ? "items-end" : "items-start"}`}>
                <div className="max-w-[85%] w-full sm:w-auto sm:min-w-[240px]">
                  <textarea
                    aria-label="Rediger meldingen"
                    ref={editTextareaRef}
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") { e.preventDefault(); cancelEdit(); }
                    }}
                    rows={1}
                    autoFocus
                    className="field min-h-12 resize-none py-3"
                  />
                  <div className="mt-1 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="tbtn px-2 text-sm font-medium text-ink-2"
                    >
                      Avbryt
                    </button>
                    <button
                      type="button"
                      onClick={() => saveEdit(m.id)}
                      disabled={!editingText.trim()}
                      className="btn btn-olive btn-sm"
                    >
                      Lagre
                    </button>
                  </div>
                </div>
              </div>
            );
          }

          if (jumbo > 0) {
            const size = jumbo === 1 ? "text-6xl" : jumbo === 2 ? "text-5xl" : "text-4xl";
            return (
              <div key={m.id} className={`relative flex flex-col pb-1 ${mine ? "items-end" : "items-start"}`}>
                <button
                  type="button"
                  onClick={mine ? (e) => { e.stopPropagation(); setOpenMenuId(menuOpen ? null : m.id); } : undefined}
                  className={`${size} px-1 leading-tight ${mine ? "cursor-pointer" : "cursor-default"}`}
                  aria-label={mine ? "Meldingsvalg" : undefined}
                >
                  {m.body}
                </button>
                {mine && menuOpen && (
                  <MessageMenu onEdit={() => beginEdit(m)} onDelete={() => deleteMessage(m.id)} />
                )}
                <span className="mt-1 px-1 text-xs text-ink-3">
                  {fmtTime(m.created_at)}{wasEdited ? " · Redigert" : ""}{isSeen ? " · Sett" : ""}
                </span>
              </div>
            );
          }

          return (
            <div key={m.id} className={`relative flex flex-col pb-1 ${mine ? "items-end" : "items-start"}`}>
              <button
                type="button"
                onClick={mine ? (e) => { e.stopPropagation(); setOpenMenuId(menuOpen ? null : m.id); } : undefined}
                className={`max-w-[75%] whitespace-pre-wrap break-words rounded-chat px-3.5 py-2.5 text-left text-[15px] leading-[1.45] ${
                  mine ? "cursor-pointer rounded-br-sm bg-ink text-paper" : "cursor-default rounded-bl-sm bg-raised text-ink shadow-[inset_0_0_0_1px_#D6D3C7]"
                }`}
                aria-label={mine ? "Meldingsvalg" : undefined}
              >
                {m.body.startsWith(CANCEL_PREFIX) ? (
                  <span className="inline-flex items-start gap-1.5"><Icon name="kryss" size={16} className="mt-0.5" />{m.body.slice(CANCEL_PREFIX.length)}</span>
                ) : m.body}
              </button>
              {mine && menuOpen && (
                <MessageMenu onEdit={() => beginEdit(m)} onDelete={() => deleteMessage(m.id)} />
              )}
              <span className="mt-0.5 px-1 text-xs text-ink-3">
                {fmtTime(m.created_at)}{wasEdited ? " · Redigert" : ""}{isSeen ? " · Sett" : ""}
              </span>
            </div>
          );
        })}
      </div>

      {/* ── Input bar ────────────────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-line bg-raised">
        <form onSubmit={send} className="flex items-end gap-2 px-2 py-3 pr-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || sending}
            className="flex h-12 w-11 shrink-0 items-center justify-center text-ink hover:bg-ink/5 disabled:opacity-45"
            aria-label="Send bilde"
          >
            <Icon name="kamera" size={20} className={uploading ? "animate-pulse" : ""} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) sendImage(f); e.target.value = ""; }}
          />
          <textarea
            ref={textareaRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Skriv en melding…"
            rows={1}
            className="field min-h-12 min-w-0 flex-1 resize-none py-3"
          />
          <button
            type="submit"
            disabled={sending || !body.trim()}
            className="btn btn-ink shrink-0"
          >
            Send
          </button>
        </form>
        {!isSeller && item && !item.is_sold && (
          <button
            type="button"
            onClick={() => setShowBidModal(true)}
            className="tbtn -mt-2 w-full justify-center text-sm"
          >
            <Icon name="bud" size={18} />
            Gi bud
          </button>
        )}
        {error && <p className="px-3 pb-2 text-xs text-clay">{error}</p>}
      </div>

      {showBidModal && item && (
        <BidModal
          item={item}
          onClose={() => setShowBidModal(false)}
          onSubmit={submitBid}
          submitting={submittingBid}
        />
      )}

      {/* Spacer so input clears the mobile bottom nav */}
      <div className="h-14 shrink-0 sm:hidden" />
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MessageMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="absolute right-0 top-full z-10 mt-1 min-w-[140px] overflow-hidden rounded-sm border border-line bg-raised"
    >
      <button
        type="button"
        onClick={onEdit}
        className="flex min-h-[44px] w-full items-center gap-2.5 px-3 text-left text-sm font-medium text-ink hover:bg-ink/5"
      >
        <Icon name="rediger" size={16} />
        Rediger
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="flex min-h-[44px] w-full items-center gap-2.5 border-t border-line px-3 text-left text-sm font-medium text-clay hover:bg-clay-soft"
      >
        <Icon name="slett" size={16} />
        Slett
      </button>
    </div>
  );
}

function BidCard({
  amount,
  status,
  isSeller,
  onRespond,
  onCancel,
  onWithdraw,
}: {
  amount: number;
  status: "pending" | "accepted" | "declined";
  isSeller: boolean;
  onRespond: (status: "accepted" | "declined") => void;
  onCancel?: () => void;
  onWithdraw?: () => void;
}) {

  return (
    <div className="w-60 overflow-hidden rounded-sm bg-raised text-sm shadow-[inset_0_0_0_1.5px_#1C1E18]">
      <div className="px-4 pb-2.5 pt-3">
        <p className="flex items-center gap-1.5 text-[13px] font-[620] text-ink-2"><Icon name="bud" size={16} />Bud</p>
        <p className="price mt-1 text-[26px] leading-none text-ink">{formatPrice(amount)}</p>
      </div>

      <div className="border-t border-line px-4 py-2.5">
        {status === "pending" && isSeller && (
          <div className="flex gap-2">
            <button
              onClick={() => onRespond("accepted")}
              className="btn btn-olive btn-sm flex-1"
            >
              Godta
            </button>
            <button
              onClick={() => onRespond("declined")}
              className="btn btn-line btn-sm flex-1"
            >
              Avslå
            </button>
          </div>
        )}
        {status === "pending" && !isSeller && (
          <div className="flex items-center justify-between gap-2">
            <p className="text-[13px] text-ink-3">Venter på svar…</p>
            {onWithdraw && (
              <button
                onClick={onWithdraw}
                className="text-xs text-ink-3 underline underline-offset-2 hover:text-clay"
              >
                Trekk tilbake
              </button>
            )}
          </div>
        )}
        {status === "accepted" && (
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-sm font-[620] text-ink"><Icon name="hake" size={16} />Godtatt</p>
            {onCancel && (
              <button
                onClick={onCancel}
                className="text-xs text-ink-3 underline underline-offset-2 hover:text-clay"
              >
                Avbryt bud
              </button>
            )}
          </div>
        )}
        {status === "declined" && (
          <p className="text-[13px] text-ink-3">Avbrutt</p>
        )}
      </div>
    </div>
  );
}

// System events are left-aligned rows between hairlines: a framed icon,
// title, subtitle and the time.
function EventCard({ type, metadata, time }: { type: MessageType; metadata: Record<string, unknown> | null; time: string }) {
  const cfg = eventCardConfig(type, metadata);
  if (!cfg) return null;
  return (
    <div className="flex items-start gap-3 border-y border-line py-3.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm text-ink shadow-[inset_0_0_0_1px_#1C1E18]">
        <Icon name={cfg.icon} size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[15px] font-[620] text-ink">{cfg.title}</p>
          <span className="num shrink-0 text-xs text-ink-3">{time}</span>
        </div>
        <p className="mt-0.5 flex items-center gap-1.5 text-[13px] leading-snug text-ink-2">
          {cfg.locked && <Icon name="laas" size={14} />}
          {cfg.sub}
        </p>
      </div>
    </div>
  );
}

function OtherAvatar({ profile, name }: { profile: Profile | null; name: string }) {
  if (profile?.avatar_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={profile.avatar_url} alt="" className="h-9 w-9 shrink-0 rounded-circle object-cover" />
    );
  }
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-circle bg-[#DCD8CC]">
      {initials ? (
        <span className="text-xs font-semibold text-ink-2">{initials}</span>
      ) : (
        <Icon name="profil" size={16} className="text-ink-3" />
      )}
    </div>
  );
}
