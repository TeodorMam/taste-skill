"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { type Review, averageRating } from "@/lib/supabase";
import { Icon } from "@/components/Icon";

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Icon key={n} name="stjerne" filled={n <= rating} size={16} className={n <= rating ? "text-ink" : "text-[#A9A597]"} />
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
      if (!userId) { router.push("/logg-inn?next=/profil/vurderinger"); return; }
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

  if (loading) return <p className="py-6 text-sm text-ink-3">Laster…</p>;

  return (
    <section className="space-y-5 py-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="-ml-3 flex h-11 w-11 items-center justify-center text-ink hover:bg-ink/5"
          aria-label="Tilbake"
        >
          <Icon name="pil-v" size={20} />
        </button>
        <h1 className="text-[32px] leading-none">Mine vurderinger</h1>
      </div>

      {rated && (
        <div className="flex items-center gap-4 border-y border-line py-4">
          <span className="price text-[44px] leading-none">{rated.avg.toFixed(1)}</span>
          <div>
            <div className="flex gap-0.5">
              {[1,2,3,4,5].map((n) => (
                <Icon key={n} name="stjerne" filled={n <= Math.round(rated.avg)} size={18} className={n <= Math.round(rated.avg) ? "text-ink" : "text-[#A9A597]"} />
              ))}
            </div>
            <p className="mt-0.5 text-sm text-ink-3">{rated.total} vurdering{rated.total !== 1 ? "er" : ""}</p>
          </div>
        </div>
      )}

      {reviews && reviews.length === 0 ? (
        <p className="text-sm text-ink-3">Ingen vurderinger ennå.</p>
      ) : (
        <div className="border-t border-line">
          {reviews?.map((r) => (
            <div key={r.id} className="border-b border-line py-3.5">
              <div className="flex items-center justify-between gap-2">
                {r.rating != null ? (
                  <Stars rating={r.rating} />
                ) : (
                  <span className={`text-[13px] font-[620] ${r.is_positive ? "text-olive" : "text-clay"}`}>
                    {r.is_positive ? "Positiv" : "Negativ"}
                  </span>
                )}
                <span className="text-xs text-ink-3">{timeAgo(r.created_at)}</span>
              </div>
              {r.comment && (
                <p className="mt-2 text-[15px] text-ink-2">{r.comment}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
