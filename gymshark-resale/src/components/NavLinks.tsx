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

  function textCls(href: string) {
    const active = path === href || (href !== "/" && path.startsWith(href));
    return `text-sm font-medium transition ${
      active ? "text-ink underline underline-offset-4 decoration-olive decoration-2" : "text-ink-3 hover:text-ink"
    }`;
  }

  return (
    <nav className="flex items-center gap-4 text-sm">
      <Link href="/varer" className={textCls("/varer")}>
        Utforsk
      </Link>
      <Link href={authHref(isLoggedIn, "/varsler")} className={`relative ${textCls("/varsler")}`}>
        Varsler
        {varsler > 0 && <Badge count={varsler} />}
      </Link>
      <Link href={authHref(isLoggedIn, "/meldinger")} className={`relative ${textCls("/meldinger")}`}>
        Innboks
        {inbox > 0 && <Badge count={inbox} />}
      </Link>
      <Link href={authHref(isLoggedIn, "/ordre")} className={`relative ${textCls("/ordre")}`}>
        Ordre
        {orders > 0 && <Badge count={orders} />}
      </Link>
      <Link href={authHref(isLoggedIn, "/selg")} className={textCls("/selg")}>
        Selg
      </Link>
      {isLoggedIn ? (
        <Link href="/profil" className={`flex items-center gap-2 ${textCls("/profil")}`}>
          Min profil
          <Avatar profile={profile} size="sm" />
        </Link>
      ) : (
        <Link href={`/logg-inn?next=${encodeURIComponent("/profil")}`} className="rounded-sm bg-ink px-4 py-2 text-sm font-medium text-raised hover:bg-ink">
          Logg inn
        </Link>
      )}
    </nav>
  );
}

function Badge({ count }: { count: number }) {
  return (
    <span className="absolute -right-3 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-sm bg-clay px-1 text-[10px] font-bold leading-none text-raised">
      {count > 9 ? "9+" : count}
    </span>
  );
}
