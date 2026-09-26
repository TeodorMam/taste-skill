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
import { ReportButton } from "@/components/ReportButton";
import { BackLink } from "@/components/BackLink";
import { Sep } from "@/components/Sep";

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
      .from("profiles_public")
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
      <BackLink href="/varer">Tilbake</BackLink>

      <div className="border-t border-ink pt-5">
        <div className="flex items-center gap-3">
          <Avatar profile={profile} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[26px] font-[680] leading-[1.08] [font-stretch:80%]">
              {displayName}
            </p>
            <p className="mt-1 text-[13px] text-ink-3">
              {firstDate
                ? `Medlem siden ${firstDate.toLocaleDateString("no-NO", {
                    month: "short",
                    year: "numeric",
                  })}`
                : "Ny selger"}
              {profile?.location ? <><Sep />{profile.location}</> : ""}
              {fmtLastSeen(profile?.last_seen_at) ? <><Sep />{fmtLastSeen(profile?.last_seen_at)}</> : ""}
            </p>
          </div>
          {summary && summary.total > 0 && (
            <div className="text-right">
              <p
                className={`price text-2xl leading-none ${
                  summary.pct >= 80
                    ? "text-olive"
                    : summary.pct >= 50
                      ? "text-ochre"
                      : "text-clay"
                }`}
              >
                {summary.pct}%
              </p>
              <p className="mt-1 text-xs text-ink-3">
                {summary.total} vurdering{summary.total === 1 ? "" : "er"}
              </p>
            </div>
          )}
        </div>

        {profile?.bio && (
          <p className="mt-4 max-w-[62ch] whitespace-pre-line text-[15px] leading-[1.55] text-ink-2">
            {profile.bio}
          </p>
        )}

        <div className="mt-5 grid grid-cols-3 divide-x divide-line border-y border-line">
          <Stat label="Aktive" value={counts.active} />
          <Stat label="Solgt" value={counts.sold} />
          <Stat label="Omsetning" value={formatPrice(counts.revenue)} />
        </div>

        <div className="mt-2">
          <ReportButton type="user" targetId={params.id} />
        </div>
      </div>

      <div className="tabs">
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
        <p className="rounded-sm bg-clay-soft p-3 text-sm text-clay">{error}</p>
      )}

      {tab === "reviews" ? (
        reviews === null ? (
          <p className="text-sm text-ink-3">Laster…</p>
        ) : (
          <ReviewList reviews={reviews} />
        )
      ) : filteredItems === null && !error ? (
        <div className="item-grid">
          {Array.from({ length: 3 }).map((_, i) => (
            <ItemCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredItems && filteredItems.length === 0 ? (
        <div className="border-t border-line pt-5 text-sm text-ink-3">
          {tab === "active"
            ? "Ingen aktive annonser."
            : "Ingen solgte annonser enda."}
        </div>
      ) : (
        filteredItems && (
          <div className="item-grid">
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
    <div className="px-3 py-3 first:pl-0 sm:px-5 sm:py-4">
      <p className="text-[13px] font-medium text-ink-3">
        {label}
      </p>
      <p className="price mt-1 text-2xl leading-none sm:text-[34px]">
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
      className={`tab ${active ? "tab-on" : ""}`}
    >
      {children}
    </button>
  );
}
