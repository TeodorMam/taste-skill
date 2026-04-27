"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { type Item, type SavedSearch, formatPrice, itemImages, PRICE_BUCKETS, CATEGORY_TREE } from "@/lib/supabase";

type SearchWithCount = SavedSearch & { newCount: number };
type FavItem = Item & { priceWhenFavorited: number | null };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyFilters(q: any, filters: Record<string, string>): any {
  const { brand, cat, sub, size, condition, location, shipping, price: priceKey, q: needle } = filters;
  const bucket = PRICE_BUCKETS.find((b) => b.key === priceKey);
  if (brand) q = q.eq("brand", brand);
  if (sub) {
    q = q.eq("category", sub);
  } else if (cat) {
    const group = CATEGORY_TREE.find((g) => g.name === cat);
    if (group) q = q.in("category", [...group.children]);
  }
  if (size) q = q.eq("size", size);
  if (condition) q = q.eq("condition", condition);
  if (location) q = q.eq("location", location);
  if (shipping === "sendes") q = q.neq("shipping", "Kun henting");
  if (bucket) q = q.gte("price", bucket.min).lt("price", bucket.max);
  if (needle?.trim()) q = q.or(`title.ilike.%${needle.trim()}%,brand.ilike.%${needle.trim()}%`);
  return q;
}

function filtersToUrl(filters: Record<string, string>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) if (v) p.set(k, v);
  const qs = p.toString();
  return `/browse${qs ? `?${qs}` : ""}`;
}

