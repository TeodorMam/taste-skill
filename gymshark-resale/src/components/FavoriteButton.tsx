"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/ToastProvider";

export function FavoriteButton({
  itemId,
  currentPrice,
  sellerId,
  itemTitle,
  variant = "overlay",
}: {
  itemId: string;
  currentPrice?: number;
  sellerId?: string | null;
  itemTitle?: string;
  variant?: "overlay" | "inline";
}) {
  const router = useRouter();
  const toast = useToast();
  const supabase = useMemo(() => createClient(), []);
  const [favorited, setFavorited] = useState<boolean | null>(null);
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, [supabase]);

  useEffect(() => {
    if (!userId) {
      setFavorited(false);
      return;
    }
    supabase
      .from("favorites")
      .select("item_id")
      .eq("user_id", userId)
      .eq("item_id", itemId)
      .maybeSingle()
      .then(({ data }) => setFavorited(!!data));
  }, [userId, itemId, supabase]);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!userId) {
      router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    if (busy || favorited === null) return;
    setBusy(true);
    if (favorited) {
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("user_id", userId)
        .eq("item_id", itemId);
      if (!error) { setFavorited(false); toast("Fjernet fra favoritter"); }
      else toast(`Feil: ${error.message}`);
    } else {
      const { error } = await supabase
        .from("favorites")
        .insert({
          user_id: userId,
          item_id: itemId,
          ...(currentPrice !== undefined ? { price_when_favorited: currentPrice } : {}),
        });
      if (!error) {
        setFavorited(true);
        toast("Lagt til i favoritter");
        if (sellerId && sellerId !== userId) {
          void supabase.from("notifications").insert({
            user_id: sellerId,
            type: "favorite",
            item_id: itemId,
            from_user_id: userId,
            metadata: { item_title: itemTitle ?? "" },
          }).then(() => null);
        }
      } else {
        toast(`Feil: ${error.message}`);
      }
    }
    setBusy(false);
  }

  const ariaLabel = favorited ? "Fjern fra favoritter" : "Legg til i favoritter";

  if (variant === "inline") {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-label={ariaLabel}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-full border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:border-stone-500 disabled:opacity-50"
      >
        <Heart filled={!!favorited} />
        {favorited ? "Favoritt" : "Legg til"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={ariaLabel}
      disabled={busy}
      className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-stone-700 shadow-sm backdrop-blur transition hover:bg-white disabled:opacity-50"
    >
      <Heart filled={!!favorited} />
    </button>
  );
}

function Heart({ filled }: { filled: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill={filled ? "#dc2626" : "none"}
      stroke={filled ? "#dc2626" : "currentColor"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}
