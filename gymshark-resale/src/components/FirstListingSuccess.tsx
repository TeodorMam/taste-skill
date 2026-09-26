"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";

export function FirstListingSuccess({
  itemId,
  itemTitle,
  shareUrl,
  isSeller,
}: {
  itemId: string;
  itemTitle: string;
  shareUrl: string;
  isSeller: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const welcome = searchParams.get("welcome") === "1";
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [profileComplete, setProfileComplete] = useState(false);

  useEffect(() => {
    if (welcome && isSeller) setOpen(true);
  }, [welcome, isSeller]);

  useEffect(() => {
    if (!open) return;
    const supabase = createClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data?.display_name?.trim() && data?.avatar_url) setProfileComplete(true);
    })();
  }, [open]);

  function close() {
    setOpen(false);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("welcome");
    const qs = params.toString();
    router.replace(`/vare/${itemId}${qs ? `?${qs}` : ""}`, { scroll: false });
  }

  async function copyLink() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      onClick={close}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md overflow-hidden rounded-t-sheet bg-raised sm:rounded-sm"
      >
        <div className="bg-olive px-6 py-8 text-center text-raised">
          <div className="text-5xl">🎉</div>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight">
            Annonsen er ute!
          </h2>
          <p className="mt-1.5 text-sm opacity-90">
            «{itemTitle}» er nå synlig for alle på Aktivbruk.
          </p>
        </div>

        <div className="space-y-3 px-5 py-5">
          <p className="text-xs font-medium uppercase tracking-wider text-ink-3">
            Neste steg
          </p>

          <button
            type="button"
            onClick={copyLink}
            className="flex w-full items-center justify-between rounded-sm border border-line bg-raised px-4 py-3 text-left transition hover:border-olive"
          >
            <span className="flex items-center gap-3">
              <span className="text-xl">🔗</span>
              <span>
                <span className="block text-sm font-medium text-ink">
                  {copied ? "Lenke kopiert!" : "Del lenken"}
                </span>
                <span className="block text-xs text-ink-3">
                  Send til venner eller del på Stories
                </span>
              </span>
            </span>
            <span className="text-ink-3">›</span>
          </button>

          {!profileComplete && (
            <Link
              href="/profil"
              onClick={close}
              className="flex w-full items-center justify-between rounded-sm border border-line bg-raised px-4 py-3 transition hover:border-olive"
            >
              <span className="flex items-center gap-3">
                <span className="text-xl">👤</span>
                <span>
                  <span className="block text-sm font-medium text-ink">
                    Fyll ut profilen
                  </span>
                  <span className="block text-xs text-ink-3">
                    Navn og bilde gir kjøpere mer tillit
                  </span>
                </span>
              </span>
              <span className="text-ink-3">›</span>
            </Link>
          )}

          <Link
            href="/meldinger"
            onClick={close}
            className="flex w-full items-center justify-between rounded-sm border border-line bg-raised px-4 py-3 transition hover:border-olive"
          >
            <span className="flex items-center gap-3">
              <span className="text-xl">💬</span>
              <span>
                <span className="block text-sm font-medium text-ink">
                  Hold øye med innboksen
                </span>
                <span className="block text-xs text-ink-3">
                  Raske svar = raske salg, du får også e-postvarsler
                </span>
              </span>
            </span>
            <span className="text-ink-3">›</span>
          </Link>
        </div>

        <div className="border-t border-line bg-paper px-5 py-3">
          <button
            type="button"
            onClick={close}
            className="w-full rounded-sm bg-ink px-5 py-2.5 text-sm font-medium text-raised hover:bg-ink"
          >
            Til annonsen
          </button>
        </div>
      </div>
    </div>
  );
}
