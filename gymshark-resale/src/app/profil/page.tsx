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
import { Icon } from "@/components/Icon";
import { Sep } from "@/components/Sep";

function Stars({ avg }: { avg: number }) {
  const filled = Math.round(avg);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Icon key={n} name="stjerne" filled={n <= filled} size={16} className={n <= filled ? "text-ink" : "text-[#A9A597]"} />
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
        <h1 className="text-[40px] leading-none">Min profil</h1>
        <p className="text-sm text-ink-2">
          Logg inn for å redigere profilen din.
        </p>
        <Link
          href="/logg-inn?next=/profil"
          className="btn btn-ink"
        >
          Logg inn
        </Link>
      </section>
    );
  }

  const rated = reviews ? averageRating(reviews) : null;
  const summary = reviews ? summarizeReviews(reviews) : null;

  return (
    <section className="space-y-8">
      <div>
        <h1 className="text-[40px] leading-none">Min profil</h1>
      </div>

      <ProfileEditor email={email} />

      {reviews !== null && (
        <div className="border-t border-ink pt-4">
          <h2 className="text-[17px] font-[620] leading-[1.3] [font-stretch:100%]">
            Mine vurderinger
          </h2>
          {reviews.length === 0 ? (
            <p className="mt-3 text-sm text-ink-3">Ingen vurderinger ennå, de vises her etter første salg.</p>
          ) : rated ? (
            <Link
              href="/profil/vurderinger"
              className="mt-3 flex w-full flex-wrap items-center gap-x-4 gap-y-2"
            >
              <span className="price text-[34px] leading-none">
                {rated.avg.toFixed(1)}
              </span>
              <Stars avg={rated.avg} />
              <span className="text-sm text-ink-3">
                {rated.total} vurdering{rated.total !== 1 ? "er" : ""}
              </span>
              <span className="ml-auto flex items-center gap-1.5 text-sm font-semibold text-ink">Se alle <Icon name="pil-h" size={16} /></span>
            </Link>
          ) : summary && summary.total > 0 ? (
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="price text-[34px] leading-none">{summary.pct}%</span>
              <span className="text-sm text-ink-3">
                positive<Sep />{summary.total} vurdering{summary.total !== 1 ? "er" : ""}
              </span>
            </div>
          ) : null}
        </div>
      )}

      <nav aria-label="Min side" className="border-t border-ink">
      <Link
        href="/favoritter"
        className="flex min-h-[64px] items-center gap-3.5 border-b border-line py-3 hover:bg-ink/[0.03]"
      >
        <Icon name="hjerte" size={20} className="text-ink-2" />
        <div className="flex-1">
          <p className="text-[15px] font-[620] text-ink">Favoritter</p>
          <p className="text-[13px] text-ink-3">Lagrede varer</p>
        </div>
        <Icon name="chevron-h" size={18} className="text-ink-3" />
      </Link>
      <Link
        href="/mine"
        className="flex min-h-[64px] items-center gap-3.5 border-b border-line py-3 hover:bg-ink/[0.03]"
      >
        <Icon name="etikett" size={20} className="text-ink-2" />
        <div className="flex-1">
          <p className="text-[15px] font-[620] text-ink">Mine annonser</p>
          <p className="text-[13px] text-ink-3">Alt du har lagt ut</p>
        </div>
        <Icon name="chevron-h" size={18} className="text-ink-3" />
      </Link>
      <Link
        href="/ordre"
        className="flex min-h-[64px] items-center gap-3.5 border-b border-line py-3 hover:bg-ink/[0.03]"
      >
        <Icon name="pakke" size={20} className="text-ink-2" />
        <div className="flex-1">
          <p className="text-[15px] font-[620] text-ink">Mine ordre</p>
          <p className="text-[13px] text-ink-3">Kjøp, salg og leveringsstatus</p>
        </div>
        {orderCount > 0 && (
          <span className="count">
            {orderCount > 9 ? "9+" : orderCount}
          </span>
        )}
        <Icon name="chevron-h" size={18} className="text-ink-3" />
      </Link>
      <Link
        href="/varsler"
        className="flex min-h-[64px] items-center gap-3.5 border-b border-line py-3 hover:bg-ink/[0.03]"
      >
        <Icon name="bjelle" size={20} className="text-ink-2" />
        <div className="flex-1">
          <p className="text-[15px] font-[620] text-ink">Varsler</p>
          <p className="text-[13px] text-ink-3">Prisfall og søk</p>
        </div>
        {varslerCount > 0 && (
          <span className="count">
            {varslerCount > 9 ? "9+" : varslerCount}
          </span>
        )}
        <Icon name="chevron-h" size={18} className="text-ink-3" />
      </Link>
      </nav>

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
    <div className="border-t border-ink pt-4">
      <h2 className="text-[17px] font-[620] leading-[1.3] [font-stretch:100%]">
        Konto
      </h2>
      <p className="mt-2 text-sm text-ink-2">
        Innlogget som <span className="font-medium">{email ?? "ukjent"}</span>
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-6">
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="tbtn tbtn-u"
          >
            Logg ut
          </button>
        </form>
        {!confirming && (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="tbtn tbtn-u text-clay"
          >
            Slett konto
          </button>
        )}
      </div>

      {confirming && (
        <div className="mt-4 space-y-3 rounded-sm bg-clay-soft p-4">
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
              className="btn btn-clayfill"
            >
              {deleting ? "Sletter…" : "Ja, slett kontoen min"}
            </button>
            <button
              type="button"
              onClick={() => { setConfirming(false); setError(null); }}
              className="tbtn px-3"
            >
              Avbryt
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
