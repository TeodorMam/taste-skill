"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import type { Message } from "@/lib/supabase";
import { useToast } from "@/components/ToastProvider";

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

type Props = {
  itemId: string;
  buyerId: string;
  sellerId: string;
  meId: string;
};

export function ChatPanel({ itemId, buyerId, sellerId, meId }: Props) {
  const toast = useToast();
  const supabase = useMemo(() => createClient(), []);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
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
      .channel(`messages:${itemId}:${buyerId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `item_id=eq.${itemId}`,
        },
        (payload) => {
          const m = payload.new as Message;
          if (m.buyer_id !== buyerId) return;
          setMessages((prev) =>
            prev.some((x) => x.id === m.id) ? prev : [...prev, m],
          );
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [supabase, itemId, buyerId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    setSending(true);
    setError(null);
    const { data, error } = await supabase
      .from("messages")
      .insert({
        item_id: itemId,
        buyer_id: buyerId,
        sender_id: meId,
        body: text,
      })
      .select("*")
      .single();
    setSending(false);
    if (error) {
      setError(error.message);
      return;
    }
    setBody("");
    toast("Melding sendt");
    const m = data as Message;
    setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
  }

  return (
    <div className="flex flex-col rounded-2xl border border-stone-200 bg-white">
      <div
        ref={listRef}
        className="max-h-72 min-h-32 space-y-2 overflow-y-auto p-3"
      >
        {messages.length === 0 && (
          <p className="py-6 text-center text-xs text-stone-400">
            {meId === sellerId
              ? "Ingen meldinger fra denne kjøperen enda."
              : "Si hei — spør om størrelse, henting eller tilstand."}
          </p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === meId;
          return (
            <div
              key={m.id}
              className={`flex flex-col ${mine ? "items-end" : "items-start"}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                  mine
                    ? "bg-stone-900 text-stone-50"
                    : "bg-stone-100 text-stone-900"
                }`}
              >
                {m.body}
              </div>
              <span className="mt-0.5 px-1 text-[10px] text-stone-400">
                {fmtTime(m.created_at)}
              </span>
            </div>
          );
        })}
      </div>
      <form onSubmit={send} className="flex gap-2 border-t border-stone-200 p-2">
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
      {error && (
        <p className="border-t border-stone-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
