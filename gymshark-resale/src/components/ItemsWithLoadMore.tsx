"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { ItemCard } from "@/components/ItemCard";
import { type Item, type Profile } from "@/lib/supabase";
import { PAGE_SIZE } from "@/lib/pagination";

/**
 * Grid of items with an explicit "Se flere" button, no infinite scroll.
 *
 * The first page is rendered on the server so the homepage still ships items
 * in the initial HTML (SEO, and no spinner on first paint). Every page after
 * that is fetched from the browser client.
 */
export function ItemsWithLoadMore({
  initialItems,
  initialSellers,
  total,
}: {
  initialItems: Item[];
  initialSellers: Record<string, Profile>;
  total: number | null;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState<Item[]>(initialItems);
  const [sellers, setSellers] = useState<Record<string, Profile>>(initialSellers);
  const [offset, setOffset] = useState(initialItems.length);
  const [reachedEnd, setReachedEnd] = useState(initialItems.length < PAGE_SIZE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // `total` comes from the same count query that produced initialItems, so the
  // button is either there or not on first paint. It never flashes in and out.
  const hasMore = !reachedEnd && (total === null || items.length < total);

  async function loadMore() {
    setLoading(true);
    setError(null);

    // Must mirror the server query on the homepage, otherwise the offsets
    // point into a different result set.
    const { data, error: queryError } = await supabase
      .from("items")
      .select("*")
      .eq("is_sold", false)
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (queryError) {
      setError("Klarte ikke laste flere varer. Prøv igjen.");
      setLoading(false);
      return;
    }

    const rows = (data ?? []) as Item[];
    // Offset paging can hand back a row we already have if something was
    // listed between two clicks, so drop anything we've already rendered.
    setItems((prev) => {
      const seen = new Set(prev.map((i) => i.id));
      return [...prev, ...rows.filter((r) => !seen.has(r.id))];
    });
    setOffset((prev) => prev + rows.length);
    if (rows.length < PAGE_SIZE) setReachedEnd(true);
    setLoading(false);

    const known = new Set(Object.keys(sellers));
    const newIds = Array.from(
      new Set(rows.map((r) => r.seller_id).filter((x): x is string => !!x && !known.has(x))),
    );
    if (newIds.length === 0) return;

    const { data: pData } = await supabase
      .from("profiles_public")
      .select("*")
      .in("user_id", newIds);
    const map: Record<string, Profile> = {};
    for (const p of (pData ?? []) as Profile[]) map[p.user_id] = p;
    setSellers((prev) => ({ ...prev, ...map }));
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            seller={item.seller_id ? (sellers[item.seller_id] ?? null) : null}
          />
        ))}
      </div>

      {error && <p className="pt-3 text-center text-sm text-ink-3">{error}</p>}

      {hasMore && (
        <div className="flex justify-center pt-4">
          <button
            onClick={loadMore}
            disabled={loading}
            className="rounded-sm bg-olive px-6 py-2.5 text-sm font-semibold text-raised transition hover:bg-olive-press disabled:opacity-50"
          >
            {loading ? "Laster…" : "Se flere"}
          </button>
        </div>
      )}
    </>
  );
}
