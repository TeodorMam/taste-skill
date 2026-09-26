import Link from "next/link";
import { cache } from "react";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/utils/supabase/server";
import type { Item } from "@/lib/supabase";
import { BRAND_PAGES, brandPageBySlug } from "@/lib/brand-pages";
import { ItemCard } from "@/components/ItemCard";

const SITE_URL = "https://aktivbruk.com";

// generateMetadata and the page both need the listings, and Next calls them
// separately. cache() makes that one query per request rather than two.
const listingsFor = cache(async (brand: string): Promise<Item[]> => {
  const supabase = createClient(await cookies());
  const { data } = await supabase
    .from("items")
    .select("*")
    .eq("brand", brand)
    .eq("is_sold", false)
    .order("created_at", { ascending: false })
    .limit(48);
  return (data as Item[] | null) ?? [];
});

export async function generateMetadata(
  { params }: { params: Promise<{ merke: string }> }
): Promise<Metadata> {
  const { merke } = await params;
  const page = brandPageBySlug(merke);
  if (!page) return { title: "Merket finnes ikke, Aktivbruk", robots: { index: false, follow: false } };

  const items = await listingsFor(page.brand);
  const title = `Brukt ${page.brand} | Kjøp og selg brukt treningstøy | Aktivbruk`;
  const description =
    items.length > 0
      ? `${items.length} brukte ${page.brand}-plagg til salgs nå. Kjøp og selg brukt treningstøy trygt på Aktivbruk, med betaling og kjøperbeskyttelse.`
      : `Kjøp og selg brukt ${page.brand} på Aktivbruk. Ingen plagg ute akkurat nå, men siden oppdateres så snart noen legger ut.`;

  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/brukt/${page.slug}` },
    // An empty brand page has nothing to rank and would read as a thin page,
    // so it stays out of the index until somebody lists something. It lets
    // itself back in the moment there is a listing.
    robots: items.length > 0 ? undefined : { index: false, follow: true },
    openGraph: {
      title,
      description,
      type: "website",
      siteName: "Aktivbruk",
      locale: "nb_NO",
      url: `${SITE_URL}/brukt/${page.slug}`,
    },
  };
}

export default async function BrandPage(
  { params }: { params: Promise<{ merke: string }> }
) {
  const { merke } = await params;
  const page = brandPageBySlug(merke);
  if (!page) notFound();

  const items = await listingsFor(page.brand);

  // ItemList, not Product: this page lists several things and points at each
  // one. Product belongs on the listing page, where there is a single item
  // with a single price.
  const jsonLd =
    items.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: `Brukt ${page.brand}`,
          url: `${SITE_URL}/brukt/${page.slug}`,
          numberOfItems: items.length,
          itemListElement: items.map((item, i) => ({
            "@type": "ListItem",
            position: i + 1,
            url: `${SITE_URL}/vare/${item.id}`,
            name: item.title,
          })),
        }
      : null;

  return (
    <section className="space-y-8">
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}

      <div className="space-y-3">
        <p className="text-sm text-ink-3">
          <Link href="/varer" className="hover:text-ink">← Alle varer</Link>
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Brukt {page.brand}</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-ink-2">{page.intro}</p>
      </div>

      {items.length > 0 ? (
        <>
          <div className="flex items-end justify-between">
            <p className="text-sm text-ink-3">
              {items.length} plagg ute nå
            </p>
            <Link
              href={`/varer?brand=${encodeURIComponent(page.brand)}`}
              className="text-xs font-medium text-olive hover:text-olive-press"
            >
              Filtrer videre →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {items.map((item) => (
              <ItemCard key={item.id} item={item} hideSeller />
            ))}
          </div>
        </>
      ) : (
        <div className="rounded-sm border border-line bg-raised p-6 text-center">
          <p className="text-sm text-ink-2">
            Ingen {page.brand}-plagg er ute akkurat nå.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link
              href="/ny-annonse"
              className="rounded-sm bg-ink px-5 py-3 text-sm font-medium text-paper hover:bg-ink"
            >
              Legg ut {page.brand}
            </Link>
            <Link
              href="/varer"
              className="rounded-sm border border-line-2 bg-raised px-5 py-3 text-sm font-medium text-ink-2 hover:border-ink"
            >
              Se alt annet
            </Link>
          </div>
        </div>
      )}

      <div className="border-t border-line pt-5">
        <p className="text-xs uppercase tracking-widest text-ink-3">Andre merker</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {BRAND_PAGES.filter((b) => b.slug !== page.slug).map((b) => (
            <Link
              key={b.slug}
              href={`/brukt/${b.slug}`}
              className="rounded-sm border border-line-2 bg-raised px-3 py-1.5 text-xs font-medium text-ink-2 hover:border-ink"
            >
              Brukt {b.brand}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
