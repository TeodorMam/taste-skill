"use client";

import { memo, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  type Item,
  type Profile,
  BRANDS,
  SIZES,
  CONDITIONS,
  AREAS,
  GENDERS,
  COLORS,
  FITS,
  CATEGORY_TREE,
  CATEGORY_PARENTS,
  type CategoryParent,
} from "@/lib/supabase";
import { createClient } from "@/utils/supabase/client";
import { ItemCard } from "@/components/ItemCard";
import { ItemCardSkeleton } from "@/components/ItemCardSkeleton";
import { Icon } from "@/components/Icon";
import { BottomSheet } from "@/components/BottomSheet";

const PAGE_SIZE = 24;
const PRICE_MAX = 2000;
type Sort = "newest" | "price_asc" | "price_desc";
type FilterKey = "gender" | "color" | "condition" | "fit" | "cat" | "size" | "location" | "brand";

export default function BrowsePage() {
  return (
    <Suspense fallback={<SkeletonGrid />}>
      <BrowseInner />
    </Suspense>
  );
}

function BrowseInner() {
  const router = useRouter();
  const params = useSearchParams();

  const [items, setItems] = useState<Item[]>([]);
  const [sellers, setSellers] = useState<Record<string, Profile>>({});
  const [total, setTotal] = useState<number | null>(null);
  const [offset, setOffset] = useState(0);
  const [initialLoading, setInitialLoading] = useState(true);
  const isFirstLoad = useRef(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);
  // The search input lives in its own memoized <SearchBar/> below so its
  // keystrokes never re-render this ~700-line component. It debounces
  // internally and calls onCommit only when the value should hit the URL
  // + query. debouncedQ mirrors the last committed value.
  const initialQ = params.get("q") ?? "";
  const [debouncedQ, setDebouncedQ] = useState(initialQ);
  const [showFilter, setShowFilter] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [activeFilterPanel, setActiveFilterPanel] = useState<FilterKey | null>(null);
  const [localPriceMin, setLocalPriceMin] = useState(0);
  const [localPriceMax, setLocalPriceMax] = useState(PRICE_MAX);

  // Memoize the Supabase client so we don't spin up a new one on every
  // render / effect fire. Under load this saves TCP setup and auth cost.
  const supabase = useMemo(() => createClient(), []);

  const urlQ = params.get("q") ?? "";
  const brand = params.get("brand") ?? "";
  const gender = params.get("gender") ?? "";
  const color = params.get("color") ?? "";
  const fit = params.get("fit") ?? "";
  const cat = params.get("cat") ?? "";
  const sub = params.get("sub") ?? "";
  const size = params.get("size") ?? "";
  const condition = params.get("condition") ?? "";
  const location = params.get("location") ?? "";
  const priceMinRaw = params.get("priceMin");
  const priceMaxRaw = params.get("priceMax");
  const priceMin = priceMinRaw !== null ? Number(priceMinRaw) : 0;
  const priceMax = priceMaxRaw !== null ? Number(priceMaxRaw) : PRICE_MAX;
  const sort = (params.get("sort") as Sort) ?? "newest";
  const shipping = params.get("shipping") ?? "";

  useEffect(() => {
    setLocalPriceMin(priceMin);
    setLocalPriceMax(priceMax);
  }, [priceMin, priceMax]);

  // Stable ref so <SearchBar/>'s onCommit can push the latest URL search
  // string without re-subscribing every render. Router itself is stable
  // across renders in Next 13+.
  const paramsStrRef = useRef(params.toString());
  paramsStrRef.current = params.toString();

  const commitSearchQuery = useCallback((value: string) => {
    setDebouncedQ(value);
    const next = new URLSearchParams(paramsStrRef.current);
    if (value) next.set("q", value);
    else next.delete("q");
    router.replace(`/varer${next.toString() ? `?${next.toString()}` : ""}`, { scroll: false });
  }, [router]);

  useEffect(() => {
    // Cache the "which brands actually exist" set for 10 min in sessionStorage.
    // Hits every browse mount otherwise and blocks nothing meaningful, the
    // list barely changes.
    const CACHE_KEY = "aktivbruk:brand-set";
    const TTL_MS = 10 * 60 * 1000;
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { at: number; brands: string[] };
        if (Date.now() - parsed.at < TTL_MS) {
          setAvailableBrands(parsed.brands);
          return;
        }
      }
    } catch {
      // no-op, fall through to fetch
    }

    supabase
      .from("items")
      .select("brand")
      .not("brand", "is", null)
      .then(({ data }) => {
        if (!data) return;
        const set = new Set((data as { brand: string }[]).map((r) => r.brand).filter(Boolean));
        const brands = BRANDS.filter((b) => set.has(b));
        setAvailableBrands(brands);
        try {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), brands }));
        } catch { /* quota, private mode, ignore */ }
      });
  }, [supabase]);

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.replace(`/varer${next.toString() ? `?${next.toString()}` : ""}`, { scroll: false });
  }

  function setMultiParam(updates: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    router.replace(`/varer${next.toString() ? `?${next.toString()}` : ""}`, { scroll: false });
  }

  function setCat(value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set("cat", value);
    else next.delete("cat");
    next.delete("sub");
    router.replace(`/varer${next.toString() ? `?${next.toString()}` : ""}`, { scroll: false });
  }

  function clearAll() {
    setLocalPriceMin(0);
    setLocalPriceMax(PRICE_MAX);
    router.replace("/varer", { scroll: false });
  }

  function commitPrice() {
    setMultiParam({
      priceMin: localPriceMin === 0 ? "" : String(localPriceMin),
      priceMax: localPriceMax >= PRICE_MAX ? "" : String(localPriceMax),
    });
  }

  const buildQuery = useCallback(
    (supabase: ReturnType<typeof createClient>, from: number) => {
      const needle = debouncedQ.trim();
      const activeParent = (cat || null) as CategoryParent | null;

      // eslint-disable-next-line prefer-const
      let q = supabase.from("items").select("*", { count: "exact" }).eq("is_sold", false);

      if (gender) q = q.eq("gender", gender);
      if (color) q = q.eq("color", color);
      if (fit) q = q.eq("fit", fit);
      if (brand) q = q.eq("brand", brand);
      if (sub) {
        q = q.eq("category", sub);
      } else if (activeParent) {
        const group = CATEGORY_TREE.find((g) => g.name === activeParent);
        if (group) q = q.in("category", group.children);
      }
      if (size) q = q.eq("size", size);
      if (condition) q = q.eq("condition", condition);
      if (location) q = q.eq("location", location);
      if (shipping === "sendes") q = q.neq("shipping", "Kun henting");
      if (priceMin > 0) q = q.gte("price", priceMin);
      if (priceMax < PRICE_MAX) q = q.lte("price", priceMax);
      if (needle) q = q.or(`title.ilike.%${needle}%,brand.ilike.%${needle}%`);

      if (sort === "price_asc") q = q.order("price", { ascending: true });
      else if (sort === "price_desc") q = q.order("price", { ascending: false });
      else q = q.order("created_at", { ascending: false });

      return q.range(from, from + PAGE_SIZE - 1);
    },
    [debouncedQ, gender, color, fit, brand, cat, sub, size, condition, location, priceMin, priceMax, sort, shipping],
  );

  useEffect(() => {
    let cancelled = false;
    setInitialLoading(true);
    setError(null);

    buildQuery(supabase, 0).then(({ data, error, count }) => {
      if (cancelled) return;
      if (error) { setError(error.message); setInitialLoading(false); return; }
      const rows = (data ?? []) as Item[];
      setItems(rows);
      setTotal(count ?? null);
      setOffset(PAGE_SIZE);
      setInitialLoading(false);
      isFirstLoad.current = false;

      const ids = Array.from(new Set(rows.map((r) => r.seller_id).filter((x): x is string => !!x)));
      if (ids.length === 0) return;
      supabase.from("profiles_public").select("*").in("user_id", ids).then(({ data: pData }) => {
        if (cancelled) return;
        const map: Record<string, Profile> = {};
        for (const p of (pData ?? []) as Profile[]) map[p.user_id] = p;
        setSellers(map);
      });
    });

    return () => { cancelled = true; };
  }, [buildQuery, supabase]);

  async function loadMore() {
    setLoadingMore(true);
    const { data, error } = await buildQuery(supabase, offset);
    if (error) { setError(error.message); setLoadingMore(false); return; }
    const rows = (data ?? []) as Item[];
    setItems((prev) => [...prev, ...rows]);
    setOffset((prev) => prev + PAGE_SIZE);
    setLoadingMore(false);

    const existingIds = new Set(Object.keys(sellers));
    const newIds = Array.from(new Set(rows.map((r) => r.seller_id).filter((x): x is string => !!x && !existingIds.has(x))));
    if (newIds.length === 0) return;
    const { data: pData } = await supabase.from("profiles_public").select("*").in("user_id", newIds);
    const map: Record<string, Profile> = {};
    for (const p of (pData ?? []) as Profile[]) map[p.user_id] = p;
    setSellers((prev) => ({ ...prev, ...map }));
  }

  const hasMore = total !== null && items.length < total;
  const priceActive = priceMin > 0 || priceMax < PRICE_MAX;

  const activeChips: { label: string; clear: () => void }[] = [];
  if (gender) activeChips.push({ label: gender, clear: () => setParam("gender", "") });
  if (color) activeChips.push({ label: color, clear: () => setParam("color", "") });
  if (fit) activeChips.push({ label: fit, clear: () => setParam("fit", "") });
  if (brand) activeChips.push({ label: brand, clear: () => setParam("brand", "") });
  if (cat) activeChips.push({ label: sub ? `${cat} › ${sub}` : cat, clear: () => setCat("") });
  if (size) activeChips.push({ label: `Str. ${size}`, clear: () => setParam("size", "") });
  if (condition) activeChips.push({ label: condition, clear: () => setParam("condition", "") });
  if (location) activeChips.push({ label: location, clear: () => setParam("location", "") });
  if (shipping) activeChips.push({ label: "Kan sendes", clear: () => setParam("shipping", "") });
  if (priceActive) {
    const lbl = priceMax >= PRICE_MAX ? `${priceMin}+ kr` : `${priceMin}–${priceMax} kr`;
    activeChips.push({ label: lbl, clear: () => setMultiParam({ priceMin: "", priceMax: "" }) });
  }

  const activeFilterCount = activeChips.length;

  const SORT_OPTIONS: { value: Sort; label: string }[] = [
    { value: "newest", label: "Nyeste først" },
    { value: "price_asc", label: "Pris lav → høy" },
    { value: "price_desc", label: "Pris høy → lav" },
  ];

  // Only show value if user has actively selected something (no "Alle" noise)
  const filterRows: { key: FilterKey; label: string; value: string }[] = [
    { key: "gender", label: "Kjønn", value: gender },
    { key: "color", label: "Farge", value: color },
    { key: "condition", label: "Tilstand", value: condition },
    { key: "fit", label: "Passform", value: fit },
    { key: "cat", label: "Kategori", value: sub ? `${cat} › ${sub}` : cat },
    { key: "size", label: "Størrelse", value: size },
    { key: "location", label: "Lokasjon", value: location },
    { key: "brand", label: "Merke", value: brand },
  ];

  function handleFilterSelect(key: string, value: string) {
    if (key === "cat") { setCat(value); }
    else if (key === "sub") { setParam("sub", value); }
    else { setParam(key, value); }
  }

  return (
    <>
      <section className="pb-6">
        <div className="flex flex-col gap-4 pb-4 lg:flex-row lg:items-end lg:justify-between lg:gap-10 lg:pb-6 lg:pt-4">
          <h1 className="text-[40px] leading-none lg:text-[64px]">Utforsk</h1>
          <div className="w-full lg:max-w-[590px]">
            <SearchBar externalValue={urlQ} onCommit={commitSearchQuery} />
          </div>
        </div>

        {/* Filter + sort bar, same layout on mobile and desktop.
            Filter/Sort sit as pill buttons on the left; active-filter
            chips scroll horizontally to their right. */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:border-y lg:border-t-ink lg:border-b-line lg:py-3.5">
        <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] lg:mx-0 lg:px-0 [&::-webkit-scrollbar]:hidden">
          <button
            onClick={() => setShowSort(true)}
            className="chip"
          >
            <Icon name="sorter" size={16} />
            Sorter
          </button>
          <button
            onClick={() => { setActiveFilterPanel(null); setShowFilter(true); }}
            className={`chip num ${activeFilterCount > 0 ? "chip-on" : ""}`}
          >
            <Icon name="filter" size={16} />
            {activeFilterCount > 0 ? `Filter (${activeFilterCount})` : "Filter"}
          </button>
          {activeChips.length > 0 && (
            <>
              <div className="h-5 w-px shrink-0 bg-line" />
              {activeChips.map((chip) => (
                <button
                  key={chip.label}
                  onClick={chip.clear}
                  className="chip"
                >
                  <ChipLabel text={chip.label} />
                  <Icon name="kryss" size={12} className="ml-0.5 text-ink-2" />
                </button>
              ))}
              <button
                onClick={clearAll}
                className="tbtn shrink-0 px-2 text-sm"
              >
                Nullstill
              </button>
            </>
          )}
        </div>

        {total !== null && (
          <p className="num flex items-center text-[13px] text-ink-3">
            {total} vare{total === 1 ? "" : "r"}
          </p>
        )}
        </div>

        {/* Thin progress bar while a new query loads, instead of a spinner in
            the text. */}
        <div className="relative mb-6 mt-3 h-0.5 overflow-hidden lg:mt-0">
          {initialLoading && !isFirstLoad.current && (
            <span className="absolute inset-y-0 left-0 w-[38%] animate-pulse bg-ink" />
          )}
        </div>

        {error && <p className="rounded-sm bg-clay-soft p-3 text-sm text-clay">{error}</p>}

        {initialLoading && isFirstLoad.current && <SkeletonGrid />}

        {!initialLoading && items.length === 0 && (
          <div className="text-[15px] text-ink-2">
            <Icon name="soek" size={28} className="text-ink-3" />
            <p className="mt-3 text-[26px] font-[680] leading-[1.08] text-ink [font-stretch:80%]">Ingen treff</p>
            <p className="mt-1.5">Prøv å nullstille filtrene eller søke bredere.</p>
            {activeChips.length > 0 && (
              <button onClick={clearAll} className="btn btn-ink mt-5">
                Nullstill filtre
              </button>
            )}
          </div>
        )}

        {items.length > 0 && (
          <>
            <div className={`item-grid transition-opacity duration-200 ${initialLoading && !isFirstLoad.current ? "opacity-40 pointer-events-none" : ""}`}>
              {items.map((item) => (
                <ItemCard key={item.id} item={item} seller={item.seller_id ? sellers[item.seller_id] : null} />
              ))}
            </div>
            {hasMore && (
              <div className="flex justify-center pt-10 lg:pt-14">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="btn btn-line px-10"
                >
                  {loadingMore ? "Laster…" : "Se flere"}
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* Sort sheet */}
      {showSort && (
        <BottomSheet onClose={() => setShowSort(false)} closeLabel="Lukk sortering">
            <div className="px-4 pb-10 pt-2">
              <p className="pb-2 text-[17px] font-[620] text-ink">Sorter etter</p>
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { setParam("sort", opt.value === "newest" ? "" : opt.value); setShowSort(false); }}
                  className={`flex min-h-[52px] w-full items-center justify-between border-b border-line text-[15px] ${sort === opt.value ? "font-[650] text-ink" : "font-medium text-ink-2"}`}
                >
                  <ChipLabel text={opt.label} />
                  {sort === opt.value && <Icon name="hake" size={18} />}
                </button>
              ))}
            </div>
        </BottomSheet>
      )}

      {/* Filter sheet, bottom-anchored so the results grid stays partly
          visible above (Finn/Tise pattern). Swipe down anywhere on it to
          close; the list scrolls first and drags the sheet from the top. */}
      {showFilter && (
        <BottomSheet
          onClose={() => { setShowFilter(false); setActiveFilterPanel(null); }}
          closeLabel="Lukk filter"
          className="flex flex-col"
          style={{ maxHeight: "62vh" }}
        >
            <div className="flex shrink-0 items-center justify-between border-b border-line px-4 pb-1 pt-1">
              {activeFilterPanel ? (
                <button
                  onClick={() => setActiveFilterPanel(null)}
                  className="tbtn font-[550] text-ink-2 hover:text-ink"
                >
                  <Icon name="pil-v" size={18} /> Tilbake
                </button>
              ) : (
                <p className="flex min-h-[44px] items-center text-[17px] font-[620] text-ink">Filter</p>
              )}
              <button onClick={clearAll} className="tbtn text-sm">
                Nullstill
              </button>
            </div>

            <div data-sheet-scroll className="flex-1 overflow-y-auto overscroll-contain">
              {!activeFilterPanel ? (
                <div className="divide-y divide-line px-4">
                  {/* Clickable filter rows, only show value when actively selected */}
                  {filterRows.map((row) => (
                    <button
                      key={row.key}
                      onClick={() => setActiveFilterPanel(row.key)}
                      className="flex min-h-[56px] w-full items-center justify-between"
                    >
                      <span className="text-[15px] font-medium text-ink">{row.label}</span>
                      <span className="flex items-center gap-2">
                        {row.value && (
                          <span className="text-[15px] font-[650] text-ink"><ChipLabel text={row.value} /></span>
                        )}
                        <Icon name="chevron-h" size={18} className="text-ink-2" />
                      </span>
                    </button>
                  ))}

                  {/* Kan sendes toggle */}
                  <div className="flex min-h-[56px] items-center justify-between">
                    <span className="text-[15px] font-medium text-ink">Kan sendes</span>
                    <button
                      onClick={() => setParam("shipping", shipping === "sendes" ? "" : "sendes")}
                      role="switch"
                      aria-checked={shipping === "sendes"}
                      className={`relative h-6 w-11 rounded-sm transition-colors ${shipping === "sendes" ? "bg-ink" : "bg-line-2"}`}
                    >
                      <span className={`absolute top-0.5 h-5 w-5 rounded-sm bg-raised transition-transform duration-150 ease-out ${shipping === "sendes" ? "translate-x-5" : "translate-x-0.5"}`} />
                    </button>
                  </div>

                  {/* Price slider, inline, no sub-panel */}
                  <div className="py-5 space-y-5">
                    <p className="text-[15px] font-medium text-ink">Pris</p>
                    <div className="space-y-1">
                      <input
                        type="range" min={0} max={PRICE_MAX} step={50}
                        aria-label="Laveste pris"
                        value={localPriceMin}
                        onChange={(e) => setLocalPriceMin(Math.min(Number(e.target.value), localPriceMax - 50))}
                        onMouseUp={commitPrice}
                        onTouchEnd={commitPrice}
                        className="w-full accent-ink"
                      />
                      <input
                        type="range" min={0} max={PRICE_MAX} step={50}
                        aria-label="Høyeste pris"
                        value={localPriceMax}
                        onChange={(e) => setLocalPriceMax(Math.max(Number(e.target.value), localPriceMin + 50))}
                        onMouseUp={commitPrice}
                        onTouchEnd={commitPrice}
                        className="w-full accent-ink"
                      />
                      <div className="num flex justify-between pt-1 text-[13px] text-ink-3">
                        <span>Min: <span className="font-medium text-ink-2">{localPriceMin} kr</span></span>
                        <span>Max: <span className="font-medium text-ink-2">{localPriceMax >= PRICE_MAX ? "∞" : `${localPriceMax} kr`}</span></span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <FilterSubPanel
                  filterKey={activeFilterPanel}
                  gender={gender}
                  color={color}
                  fit={fit}
                  brand={brand}
                  cat={cat}
                  sub={sub}
                  size={size}
                  condition={condition}
                  location={location}
                  availableBrands={availableBrands}
                  onSelect={handleFilterSelect}
                />
              )}
            </div>

            {/* Sticky CTA */}
            <div className="shrink-0 border-t border-line px-4 pb-8 pt-3">
              <button
                onClick={() => { setShowFilter(false); setActiveFilterPanel(null); }}
                className="btn btn-olive btn-lg num w-full"
              >
                {total !== null ? `Se ${total} annonser` : "Se annonser"}
              </button>
            </div>
        </BottomSheet>
      )}
    </>
  );
}

