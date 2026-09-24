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
  // Swipe-down state for the filter sheet's drag handle. Positive dragY
  // pulls the sheet down; releasing past ~100px closes it.
  const [dragY, setDragY] = useState(0);
  const dragStartYRef = useRef<number | null>(null);
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
      <section className="space-y-3 pb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Utforsk</h1>

        <SearchBar externalValue={urlQ} onCommit={commitSearchQuery} />

        {/* Filter + sort bar, same layout on mobile and desktop.
            Filter/Sort sit as pill buttons on the left; active-filter
            chips scroll horizontally to their right. */}
        <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            onClick={() => setShowSort(true)}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3.5 py-1.5 text-sm font-medium text-stone-700 hover:border-stone-400"
          >
            <SortIcon />
            Sorter
          </button>
          <button
            onClick={() => { setActiveFilterPanel(null); setShowFilter(true); }}
            className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium ${
              activeFilterCount > 0
                ? "border-[#5a6b32] bg-[#5a6b32] text-white"
                : "border-stone-200 bg-white text-stone-700 hover:border-stone-400"
            }`}
          >
            <FilterIcon />
            {activeFilterCount > 0 ? `Filter (${activeFilterCount})` : "Filter"}
          </button>
          {activeChips.length > 0 && (
            <>
              <div className="h-5 shrink-0 w-px bg-stone-200" />
              {activeChips.map((chip) => (
                <button
                  key={chip.label}
                  onClick={chip.clear}
                  className="flex shrink-0 items-center gap-1 rounded-full border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:border-stone-500"
                >
                  {chip.label}
                  <span className="ml-0.5 opacity-60">✕</span>
                </button>
              ))}
              <button
                onClick={clearAll}
                className="shrink-0 rounded-full px-2 py-1.5 text-xs font-medium text-stone-500 hover:text-stone-700"
              >
                Nullstill
              </button>
            </>
          )}
        </div>

        {total !== null && (
          <p className="text-xs text-stone-500">
            {initialLoading && !isFirstLoad.current && (
              <span className="mr-1.5 inline-block h-3 w-3 animate-spin rounded-full border-2 border-stone-300 border-t-stone-600" />
            )}
            {total} vare{total === 1 ? "" : "r"}
          </p>
        )}

        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        {initialLoading && isFirstLoad.current && <SkeletonGrid />}

        {!initialLoading && items.length === 0 && (
          <div className="rounded-2xl border border-dashed border-stone-300 p-10 text-center text-sm text-stone-500">
            <p className="font-medium text-stone-700">Ingen treff</p>
            <p className="mt-1">Prøv å nullstille filtrene eller søke bredere.</p>
            {activeChips.length > 0 && (
              <button onClick={clearAll} className="mt-4 rounded-full bg-stone-900 px-4 py-2 text-xs font-medium text-stone-50 hover:bg-black">
                Nullstill filtre
              </button>
            )}
          </div>
        )}

        {items.length > 0 && (
          <>
            <div className={`grid grid-cols-2 gap-3 sm:grid-cols-3 transition-opacity duration-200 ${initialLoading && !isFirstLoad.current ? "opacity-40 pointer-events-none" : ""}`}>
              {items.map((item) => (
                <ItemCard key={item.id} item={item} seller={item.seller_id ? sellers[item.seller_id] : null} />
              ))}
            </div>
            {hasMore && (
              <div className="flex justify-center pt-2">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="rounded-full border border-stone-300 bg-white px-6 py-2.5 text-sm font-medium text-stone-700 transition hover:border-stone-500 disabled:opacity-50"
                >
                  {loadingMore ? "Laster…" : "Last inn flere"}
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* Sort sheet */}
      {showSort && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]" onClick={() => setShowSort(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl bg-white shadow-[0_-12px_40px_rgba(0,0,0,0.18)]">
            <button
              type="button"
              onClick={() => setShowSort(false)}
              aria-label="Lukk sortering"
              className="mx-auto mb-1 mt-2 h-1 w-10 rounded-full bg-stone-300"
            />
            <div className="px-4 pb-10 pt-1">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-500">Sorter etter</p>
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { setParam("sort", opt.value === "newest" ? "" : opt.value); setShowSort(false); }}
                  className={`flex w-full items-center justify-between border-b border-stone-100 py-4 text-sm ${sort === opt.value ? "font-semibold text-[#5a6b32]" : "font-medium text-stone-700"}`}
                >
                  {opt.label}
                  {sort === opt.value && <CheckIcon />}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Filter sheet, bottom-anchored so the results grid stays partly
          visible above (Finn/Tise pattern). Real swipe-to-dismiss on the
          top strip. */}
      {showFilter && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]"
            onClick={() => { setShowFilter(false); setActiveFilterPanel(null); setDragY(0); }}
          />
          <div
            className="fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-3xl bg-white shadow-[0_-12px_40px_rgba(0,0,0,0.18)]"
            style={{
              maxHeight: "62vh",
              transform: `translateY(${dragY}px)`,
              transition: dragStartYRef.current == null ? "transform 220ms cubic-bezier(0.2, 0.9, 0.3, 1)" : "none",
              touchAction: "pan-y",
            }}
          >
            <div
              className="shrink-0 cursor-grab pt-2 pb-1 active:cursor-grabbing"
              onTouchStart={(e) => { dragStartYRef.current = e.touches[0].clientY; }}
              onTouchMove={(e) => {
                if (dragStartYRef.current == null) return;
                const delta = e.touches[0].clientY - dragStartYRef.current;
                if (delta > 0) setDragY(delta);
              }}
              onTouchEnd={() => {
                const shouldClose = dragY > 100;
                dragStartYRef.current = null;
                if (shouldClose) {
                  setShowFilter(false);
                  setActiveFilterPanel(null);
                }
                setDragY(0);
              }}
            >
              <button
                type="button"
                onClick={() => { setShowFilter(false); setActiveFilterPanel(null); setDragY(0); }}
                aria-label="Lukk filter"
                className="mx-auto block h-1 w-10 rounded-full bg-stone-300"
              />
            </div>
            <div className="flex shrink-0 items-center justify-between border-b border-stone-100 px-4 pb-3 pt-1">
              {activeFilterPanel ? (
                <button
                  onClick={() => setActiveFilterPanel(null)}
                  className="flex items-center gap-1.5 text-sm font-medium text-stone-500 hover:text-black"
                >
                  <BackIcon /> Tilbake
                </button>
              ) : (
                <p className="text-sm font-semibold text-stone-800">Filter</p>
              )}
              <button onClick={clearAll} className="text-xs font-medium text-stone-500 hover:text-black">
                Nullstill
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {!activeFilterPanel ? (
                <div className="divide-y divide-stone-100 px-4">
                  {/* Clickable filter rows, only show value when actively selected */}
                  {filterRows.map((row) => (
                    <button
                      key={row.key}
                      onClick={() => setActiveFilterPanel(row.key)}
                      className="flex w-full items-center justify-between py-4"
                    >
                      <span className="text-sm font-medium text-stone-800">{row.label}</span>
                      <span className="flex items-center gap-2">
                        {row.value && (
                          <span className="text-sm font-medium text-[#5a6b32]">{row.value}</span>
                        )}
                        <ChevronIcon />
                      </span>
                    </button>
                  ))}

                  {/* Kan sendes toggle */}
                  <div className="flex items-center justify-between py-4">
                    <span className="text-sm font-medium text-stone-800">Kan sendes</span>
                    <button
                      onClick={() => setParam("shipping", shipping === "sendes" ? "" : "sendes")}
                      className={`relative h-6 w-11 rounded-full transition-colors ${shipping === "sendes" ? "bg-[#5a6b32]" : "bg-stone-200"}`}
                    >
                      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${shipping === "sendes" ? "translate-x-5" : "translate-x-0.5"}`} />
                    </button>
                  </div>

                  {/* Price slider, inline, no sub-panel */}
                  <div className="py-5 space-y-5">
                    <p className="text-sm font-medium text-stone-800">Pris</p>
                    <div className="space-y-1">
                      <input
                        type="range" min={0} max={PRICE_MAX} step={50}
                        aria-label="Laveste pris"
                        value={localPriceMin}
                        onChange={(e) => setLocalPriceMin(Math.min(Number(e.target.value), localPriceMax - 50))}
                        onMouseUp={commitPrice}
                        onTouchEnd={commitPrice}
                        className="w-full accent-[#5a6b32]"
                      />
                      <input
                        type="range" min={0} max={PRICE_MAX} step={50}
                        aria-label="Høyeste pris"
                        value={localPriceMax}
                        onChange={(e) => setLocalPriceMax(Math.max(Number(e.target.value), localPriceMin + 50))}
                        onMouseUp={commitPrice}
                        onTouchEnd={commitPrice}
                        className="w-full accent-[#5a6b32]"
                      />
                      <div className="flex justify-between pt-1 text-xs text-stone-500">
                        <span>Min: <span className="font-medium text-stone-700">{localPriceMin} kr</span></span>
                        <span>Max: <span className="font-medium text-stone-700">{localPriceMax >= PRICE_MAX ? "∞" : `${localPriceMax} kr`}</span></span>
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
            <div className="shrink-0 border-t border-stone-100 px-4 pb-8 pt-3">
              <button
                onClick={() => { setShowFilter(false); setActiveFilterPanel(null); setDragY(0); }}
                className="w-full rounded-full bg-[#5a6b32] py-4 text-base font-semibold text-white hover:bg-[#435022] active:bg-[#435022]"
              >
                {total !== null ? `Se ${total} annonser` : "Se annonser"}
              </button>
            </div>
          </div>
        </>
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
        <p className="py-6 text-sm text-stone-500">Ingen merker tilgjengelig ennå.</p>
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
    <input
      type="search"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      placeholder="Søk tittel eller merke…"
      className="block w-full rounded-full border border-stone-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-[#5a6b32] focus:ring-1 focus:ring-[#5a6b32]/30"
    />
  );
});

function OptionList({ children }: { children: React.ReactNode }) {
  return <div className="divide-y divide-stone-100 px-4">{children}</div>;
}

function OptionRow({ label, active, onClick, indented = false }: {
  label: string; active: boolean; onClick: () => void; indented?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center justify-between py-3.5 text-sm ${indented ? "pl-5" : ""} ${active ? "font-semibold text-[#5a6b32]" : "font-medium text-stone-700"}`}
    >
      {label}
      {active && <CheckIcon />}
    </button>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => <ItemCardSkeleton key={i} />)}
    </div>
  );
}

function SortIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M6 12h12M10 17h4" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="h-4 w-4 text-[#5a6b32]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg className="h-4 w-4 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}
