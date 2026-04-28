"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { type Profile } from "@/lib/supabase";
import { useInboxDot } from "@/hooks/useInboxDot";
import { Avatar } from "@/components/Avatar";

export function NavLinks({ isLoggedIn }: { isLoggedIn: boolean }) {
  const path = usePathname();
  const hasUnread = useInboxDot(isLoggedIn);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (!isLoggedIn) return;
    const supabase = createClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      // Stamp last_seen_at in the background on every navigation
      void supabase.from("profiles").update({ last_seen_at: new Date().toISOString() }).eq("user_id", user.id).then(() => null);
      const { data: pData } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
      setProfile((pData as Profile | null) ?? null);
    })();
  }, [isLoggedIn, path]);

  function textCls(href: string) {
    const active = path === href || (href !== "/" && path.startsWith(href));
    return `text-sm font-medium transition ${
      active ? "text-black underline underline-offset-4 decoration-[#5a6b32] decoration-2" : "text-stone-500 hover:text-black"
    }`;
  }

  return (
    <nav className="flex items-center gap-4 text-sm">
      <Link href="/browse" className={textCls("/browse")}>
        Utforsk
      </Link>
      {isLoggedIn ? (
        <>
          <Link href="/varsler" className={textCls("/varsler")}>
            Varsler
          </Link>
          <Link href="/inbox" className={`relative ${textCls("/inbox")}`}>
            Innboks
            {hasUnread && (
              <span className="absolute -right-2 -top-1 h-2 w-2 rounded-full bg-red-500" />
            )}
          </Link>
          <Link href="/post" className={textCls("/post")}>
            Selg
          </Link>
          <Link href="/profil" className={`flex items-center gap-2 ${textCls("/profil")}`}>
            Min profil
            <Avatar profile={profile} size="sm" />
          </Link>
        </>
      ) : (
        <Link
          href="/login"
          className="rounded-full bg-stone-900 px-3 py-1.5 font-medium text-stone-50 hover:bg-black"
        >
          Logg inn
        </Link>
      )}
    </nav>
  );
}
