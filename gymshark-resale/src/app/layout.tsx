import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { NavLinks } from "@/components/NavLinks";
import { BottomNav } from "@/components/BottomNav";
import { ClientProviders } from "@/components/ClientProviders";
import { SearchButton } from "@/components/SearchButton";

export const metadata: Metadata = {
  title: "Aktivbruk — bruktmarked for treningsklær",
  description:
    "Kjøp og selg brukte treningsklær i Norge. Gymshark, Nike, Lululemon, Alphalete og mer.",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: "/apple-icon.png",
  },
  keywords: [
    "brukte treningsklær",
    "treningsklær brukt",
    "kjøp treningsklær",
    "selg treningsklær",
    "gymshark brukt",
    "gymshark norge",
    "alphalete brukt",
    "lululemon brukt",
    "nvgtn brukt",
    "aybl brukt",
    "bruktmarked treningsklær",
    "treningsutstyr brukt",
    "aktivbruk",
    "brukte sportklær",
    "second hand treningsklær",
    "treningsklær norge",
  ],
  openGraph: {
    title: "Aktivbruk — bruktmarked for treningsklær",
    description:
      "Kjøp og selg brukte treningsklær i Norge. Gymshark, Nike, Lululemon, Alphalete og mer.",
    type: "website",
    locale: "nb_NO",
    siteName: "Aktivbruk",
  },
  twitter: {
    card: "summary_large_image",
    title: "Aktivbruk — bruktmarked for treningsklær",
    description:
      "Kjøp og selg brukte treningsklær i Norge.",
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="no">
      <body className="bg-stone-50 text-stone-900">
        <ClientProviders>
        <header className="sticky top-0 z-10 border-b border-stone-200 bg-stone-50/80 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
            <Link href="/" className="text-base font-semibold tracking-tight">
              aktivbruk
              <span className="text-[#5a6b32]">.</span>
            </Link>
            <div className="hidden sm:block">
              <NavLinks isLoggedIn={!!user} />
            </div>
            <SearchButton />
            {!user && (
              <Link
                href="/login"
                className="rounded-full bg-stone-900 px-3 py-1.5 text-xs font-medium text-stone-50 hover:bg-black sm:hidden"
              >
                Logg inn
              </Link>
            )}
            {user && (
              <form action="/auth/signout" method="post" className="sm:hidden">
                <button
                  type="submit"
                  className="text-xs text-stone-500 hover:text-black"
                >
                  Logg ut
                </button>
              </form>
            )}
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-4 pb-24 pt-6 sm:pb-10">{children}</main>
        <footer className="mx-auto max-w-3xl px-4 pb-24 pt-4 text-xs text-stone-500 sm:pb-10">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p>
              Aktivbruk — bruktmarked for treningsklær. Et uavhengig prosjekt, ikke
              tilknyttet noen merkevare.
            </p>
            <div className="flex items-center gap-4">
              <a href="mailto:kontakt@aktivbruk.com" className="text-stone-500 hover:text-black">
                kontakt@aktivbruk.com
              </a>
              <Link href="/about" className="text-stone-500 underline hover:text-black">
                Om & FAQ
              </Link>
              <Link href="/vilkar" className="text-stone-500 underline hover:text-black">
                Vilkår
              </Link>
              <Link href="/personvern" className="text-stone-500 underline hover:text-black">
                Personvern
              </Link>
            </div>
          </div>
        </footer>
        <BottomNav isLoggedIn={!!user} />
        </ClientProviders>
      </body>
    </html>
  );
}
