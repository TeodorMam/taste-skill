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

      // --- INBOX COUNT ---
      // Count threads that have at least one unread message. Uses chat_reads
      // per-thread last-read timestamp so it clears the moment you open a
      // conversation, matching the inbox UI.
      const [{ data: myItems }, { data: reads }] = await Promise.all([
        supabase.from("items").select("id").eq("seller_id", user.id),
        supabase.from("chat_reads").select("item_id, buyer_id, last_read_at").eq("user_id", user.id),
      ]);
      const myItemIds = new Set((myItems ?? []).map((i) => String((i as { id: string | number }).id)));
      const readsMap = new Map<string, string>();
      for (const r of (reads ?? []) as { item_id: string; buyer_id: string; last_read_at: string }[]) {
        readsMap.set(`${r.item_id}:${r.buyer_id}`, r.last_read_at);
      }
      const { data: recentMsgs } = await supabase
        .from("messages")
        .select("item_id, buyer_id, sender_id, created_at")
        .neq("sender_id", user.id)
        .order("created_at", { ascending: false })
        .limit(500);
      const unreadThreadKeys = new Set<string>();
      for (const m of (recentMsgs ?? []) as { item_id: string; buyer_id: string; sender_id: string; created_at: string }[]) {
        const key = `${m.item_id}:${m.buyer_id}`;
        if (unreadThreadKeys.has(key)) continue;
        const iAmSeller = myItemIds.has(String(m.item_id));
        const iAmBuyer = m.buyer_id === user.id;
        if (!iAmSeller && !iAmBuyer) continue;
        const lastRead = readsMap.get(key);
        if (!lastRead || new Date(m.created_at).getTime() > new Date(lastRead).getTime()) {
          unreadThreadKeys.add(key);
        }
      }
      let inboxCount = unreadThreadKeys.size;
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
