"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
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
type FilterKey = "gender" | "color" | "condition" | "fit" | "cat" | "size" | "location" | "shipping" | "brand" | "price";

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
  const [debouncedQ, setDebouncedQ] = useState(params.get("q") ?? "");
  const [showFilter, setShowFilter] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [activeFilterPanel, setActiveFilterPanel] = useState<FilterKey | null>(null);
  const [localPriceMin, setLocalPriceMin] = useState(0);
  const [localPriceMax, setLocalPriceMax] = useState(PRICE_MAX);

  const q = params.get("q") ?? "";
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
  const hideSold = params.get("sold") !== "1";
  const shipping = params.get("shipping") ?? "";

  useEffect(() => {
    setLocalPriceMin(priceMin);
    setLocalPriceMax(priceMax);
  }, [priceMin, priceMax]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(q), 400);
    return () => clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("items")
      .select("brand")
      .not("brand", "is", null)
      .then(({ data }) => {
        if (!data) return;
        const set = new Set((data as { brand: string }[]).map((r) => r.brand).filter(Boolean));
        setAvailableBrands(BRANDS.filter((b) => set.has(b)));
      });
  }, []);

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.replace(`/browse${next.toString() ? `?${next.toString()}` : ""}`, { scroll: false });
  }

  function setMultiParam(updates: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    router.replace(`/browse${next.toString() ? `?${next.toString()}` : ""}`, { scroll: false });
  }

  function setCat(value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set("cat", value);
    else next.delete("cat");
    next.delete("sub");
    router.replace(`/browse${next.toString() ? `?${next.toString()}` : ""}`, { scroll: false });
  }

  function clearAll() {
    setLocalPriceMin(0);
    setLocalPriceMax(PRICE_MAX);
    router.replace("/browse", { scroll: false });
  }

  const buildQuery = useCallback(
    (supabase: ReturnType<typeof createClient>, from: number) => {
      const needle = debouncedQ.trim();
      const activeParent = (cat || null) as CategoryParent | null;

      // eslint-disable-next-line prefer-const
      let q = supabase.from("items").select("*", { count: "exact" });

      if (hideSold) q = q.eq("is_sold", false);
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
    [debouncedQ, gender, color, fit, brand, cat, sub, size, condition, location, priceMin, priceMax, sort, hideSold, shipping],
  );

  useEffect(() => {
    const supabase = createClient();
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
      supabase.from("profiles").select("*").in("user_id", ids).then(({ data: pData }) => {
        if (cancelled) return;
        const map: Record<string, Profile> = {};
        for (const p of (pData ?? []) as Profile[]) map[p.user_id] = p;
        setSellers(map);
      });
    });

    return () => { cancelled = true; };
  }, [buildQuery]);

  async function loadMore() {
    const supabase = createClient();
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
    const { data: pData } = await supabase.from("profiles").select("*").in("user_id", newIds);
    const map: Record<string, Profile> = {};
    for (const p of (pData ?? []) as Profile[]) map[p.user_id] = p;
    setSellers((prev) => ({ ...prev, ...map }));
  }

  const hasMore = total !== null && items.length < total;
  const activeParent = (cat || null) as CategoryParent | null;
  const activeGroup = activeParent ? CATEGORY_TREE.find((g) => g.name === activeParent) : null;
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

  const filterRows: { key: FilterKey; label: string; value: string }[] = [
    { key: "gender", label: "Kjønn", value: gender || "Alle" },
    { key: "color", label: "Farge", value: color || "Alle" },
    { key: "condition", label: "Tilstand", value: condition || "Alle" },
    { key: "fit", label: "Passform", value: fit || "Alle" },
    { key: "cat", label: "Kategori", value: sub ? `${cat} › ${sub}` : cat || "Alle" },
    { key: "size", label: "Størrelse", value: size || "Alle" },
    { key: "location", label: "Lokasjon", value: location || "Hele Norge" },
    { key: "shipping", label: "Frakt", value: shipping === "sendes" ? "Kan sendes" : "Alle" },
    { key: "brand", label: "Merke", value: brand || "Alle" },
    { key: "price", label: "Pris", value: priceActive ? (priceMax >= PRICE_MAX ? `${priceMin}+ kr` : `${priceMin}–${priceMax} kr`) : "Alle" },
  ];

  function handleFilterSelect(key: string, value: string) {
    if (key === "cat") { setCat(value); }
    else if (key === "sub") { setParam("sub", value); }
    else if (key === "priceCommit") {
      const [min, max] = value.split(",");
      setMultiParam({
        priceMin: min === "0" ? "" : min,
        priceMax: max === String(PRICE_MAX) ? "" : max,
      });
    }
    else { setParam(key, value); }
  }

  return (
    <>
      <section className="space-y-3 pb-28">
        <h1 className="text-3xl font-semibold tracking-tight">Utforsk</h1>

        <input
          type="search"
          value={q}
          onChange={(e) => setParam("q", e.target.value)}
          placeholder="Søk tittel eller merke…"
          className="block w-full rounded-full border border-stone-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-[#5a6b32] focus:ring-1 focus:ring-[#5a6b32]/30"
        />

        {activeChips.length > 0 && (
          <div className="-mx-4 overflow-x-auto px-4">
            <div className="flex gap-1.5 pb-0.5">
              {activeChips.map((chip) => (
                <button
                  key={chip.label}
                  onClick={chip.clear}
                  className="flex shrink-0 items-center gap-1 rounded-full border border-[#5a6b32] bg-[#5a6b32] px-3 py-1.5 text-xs font-medium text-white"
                >
                  {chip.label}
                  <span className="ml-0.5 opacity-75">✕</span>
                </button>
              ))}
              <button
                onClick={clearAll}
                className="shrink-0 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-500 hover:border-stone-400"
              >
                Nullstill alle
              </button>
            </div>
          </div>
        )}

        {total !== null && (
          <p className="text-xs text-stone-400">
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

      {/* Floating bottom bar */}
      <div className="fixed bottom-4 left-0 right-0 z-30 flex justify-center px-4 pointer-events-none">
        <div className="pointer-events-auto flex items-center rounded-full border border-stone-200 bg-white shadow-lg shadow-stone-900/10">
          <button
            onClick={() => setShowSort(true)}
            className="flex items-center gap-2 rounded-l-full px-5 py-3 text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            <SortIcon />
            Sorter
          </button>
          <div className="h-6 w-px bg-stone-200" />
          <button
            onClick={() => { setActiveFilterPanel(null); setShowFilter(true); }}
            className="flex items-center gap-2 rounded-r-full px-5 py-3 text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            <FilterIcon />
            Filter
            {activeFilterCount > 0 && (
              <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[#5a6b32] text-[9px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Sort sheet */}
      {showSort && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setShowSort(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-white">
            <div className="mx-auto my-2 h-1 w-10 rounded-full bg-stone-200" />
            <div className="px-4 pb-10 pt-1">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-400">Sorter etter</p>
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

      {/* Filter sheet */}
      {showFilter && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30"
            onClick={() => { setShowFilter(false); setActiveFilterPanel(null); }}
          />
          <div
            className="fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-2xl bg-white"
            style={{ maxHeight: "88vh" }}
          >
            <div className="mx-auto my-2 h-1 w-10 shrink-0 rounded-full bg-stone-200" />
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
                  {filterRows.map((row) => {
                    const isActive = row.value !== "Alle" && row.value !== "Hele Norge";
                    return (
                      <button
                        key={row.key}
                        onClick={() => setActiveFilterPanel(row.key)}
                        className="flex w-full items-center justify-between py-4"
                      >
                        <span className="text-sm font-medium text-stone-800">{row.label}</span>
                        <span className="flex items-center gap-2">
                          <span className={`text-sm ${isActive ? "font-medium text-[#5a6b32]" : "text-stone-400"}`}>
                            {row.value}
                          </span>
                          <ChevronIcon />
                        </span>
                      </button>
                    );
                  })}
                  <div className="flex items-center justify-between py-4">
                    <span className="text-sm font-medium text-stone-800">Skjul solgte</span>
                    <button
                      onClick={() => setParam("sold", hideSold ? "1" : "")}
                      className={`relative h-6 w-11 rounded-full transition-colors ${hideSold ? "bg-[#5a6b32]" : "bg-stone-200"}`}
                    >
                      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${hideSold ? "translate-x-5" : "translate-x-0.5"}`} />
                    </button>
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
                  shipping={shipping}
                  localPriceMin={localPriceMin}
                  localPriceMax={localPriceMax}
                  setLocalPriceMin={setLocalPriceMin}
                  setLocalPriceMax={setLocalPriceMax}
                  availableBrands={availableBrands}
                  activeGroup={activeGroup}
                  onSelect={handleFilterSelect}
                />
              )}
            </div>

            <div className="shrink-0 border-t border-stone-100 px-4 pb-8 pt-3">
              <button
                onClick={() => { setShowFilter(false); setActiveFilterPanel(null); }}
                className="w-full rounded-full bg-stone-900 py-3 text-sm font-medium text-stone-50 hover:bg-black"
              >
                {total !== null ? `Vis ${total} resultat${total === 1 ? "" : "er"}` : "Vis resultater"}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

type ActiveGroup = (typeof CATEGORY_TREE)[number] | null | undefined;

function FilterSubPanel({
  filterKey,
  gender, color, fit, brand, cat, sub, size, condition, location, shipping,
  localPriceMin, localPriceMax, setLocalPriceMin, setLocalPriceMax,
  availableBrands, activeGroup, onSelect,
}: {
  filterKey: FilterKey;
  gender: string; color: string; fit: string; brand: string; cat: string; sub: string;
  size: string; condition: string; location: string; shipping: string;
  localPriceMin: number; localPriceMax: number;
  setLocalPriceMin: (v: number) => void;
  setLocalPriceMax: (v: number) => void;
  availableBrands: string[];
  activeGroup: ActiveGroup;
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

  if (filterKey === "shipping") return (
    <OptionList>
      <OptionRow label="Alle" active={!shipping} onClick={() => onSelect("shipping", "")} />
      <OptionRow label="Kan sendes" active={shipping === "sendes"} onClick={() => onSelect("shipping", "sendes")} />
    </OptionList>
  );

  if (filterKey === "brand") return (
    <OptionList>
      <OptionRow label="Alle merker" active={!brand} onClick={() => onSelect("brand", "")} />
      {availableBrands.length === 0 && (
        <p className="py-6 text-sm text-stone-400">Ingen merker tilgjengelig ennå.</p>
      )}
      {availableBrands.map((b) => <OptionRow key={b} label={b} active={brand === b} onClick={() => onSelect("brand", b)} />)}
    </OptionList>
  );

  if (filterKey === "price") {
    const summary = localPriceMin === 0 && localPriceMax >= PRICE_MAX
      ? "Alle priser"
      : localPriceMax >= PRICE_MAX
      ? `Fra ${localPriceMin} kr`
      : `${localPriceMin} – ${localPriceMax} kr`;

    return (
      <div className="space-y-8 px-4 py-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-stone-500">Minstepris</span>
            <span className="text-sm font-semibold text-stone-800">{localPriceMin} kr</span>
          </div>
          <input
            type="range" min={0} max={PRICE_MAX} step={50}
            value={localPriceMin}
            onChange={(e) => setLocalPriceMin(Math.min(Number(e.target.value), localPriceMax - 50))}
            onMouseUp={() => onSelect("priceCommit", `${localPriceMin},${localPriceMax}`)}
            onTouchEnd={() => onSelect("priceCommit", `${localPriceMin},${localPriceMax}`)}
            className="w-full accent-[#5a6b32]"
          />
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-stone-500">Maksimumspris</span>
            <span className="text-sm font-semibold text-stone-800">
              {localPriceMax >= PRICE_MAX ? `${PRICE_MAX}+ kr` : `${localPriceMax} kr`}
            </span>
          </div>
          <input
            type="range" min={0} max={PRICE_MAX} step={50}
            value={localPriceMax}
            onChange={(e) => setLocalPriceMax(Math.max(Number(e.target.value), localPriceMin + 50))}
            onMouseUp={() => onSelect("priceCommit", `${localPriceMin},${localPriceMax}`)}
            onTouchEnd={() => onSelect("priceCommit", `${localPriceMin},${localPriceMax}`)}
            className="w-full accent-[#5a6b32]"
          />
        </div>
        <p className="text-center text-sm font-medium text-stone-500">{summary}</p>
      </div>
    );
  }

  return null;
}

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
