"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLinks({ isLoggedIn }: { isLoggedIn: boolean }) {
  const path = usePathname();

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
          <Link href="/inbox" className={textCls("/inbox")}>
            Innboks
          </Link>
          <Link href="/mine" className={textCls("/mine")}>
            Mine annonser
          </Link>
          <Link href="/post" className={textCls("/post")}>
            Selg
          </Link>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="text-xs text-stone-500 hover:text-black"
            >
              Logg ut
            </button>
          </form>
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
