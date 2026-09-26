"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { type Review, averageRating, summarizeReviews } from "@/lib/supabase";
import { Icon } from "@/components/Icon";

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
  const textSize = size === "md" ? "text-sm" : "text-[13px]";

  // A plain text row, no coloured pill: a star (or a tick / warning / cross
  // for the older thumbs reviews), the score, and the count in grey.
  let content: React.ReactNode;

  if (star) {
    content = (
      <span className={`num inline-flex items-center gap-[5px] font-[620] text-ink ${textSize}`}>
        <Icon name="stjerne" filled size={14} />
        {star.avg.toFixed(1)} <span className="font-medium text-ink-3">({star.total})</span>
      </span>
    );
  } else if (total > 0) {
    content = (
      <span className={`num inline-flex items-center gap-[5px] font-[620] text-ink ${textSize}`}>
        <Icon name={pct >= 80 ? "hake" : pct >= 50 ? "advarsel" : "kryss"} size={14} className={pct >= 50 ? "" : "text-clay"} />
        {pct}% <span className="font-medium text-ink-3">({total})</span>
      </span>
    );
  } else {
    content = (
      <span className={`inline-flex items-center font-[550] text-ink-2 ${textSize}`}>
        Ny selger
      </span>
    );
  }

  if (linkToProfile) {
    return (
      <Link href={`/selger/${sellerId}`} className="hover:underline">
        {content}
      </Link>
    );
  }
  return content;
}
