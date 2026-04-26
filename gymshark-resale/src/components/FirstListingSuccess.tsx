"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

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

  useEffect(() => {
    if (welcome && isSeller) setOpen(true);
  }, [welcome, isSeller]);

  function close() {
    setOpen(false);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("welcome");
    const qs = params.toString();
    router.replace(`/item/${itemId}${qs ? `?${qs}` : ""}`, { scroll: false });
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
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      onClick={close}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
      >
        <div className="bg-gradient-to-br from-[#5a6b32] to-[#3d4720] px-6 py-8 text-center text-white">
          <div className="text-5xl">🎉</div>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight">
            Annonsen er ute!
          </h2>
          <p className="mt-1.5 text-sm opacity-90">
            «{itemTitle}» er nå synlig for alle på Aktivbruk.
          </p>
        </div>

        <div className="space-y-3 px-5 py-5">
          <p className="text-xs font-medium uppercase tracking-wider text-stone-500">
            Neste steg
          </p>

          <button
            type="button"
            onClick={copyLink}
            className="flex w-full items-center justify-between rounded-xl border border-stone-200 bg-white px-4 py-3 text-left transition hover:border-[#5a6b32]"
          >
            <span className="flex items-center gap-3">
              <span className="text-xl">🔗</span>
              <span>
                <span className="block text-sm font-medium text-stone-900">
                  {copied ? "Lenke kopiert!" : "Del lenken"}
                </span>
                <span className="block text-xs text-stone-500">
                  Send til venner eller del på Stories
                </span>
              </span>
            </span>
            <span className="text-stone-400">›</span>
          </button>

          <Link
            href="/profil"
            onClick={close}
            className="flex w-full items-center justify-between rounded-xl border border-stone-200 bg-white px-4 py-3 transition hover:border-[#5a6b32]"
          >
            <span className="flex items-center gap-3">
              <span className="text-xl">👤</span>
              <span>
                <span className="block text-sm font-medium text-stone-900">
                  Fyll ut profilen
                </span>
                <span className="block text-xs text-stone-500">
                  Navn og bilde gir kjøpere mer tillit
                </span>
              </span>
            </span>
            <span className="text-stone-400">›</span>
          </Link>

          <Link
            href="/inbox"
            onClick={close}
            className="flex w-full items-center justify-between rounded-xl border border-stone-200 bg-white px-4 py-3 transition hover:border-[#5a6b32]"
          >
            <span className="flex items-center gap-3">
              <span className="text-xl">💬</span>
              <span>
                <span className="block text-sm font-medium text-stone-900">
                  Hold øye med innboksen
                </span>
                <span className="block text-xs text-stone-500">
                  Raske svar = raske salg
                </span>
              </span>
            </span>
            <span className="text-stone-400">›</span>
          </Link>
        </div>

        <div className="border-t border-stone-100 bg-stone-50 px-5 py-3">
          <button
            type="button"
            onClick={close}
            className="w-full rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-black"
          >
            Til annonsen
          </button>
        </div>
      </div>
    </div>
  );
}
