"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { type Review } from "@/lib/supabase";
import { useToast } from "@/components/ToastProvider";
import { Icon } from "@/components/Icon";

export function ReviewForm({
  itemId,
  reviewerId,
  sellerId,
  label = "Hvordan var opplevelsen?",
  onDone,
}: {
  itemId: string;
  reviewerId: string;
  sellerId: string;
  label?: string;
  onDone?: (review: Review) => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const toast = useToast();
  const [existing, setExisting] = useState<Review | null | undefined>(undefined);
  const [rating, setRating] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("reviews")
      .select("*")
      .eq("item_id", itemId)
      .eq("reviewer_id", reviewerId)
      .maybeSingle()
      .then(({ data }) => setExisting((data as Review | null) ?? null));
  }, [itemId, reviewerId, supabase]);

  async function submit() {
    if (rating === null) {
      setError("Velg et antall stjerner");
      return;
    }
    setError(null);
    setSubmitting(true);
    const { data, error } = await supabase
      .from("reviews")
      .insert({
        item_id: itemId,
        reviewer_id: reviewerId,
        seller_id: sellerId,
        rating,
        is_positive: rating >= 3,
        comment: comment.trim() || null,
      })
      .select("*")
      .single();
    setSubmitting(false);
    if (error) {
      setError(error.message);
      return;
    }
    const review = data as Review;
    setExisting(review);
    toast("Vurdering sendt");
    onDone?.(review);
  }

  if (existing === undefined) return null;

  if (existing) {
    return (
      <div className="border-y border-line py-3.5 text-sm">
        <p className="flex flex-wrap items-center gap-1.5 font-[620] text-ink">
          Takk for vurderingen, {renderStars(existing.rating ?? (existing.is_positive ? 4 : 2), 16)}
        </p>
        {existing.comment && (
          <p className="mt-1 text-ink-2">{existing.comment}</p>
        )}
      </div>
    );
  }

  const display = hovered ?? rating ?? 0;

  return (
    <div className="space-y-3 border-y border-line py-4">
      <p className="text-sm font-[620] text-ink">{label}</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(null)}
            className={`flex h-11 w-11 items-center justify-center ${n <= display ? "text-ink" : "text-[#A9A597]"}`}
            aria-label={`${n} stjerner`}
          >
            <Icon name="stjerne" filled={n <= display} size={28} />
          </button>
        ))}
      </div>
      {rating !== null && (
        <p className="text-[13px] text-ink-3">{ratingLabel(rating)}</p>
      )}
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value.slice(0, 280))}
        placeholder="Valgfri kommentar (maks 280 tegn)…"
        rows={2}
        className="field resize-none"
      />
      {error && <p className="text-[13px] text-clay">{error}</p>}
      <button
        type="button"
        onClick={submit}
        disabled={submitting}
        className="btn btn-line w-full"
      >
        {submitting ? "Lagrer…" : "Send vurdering"}
      </button>
    </div>
  );
}

function ratingLabel(r: number): string {
  return ["", "Veldig dårlig", "Dårlig", "OK", "Bra", "Veldig bra"][r] ?? "";
}

export function renderStars(rating: number, size = 14): React.ReactNode {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${Math.round(rating)} av 5 stjerner`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Icon
          key={n}
          name="stjerne"
          filled={n <= Math.round(rating)}
          size={size}
          className={n <= Math.round(rating) ? "text-ink" : "text-[#A9A597]"}
        />
      ))}
    </span>
  );
}
