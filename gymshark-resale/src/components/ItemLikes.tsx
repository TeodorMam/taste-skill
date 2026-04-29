"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { profileDisplayName, type Profile } from "@/lib/supabase";

export function ItemLikes({ itemId }: { itemId: string | number }) {
  const supabase = useMemo(() => createClient(), []);
  const [count, setCount] = useState<number | null>(null);
  const [names, setNames] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("favorites")
        .select("user_id")
        .eq("item_id", itemId);
      if (error || !data || data.length === 0) { setCount(0); return; }

      setCount(data.length);

      // Fetch display names for first 3
      const first3 = data.slice(0, 3).map((r: { user_id: string }) => r.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", first3);
      const pMap: Record<string, Profile> = {};
      for (const p of (profiles ?? []) as Profile[]) pMap[p.user_id] = p;
      setNames(first3.map((id) => profileDisplayName(pMap[id], id)));
    })();
  }, [itemId, supabase]);

  if (!count) return null;

  let label: string;
  if (count === 1) {
    label = `${names[0]} liker denne annonsen`;
  } else if (count === 2) {
    label = `${names[0]} og ${names[1]} liker denne annonsen`;
  } else if (count === 3) {
    label = `${names[0]}, ${names[1]} og ${names[2]} liker denne annonsen`;
  } else {
    const rest = count - 2;
    label = `${names[0]}, ${names[1]} og ${rest} andre liker denne annonsen`;
  }

  return (
    <p className="flex items-center gap-1.5 text-xs text-stone-500">
      <span className="text-rose-400">♥</span>
      <span>{label}</span>
    </p>
  );
}
