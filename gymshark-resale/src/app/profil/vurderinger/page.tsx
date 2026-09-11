"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { type Review, averageRating } from "@/lib/supabase";

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= rating ? "text-amber-400" : "text-stone-200"}>
          ★
        </span>
      ))}
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "I dag";
  if (days === 1) return "I går";
  if (days < 7) return `${days} dager siden`;
  if (days < 30) return `${Math.floor(days / 7)} uker siden`;
  if (days < 365) return `${Math.floor(days / 30)} måneder siden`;
  return `${Math.floor(days / 365)} år siden`;
}

export default function VurderingerPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const userId = data.user?.id;
      if (!userId) { router.push("/login?next=/profil/vurderinger"); return; }
      supabase
        .from("reviews")
        .select("*")
        .eq("seller_id", userId)
        .order("created_at", { ascending: false })
        .then(({ data: rData }) => {
          setReviews((rData ?? []) as Review[]);
          setLoading(false);
        });
    });
  }, [supabase, router]);

  const rated = reviews ? averageRating(reviews) : null;

  if (loading) return <p className="py-6 text-sm text-stone-500">Laster…</p>;

  return (
    <section className="space-y-5 py-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-full p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
          aria-label="Tilbake"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 className="text-2xl font-semibold tracking-tight">Mine vurderinger</h1>
      </div>

      {rated && (
        <div className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white px-5 py-4">
          <span className="text-4xl font-semibold tracking-tight">{rated.avg.toFixed(1)}</span>
          <div>
            <div className="flex gap-0.5">
              {[1,2,3,4,5].map((n) => (
                <span key={n} className={n <= Math.round(rated.avg) ? "text-amber-400 text-lg" : "text-stone-200 text-lg"}>★</span>
              ))}
            </div>
            <p className="mt-0.5 text-sm text-stone-500">{rated.total} vurdering{rated.total !== 1 ? "er" : ""}</p>
          </div>
        </div>
      )}

      {reviews && reviews.length === 0 ? (
        <p className="text-sm text-stone-400">Ingen vurderinger ennå.</p>
      ) : (
        <div className="space-y-3">
          {reviews?.map((r) => (
            <div key={r.id} className="rounded-2xl border border-stone-200 bg-white px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                {r.rating != null ? (
                  <Stars rating={r.rating} />
                ) : (
                  <span className={`text-xs font-medium ${r.is_positive ? "text-emerald-600" : "text-red-500"}`}>
                    {r.is_positive ? "Positiv" : "Negativ"}
                  </span>
                )}
                <span className="text-xs text-stone-400">{timeAgo(r.created_at)}</span>
              </div>
              {r.comment && (
                <p className="mt-2 text-sm text-stone-700">{r.comment}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
