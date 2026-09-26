"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { type Item, type Profile } from "@/lib/supabase";
import { ItemCard } from "@/components/ItemCard";
import { ItemCardSkeleton } from "@/components/ItemCardSkeleton";

export default function FavorittePage() {
  const supabase = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const [items, setItems] = useState<Item[] | null>(null);
  const [sellers, setSellers] = useState<Record<string, Profile>>({});
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
        const list = rows.map((r) => r.items).filter((i): i is Item => !!i);
        setItems(list);
        const ids = Array.from(
          new Set(list.map((i) => i.seller_id).filter((x): x is string => !!x)),
        );
        if (ids.length === 0) return;
        supabase
          .from("profiles_public")
          .select("*")
          .in("user_id", ids)
          .then(({ data: pData }) => {
            const map: Record<string, Profile> = {};
            for (const p of (pData ?? []) as Profile[]) {
              map[p.user_id] = p;
            }
            setSellers(map);
          });
      });
  }, [userId, supabase]);

  if (userId === undefined) {
    return <p className="py-6 text-sm text-ink-3">Laster…</p>;
  }
  if (userId === null) {
    return (
      <section className="space-y-3 py-10">
        <h1 className="text-[40px] leading-none">Favoritter</h1>
        <p className="text-sm text-ink-2">
          Logg inn for å lagre favoritter og følge med på varer du liker.
        </p>
        <Link
          href="/logg-inn?next=/favoritter"
          className="btn btn-ink"
        >
          Logg inn
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-[40px] leading-none">Favoritter</h1>
        <p className="mt-1 text-sm text-ink-3">
          Varer du har lagret, trykk hjertet for å fjerne.
        </p>
      </div>

      {error && (
        <p className="rounded-sm bg-clay-soft p-3 text-sm text-clay">{error}</p>
      )}

      {items === null && !error && (
        <div className="item-grid">
          {Array.from({ length: 3 }).map((_, i) => (
            <ItemCardSkeleton key={i} />
          ))}
        </div>
      )}

      {items && items.length === 0 && (
        <div className="border-t border-line pt-5 text-sm text-ink-3">
          <p className="font-medium text-ink-2">Ingen favoritter enda</p>
          <p className="mt-1">
            Trykk hjertet på en vare for å lagre den her.
          </p>
          <Link
            href="/varer"
            className="btn btn-ink btn-sm mt-4"
          >
            Utforsk varer
          </Link>
        </div>
      )}

      {items && items.length > 0 && (
        <div className="item-grid">
          {items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              seller={item.seller_id ? sellers[item.seller_id] : null}
            />
          ))}
        </div>
      )}
    </section>
  );
}