function FilterSubPanel({
  filterKey,
  gender, color, fit, brand, cat, sub, size, condition, location,
  availableBrands, onSelect,
}: {
  filterKey: FilterKey;
  gender: string; color: string; fit: string; brand: string; cat: string; sub: string;
  size: string; condition: string; location: string;
  availableBrands: string[];
  onSelect: (key: string, value: string) => void;
}) {
  if (filterKey === "gender") return (
    <OptionList>
      <OptionRow label="Alle" active={!gender} onClick={() => onSelect("gender", "")} />
      {GENDERS.map((g) => <OptionRow key={g} label={g} active={gender === g} onClick={() => onSelect("gender", g)} />)}
    </OptionList>
  );

  if (filterKey === "color") return (
    <OptionList>
      <OptionRow label="Alle farger" active={!color} onClick={() => onSelect("color", "")} />
      {COLORS.map((c) => <OptionRow key={c} label={c} active={color === c} onClick={() => onSelect("color", c)} />)}
    </OptionList>
  );

  if (filterKey === "condition") return (
    <OptionList>
      <OptionRow label="Alle tilstander" active={!condition} onClick={() => onSelect("condition", "")} />
      {CONDITIONS.map((c) => <OptionRow key={c} label={c} active={condition === c} onClick={() => onSelect("condition", c)} />)}
    </OptionList>
  );

  if (filterKey === "fit") return (
    <OptionList>
      <OptionRow label="Alle passformer" active={!fit} onClick={() => onSelect("fit", "")} />
      {FITS.map((f) => <OptionRow key={f} label={f} active={fit === f} onClick={() => onSelect("fit", f)} />)}
    </OptionList>
  );

  if (filterKey === "cat") return (
    <OptionList>
      <OptionRow label="Alle kategorier" active={!cat} onClick={() => onSelect("cat", "")} />
      {CATEGORY_PARENTS.map((parent) => {
        const group = CATEGORY_TREE.find((g) => g.name === parent);
        return (
          <div key={parent}>
            <OptionRow label={parent} active={cat === parent && !sub} onClick={() => onSelect("cat", parent)} />
            {cat === parent && group?.children.map((child) => (
              <OptionRow key={child} label={child} active={sub === child} indented onClick={() => onSelect("sub", child)} />
            ))}
          </div>
        );
      })}
    </OptionList>
  );

  if (filterKey === "size") return (
    <OptionList>
      <OptionRow label="Alle størrelser" active={!size} onClick={() => onSelect("size", "")} />
      {SIZES.map((s) => <OptionRow key={s} label={s} active={size === s} onClick={() => onSelect("size", s)} />)}
    </OptionList>
  );

  if (filterKey === "location") return (
    <OptionList>
      <OptionRow label="Hele Norge" active={!location} onClick={() => onSelect("location", "")} />
      {AREAS.map((a) => <OptionRow key={a} label={a} active={location === a} onClick={() => onSelect("location", a)} />)}
    </OptionList>
  );

  if (filterKey === "brand") return (
    <OptionList>
      <OptionRow label="Alle merker" active={!brand} onClick={() => onSelect("brand", "")} />
      {availableBrands.length === 0 && (
        <p className="py-6 text-sm text-ink-3">Ingen merker tilgjengelig ennå.</p>
      )}
      {availableBrands.map((b) => <OptionRow key={b} label={b} active={brand === b} onClick={() => onSelect("brand", b)} />)}
    </OptionList>
  );

  return null;
}

