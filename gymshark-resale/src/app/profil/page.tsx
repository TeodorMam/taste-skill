"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { type Review, averageRating, summarizeReviews } from "@/lib/supabase";
import { ProfileEditor } from "@/components/ProfileEditor";
import { PasswordSetter } from "@/components/PasswordSetter";
import { StripeConnectPanel } from "@/components/StripeConnectPanel";
import { useNavCounts } from "@/hooks/useNavCounts";

function Stars({ avg }: { avg: number }) {
  const filled = Math.round(avg);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= filled ? "text-ochre" : "text-ink-3"}>
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
  const { orders: orderCount, varsler: varslerCount } = useNavCounts(true);

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
    return <p className="py-6 text-sm text-ink-3">Laster…</p>;
  }
  if (userId === null) {
    return (
      <section className="space-y-3 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">Min profil</h1>
        <p className="text-sm text-ink-2">
          Logg inn for å redigere profilen din.
        </p>
        <Link
          href="/logg-inn?next=/profil"
          className="inline-block rounded-sm bg-ink px-5 py-3 text-sm font-medium text-paper hover:bg-ink"
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
      </div>

      <ProfileEditor email={email} />

      {reviews !== null && (
        <div className="rounded-sm border border-line bg-raised p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-ink-3">
            Mine vurderinger
          </p>
          {reviews.length === 0 ? (
            <p className="mt-3 text-sm text-ink-3">Ingen vurderinger ennå, de vises her etter første salg.</p>
          ) : rated ? (
            <Link
              href="/profil/vurderinger"
              className="mt-3 flex w-full flex-wrap items-center gap-x-4 gap-y-2"
            >
              <span className="text-3xl font-semibold tracking-tight">
                {rated.avg.toFixed(1)}
              </span>
              <Stars avg={rated.avg} />
              <span className="text-sm text-ink-3">
                {rated.total} vurdering{rated.total !== 1 ? "er" : ""}
              </span>
              <span className="ml-auto text-xs text-ink-3">Se alle →</span>
            </Link>
          ) : summary && summary.total > 0 ? (
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="text-2xl font-semibold">{summary.pct}%</span>
              <span className="text-sm text-ink-3">
                positive · {summary.total} vurdering{summary.total !== 1 ? "er" : ""}
              </span>
            </div>
          ) : null}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/favoritter"
          className="flex items-center gap-3 rounded-sm border border-line bg-raised p-4 transition hover:border-ink"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-sunk text-lg">♡</span>
          <div>
            <p className="text-sm font-medium text-ink">Favoritter</p>
            <p className="text-xs text-ink-3">Lagrede varer</p>
          </div>
        </Link>
        <Link
          href="/mine"
          className="flex items-center gap-3 rounded-sm border border-line bg-raised p-4 transition hover:border-ink"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-sunk text-lg">🏷</span>
          <div>
            <p className="text-sm font-medium text-ink">Mine annonser</p>
            <p className="text-xs text-ink-3">Alt du har lagt ut</p>
          </div>
        </Link>
      </div>

      <Link
        href="/ordre"
        className="flex items-center gap-3 rounded-sm border border-line bg-raised p-4 transition hover:border-ink"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-sunk text-lg">📦</span>
        <div className="flex-1">
          <p className="text-sm font-medium text-ink">Mine ordre</p>
          <p className="text-xs text-ink-3">Kjøp, salg og leveringsstatus</p>
        </div>
        {orderCount > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-sm bg-clay px-1 text-[10px] font-bold text-raised">
            {orderCount > 9 ? "9+" : orderCount}
          </span>
        )}
      </Link>

      <Link
        href="/varsler"
        className="relative flex items-center gap-3 rounded-sm border border-line bg-raised p-4 transition hover:border-ink"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-sunk text-lg">🔔</span>
        <div className="flex-1">
          <p className="text-sm font-medium text-ink">Varsler</p>
          <p className="text-xs text-ink-3">Prisfall og søk</p>
        </div>
        {varslerCount > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-sm bg-clay px-1 text-[10px] font-bold text-raised">
            {varslerCount > 9 ? "9+" : varslerCount}
          </span>
        )}
      </Link>

      <StripeConnectPanel />

      <PasswordSetter />

      <AccountSection email={email} />
    </section>
  );
}

function AccountSection({ email }: { email: string | null }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function deleteAccount() {
    setDeleting(true);
    setError(null);
    const res = await fetch("/api/account/delete", { method: "POST" });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? "Noe gikk galt");
      setDeleting(false);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="rounded-sm border border-line bg-raised p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-ink-3">
        Konto
      </p>
      <p className="mt-2 text-sm text-ink-2">
        Innlogget som <span className="font-medium">{email ?? "ukjent"}</span>
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="rounded-sm border border-line-2 bg-raised px-4 py-2 text-xs font-medium text-ink-2 hover:border-ink"
          >
            Logg ut
          </button>
        </form>
        {!confirming && (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="rounded-sm border border-clay/40 bg-raised px-4 py-2 text-xs font-medium text-clay hover:border-clay/40"
          >
            Slett konto
          </button>
        )}
      </div>

      {confirming && (
        <div className="mt-4 rounded-sm border border-clay/40 bg-clay-soft p-4 space-y-3">
          <p className="text-sm font-semibold text-clay">Er du sikker?</p>
          <p className="text-xs text-clay">
            Alle data slettes permanent innen 30 dager. Aktive ordre må fullføres først. Dette kan ikke angres.
          </p>
          {error && (
            <p className="text-xs text-clay">{error}</p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={deleteAccount}
              disabled={deleting}
              className="rounded-sm bg-clay px-4 py-2 text-xs font-medium text-raised hover:bg-clay disabled:opacity-50"
            >
              {deleting ? "Sletter…" : "Ja, slett kontoen min"}
            </button>
            <button
              type="button"
              onClick={() => { setConfirming(false); setError(null); }}
              className="rounded-sm border border-line-2 bg-raised px-4 py-2 text-xs font-medium text-ink-2 hover:border-ink"
            >
              Avbryt
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
