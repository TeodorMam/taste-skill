"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import {
  type Item,
  type Profile,
  type Review,
  formatPrice,
  profileDisplayName,
  summarizeReviews,
} from "@/lib/supabase";
import { ItemCard } from "@/components/ItemCard";
import { ItemCardSkeleton } from "@/components/ItemCardSkeleton";
import { ReviewList } from "@/components/ReviewList";
import { Avatar } from "@/components/Avatar";

function fmtLastSeen(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days === 0) return "Aktiv i dag";
  if (days === 1) return "Aktiv i går";
  if (days < 30) return `Aktiv for ${days} dager siden`;
  return null;
}

export default function SellerPage() {
  const params = useParams<{ id: string }>();
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState<Item[] | null>(null);
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"active" | "sold" | "reviews">("active");

  useEffect(() => {
    if (!params.id) return;
    supabase
      .from("items")
      .select("*")
      .eq("seller_id", params.id)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setItems((data ?? []) as Item[]);
      });
    supabase
      .from("reviews")
      .select("*")
      .eq("seller_id", params.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setReviews((data ?? []) as Review[]));
    supabase
      .from("profiles")
      .select("*")
      .eq("user_id", params.id)
      .maybeSingle()
      .then(({ data }) => setProfile((data ?? null) as Profile | null));
  }, [params.id, supabase]);

  const counts = useMemo(() => {
    if (!items) return { active: 0, sold: 0, revenue: 0 };
    return {
      active: items.filter((i) => !i.is_sold).length,
      sold: items.filter((i) => i.is_sold).length,
      revenue: items
        .filter((i) => i.is_sold)
        .reduce((s, i) => s + (Number(i.price) || 0), 0),
    };
  }, [items]);

  const summary = useMemo(
    () => (reviews ? summarizeReviews(reviews) : null),
    [reviews],
  );

  const filteredItems = useMemo(() => {
    if (!items) return null;
    return items.filter((i) => (tab === "sold" ? i.is_sold : !i.is_sold));
  }, [items, tab]);

  const firstDate = useMemo(() => {
    if (profile?.created_at) return new Date(profile.created_at);
    if (!items || items.length === 0) return null;
    const oldest = items.reduce((acc, i) =>
      new Date(i.created_at) < new Date(acc.created_at) ? i : acc,
    );
    return new Date(oldest.created_at);
  }, [items, profile]);

  const sellerId = params.id ?? null;
  const displayName = profileDisplayName(profile, sellerId);

  return (
    <section className="space-y-5">
      <Link href="/browse" className="text-sm text-stone-500 hover:text-black">
        ← Tilbake
      </Link>

      <div className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <Avatar profile={profile} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-semibold tracking-tight">
              {displayName}
            </p>
            <p className="text-xs text-stone-500">
              {firstDate
                ? `Medlem siden ${firstDate.toLocaleDateString("no-NO", {
                    month: "short",
                    year: "numeric",
                  })}`
                : "Ny selger"}
              {profile?.location ? ` · ${profile.location}` : ""}
              {fmtLastSeen(profile?.last_seen_at) ? ` · ${fmtLastSeen(profile?.last_seen_at)}` : ""}
            </p>
          </div>
          {summary && summary.total > 0 && (
            <div className="text-right">
              <p
                className={`text-lg font-semibold ${
                  summary.pct >= 80
                    ? "text-emerald-700"
                    : summary.pct >= 50
                      ? "text-amber-700"
                      : "text-red-700"
                }`}
              >
                {summary.pct}%
              </p>
              <p className="text-[10px] text-stone-500">
                {summary.total} vurdering{summary.total === 1 ? "" : "er"}
              </p>
            </div>
          )}
        </div>

        {profile?.bio && (
          <p className="mt-3 whitespace-pre-line text-sm text-stone-700">
            {profile.bio}
          </p>
        )}

        <div className="mt-4 grid grid-cols-3 gap-2">
          <Stat label="Aktive" value={counts.active} />
          <Stat label="Solgt" value={counts.sold} />
          <Stat label="Omsetning" value={formatPrice(counts.revenue)} />
        </div>
      </div>

      <div className="flex gap-2">
        <TabChip active={tab === "active"} onClick={() => setTab("active")}>
          Aktive ({counts.active})
        </TabChip>
        <TabChip active={tab === "sold"} onClick={() => setTab("sold")}>
          Solgt ({counts.sold})
        </TabChip>
        <TabChip active={tab === "reviews"} onClick={() => setTab("reviews")}>
          Vurderinger ({summary?.total ?? 0})
        </TabChip>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}

      {tab === "reviews" ? (
        reviews === null ? (
          <p className="text-sm text-stone-500">Laster…</p>
        ) : (
          <ReviewList reviews={reviews} />
        )
      ) : filteredItems === null && !error ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <ItemCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredItems && filteredItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 p-10 text-center text-sm text-stone-500">
          {tab === "active"
            ? "Ingen aktive annonser."
            : "Ingen solgte annonser enda."}
        </div>
      ) : (
        filteredItems && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {filteredItems.map((item) => (
              <ItemCard key={item.id} item={item} hideSeller />
            ))}
          </div>
        )
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl bg-stone-50 p-3">
      <p className="text-[10px] font-medium uppercase tracking-wider text-stone-500">
        {label}
      </p>
      <p className="mt-0.5 text-base font-semibold tracking-tight sm:text-lg">
        {value}
      </p>
    </div>
  );
}

function TabChip({
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
      className={`rounded-full border px-4 py-1.5 text-xs font-medium transition ${
        active
          ? "border-[#5a6b32] bg-[#5a6b32] text-white"
          : "border-stone-300 bg-white text-stone-700 hover:border-stone-500"
      }`}
    >
      {children}
    </button>
  );
}
