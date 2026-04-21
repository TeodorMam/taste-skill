"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { type Review } from "@/lib/supabase";

export function ReviewForm({
  itemId,
  reviewerId,
  sellerId,
  onDone,
}: {
  itemId: string;
  reviewerId: string;
  sellerId: string;
  onDone?: (review: Review) => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [existing, setExisting] = useState<Review | null | undefined>(undefined);
  const [isPositive, setIsPositive] = useState<boolean | null>(null);
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
    if (isPositive === null) {
      setError("Velg tommel opp eller ned");
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
        is_positive: isPositive,
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
    onDone?.(review);
  }

  if (existing === undefined) return null;

  if (existing) {
    return (
      <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm">
        <p className="font-medium text-stone-800">
          Takk for vurderingen {existing.is_positive ? "👍" : "👎"}
        </p>
        {existing.comment && (
          <p className="mt-1 text-stone-600">{existing.comment}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-stone-200 bg-white p-4">
      <p className="text-sm font-medium text-stone-800">Hvordan var opplevelsen?</p>
      <p className="text-xs text-stone-500">
        Din vurdering hjelper andre kjøpere å stole på selgeren.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setIsPositive(true)}
          className={`flex-1 rounded-full border px-3 py-2 text-sm font-medium transition ${
            isPositive === true
              ? "border-emerald-500 bg-emerald-50 text-emerald-700"
              : "border-stone-300 bg-white text-stone-700 hover:border-stone-500"
          }`}
        >
          👍 Bra
        </button>
        <button
          type="button"
          onClick={() => setIsPositive(false)}
          className={`flex-1 rounded-full border px-3 py-2 text-sm font-medium transition ${
            isPositive === false
              ? "border-red-500 bg-red-50 text-red-700"
              : "border-stone-300 bg-white text-stone-700 hover:border-stone-500"
          }`}
        >
          👎 Dårlig
        </button>
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value.slice(0, 280))}
        placeholder="Valgfri kommentar (maks 280 tegn)…"
        rows={2}
        className="block w-full resize-none rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#5a6b32] focus:ring-1 focus:ring-[#5a6b32]/30"
      />
      {error && <p className="text-xs text-red-700">{error}</p>}
      <button
        type="button"
        onClick={submit}
        disabled={submitting}
        className="w-full rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-stone-50 hover:bg-black disabled:opacity-50"
      >
        {submitting ? "Lagrer…" : "Send vurdering"}
      </button>
    </div>
  );
}
