"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { Icon, type IconName } from "@/components/Icon";

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
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/35 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      onClick={close}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[420px] overflow-hidden rounded-t-sheet bg-raised sm:rounded-sheet"
      >
        <div className="px-5 pb-2 pt-6 sm:px-6">
          <Icon name="feiring" size={28} className="text-olive" />
          <h2 className="mt-3 text-[32px] leading-none">
            Annonsen er ute!
          </h2>
          <p className="mt-2 text-[15px] text-ink-2">
            «{itemTitle}» er nå synlig for alle på Aktivbruk.
          </p>
        </div>

        <div className="px-5 pb-2 pt-4 sm:px-6">
          <h3 className="pb-2 text-sm font-[620] text-ink">
            Neste steg
          </h3>

          <div className="border-t border-line">
          <button
            type="button"
            onClick={copyLink}
            className="flex min-h-[64px] w-full items-center gap-3 border-b border-line py-3 text-left hover:bg-ink/5"
          >
            <NextStep icon="lenke" title={copied ? "Lenke kopiert!" : "Del lenken"} sub="Send til venner eller del på Stories" />
          </button>

          {!profileComplete && (
            <Link
              href="/profil"
              onClick={close}
              className="flex min-h-[64px] w-full items-center gap-3 border-b border-line py-3 text-left hover:bg-ink/5"
            >
              <NextStep icon="profil" title="Fyll ut profilen" sub="Navn og bilde gir kjøpere mer tillit" />
            </Link>
          )}

          <Link
            href="/meldinger"
            onClick={close}
            className="flex min-h-[64px] w-full items-center gap-3 border-b border-line py-3 text-left hover:bg-ink/5"
          >
            <NextStep icon="chat" title="Hold øye med innboksen" sub="Raske svar = raske salg, du får også e-postvarsler" />
          </Link>
          </div>
        </div>

        <div className="px-5 pb-8 pt-4 sm:px-6 sm:pb-6">
          <button
            type="button"
            onClick={close}
            className="btn btn-ink w-full"
          >
            Til annonsen
          </button>
        </div>
      </div>
    </div>
  );
}

function NextStep({ icon, title, sub }: { icon: IconName; title: string; sub: string }) {
  return (
    <>
      <Icon name={icon} size={20} className="text-ink-2" />
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-[620] text-ink">{title}</span>
        <span className="block text-[13px] text-ink-3">{sub}</span>
      </span>
      <Icon name="chevron-h" size={18} className="text-ink-3" />
    </>
  );
}
