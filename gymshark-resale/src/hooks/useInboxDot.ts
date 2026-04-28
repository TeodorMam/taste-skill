"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export function useInboxDot(isLoggedIn: boolean): boolean {
  const path = usePathname();
  const [hasDot, setHasDot] = useState(false);

  useEffect(() => {
    if (path === "/inbox") { setHasDot(false); return; }
    if (!isLoggedIn) return;
    const supabase = createClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Unread notifications (offers + favorites)
      const { data: unreadNotifs } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", user.id)
        .is("read_at", null)
        .limit(1);
      if ((unreadNotifs?.length ?? 0) > 0) { setHasDot(true); return; }

      // 2. Unread messages from others since last inbox visit
      const lastVisit = localStorage.getItem("lastInboxVisit");
      const since = lastVisit
        ? new Date(Number(lastVisit)).toISOString()
        : new Date(Date.now() - 7 * 86400000).toISOString();
      const { data: unread } = await supabase
        .from("messages")
        .select("id")
        .neq("sender_id", user.id)
        .gt("created_at", since)
        .limit(1);
      if ((unread?.length ?? 0) > 0) { setHasDot(true); return; }

      // 3. Items sold to user that haven't been reviewed
      const { data: soldItems } = await supabase
        .from("items")
        .select("id")
        .eq("sold_to_buyer_id", user.id)
        .eq("is_sold", true);
      const soldIds = (soldItems ?? []).map((i: { id: string }) => i.id);
      if (soldIds.length === 0) { setHasDot(false); return; }
      const { data: reviews } = await supabase
        .from("reviews")
        .select("item_id")
        .in("item_id", soldIds)
        .eq("reviewer_id", user.id);
      const reviewed = new Set((reviews ?? []).map((r: { item_id: string }) => r.item_id));
      setHasDot(soldIds.some((id: string) => !reviewed.has(id)));
    })();
  }, [isLoggedIn, path]);

  return hasDot;
}
