"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import type { Item, Message } from "@/lib/supabase";

type ThreadRow = {
  item: Item;
  lastMessage: Message;
  role: "buyer" | "seller";
  buyerId: string;
};

export default function InboxPage() {
  const supabase = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const [threads, setThreads] = useState<ThreadRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth
      .getUser()
      .then(({ data }) => setUserId(data.user?.id ?? null));
  }, [supabase]);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data: msgs, error: mErr } = await supabase
        .from("messages")
        .select("*")
        .order("created_at", { ascending: false });
      if (mErr) {
        setError(mErr.message);
        return;
      }
      const messages = (msgs ?? []) as Message[];
      const byThread = new Map<string, Message>();
      for (const m of messages) {
        const key = `${m.item_id}:${m.buyer_id}`;
        if (!byThread.has(key)) byThread.set(key, m);
      }
      const itemIds = Array.from(new Set([...byThread.values()].map((m) => m.item_id)));
      if (itemIds.length === 0) {
        setThreads([]);
        return;
      }
      const { data: items, error: iErr } = await supabase
        .from("items")
        .select("*")
        .in("id", itemIds);
      if (iErr) {
        setError(iErr.message);
        return;
      }
      const itemMap = new Map(((items ?? []) as Item[]).map((i) => [i.id, i]));
      const rows: ThreadRow[] = [];
      for (const m of byThread.values()) {
        const item = itemMap.get(m.item_id);
        if (!item) continue;
        const role: "buyer" | "seller" =
          item.seller_id === userId ? "seller" : "buyer";
        rows.push({ item, lastMessage: m, role, buyerId: m.buyer_id });
      }
      rows.sort(
        (a, b) =>
          new Date(b.lastMessage.created_at).getTime() -
          new Date(a.lastMessage.created_at).getTime(),
      );
      setThreads(rows);
    })();
  }, [userId, supabase]);

  if (userId === undefined) {
    return <p className="py-6 text-sm text-stone-500">Laster…</p>;
  }
  if (userId === null) {
    return (
      <section className="space-y-3 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">Innboks</h1>
        <p className="text-sm text-stone-600">Logg inn for å se meldingene dine.</p>
        <Link
          href="/login?next=/inbox"
          className="inline-block rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-stone-50 hover:bg-black"
        >
          Logg inn
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-semibold tracking-tight">Innboks</h1>
      {error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}
      {threads === null && !error && (
        <p className="text-sm text-stone-500">Laster…</p>
      )}
      {threads && threads.length === 0 && (
        <div className="rounded-2xl border border-dashed border-stone-300 p-10 text-center text-sm text-stone-500">
          Ingen samtaler enda. Send melding til en selger fra en annonse.
        </div>
      )}
      {threads && threads.length > 0 && (
        <ul className="divide-y divide-stone-200 overflow-hidden rounded-2xl border border-stone-200 bg-white">
          {threads.map(({ item, lastMessage, role }) => (
            <li key={`${item.id}:${lastMessage.buyer_id}`}>
              <Link
                href={`/item/${item.id}`}
                className="flex items-center gap-3 p-3 hover:bg-stone-50"
              >
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-stone-100">
                  {item.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-sm font-medium">{item.title}</p>
                    <span className="shrink-0 text-[10px] uppercase tracking-wider text-[#5a6b32]">
                      {role === "seller" ? "Selger" : "Kjøper"}
                    </span>
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-xs text-stone-500">
                    {lastMessage.sender_id === userId ? "Du: " : ""}
                    {lastMessage.body}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
