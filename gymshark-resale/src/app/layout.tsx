import "./globals.css";
import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { NavLinks } from "@/components/NavLinks";
import { BottomNav } from "@/components/BottomNav";
import { ClientProviders } from "@/components/ClientProviders";
import { SearchButton } from "@/components/SearchButton";
import { Analytics } from "@/components/Analytics";
import { PageWidth } from "@/components/PageWidth";

// Archivo is variable in both width and weight. Headings and prices use the
// narrow end of the width axis; body text stays at 100 %.
const archivo = Archivo({
  subsets: ["latin", "latin-ext"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

const SITE_DESCRIPTION =
  "Norges første bruktmarked kun for treningsklær. Kjøp og selg brukt Gymshark, Nike, YoungLA, Craft, DFYNE og mer, trygg betaling via Stripe.";

export const metadata: Metadata = {
  metadataBase: new URL("https://aktivbruk.com"),
  title: {
    default: "Aktivbruk, Norges første bruktmarked for treningsklær",
    template: "%s | Aktivbruk",
  },
  description: SITE_DESCRIPTION,
  applicationName: "Aktivbruk",
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
    "youngla brukt",
    "dfyne brukt",
    "craft brukt",
    "alphalete brukt",
    "lululemon brukt",
    "nvgtn brukt",
    "aybl brukt",
    "bruktmarked treningsklær",
    "aktivbruk",
    "brukte sportklær",
    "second hand treningsklær",
    "treningsklær norge",
  ],
  openGraph: {
    title: "Aktivbruk, Norges første bruktmarked for treningsklær",
    description: SITE_DESCRIPTION,
    type: "website",
    locale: "nb_NO",
    siteName: "Aktivbruk",
    url: "https://aktivbruk.com",
  },
  twitter: {
    card: "summary_large_image",
    title: "Aktivbruk, Norges første bruktmarked for treningsklær",
    description: SITE_DESCRIPTION,
  },
  alternates: { canonical: "https://aktivbruk.com" },
};

// Site-wide JSON-LD, one Organization block so Google can pull a
// knowledge-panel style entry for the brand, and a WebSite block with a
// SearchAction so aktivbruk.com can qualify for Google's sitelinks
// searchbox in the SERP.
const SITE_JSON_LD = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Aktivbruk",
    url: "https://aktivbruk.com",
    logo: "https://aktivbruk.com/apple-icon.png",
    email: "kontakt@aktivbruk.com",
    description: SITE_DESCRIPTION,
    areaServed: "NO",
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Aktivbruk",
    url: "https://aktivbruk.com",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://aktivbruk.com/varer?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  },
];

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="no" className={archivo.variable}>
      <body className="bg-paper font-sans text-ink">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(SITE_JSON_LD) }}
        />
        <ClientProviders>
        <Analytics />
        <header className="sticky top-0 z-10 border-b border-line bg-paper">
          <div className="mx-auto flex h-14 max-w-[1280px] items-center gap-8 pl-4 pr-2 sm:h-16 sm:pr-4 lg:px-10">
            <Link href="/" className="text-[22px] font-[760] leading-none tracking-[-0.01em] [font-stretch:76%] sm:text-[26px]">
              aktivbruk
              <span className="text-olive">.</span>
            </Link>
            <div className="hidden self-stretch sm:ml-auto sm:flex">
              <NavLinks isLoggedIn={!!user} />
            </div>
            <div className="ml-auto flex items-center gap-1 sm:-mr-3 sm:ml-0">
              <SearchButton />
              {!user && (
                <Link href="/logg-inn" className="btn btn-ink btn-sm sm:hidden">
                  Logg inn
                </Link>
              )}
              {user && (
                <form action="/auth/signout" method="post" className="sm:hidden">
                  <button
                    type="submit"
                    className="flex h-11 items-center px-1 text-sm font-[550] text-ink-2 hover:text-ink"
                  >
                    Logg ut
                  </button>
                </form>
              )}
            </div>
          </div>
        </header>
        <PageWidth>{children}</PageWidth>
        <footer className="border-t border-line pb-20 sm:pb-0">
          <div className="mx-auto flex max-w-[1280px] flex-col gap-2.5 px-4 pb-6 pt-5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-8 sm:pb-8 sm:pt-7 lg:px-10">
            <p className="max-w-[52ch] text-[13px] leading-normal text-ink-3 sm:text-sm">
              Aktivbruk, bruktmarked for treningsklær. Et uavhengig prosjekt, ikke
              tilknyttet noen merkevare.
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-ink-2 sm:justify-end sm:gap-x-6 sm:gap-y-2 sm:text-sm">
              <a href="mailto:kontakt@aktivbruk.com" className="underline decoration-1 underline-offset-[3px] hover:text-ink">
                kontakt@aktivbruk.com
              </a>
              <Link href="/om" className="underline decoration-1 underline-offset-[3px] hover:text-ink">
                Om & FAQ
              </Link>
              <Link href="/vilkar" className="underline decoration-1 underline-offset-[3px] hover:text-ink">
                Vilkår
              </Link>
              <Link href="/personvern" className="underline decoration-1 underline-offset-[3px] hover:text-ink">
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
