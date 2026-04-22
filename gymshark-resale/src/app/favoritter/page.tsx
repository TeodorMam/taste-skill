"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { type Item } from "@/lib/supabase";
import { ItemCard } from "@/components/ItemCard";
import { ItemCardSkeleton } from "@/components/ItemCardSkeleton";

export default function FavorittePage() {
  const supabase = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, [supabase]);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from("favorites")
      .select("item_id, created_at, items(*)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          setError(error.message);
          return;
        }
        const rows = (data ?? []) as unknown as {
          item_id: string;
          items: Item | null;
        }[];
        setItems(rows.map((r) => r.items).filter((i): i is Item => !!i));
      });
  }, [userId, supabase]);

  if (userId === undefined) {
    return <p className="py-6 text-sm text-stone-500">Laster…</p>;
  }
  if (userId === null) {
    return (
      <section className="space-y-3 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">Favoritter</h1>
        <p className="text-sm text-stone-600">
          Logg inn for å lagre favoritter og følge med på varer du liker.
        </p>
        <Link
          href="/login?next=/favoritter"
          className="inline-block rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-stone-50 hover:bg-black"
        >
          Logg inn
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Favoritter</h1>
        <p className="mt-1 text-sm text-stone-500">
          Varer du har lagret — trykk hjertet for å fjerne.
        </p>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}

      {items === null && !error && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <ItemCardSkeleton key={i} />
          ))}
        </div>
      )}

      {items && items.length === 0 && (
        <div className="rounded-2xl border border-dashed border-stone-300 p-10 text-center text-sm text-stone-500">
          <p className="font-medium text-stone-700">Ingen favoritter enda</p>
          <p className="mt-1">
            Trykk hjertet på en vare for å lagre den her.
          </p>
          <Link
            href="/browse"
            className="mt-4 inline-block rounded-full bg-stone-900 px-5 py-2.5 text-xs font-medium text-stone-50 hover:bg-black"
          >
            Utforsk varer
          </Link>
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
