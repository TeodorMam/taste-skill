"use client";

import { useEffect, useState } from "react";
import { supabase, type Item } from "@/lib/supabase";
import { ItemCard } from "@/components/ItemCard";

export default function BrowsePage() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("items")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setItems((data ?? []) as Item[]);
      });
  }, []);

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Browse</h1>
        <p className="text-xs text-neutral-500">
          {items ? `${items.length} item${items.length === 1 ? "" : "s"}` : ""}
        </p>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}

      {items === null && !error && (
        <p className="text-sm text-neutral-500">Loading…</p>
      )}

      {items && items.length === 0 && (
        <div className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500">
          No items yet. Be the first to post one.
        </div>
      )}

      {items && items.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}
