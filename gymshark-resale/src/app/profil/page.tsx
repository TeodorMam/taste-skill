"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { type Review, averageRating, summarizeReviews } from "@/lib/supabase";
import { ProfileEditor } from "@/components/ProfileEditor";
import { PasswordSetter } from "@/components/PasswordSetter";
import { StripeConnectPanel } from "@/components/StripeConnectPanel";

function Stars({ avg }: { avg: number }) {
  const filled = Math.round(avg);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= filled ? "text-amber-400" : "text-stone-200"}>
          ★
        </span>
      ))}
    </div>
  );
}

export default function ProfilPage() {
  const supabase = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const [email, setEmail] = useState<string | null>(null);
  const [reviews, setReviews] = useState<Review[] | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
      setEmail(data.user?.email ?? null);
    });
  }, [supabase]);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from("reviews")
      .select("*")
      .eq("seller_id", userId)
      .then(({ data }) => setReviews((data ?? []) as Review[]));
  }, [userId, supabase]);

  if (userId === undefined) {
    return <p className="py-6 text-sm text-stone-500">Laster…</p>;
  }
  if (userId === null) {
    return (
      <section className="space-y-3 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">Min profil</h1>
        <p className="text-sm text-stone-600">
          Logg inn for å redigere profilen din.
        </p>
        <Link
          href="/login?next=/profil"
          className="inline-block rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-stone-50 hover:bg-black"
        >
          Logg inn
        </Link>
      </section>
    );
  }

  const rated = reviews ? averageRating(reviews) : null;
  const summary = reviews ? summarizeReviews(reviews) : null;

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Min profil</h1>
        <p className="mt-1 text-sm text-stone-500">
          Sett navn, bilde og bio så kjøpere ser hvem du er.
        </p>
      </div>

      <ProfileEditor />

      {reviews && reviews.length > 0 && (
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-stone-500">
            Mine vurderinger
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            {rated ? (
              <>
                <span className="text-3xl font-semibold tracking-tight">
                  {rated.avg.toFixed(1)}
                </span>
                <Stars avg={rated.avg} />
                <span className="text-sm text-stone-500">
                  {rated.total} vurdering{rated.total !== 1 ? "er" : ""}
                </span>
              </>
            ) : summary && summary.total > 0 ? (
              <>
                <span className="text-2xl font-semibold">{summary.pct}%</span>
                <span className="text-sm text-stone-500">
                  positive · {summary.total} vurdering{summary.total !== 1 ? "er" : ""}
                </span>
              </>
            ) : null}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/favoritter"
          className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white p-4 transition hover:border-stone-400"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-stone-100 text-lg">♡</span>
          <div>
            <p className="text-sm font-medium text-stone-900">Favoritter</p>
            <p className="text-xs text-stone-500">Lagrede varer</p>
          </div>
        </Link>
        <Link
          href="/mine"
          className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white p-4 transition hover:border-stone-400"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-stone-100 text-lg">🏷</span>
          <div>
            <p className="text-sm font-medium text-stone-900">Mine annonser</p>
            <p className="text-xs text-stone-500">Alt du har lagt ut</p>
          </div>
        </Link>
      </div>

      <StripeConnectPanel />

      <PasswordSetter />

      <div className="rounded-2xl border border-stone-200 bg-white p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-stone-500">
          Konto
        </p>
        <p className="mt-2 text-sm text-stone-700">
          Innlogget som <span className="font-medium">{email ?? "ukjent"}</span>
        </p>
        <form action="/auth/signout" method="post" className="mt-3">
          <button
            type="submit"
            className="rounded-full border border-stone-300 bg-white px-4 py-2 text-xs font-medium text-stone-700 hover:border-stone-500"
          >
            Logg ut
          </button>
        </form>
      </div>
    </section>
  );
}
