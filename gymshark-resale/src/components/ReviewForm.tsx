"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { type Review } from "@/lib/supabase";
import { useToast } from "@/components/ToastProvider";

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
      <div className="rounded-sm border border-line bg-paper p-4 text-sm">
        <p className="font-medium text-ink">
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
    <div className="space-y-3 rounded-sm border border-line bg-raised p-4">
      <p className="text-sm font-medium text-ink">{label}</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(null)}
            className="text-3xl leading-none transition-transform hover:scale-110 focus:outline-none"
            aria-label={`${n} stjerner`}
          >
            <span className={n <= display ? "text-ochre" : "text-ink-3"}>★</span>
          </button>
        ))}
      </div>
      {rating !== null && (
        <p className="text-xs text-ink-3">{ratingLabel(rating)}</p>
      )}
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value.slice(0, 280))}
        placeholder="Valgfri kommentar (maks 280 tegn)…"
        rows={2}
        className="block w-full resize-none rounded-sm border border-line-2 bg-raised px-3 py-2 text-sm outline-none focus:border-olive focus:ring-1 focus:ring-olive/30"
      />
      {error && <p className="text-xs text-clay">{error}</p>}
      <button
        type="button"
        onClick={submit}
        disabled={submitting}
        className="w-full rounded-sm bg-ink px-5 py-2.5 text-sm font-medium text-paper hover:bg-ink disabled:opacity-50"
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
    <span className="inline-flex items-center gap-0.5" style={{ fontSize: size }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= Math.round(rating) ? "text-ochre" : "text-ink-3"}>
          ★
        </span>
      ))}
    </span>
  );
}
