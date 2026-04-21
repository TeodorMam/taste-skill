"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { type Item, formatPrice, itemImages } from "@/lib/supabase";
import { createClient } from "@/utils/supabase/client";
import { ChatPanel } from "@/components/ChatPanel";
import { ItemCard } from "@/components/ItemCard";
import { Carousel } from "@/components/Carousel";

export default function ItemPage() {
  const params = useParams<{ id: string }>();
  const supabase = useMemo(() => createClient(), []);
  const [item, setItem] = useState<Item | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null | undefined>(undefined);

  const [buyerThreads, setBuyerThreads] = useState<string[]>([]);
  const [activeBuyer, setActiveBuyer] = useState<string | null>(null);

  const [similar, setSimilar] = useState<Item[]>([]);

  useEffect(() => {
    if (!params.id) return;
    supabase
      .from("items")
      .select("*")
      .eq("id", params.id)
      .single()
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setItem(data as Item);
      });
    supabase.auth
      .getUser()
      .then(({ data }) => setUserId(data.user?.id ?? null));
  }, [params.id, supabase]);

  const isSeller = !!item && !!userId && userId === item.seller_id;

  useEffect(() => {
    if (!item || !isSeller) return;
    supabase
      .from("messages")
      .select("buyer_id, created_at")
      .eq("item_id", item.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        const seen = new Set<string>();
        const ordered: string[] = [];
        for (const row of (data ?? []) as { buyer_id: string }[]) {
          if (!seen.has(row.buyer_id)) {
            seen.add(row.buyer_id);
            ordered.push(row.buyer_id);
          }
        }
        setBuyerThreads(ordered);
        setActiveBuyer((prev) => prev ?? ordered[0] ?? null);
      });
  }, [item, isSeller, supabase]);

  useEffect(() => {
    if (!item) return;
    const base = supabase.from("items").select("*").neq("id", item.id).limit(24);
    const query = item.brand ? base.eq("brand", item.brand) : base;
    query.then(({ data }) => {
      const rows = ((data ?? []) as Item[]).filter((i) => !i.is_sold);
      setSimilar(rows.slice(0, 6));
    });
  }, [item, supabase]);

  async function toggleSold() {
    if (!item) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("items")
      .update({ is_sold: !item.is_sold })
      .eq("id", item.id)
      .select("*")
      .single();
    setSaving(false);
    if (error) setError(error.message);
    else if (data) setItem(data as Item);
  }

  if (error) {
    return (
      <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
    );
  }
  if (!item) {
    return <p className="text-sm text-stone-500">Laster…</p>;
  }

  return (
    <article className="space-y-8">
      <Link href="/browse" className="text-sm text-stone-500 hover:text-black">
        ← Tilbake
      </Link>

      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
        <div className="relative">
          <Carousel images={itemImages(item)} alt={item.title} />
          {item.brand && (
            <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-[#5a6b32] backdrop-blur">
              {item.brand}
            </div>
          )}
          {item.is_sold && (
            <div className="pointer-events-none absolute left-3 bottom-3 rounded-full bg-stone-900 px-3 py-1 text-xs font-medium text-stone-50">
              Solgt
            </div>
          )}
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{item.title}</h1>
            <p className="text-2xl font-semibold">{formatPrice(item.price)}</p>
          </div>

          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            {item.brand && (
              <>
                <dt className="text-stone-500">Merke</dt>
                <dd className="text-right font-medium">{item.brand}</dd>
              </>
            )}
            <dt className="text-stone-500">Størrelse</dt>
            <dd className="text-right">{item.size}</dd>
            <dt className="text-stone-500">Tilstand</dt>
            <dd className="text-right">{item.condition}</dd>
            <dt className="text-stone-500">Sted</dt>
            <dd className="text-right">{item.location}</dd>
            <dt className="text-stone-500">Lagt ut</dt>
            <dd className="text-right">
              {new Date(item.created_at).toLocaleDateString("no-NO")}
            </dd>
          </dl>

          {userId === null && (
            <Link
              href={`/login?next=/item/${item.id}`}
              className="block w-full rounded-full bg-stone-900 px-5 py-3 text-center text-sm font-medium text-stone-50 hover:bg-black"
            >
              Logg inn for å chatte med selger
            </Link>
          )}

          {userId && !item.seller_id && (
            <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
              Denne annonsen ble lagt ut før brukerkontoer, så chat er ikke
              tilgjengelig. Bruk kontaktinfo nedenfor i stedet.
            </p>
          )}

          {userId && item.seller_id && !isSeller && (
            <ChatPanel
              itemId={item.id}
              buyerId={userId}
              sellerId={item.seller_id}
              meId={userId}
            />
          )}

          {isSeller && item.seller_id && (
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-stone-800">
                {buyerThreads.length
                  ? `Samtaler (${buyerThreads.length})`
                  : "Ingen meldinger enda"}
              </h2>
              {buyerThreads.length > 1 && (
                <div className="flex flex-wrap gap-2">
                  {buyerThreads.map((b, i) => (
                    <button
                      key={b}
                      onClick={() => setActiveBuyer(b)}
                      className={`rounded-full border px-3 py-1 text-xs ${
                        activeBuyer === b
                          ? "border-[#5a6b32] bg-[#5a6b32] text-white"
                          : "border-stone-300 text-stone-700 hover:border-stone-500"
                      }`}
                    >
                      Kjøper {i + 1}
                    </button>
                  ))}
                </div>
              )}
              {activeBuyer && (
                <ChatPanel
                  itemId={item.id}
                  buyerId={activeBuyer}
                  sellerId={item.seller_id}
                  meId={userId}
                />
              )}
            </div>
          )}

          <details className="rounded-lg border border-stone-200 bg-stone-50 p-3 text-sm">
            <summary className="cursor-pointer text-stone-600">
              Kontakt utenfor Aktivbruk
            </summary>
            <p className="mt-2 break-all font-medium">{item.contact}</p>
          </details>

          {isSeller && (
            <button
              onClick={toggleSold}
              disabled={saving}
              className="w-full rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-medium hover:border-stone-500 disabled:opacity-50"
            >
              {saving
                ? "Lagrer…"
                : item.is_sold
                  ? "Marker som tilgjengelig"
                  : "Marker som solgt"}
            </button>
          )}
        </div>
      </div>

      {similar.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-end justify-between">
            <h2 className="text-lg font-semibold tracking-tight">
              {item.brand ? `Flere fra ${item.brand}` : "Lignende varer"}
            </h2>
            {item.brand && (
              <Link
                href={`/browse?brand=${encodeURIComponent(item.brand)}`}
                className="text-xs font-medium text-[#5a6b32] hover:text-[#435022]"
              >
                Se alle →
              </Link>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {similar.map((s) => (
              <ItemCard key={s.id} item={s} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
