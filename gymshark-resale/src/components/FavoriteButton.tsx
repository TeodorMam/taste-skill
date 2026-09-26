"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/ToastProvider";
import { Icon } from "@/components/Icon";

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
      router.push(`/logg-inn?next=${encodeURIComponent(window.location.pathname)}`);
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
        void supabase.rpc("notify_seller_of_favorite", { p_item_id: String(itemId) }).then(() => null);
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
        className="tbtn disabled:opacity-45"
      >
        <Icon name="hjerte" filled={!!favorited} size={18} />
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
      className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-sm bg-raised text-ink disabled:opacity-45"
    >
      <Icon name="hjerte" filled={!!favorited} size={18} />
    </button>
  );
}
