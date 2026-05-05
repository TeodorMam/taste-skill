"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import {
  type Item,
  type Message,
  type Profile,
  itemImages,
  profileDisplayName,
} from "@/lib/supabase";

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

export default function ChatPage() {
  const params = useParams<{ itemId: string; buyerId: string }>();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { itemId, buyerId } = params;

  const [meId, setMeId] = useState<string | null | undefined>(undefined);
  const [item, setItem] = useState<Item | null>(null);
  const [otherProfile, setOtherProfile] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otherLastRead, setOtherLastRead] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMeId(data.user?.id ?? null));
  }, [supabase]);

  useEffect(() => {
    supabase.from("items").select("*").eq("id", itemId).single()
      .then(({ data }) => setItem(data as Item));
  }, [supabase, itemId]);

  const isSeller = !!meId && !!item && meId === item.seller_id;
  const otherId = meId ? (isSeller ? buyerId : (item?.seller_id ?? "")) : "";

  useEffect(() => {
    if (!meId || !item) return;
    const id = isSeller ? buyerId : (item.seller_id ?? "");
    if (!id) return;
    supabase.from("profiles").select("*").eq("user_id", id).maybeSingle()
      .then(({ data }) => setOtherProfile(data as Profile | null));
  }, [meId, item, isSeller, buyerId, supabase]);

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
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [supabase, itemId, buyerId, meId]);

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

  useEffect(() => {
    if (!meId) return;
    supabase.from("chat_reads").upsert(
      { user_id: meId, item_id: itemId, buyer_id: buyerId, last_read_at: new Date().toISOString() },
      { onConflict: "user_id,item_id,buyer_id" },
    );
  }, [supabase, itemId, buyerId, meId, messages.length]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages.length]);

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

  async function sendImage(file: File) {
    if (!meId) return;
    setUploading(true);
    setError(null);
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

  const lastSentIdx = messages.reduce((acc, m, i) => (m.sender_id === meId ? i : acc), -1);
  const cover = item ? itemImages(item)[0] : null;
  const otherName = profileDisplayName(otherProfile, otherId);

  if (meId === undefined) return <p className="py-6 text-sm text-stone-500">Laster…</p>;

  if (meId === null) {
    return (
      <section className="space-y-3 py-10">
        <p className="text-sm text-stone-600">Logg inn for å se chatten.</p>
        <Link
          href={`/login?next=/chat/${itemId}/${buyerId}`}
          className="inline-block rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-stone-50 hover:bg-black"
        >
          Logg inn
        </Link>
      </section>
    );
  }

  return (
    <div
      className="-mx-4 -mt-6 flex flex-col bg-white"
      style={{ height: "calc(100dvh - 3.5rem)" }}
    >
      {/* Top bar */}
      <div className="flex shrink-0 items-center gap-3 border-b border-stone-200 px-4 py-3">
        <button
          onClick={() => router.push("/inbox")}
          className="shrink-0 rounded-full p-1 text-stone-600 hover:bg-stone-100 hover:text-stone-900"
          aria-label="Tilbake til innboks"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <OtherAvatar profile={otherProfile} name={otherName} />
          <p className="truncate text-sm font-semibold text-stone-900">{otherName}</p>
        </div>
        {item && (
          <Link href={`/item/${itemId}`} className="shrink-0" aria-label="Gå til annonse">
            <div className="h-10 w-10 overflow-hidden rounded-xl bg-stone-100">
              {cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cover} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full bg-stone-200" />
              )}
            </div>
          </Link>
        )}
      </div>

      {/* Messages */}
      <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <p className="py-10 text-center text-xs text-stone-400">
            {isSeller
              ? "Ingen meldinger fra denne kjøperen enda."
              : "Si hei — spør om størrelse, henting eller tilstand."}
          </p>
        )}
        {messages.map((m, i) => {
          const mine = m.sender_id === meId;
          const isLastSent = mine && i === lastSentIdx;
          const isSeen =
            isLastSent &&
            otherLastRead !== null &&
            new Date(m.created_at) <= new Date(otherLastRead);
          return (
            <div key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
              {m.image_url ? (
                <a href={m.image_url} target="_blank" rel="noopener noreferrer" className="max-w-[75%]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.image_url} alt="" className="max-h-56 w-full rounded-2xl object-cover" />
                </a>
              ) : (
                <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-stone-900 text-stone-50" : "bg-stone-100 text-stone-900"}`}>
                  {m.body}
                </div>
              )}
              <span className="mt-0.5 px-1 text-[10px] text-stone-400">
                {fmtTime(m.created_at)}{isSeen ? " · Sett" : ""}
              </span>
            </div>
          );
        })}
      </div>

      {/* Input bar */}
      <div className="shrink-0 border-t border-stone-200 bg-white">
        <form onSubmit={send} className="flex items-center gap-2 p-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || sending}
            className="shrink-0 rounded-full p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700 disabled:opacity-40"
            aria-label="Send bilde"
          >
            {uploading ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) sendImage(f); e.target.value = ""; }}
          />
          <input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Skriv en melding…"
            className="min-w-0 flex-1 rounded-full border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#5a6b32]"
          />
          <button
            type="submit"
            disabled={sending || !body.trim()}
            className="shrink-0 rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-stone-50 hover:bg-black disabled:opacity-40"
          >
            Send
          </button>
        </form>
        {error && <p className="px-3 pb-2 text-xs text-red-700">{error}</p>}
      </div>

      {/* Spacer so input clears the mobile bottom nav */}
      <div className="h-14 shrink-0 sm:hidden" />
    </div>
  );
}

function OtherAvatar({ profile, name }: { profile: Profile | null; name: string }) {
  if (profile?.avatar_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={profile.avatar_url} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
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
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-stone-200">
      {initials ? (
        <span className="text-xs font-semibold text-stone-600">{initials}</span>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-stone-400">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      )}
    </div>
  );
}
