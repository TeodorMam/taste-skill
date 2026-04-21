"use client";

import { type Review } from "@/lib/supabase";

export function ReviewList({ reviews }: { reviews: Review[] }) {
  if (reviews.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-stone-300 p-6 text-center text-sm text-stone-500">
        Ingen vurderinger enda.
      </div>
    );
  }
  return (
    <ul className="space-y-2">
      {reviews.map((r) => (
        <li
          key={r.id}
          className="rounded-xl border border-stone-200 bg-white p-3 text-sm"
        >
          <div className="flex items-center justify-between">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                r.is_positive
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {r.is_positive ? "👍 Bra" : "👎 Dårlig"}
            </span>
            <span className="text-[11px] text-stone-400">
              {new Date(r.created_at).toLocaleDateString("no-NO")}
            </span>
          </div>
          {r.comment && (
            <p className="mt-1.5 text-sm text-stone-700">{r.comment}</p>
          )}
        </li>
      ))}
    </ul>
  );
}