// Isolated search input: keeps its own state and its own 200 ms debounce,
// so keystrokes never re-render BrowseInner. It only calls onCommit when
// the value should actually hit the URL + the Supabase query. externalValue
// lets the parent reset it (Nullstill, browser back) without a sync loop
// lastCommittedRef tracks what we ourselves last pushed.
const SearchBar = memo(function SearchBar({
  externalValue,
  onCommit,
}: {
  externalValue: string;
  onCommit: (value: string) => void;
}) {
  const [value, setValue] = useState(externalValue);
  const lastCommittedRef = useRef(externalValue);
  const onCommitRef = useRef(onCommit);
  onCommitRef.current = onCommit;

  useEffect(() => {
    if (value === lastCommittedRef.current) return;
    const timer = setTimeout(() => {
      lastCommittedRef.current = value;
      onCommitRef.current(value);
    }, 200);
    return () => clearTimeout(timer);
  }, [value]);

  useEffect(() => {
    if (externalValue === lastCommittedRef.current) return;
    lastCommittedRef.current = externalValue;
    setValue(externalValue);
  }, [externalValue]);

  return (
    <div className="relative">
      <Icon name="soek" size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3" />
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Søk tittel eller merke…"
        className="field pl-10"
      />
    </div>
  );
});

function OptionList({ children }: { children: React.ReactNode }) {
  return <div className="divide-y divide-line px-4">{children}</div>;
}

function OptionRow({ label, active, onClick, indented = false }: {
  label: string; active: boolean; onClick: () => void; indented?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex min-h-[52px] w-full items-center justify-between text-[15px] ${indented ? "pl-5" : ""} ${active ? "font-[650] text-ink" : "font-medium text-ink-2"}`}
    >
      {label}
      {active && <Icon name="hake" size={18} />}
    </button>
  );
}

function SkeletonGrid() {
  return (
    <div className="item-grid">
      {Array.from({ length: 6 }).map((_, i) => <ItemCardSkeleton key={i} />)}
    </div>
  );
}

// Labels like "Overdel › T-skjorte" and "Pris lav → høy" keep their text for
// screen readers, but the separator character is drawn as an icon.
function ChipLabel({ text }: { text: string }) {
  const parts = text.split(/ ([›→]) /);
  if (parts.length === 1) return <>{text}</>;
  return (
    <span className="inline-flex items-center gap-1.5">
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <span key={i} className="inline-flex">
            <Icon name={part === "›" ? "chevron-h" : "pil-h"} size={14} />
            <span className="sr-only">{part}</span>
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </span>
  );
}
