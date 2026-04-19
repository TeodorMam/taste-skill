"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import type { Message } from "@/lib/supabase";

type Props = {
  itemId: string;
  buyerId: string;
  sellerId: string;
  meId: string;
};

export function ChatPanel({ itemId, buyerId, sellerId, meId }: Props) {
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
    const m = data as Message;
    setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
  }

  return (
    <div className="flex flex-col rounded-xl border border-neutral-200 bg-white">
      <div
        ref={listRef}
        className="max-h-72 min-h-32 space-y-2 overflow-y-auto p-3"
      >
        {messages.length === 0 && (
          <p className="py-6 text-center text-xs text-neutral-400">
            {meId === sellerId
              ? "No messages yet from this buyer."
              : "Say hi — ask about size, pickup, or condition."}
          </p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === meId;
          return (
            <div
              key={m.id}
              className={`flex ${mine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                  mine
                    ? "bg-black text-white"
                    : "bg-neutral-100 text-neutral-900"
                }`}
              >
                {m.body}
              </div>
            </div>
          );
        })}
      </div>
      <form onSubmit={send} className="flex gap-2 border-t border-neutral-200 p-2">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write a message…"
          className="min-w-0 flex-1 rounded-full border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
        />
        <button
          type="submit"
          disabled={sending || !body.trim()}
          className="shrink-0 rounded-full bg-black px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-40"
        >
          Send
        </button>
      </form>
      {error && (
        <p className="border-t border-neutral-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
