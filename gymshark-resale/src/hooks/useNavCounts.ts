"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export function useNavCounts(isLoggedIn: boolean): { inbox: number; varsler: number; orders: number } {
  const path = usePathname();
  const [counts, setCounts] = useState({ inbox: 0, varsler: 0, orders: 0 });

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
      // Unread notifications (offers + favorites) from notifications table
      const { count: notifCount } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("read_at", null);

      // Unread messages sent by others
      const { count: msgCount } = await supabase
        .from("messages").select("id", { count: "exact", head: true })
        .neq("sender_id", user.id).gt("created_at", since);

      let inboxCount = (notifCount ?? 0) + (msgCount ?? 0);
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

      // --- ORDERS COUNT ---
      const { data: activeOrders } = await supabase
        .from("orders")
        .select("id")
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .neq("status", "pending")
        .neq("status", "paid_out")
        .neq("status", "confirmed")
        .neq("status", "cancelled")
        .neq("status", "refunded");

      const ordersCount = path.startsWith("/orders") ? 0 : (activeOrders ?? []).length;

      setCounts({ inbox: inboxCount, varsler: varslerCount, orders: ordersCount });
    })();
  }, [isLoggedIn, path]);

  return counts;
}
