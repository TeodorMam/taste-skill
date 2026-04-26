"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
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
  categoryMatchesParent,
} from "@/lib/supabase";
import { createClient } from "@/utils/supabase/client";
import { ItemCard } from "@/components/ItemCard";
import { ItemCardSkeleton } from "@/components/ItemCardSkeleton";

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

  const [items, setItems] = useState<Item[] | null>(null);
  const [sellers, setSellers] = useState<Record<string, Profile>>({});
  const [error, setError] = useState<string | null>(null);

  const q = params.get("q") ?? "";
  const brand = params.get("brand") ?? "";
  const cat = params.get("cat") ?? ""; // parent (broad) category
  const sub = params.get("sub") ?? ""; // specific subcategory
  const size = params.get("size") ?? "";
  const condition = params.get("condition") ?? "";
  const location = params.get("location") ?? "";
  const price = (params.get("price") ?? "") as PriceBucketKey | "";
  const sort = (params.get("sort") as Sort) ?? "newest";
  const hideSold = params.get("sold") !== "1";
  const shipping = params.get("shipping") ?? "";

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.replace(`/browse${next.toString() ? `?${next.toString()}` : ""}`, {
      scroll: false,
    });
  }

  function setCat(value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set("cat", value);
    else next.delete("cat");
    next.delete("sub");
    router.replace(`/browse${next.toString() ? `?${next.toString()}` : ""}`, {
      scroll: false,
    });
  }

  function clearAll() {
    router.replace("/browse", { scroll: false });
  }

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("items")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          setError(error.message);
          return;
        }
        const rows = (data ?? []) as Item[];
        setItems(rows);
        const ids = Array.from(
          new Set(rows.map((r) => r.seller_id).filter((x): x is string => !!x)),
        );
        if (ids.length === 0) return;
        supabase
          .from("profiles")
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
  }, []);

  const activeParent = (cat || null) as CategoryParent | null;
  const activeGroup = activeParent
    ? CATEGORY_TREE.find((g) => g.name === activeParent)
    : null;

  const filtered = useMemo(() => {
    if (!items) return null;
    const needle = q.trim().toLowerCase();
    const bucket = PRICE_BUCKETS.find((b) => b.key === price);
    let out = items.filter((i) => {
      if (hideSold && i.is_sold) return false;
      if (brand && i.brand !== brand) return false;
      if (sub) {
        if (i.category !== sub) return false;
      } else if (activeParent) {
        if (!categoryMatchesParent(i.category, activeParent)) return false;
      }
      if (size && i.size !== size) return false;
      if (condition && i.condition !== condition) return false;
      if (location && i.location !== location) return false;
      if (shipping === "sendes" && i.shipping === "Kun henting") return false;
      if (bucket && (i.price < bucket.min || i.price >= bucket.max)) return false;
      if (needle) {
        const hay = `${i.title} ${i.brand ?? ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
    if (sort === "price_asc") out = [...out].sort((a, b) => a.price - b.price);
    else if (sort === "price_desc") out = [...out].sort((a, b) => b.price - a.price);
    return out;
  }, [items, q, brand, sub, activeParent, size, condition, location, price, sort, hideSold, shipping]);

  const availableBrands = useMemo(() => {
    if (!items) return [] as string[];
    const set = new Set<string>();
    for (const i of items) if (i.brand) set.add(i.brand);
    return BRANDS.filter((b) => set.has(b));
  }, [items]);

  const hasActiveFilter =
    !!(q || brand || cat || sub || size || condition || location || price || shipping) ||
    sort !== "newest" ||
    !hideSold;

  return (
    <section className="space-y-5">
      <div className="flex items-end justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">Utforsk</h1>
        <p className="text-xs text-stone-500">
          {filtered ? `${filtered.length} vare${filtered.length === 1 ? "" : "r"}` : ""}
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
            <Chip
              key={b.key}
              active={price === b.key}
              onClick={() => setParam("price", b.key)}
            >
              {b.label}
            </Chip>
          ))}
        </Row>

        <Row>
          <Chip active={shipping === ""} onClick={() => setParam("shipping", "")}>
            Alle
          </Chip>
          <Chip active={shipping === "sendes"} onClick={() => setParam("shipping", "sendes")}>
            📦 Kan sendes
          </Chip>
        </Row>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={condition}
            onChange={(e) => setParam("condition", e.target.value)}
            className={select}
          >
            <option value="">Alle tilstander</option>
            {CONDITIONS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select
            value={location}
            onChange={(e) => setParam("location", e.target.value)}
            className={select}
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
            className={select}
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
            <button
              onClick={clearAll}
              className="ml-auto text-xs font-medium text-[#5a6b32] underline underline-offset-2 hover:text-[#435022]"
            >
              Nullstill
            </button>
          )}
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}

      {filtered === null && !error && <SkeletonGrid />}

      {filtered && filtered.length === 0 && (
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

      {filtered && filtered.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {filtered.map((item) => (
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

const select =
  "rounded-full border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 outline-none focus:border-[#5a6b32]";
