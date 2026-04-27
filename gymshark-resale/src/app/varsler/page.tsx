"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { type SavedSearch, PRICE_BUCKETS, CATEGORY_TREE } from "@/lib/supabase";

type SearchWithCount = SavedSearch & { newCount: number };

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
  const [searches, setSearches] = useState<SearchWithCount[] | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id ?? null;
      setUserId(uid);
      if (!uid) return;
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

  if (userId === undefined) return <p className="py-6 text-sm text-stone-500">Laster…</p>;

  if (userId === null) {
    return (
      <section className="space-y-3 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">Varsler</h1>
        <p className="text-sm text-stone-600">Logg inn for å bruke lagrede søk.</p>
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
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Varsler</h1>
        <p className="mt-1.5 text-sm text-stone-500">
          Lagrede søk — se om nye varer har dukket opp siden sist.
        </p>
      </div>

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
                  Sist sjekket {new Date(s.last_seen_at).toLocaleDateString("no-NO", { day: "numeric", month: "short" })}
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
    </section>
  );
}
