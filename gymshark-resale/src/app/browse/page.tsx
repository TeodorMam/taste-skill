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
  PRICE_BUCKETS,
  type PriceBucketKey,
  CATEGORY_TREE,
  CATEGORY_PARENTS,
  type CategoryParent,
} from "@/lib/supabase";
import { createClient } from "@/utils/supabase/client";
import { ItemCard } from "@/components/ItemCard";
import { ItemCardSkeleton } from "@/components/ItemCardSkeleton";

const PAGE_SIZE = 24;
type Sort = "newest" | "price_asc" | "price_desc";

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
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [saveLabel, setSaveLabel] = useState("");
  const [savingSearch, setSavingSearch] = useState(false);
  const [savedOk, setSavedOk] = useState(false);

  const q = params.get("q") ?? "";
  const brand = params.get("brand") ?? "";
  const cat = params.get("cat") ?? "";
  const sub = params.get("sub") ?? "";
  const size = params.get("size") ?? "";
  const condition = params.get("condition") ?? "";
  const location = params.get("location") ?? "";
  const price = (params.get("price") ?? "") as PriceBucketKey | "";
  const sort = (params.get("sort") as Sort) ?? "newest";
  const hideSold = params.get("sold") !== "1";
  const shipping = params.get("shipping") ?? "";

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(q), 400);
    return () => clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  function autoLabel(f: Record<string, string>): string {
    const parts: string[] = [];
    if (f.brand) parts.push(f.brand);
    if (f.sub) parts.push(f.sub);
    else if (f.cat) parts.push(f.cat);
    if (f.size) parts.push(`str. ${f.size}`);
    if (f.price) {
      const b = PRICE_BUCKETS.find((b) => b.key === f.price);
      if (b) parts.push(b.label);
    }
    if (f.q) parts.push(`"${f.q}"`);
    return parts.join(" · ") || "Mitt søk";
  }

  async function doSaveSearch() {
    if (!userId || !saveLabel.trim()) return;
    setSavingSearch(true);
    const supabase = createClient();
    const filters: Record<string, string> = {};
    if (q) filters.q = q;
    if (brand) filters.brand = brand;
    if (cat) filters.cat = cat;
    if (sub) filters.sub = sub;
    if (size) filters.size = size;
    if (condition) filters.condition = condition;
    if (location) filters.location = location;
    if (price) filters.price = price;
    if (shipping) filters.shipping = shipping;
    await supabase.from("saved_searches").insert({ user_id: userId, label: saveLabel.trim(), filters });
    setSavingSearch(false);
    setShowSaveForm(false);
    setSavedOk(true);
    setTimeout(() => setSavedOk(false), 2500);
  }

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
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
    router.replace("/browse", { scroll: false });
  }

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

  const buildQuery = useCallback(
    (supabase: ReturnType<typeof createClient>, from: number) => {
      const needle = debouncedQ.trim();
      const bucket = PRICE_BUCKETS.find((b) => b.key === price);
      const activeParent = (cat || null) as CategoryParent | null;

      // eslint-disable-next-line prefer-const
      let q = supabase.from("items").select("*", { count: "exact" });

      if (hideSold) q = q.eq("is_sold", false);
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
      if (bucket) q = q.gte("price", bucket.min).lt("price", bucket.max);
      if (needle) q = q.or(`title.ilike.%${needle}%,brand.ilike.%${needle}%`);

      if (sort === "price_asc") q = q.order("price", { ascending: true });
      else if (sort === "price_desc") q = q.order("price", { ascending: false });
      else q = q.order("created_at", { ascending: false });

      return q.range(from, from + PAGE_SIZE - 1);
    },
    [debouncedQ, brand, cat, sub, size, condition, location, price, sort, hideSold, shipping],
  );

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    setInitialLoading(true);
    setError(null);

    buildQuery(supabase, 0).then(({ data, error, count }) => {
      if (cancelled) return;
      if (error) {
        setError(error.message);
        setInitialLoading(false);
        return;
      }
      const rows = (data ?? []) as Item[];
      setItems(rows);
      setTotal(count ?? null);
      setOffset(PAGE_SIZE);
      setInitialLoading(false);
      isFirstLoad.current = false;

      const ids = Array.from(
        new Set(rows.map((r) => r.seller_id).filter((x): x is string => !!x)),
      );
      if (ids.length === 0) return;
      supabase
        .from("profiles")
        .select("*")
        .in("user_id", ids)
        .then(({ data: pData }) => {
          if (cancelled) return;
          const map: Record<string, Profile> = {};
          for (const p of (pData ?? []) as Profile[]) map[p.user_id] = p;
          setSellers(map);
        });
    });

    return () => {
      cancelled = true;
    };
  }, [buildQuery]);

  async function loadMore() {
    const supabase = createClient();
    setLoadingMore(true);
    const { data, error } = await buildQuery(supabase, offset);
    if (error) {
      setError(error.message);
      setLoadingMore(false);
      return;
    }
    const rows = (data ?? []) as Item[];
    setItems((prev) => [...prev, ...rows]);
    setOffset((prev) => prev + PAGE_SIZE);
    setLoadingMore(false);

    const existingIds = new Set(Object.keys(sellers));
    const newIds = Array.from(
      new Set(
        rows
          .map((r) => r.seller_id)
          .filter((x): x is string => !!x && !existingIds.has(x)),
      ),
    );
    if (newIds.length === 0) return;
    const { data: pData } = await supabase
      .from("profiles")
      .select("*")
      .in("user_id", newIds);
    const map: Record<string, Profile> = {};
    for (const p of (pData ?? []) as Profile[]) map[p.user_id] = p;
    setSellers((prev) => ({ ...prev, ...map }));
  }

  const hasMore = total !== null && items.length < total;
  const activeParent = (cat || null) as CategoryParent | null;
  const activeGroup = activeParent
    ? CATEGORY_TREE.find((g) => g.name === activeParent)
    : null;
  const hasActiveFilter =
    !!(q || brand || cat || sub || size || condition || location || price || shipping) ||
    sort !== "newest" ||
    !hideSold;

  return (
    <section className="space-y-5">
      <div className="flex items-end justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">Utforsk</h1>
        <p className="flex items-center gap-1.5 text-xs text-stone-500">
          {initialLoading && !isFirstLoad.current && (
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-stone-300 border-t-stone-600" />
          )}
          {total !== null ? `${total} vare${total === 1 ? "" : "r"}` : ""}
        </p>
      </div>

      <div className="space-y-3">
        <input
          type="search"
          value={q}
          onChange={(e) => setParam("q", e.target.value)}
          placeholder="Søk tittel eller merke…"
          className="block w-full rounded-full border border-stone-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-[#5a6b32] focus:ring-1 focus:ring-[#5a6b32]/30"
        />

        {availableBrands.length > 0 && (
          <Row>
            <Chip active={brand === ""} onClick={() => setParam("brand", "")}>
              Alle merker
            </Chip>
            {availableBrands.map((b) => (
              <Chip key={b} active={brand === b} onClick={() => setParam("brand", b)}>
                {b}
              </Chip>
            ))}
          </Row>
        )}

        <Row>
          <Chip active={cat === ""} onClick={() => setCat("")}>
            Alle kategorier
          </Chip>
          {CATEGORY_PARENTS.map((c) => (
            <Chip key={c} active={cat === c} onClick={() => setCat(c)}>
              {c}
            </Chip>
          ))}
        </Row>

        {activeGroup && (
          <Row>
            <Chip active={sub === ""} onClick={() => setParam("sub", "")}>
              Alle i {activeGroup.name.toLowerCase()}
            </Chip>
            {activeGroup.children.map((c) => (
              <Chip key={c} active={sub === c} onClick={() => setParam("sub", c)}>
                {c}
              </Chip>
            ))}
          </Row>
        )}

        <Row>
          <Chip active={size === ""} onClick={() => setParam("size", "")}>
            Alle str.
          </Chip>
          {SIZES.map((s) => (
            <Chip key={s} active={size === s} onClick={() => setParam("size", s)}>
              {s}
            </Chip>
          ))}
        </Row>

        <Row>
          <Chip active={price === ""} onClick={() => setParam("price", "")}>
            Alle priser
          </Chip>
          {PRICE_BUCKETS.map((b) => (
            <Chip key={b.key} active={price === b.key} onClick={() => setParam("price", b.key)}>
              {b.label}
            </Chip>
          ))}
        </Row>

        <Row>
          <Chip active={shipping === ""} onClick={() => setParam("shipping", "")}>
            Alle
          </Chip>
          <Chip
            active={shipping === "sendes"}
            onClick={() => setParam("shipping", "sendes")}
          >
            📦 Kan sendes
          </Chip>
        </Row>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={condition}
            onChange={(e) => setParam("condition", e.target.value)}
            className={selectCls}
          >
            <option value="">Alle tilstander</option>
            {CONDITIONS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select
            value={location}
            onChange={(e) => setParam("location", e.target.value)}
            className={selectCls}
          >
            <option value="">Hele Norge</option>
            {AREAS.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) =>
              setParam("sort", e.target.value === "newest" ? "" : e.target.value)
            }
            className={selectCls}
          >
            <option value="newest">Nyeste først</option>
            <option value="price_asc">Pris lav → høy</option>
            <option value="price_desc">Pris høy → lav</option>
          </select>
          <label className="inline-flex cursor-pointer select-none items-center gap-2 rounded-full border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700">
            <input
              type="checkbox"
              checked={hideSold}
              onChange={(e) => setParam("sold", e.target.checked ? "" : "1")}
              className="h-3.5 w-3.5 accent-[#5a6b32]"
            />
            Skjul solgte
          </label>
          {hasActiveFilter && (
            <div className="ml-auto flex items-center gap-3">
              {savedOk && (
                <span className="text-xs font-medium text-emerald-600">✓ Søk lagret</span>
              )}
              {userId && !savedOk && !showSaveForm && (
                <button
                  onClick={() => {
                    setSaveLabel(autoLabel({ q, brand, cat, sub, size, condition, location, price, shipping }));
                    setShowSaveForm(true);
                  }}
                  className="text-xs font-medium text-stone-500 hover:text-stone-900"
                >
                  💾 Lagre søk
                </button>
              )}
              {userId && showSaveForm && (
                <div className="flex items-center gap-1.5">
                  <input
                    autoFocus
                    value={saveLabel}
                    onChange={(e) => setSaveLabel(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") doSaveSearch();
                      if (e.key === "Escape") setShowSaveForm(false);
                    }}
                    maxLength={60}
                    placeholder="Navn på søket"
                    className="w-36 rounded-full border border-stone-300 bg-white px-3 py-1 text-xs outline-none focus:border-[#5a6b32]"
                  />
                  <button
                    onClick={doSaveSearch}
                    disabled={savingSearch || !saveLabel.trim()}
                    className="rounded-full bg-[#5a6b32] px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
                  >
                    {savingSearch ? "…" : "Lagre"}
                  </button>
                  <button onClick={() => setShowSaveForm(false)} className="text-xs text-stone-400 hover:text-stone-700">✕</button>
                </div>
              )}
              <button
                onClick={clearAll}
                className="text-xs font-medium text-[#5a6b32] underline underline-offset-2 hover:text-[#435022]"
              >
                Nullstill
              </button>
            </div>
          )}
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}

      {initialLoading && isFirstLoad.current && <SkeletonGrid />}

      {!initialLoading && items.length === 0 && (
        <div className="rounded-2xl border border-dashed border-stone-300 p-10 text-center text-sm text-stone-500">
          <p className="font-medium text-stone-700">Ingen treff</p>
          <p className="mt-1">Prøv å nullstille filtrene eller søke bredere.</p>
          {hasActiveFilter && (
            <button
              onClick={clearAll}
              className="mt-4 rounded-full bg-stone-900 px-4 py-2 text-xs font-medium text-stone-50 hover:bg-black"
            >
              Nullstill filtre
            </button>
          )}
        </div>
      )}

      {items.length > 0 && (
        <>
          <div className={`grid grid-cols-2 gap-3 sm:grid-cols-3 transition-opacity duration-200 ${initialLoading && !isFirstLoad.current ? "opacity-40 pointer-events-none" : ""}`}>
            {items.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                seller={item.seller_id ? sellers[item.seller_id] : null}
              />
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
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <ItemCardSkeleton key={i} />
      ))}
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div className="-mx-4 overflow-x-auto px-4">
      <div className="flex gap-2 pb-1">{children}</div>
    </div>
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

const selectCls =
  "rounded-full border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 outline-none focus:border-[#5a6b32]";
