"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export function NavLinks({ isLoggedIn }: { isLoggedIn: boolean }) {
  const path = usePathname();
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) return;
    const supabase = createClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const lastVisit = localStorage.getItem("lastInboxVisit");
      const since = lastVisit
        ? new Date(Number(lastVisit)).toISOString()
        : new Date(Date.now() - 7 * 86400000).toISOString();
      const { data } = await supabase
        .from("messages")
        .select("id")
        .neq("sender_id", user.id)
        .gt("created_at", since)
        .limit(1);
      setHasUnread((data?.length ?? 0) > 0);
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
          <Link href="/favoritter" className={textCls("/favoritter")}>
            Favoritter
          </Link>
          <Link href="/inbox" className={`relative ${textCls("/inbox")}`}>
            Innboks
            {hasUnread && (
              <span className="absolute -right-2 -top-1 h-2 w-2 rounded-full bg-red-500" />
            )}
          </Link>
          <Link href="/mine" className={textCls("/mine")}>
            Mine annonser
          </Link>
          <Link href="/post" className={textCls("/post")}>
            Selg
          </Link>
          <Link href="/profil" className={textCls("/profil")}>
            Min profil
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
