"use client";

import { useEffect, useMemo, useState } from "react";
import { type Item, BRANDS } from "@/lib/supabase";
import { createClient } from "@/utils/supabase/client";
import { ItemCard } from "@/components/ItemCard";

export default function BrowsePage() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [brand, setBrand] = useState<string>("");

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("items")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setItems((data ?? []) as Item[]);
      });
  }, []);

  const filtered = useMemo(() => {
    if (!items) return null;
    if (!brand) return items;
    return items.filter((i) => i.brand === brand);
  }, [items, brand]);

  const availableBrands = useMemo(() => {
    if (!items) return [] as string[];
    const set = new Set<string>();
    for (const i of items) if (i.brand) set.add(i.brand);
    return BRANDS.filter((b) => set.has(b));
  }, [items]);

  return (
    <section className="space-y-5">
      <div className="flex items-end justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">Utforsk</h1>
        <p className="text-xs text-stone-500">
          {filtered ? `${filtered.length} vare${filtered.length === 1 ? "" : "r"}` : ""}
        </p>
      </div>

      {availableBrands.length > 0 && (
        <div className="-mx-4 overflow-x-auto px-4">
          <div className="flex gap-2 pb-1">
            <Chip active={brand === ""} onClick={() => setBrand("")}>
              Alle
            </Chip>
            {availableBrands.map((b) => (
              <Chip key={b} active={brand === b} onClick={() => setBrand(b)}>
                {b}
              </Chip>
            ))}
          </div>
        </div>
      )}

      {error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}

      {filtered === null && !error && (
        <p className="text-sm text-stone-500">Laster…</p>
      )}

      {filtered && filtered.length === 0 && (
        <div className="rounded-2xl border border-dashed border-stone-300 p-10 text-center text-sm text-stone-500">
          Ingen varer å vise enda. Bli den første til å legge ut.
        </div>
      )}

      {filtered && filtered.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {filtered.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}

function Chip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
        active
          ? "border-[#5a6b32] bg-[#5a6b32] text-white"
          : "border-stone-300 bg-white text-stone-700 hover:border-stone-500"
      }`}
    >
      {children}
    </button>
  );
}
