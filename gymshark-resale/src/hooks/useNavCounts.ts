"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export function useNavCounts(isLoggedIn: boolean): { inbox: number; varsler: number } {
  const path = usePathname();
  const [counts, setCounts] = useState({ inbox: 0, varsler: 0 });

  useEffect(() => {
    if (!isLoggedIn) return;
    const supabase = createClient();

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const lastVisit = localStorage.getItem("lastInboxVisit");
      const since = lastVisit
        ? new Date(Number(lastVisit)).toISOString()
        : new Date(Date.now() - 30 * 86400000).toISOString();

      // --- INBOX COUNT ---
      let inboxCount = 0;

      const { data: myItems } = await supabase.from("items").select("id").eq("seller_id", user.id);
      const myItemIds = (myItems ?? []).map((i: { id: string }) => i.id);

      if (myItemIds.length > 0) {
        const { count: offerCount } = await supabase
          .from("offers").select("id", { count: "exact", head: true })
          .in("item_id", myItemIds).neq("buyer_id", user.id).gt("created_at", since);
        inboxCount += offerCount ?? 0;

        const { count: favCount } = await supabase
          .from("favorites").select("user_id", { count: "exact", head: true })
          .in("item_id", myItemIds).neq("user_id", user.id).gt("created_at", since);
        inboxCount += favCount ?? 0;
      }

      const { count: msgCount } = await supabase
        .from("messages").select("id", { count: "exact", head: true })
        .neq("sender_id", user.id).gt("created_at", since);
      inboxCount += msgCount ?? 0;

      if (path === "/inbox") inboxCount = 0;

      // --- VARSLER COUNT ---
      let varslerCount = 0;

      const { data: searches } = await supabase
        .from("saved_searches").select("id, last_seen_at").eq("user_id", user.id);

      for (const s of (searches ?? [])) {
        const { count } = await supabase
          .from("items").select("id", { count: "exact", head: true })
          .eq("is_sold", false).gt("created_at", s.last_seen_at);
        if ((count ?? 0) > 0) varslerCount++;
      }

      const { data: favs } = await supabase
        .from("favorites")
        .select("price_when_favorited, items(price)")
        .eq("user_id", user.id);

      for (const fav of (favs ?? [])) {
        const item = Array.isArray(fav.items) ? fav.items[0] as { price: number } | undefined : fav.items as { price: number } | null;
        if (item && fav.price_when_favorited && item.price < fav.price_when_favorited) {
          varslerCount++;
        }
      }

      if (path === "/varsler") varslerCount = 0;

      setCounts({ inbox: inboxCount, varsler: varslerCount });
    })();
  }, [isLoggedIn, path]);

  return counts;
}
