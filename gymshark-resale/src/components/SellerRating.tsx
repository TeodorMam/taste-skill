"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { type Review, averageRating, summarizeReviews } from "@/lib/supabase";

export function SellerRating({
  sellerId,
  size = "sm",
  linkToProfile = false,
}: {
  sellerId: string;
  size?: "sm" | "md";
  linkToProfile?: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [reviews, setReviews] = useState<Review[] | null>(null);

  useEffect(() => {
    if (!sellerId) return;
    supabase
      .from("reviews")
      .select("*")
      .eq("seller_id", sellerId)
      .then(({ data }) => setReviews((data ?? []) as Review[]));
  }, [sellerId, supabase]);

  if (!reviews) return null;

  const star = averageRating(reviews);
  const { total, pct } = summarizeReviews(reviews);
  const textSize = size === "md" ? "text-xs" : "text-[10px]";

  let content: React.ReactNode;

  if (star) {
    const color =
      star.avg >= 4
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : star.avg >= 3
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : "border-red-200 bg-red-50 text-red-700";
    content = (
      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-medium ${color} ${textSize}`}>
        <span className="text-amber-400">★</span>
        {star.avg.toFixed(1)} ({star.total})
      </span>
    );
  } else if (total > 0) {
    const color =
      pct >= 80
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : pct >= 50
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : "border-red-200 bg-red-50 text-red-700";
    content = (
      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-medium ${color} ${textSize}`}>
        <span aria-hidden>{pct >= 80 ? "👍" : pct >= 50 ? "⚠️" : "👎"}</span>
        {pct}% ({total})
      </span>
    );
  } else {
    content = (
      <span className={`inline-flex items-center gap-1 rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5 font-medium text-stone-500 ${textSize}`}>
        Ny selger
      </span>
    );
  }

  if (linkToProfile) {
    return (
      <Link href={`/seller/${sellerId}`} className="hover:opacity-80">
        {content}
      </Link>
    );
  }
  return content;
}
