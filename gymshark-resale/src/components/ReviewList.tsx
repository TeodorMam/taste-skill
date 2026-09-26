"use client";

import { type Review } from "@/lib/supabase";
import { renderStars } from "@/components/ReviewForm";
import { Icon } from "@/components/Icon";

export function ReviewList({ reviews }: { reviews: Review[] }) {
  if (reviews.length === 0) {
    return (
      <div className="border-t border-line pt-4 text-sm text-ink-3">
        Ingen vurderinger enda.
      </div>
    );
  }
  return (
    <ul className="border-t border-line">
      {reviews.map((r) => (
        <li key={r.id} className="border-b border-line py-3.5 text-sm">
          <div className="flex items-center justify-between">
            {r.rating !== null && r.rating !== undefined ? (
              <span>{renderStars(r.rating)}</span>
            ) : (
              <span className={`inline-flex items-center gap-1.5 text-[13px] font-[620] ${r.is_positive ? "text-olive" : "text-clay"}`}>
                <Icon name={r.is_positive ? "hake" : "kryss"} size={14} />
                {r.is_positive ? "Bra" : "Dårlig"}
              </span>
            )}
            <span className="num text-xs text-ink-3">
              {new Date(r.created_at).toLocaleDateString("no-NO")}
            </span>
          </div>
          {r.comment && (
            <p className="mt-1.5 text-[15px] text-ink-2">{r.comment}</p>
          )}
        </li>
      ))}
    </ul>
  );
}
