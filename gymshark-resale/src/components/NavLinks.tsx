"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { type Profile } from "@/lib/supabase";
import { useNavCounts } from "@/hooks/useNavCounts";
import { Avatar } from "@/components/Avatar";

function authHref(isLoggedIn: boolean, href: string) {
  return isLoggedIn ? href : `/logg-inn?next=${encodeURIComponent(href)}`;
}

export function NavLinks({ isLoggedIn }: { isLoggedIn: boolean }) {
  const path = usePathname();
  const { inbox, varsler, orders } = useNavCounts(isLoggedIn);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (!isLoggedIn) return;
    const supabase = createClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      void supabase.from("profiles").update({ last_seen_at: new Date().toISOString() }).eq("user_id", user.id).then(() => null);
      const { data: pData } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
      setProfile((pData as Profile | null) ?? null);
    })();
  }, [isLoggedIn, path]);

  // "Where am I" is an olive bar along the bottom of the header plus full
  // weight. Filled ink is reserved for things the user has chosen.
  function textCls(href: string) {
    const active = path === href || (href !== "/" && path.startsWith(href));
    return `relative flex items-center text-sm transition-colors lg:text-[15px] ${
      active
        ? "font-[650] text-ink after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-olive"
        : "font-medium text-ink-2 hover:text-ink"
    }`;
  }

  return (
    <nav aria-label="Hovedmeny" className="flex items-stretch gap-4 md:gap-6 lg:gap-7">
      <Link href="/varer" className={textCls("/varer")}>
        Utforsk
      </Link>
      <Link href={authHref(isLoggedIn, "/varsler")} className={textCls("/varsler")}>
        Varsler
        {varsler > 0 && <Badge count={varsler} />}
      </Link>
      <Link href={authHref(isLoggedIn, "/meldinger")} className={textCls("/meldinger")}>
        Innboks
        {inbox > 0 && <Badge count={inbox} />}
      </Link>
      <Link href={authHref(isLoggedIn, "/ordre")} className={textCls("/ordre")}>
        Ordre
        {orders > 0 && <Badge count={orders} />}
      </Link>
      <Link href={authHref(isLoggedIn, "/selg")} className={textCls("/selg")}>
        Selg
      </Link>
      {isLoggedIn ? (
        <Link href="/profil" className={`gap-2.5 ${textCls("/profil")}`}>
          Min profil
          <Avatar profile={profile} size="sm" />
        </Link>
      ) : (
        <span className="flex items-center">
          <Link href={`/logg-inn?next=${encodeURIComponent("/profil")}`} className="btn btn-ink btn-sm ml-1">
            Logg inn
          </Link>
        </span>
      )}
    </nav>
  );
}

function Badge({ count }: { count: number }) {
  return <span className="count ml-1.5">{count > 9 ? "9+" : count}</span>;
}
