import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { NavLinks } from "@/components/NavLinks";

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
            <NavLinks isLoggedIn={!!user} />
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
