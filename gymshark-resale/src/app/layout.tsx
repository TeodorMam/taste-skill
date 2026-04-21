import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

export const metadata: Metadata = {
  title: "Aktivbruk — bruktbørs for treningsklær",
  description:
    "Kjøp og selg brukte treningsklær i Norge. Gymshark, Nike, Lululemon, Alphalete og mer.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="no">
      <body className="bg-stone-50 text-stone-900">
        <header className="sticky top-0 z-10 border-b border-stone-200 bg-stone-50/80 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
            <Link href="/" className="text-base font-semibold tracking-tight">
              aktivbruk
              <span className="text-[#5a6b32]">.</span>
            </Link>
            <nav className="flex items-center gap-3 text-sm">
              <Link href="/browse" className="text-stone-700 hover:text-black">
                Utforsk
              </Link>
              {user ? (
                <>
                  <Link href="/inbox" className="text-stone-700 hover:text-black">
                    Innboks
                  </Link>
                  <Link href="/mine" className="text-stone-700 hover:text-black">
                    Mine
                  </Link>
                  <Link
                    href="/post"
                    className="rounded-full bg-stone-900 px-3 py-1.5 font-medium text-stone-50 hover:bg-black"
                  >
                    Selg
                  </Link>
                  <form action="/auth/signout" method="post">
                    <button
                      type="submit"
                      className="text-xs text-stone-500 hover:text-black"
                      title={user.email ?? undefined}
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
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
        <footer className="mx-auto max-w-3xl px-4 py-10 text-xs text-stone-500">
          Aktivbruk — bruktbørs for treningsklær. Et uavhengig prosjekt, ikke
          tilknyttet noen merkevare.
        </footer>
      </body>
    </html>
  );
}
