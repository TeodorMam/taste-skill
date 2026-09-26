"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { type Item, type SavedSearch, formatPrice, itemImages, PRICE_BUCKETS, CATEGORY_TREE } from "@/lib/supabase";
import { Icon } from "@/components/Icon";

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
  return `/varer${qs ? `?${qs}` : ""}`;
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

  if (userId === undefined) return <p className="py-6 text-sm text-ink-3">Laster…</p>;

  if (userId === null) {
    return (
      <section className="space-y-3 py-10">
        <h1 className="text-[40px] leading-none">Varsler</h1>
        <p className="text-sm text-ink-2">Logg inn for å bruke varsler.</p>
        <Link
          href="/logg-inn?next=/varsler"
          className="btn btn-ink"
        >
          Logg inn
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <h1 className="text-[40px] leading-none">Varsler</h1>

      {/* Tab switcher */}
      <div className="tabs">
        <button
          onClick={() => setTab("searches")}
          className={`tab ${tab === "searches" ? "tab-on" : ""}`}
        >
          Lagrede søk
          {searches !== null && searches.some((s) => s.newCount > 0) && (
            <span className="count">
              {searches.reduce((acc, s) => acc + (s.newCount > 0 ? 1 : 0), 0)}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("favorites")}
          className={`tab ${tab === "favorites" ? "tab-on" : ""}`}
        >
          Favoritter
          {favAlertCount > 0 && (
            <span className="count">
              {favAlertCount}
            </span>
          )}
        </button>
      </div>

      {/* Saved searches tab */}
      {tab === "searches" && (
        <>
          {searches === null && <p className="text-sm text-ink-3">Laster…</p>}
          {searches !== null && searches.length === 0 && (
            <div className="border-t border-line pt-5 space-y-2">
              <p className="font-medium text-ink-2">Ingen lagrede søk enda</p>
              <p className="text-sm text-ink-3">
                Sett filtre på{" "}
                <Link href="/varer" className="font-semibold text-ink underline underline-offset-2">
                  Utforsk
                </Link>{" "}
                og trykk «Lagre søk».
              </p>
            </div>
          )}
          {searches !== null && searches.length > 0 && (
            <ul className="border-t border-line">
              {searches.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center gap-3 border-b border-line py-3.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-[15px] font-[620] text-ink">{s.label}</p>
                      {s.newCount > 0 && (
                        <span className="count shrink-0">
                          {s.newCount} ny{s.newCount === 1 ? "" : "e"}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-ink-3">
                      Sist sjekket{" "}
                      {new Date(s.last_seen_at).toLocaleDateString("no-NO", {
                        day: "numeric",
                        month: "short",
                      })}
                    </p>
                  </div>
                  <button
                    onClick={() => openSearch(s)}
                    className="btn btn-ink btn-sm shrink-0"
                  >
                    Utforsk
                  </button>
                  <button
                    onClick={() => deleteSearch(s.id)}
                    className="-mr-3 flex h-11 w-11 shrink-0 items-center justify-center text-ink-2 hover:text-clay"
                    title="Slett søk"
                  >
                    <Icon name="kryss" size={18} />
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
          {favItems === null && <p className="text-sm text-ink-3">Laster…</p>}

          {favItems !== null && favItems.length === 0 && (
            <div className="border-t border-line pt-5 space-y-2">
              <p className="font-medium text-ink-2">Ingen favoritter enda</p>
              <p className="text-sm text-ink-3">
                Trykk hjertet på en vare for å følge med på prisfall og tilgjengelighet.
              </p>
              <Link
                href="/varer"
                className="btn btn-ink btn-sm mt-2"
              >
                Utforsk varer
              </Link>
            </div>
          )}

          {favItems !== null && favItems.length > 0 && priceDrop.length === 0 && soldFavs.length === 0 && (
            <div className="border-t border-line pt-5">
              <p className="font-medium text-ink-2">Ingen endringer enda</p>
              <p className="mt-1 text-sm text-ink-3">
                Du følger {favItems.length} vare{favItems.length !== 1 ? "r" : ""}. Vi varsler deg om prisfall og om varer blir solgt.
              </p>
            </div>
          )}

          {priceDrop.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-[620] text-ink">
                Prisfall
              </p>
              <ul className="border-t border-line">
                {priceDrop.map((item) => {
                  const cover = itemImages(item)[0];
                  const drop = Math.round((1 - item.price / item.priceWhenFavorited!) * 100);
                  return (
                    <li key={item.id} className="flex items-center gap-3 border-b border-line py-3.5">
                      <Link href={`/vare/${item.id}`} className="shrink-0">
                        {cover ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={cover}
                            alt={item.title}
                            className="h-[74px] w-14 bg-sunk object-cover"
                          />
                        ) : (
                          <div className="h-[74px] w-14 bg-sunk" />
                        )}
                      </Link>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-[620]">{item.title}</p>
                        <div className="mt-0.5 flex items-center gap-1.5">
                          <span className="text-xs text-ink-3 line-through">
                            {formatPrice(item.priceWhenFavorited!)}
                          </span>
                          <span className="price text-sm text-ink">
                            {formatPrice(item.price)}
                          </span>
                          <span className="num text-xs font-semibold text-olive">
                            −{drop}%
                          </span>
                        </div>
                      </div>
                      <Link
                        href={`/vare/${item.id}`}
                        className="btn btn-ink btn-sm shrink-0"
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
              <p className="text-sm font-[620] text-ink">
                Solgte favoritter
              </p>
              <ul className="border-t border-line">
                {soldFavs.map((item) => {
                  const cover = itemImages(item)[0];
                  return (
                    <li key={item.id} className="flex items-center gap-3 border-b border-line py-3.5 opacity-70">
                      <div className="relative shrink-0">
                        {cover ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={cover}
                            alt={item.title}
                            className="h-[74px] w-14 bg-sunk object-cover grayscale"
                          />
                        ) : (
                          <div className="h-[74px] w-14 bg-sunk" />
                        )}
                        <span className="absolute -bottom-1 -right-1 rounded-sm bg-ink px-1.5 py-px text-xs font-bold text-raised">
                          Solgt
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink-3">{item.title}</p>
                        <p className="text-xs text-ink-3">{formatPrice(item.price)}</p>
                      </div>
                      <button
                        onClick={() => removeFavorite(item.id)}
                        className="btn btn-quiet btn-sm shrink-0"
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