export default function VarslerPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const [tab, setTab] = useState<"searches" | "favorites">("searches");
  const [searches, setSearches] = useState<SearchWithCount[] | null>(null);
  const [favItems, setFavItems] = useState<FavItem[] | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id ?? null;
      setUserId(uid);
      if (!uid) return;

      // Fetch saved searches with new-item counts
      supabase
        .from("saved_searches")
        .select("*")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .then(async ({ data: sData }) => {
          if (!sData) { setSearches([]); return; }
          const ss = sData as SavedSearch[];
          const withCounts = await Promise.all(
            ss.map(async (s) => {
              let q = supabase
                .from("items")
                .select("id", { count: "exact", head: true })
                .eq("is_sold", false)
                .gt("created_at", s.last_seen_at);
              q = applyFilters(q, s.filters);
              const { count } = await q;
              return { ...s, newCount: count ?? 0 };
            }),
          );
          setSearches(withCounts);
        });

      // Fetch favorited items with price_when_favorited
      supabase
        .from("favorites")
        .select("price_when_favorited, items(*)")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .then(({ data: fData }) => {
          const rows = (fData ?? []) as unknown as {
            price_when_favorited: number | null;
            items: Item | null;
          }[];
          const list: FavItem[] = rows
            .filter((r) => r.items !== null)
            .map((r) => ({ ...r.items!, priceWhenFavorited: r.price_when_favorited }));
          setFavItems(list);
        });
    });
  }, [supabase]);

  async function openSearch(s: SearchWithCount) {
    await supabase
      .from("saved_searches")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", s.id);
    router.push(filtersToUrl(s.filters));
  }

  async function deleteSearch(id: string) {
    await supabase.from("saved_searches").delete().eq("id", id);
    setSearches((prev) => prev?.filter((s) => s.id !== id) ?? null);
  }

  async function removeFavorite(itemId: string) {
    if (!userId) return;
    await supabase.from("favorites").delete().eq("user_id", userId).eq("item_id", itemId);
    setFavItems((prev) => prev?.filter((f) => f.id !== itemId) ?? null);
  }

  const priceDrop = (favItems ?? []).filter(
    (f) => !f.is_sold && f.priceWhenFavorited !== null && f.price < f.priceWhenFavorited,
  );
  const soldFavs = (favItems ?? []).filter((f) => f.is_sold);
  const favAlertCount = priceDrop.length + soldFavs.length;

  if (userId === undefined) return <p className="py-6 text-sm text-stone-500">Laster…</p>;

  if (userId === null) {
    return (
      <section className="space-y-3 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">Varsler</h1>
        <p className="text-sm text-stone-600">Logg inn for å bruke varsler.</p>
        <Link
          href="/login?next=/varsler"
          className="inline-block rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-stone-50 hover:bg-black"
        >
          Logg inn
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <h1 className="text-3xl font-semibold tracking-tight">Varsler</h1>

      {/* Tab switcher */}
      <div className="flex gap-1 rounded-xl bg-stone-100 p-1">
        <button
          onClick={() => setTab("searches")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
            tab === "searches"
              ? "bg-white text-stone-900 shadow-sm"
              : "text-stone-500 hover:text-stone-700"
          }`}
        >
          Lagrede søk
          {searches !== null && searches.some((s) => s.newCount > 0) && (
            <span className="rounded-full bg-[#5a6b32] px-1.5 py-0.5 text-[10px] font-semibold text-white">
              {searches.reduce((acc, s) => acc + (s.newCount > 0 ? 1 : 0), 0)}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("favorites")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
            tab === "favorites"
              ? "bg-white text-stone-900 shadow-sm"
              : "text-stone-500 hover:text-stone-700"
          }`}
        >
          Favoritter
          {favAlertCount > 0 && (
            <span className="rounded-full bg-[#5a6b32] px-1.5 py-0.5 text-[10px] font-semibold text-white">
              {favAlertCount}
            </span>
          )}
        </button>
      </div>

      {/* Saved searches tab */}
      {tab === "searches" && (
        <>
          {searches === null && <p className="text-sm text-stone-500">Laster…</p>}
          {searches !== null && searches.length === 0 && (
            <div className="rounded-2xl border border-dashed border-stone-300 p-10 text-center space-y-2">
              <p className="font-medium text-stone-700">Ingen lagrede søk enda</p>
              <p className="text-sm text-stone-500">
                Sett filtre på{" "}
                <Link href="/browse" className="text-[#5a6b32] underline underline-offset-2">
                  Utforsk
                </Link>{" "}
                og trykk «Lagre søk».
              </p>
            </div>
          )}
          {searches !== null && searches.length > 0 && (
            <ul className="space-y-2">
              {searches.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-stone-900">{s.label}</p>
                      {s.newCount > 0 && (
                        <span className="shrink-0 rounded-full bg-[#5a6b32] px-2 py-0.5 text-[10px] font-semibold text-white">
                          {s.newCount} ny{s.newCount === 1 ? "" : "e"}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] text-stone-400">
                      Sist sjekket{" "}
                      {new Date(s.last_seen_at).toLocaleDateString("no-NO", {
                        day: "numeric",
                        month: "short",
                      })}
                    </p>
                  </div>
                  <button
                    onClick={() => openSearch(s)}
                    className="shrink-0 rounded-full bg-stone-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-black"
                  >
                    Utforsk
                  </button>
                  <button
                    onClick={() => deleteSearch(s.id)}
                    className="shrink-0 text-stone-300 hover:text-red-500 transition"
                    title="Slett søk"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {/* Favorites tab */}
      {tab === "favorites" && (
        <>
          {favItems === null && <p className="text-sm text-stone-500">Laster…</p>}

          {favItems !== null && favItems.length === 0 && (
            <div className="rounded-2xl border border-dashed border-stone-300 p-10 text-center space-y-2">
              <p className="font-medium text-stone-700">Ingen favoritter enda</p>
              <p className="text-sm text-stone-500">
                Trykk hjertet på en vare for å følge med på prisfall og tilgjengelighet.
              </p>
              <Link
                href="/browse"
                className="mt-2 inline-block rounded-full bg-stone-900 px-5 py-2.5 text-xs font-medium text-stone-50 hover:bg-black"
              >
                Utforsk varer
              </Link>
            </div>
          )}

          {favItems !== null && favItems.length > 0 && priceDrop.length === 0 && soldFavs.length === 0 && (
            <div className="rounded-2xl border border-dashed border-stone-300 p-8 text-center">
              <p className="font-medium text-stone-700">Ingen endringer enda</p>
              <p className="mt-1 text-sm text-stone-500">
                Du følger {favItems.length} vare{favItems.length !== 1 ? "r" : ""}. Vi varsler deg om prisfall og om varer blir solgt.
              </p>
            </div>
          )}

          {priceDrop.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wider text-stone-500">
                Prisfall
              </p>
              <ul className="space-y-2">
                {priceDrop.map((item) => {
                  const cover = itemImages(item)[0];
                  const drop = Math.round((1 - item.price / item.priceWhenFavorited!) * 100);
                  return (
                    <li key={item.id} className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-3">
                      <Link href={`/item/${item.id}`} className="shrink-0">
                        {cover ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={cover}
                            alt={item.title}
                            className="h-14 w-14 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="h-14 w-14 rounded-lg bg-stone-100" />
                        )}
                      </Link>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{item.title}</p>
                        <div className="mt-0.5 flex items-center gap-1.5">
                          <span className="text-xs text-stone-400 line-through">
                            {formatPrice(item.priceWhenFavorited!)}
                          </span>
                          <span className="text-xs font-semibold text-[#5a6b32]">
                            {formatPrice(item.price)}
                          </span>
                          <span className="rounded-full bg-[#5a6b32]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#5a6b32]">
                            −{drop}%
                          </span>
                        </div>
                      </div>
                      <Link
                        href={`/item/${item.id}`}
                        className="shrink-0 rounded-full bg-stone-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-black"
                      >
                        Se annonse
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {soldFavs.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wider text-stone-500">
                Solgte favoritter
              </p>
              <ul className="space-y-2">
                {soldFavs.map((item) => {
                  const cover = itemImages(item)[0];
                  return (
                    <li key={item.id} className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-3 opacity-70">
                      <div className="relative shrink-0">
                        {cover ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={cover}
                            alt={item.title}
                            className="h-14 w-14 rounded-lg object-cover grayscale"
                          />
                        ) : (
                          <div className="h-14 w-14 rounded-lg bg-stone-100" />
                        )}
                        <span className="absolute -bottom-1 -right-1 rounded-full bg-stone-800 px-1.5 py-px text-[8px] font-bold uppercase tracking-wide text-white">
                          Solgt
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-stone-500">{item.title}</p>
                        <p className="text-xs text-stone-400">{formatPrice(item.price)}</p>
                      </div>
                      <button
                        onClick={() => removeFavorite(item.id)}
                        className="shrink-0 rounded-full border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-500 hover:border-red-300 hover:text-red-500 transition"
                      >
                        Fjern
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  );
}
