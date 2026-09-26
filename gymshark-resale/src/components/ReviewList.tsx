"use client";

import { type Review } from "@/lib/supabase";
import { renderStars } from "@/components/ReviewForm";

export function ReviewList({ reviews }: { reviews: Review[] }) {
  if (reviews.length === 0) {
    return (
      <div className="rounded-sm border border-dashed border-line-2 p-6 text-center text-sm text-ink-3">
        Ingen vurderinger enda.
      </div>
    );
  }
  return (
    <ul className="space-y-2">
      {reviews.map((r) => (
        <li key={r.id} className="rounded-sm border border-line bg-raised p-3 text-sm">
          <div className="flex items-center justify-between">
            {r.rating !== null && r.rating !== undefined ? (
              <span>{renderStars(r.rating)}</span>
            ) : (
              <span className={`inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-[11px] font-medium ${r.is_positive ? "bg-olive-soft text-olive" : "bg-clay-soft text-clay"}`}>
                {r.is_positive ? "👍 Bra" : "👎 Dårlig"}
              </span>
            )}
            <span className="text-[11px] text-ink-3">
              {new Date(r.created_at).toLocaleDateString("no-NO")}
            </span>
          </div>
          {r.comment && (
            <p className="mt-1.5 text-sm text-ink-2">{r.comment}</p>
          )}
        </li>
      ))}
    </ul>
  );
}
