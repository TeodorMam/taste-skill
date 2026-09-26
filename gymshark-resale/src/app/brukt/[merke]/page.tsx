import Link from "next/link";
import { cache } from "react";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/utils/supabase/server";
import type { Item } from "@/lib/supabase";
import { BRAND_PAGES, brandPageBySlug } from "@/lib/brand-pages";
import { ItemCard } from "@/components/ItemCard";
import { Icon } from "@/components/Icon";
import { BackLink } from "@/components/BackLink";

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
      <div className="space-y-3">
        <BackLink href="/varer">Alle varer</BackLink>
        <h1 className="dsp text-[40px] lg:text-[64px]">Brukt {page.brand}</h1>
        <p className="max-w-[62ch] text-base leading-[1.55] text-ink-2">{page.intro}</p>
      </div>

      {items.length > 0 ? (
        <>
          <div className="flex items-center justify-between border-t border-ink pt-2">
            <p className="num text-sm text-ink-3">
              {items.length} plagg ute nå
            </p>
            <Link
              href={`/varer?brand=${encodeURIComponent(page.brand)}`}
              className="tbtn text-sm"
            >
              Filtrer videre <Icon name="pil-h" size={16} />
            </Link>
          </div>
          <div className="item-grid">
            {items.map((item) => (
              <ItemCard key={item.id} item={item} hideSeller />
            ))}
          </div>
        </>
      ) : (
        <div className="border-t border-ink pt-6">
          <p className="text-base text-ink-2">
            Ingen {page.brand}-plagg er ute akkurat nå.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-5">
            <Link href="/ny-annonse" className="btn btn-ink">
              Legg ut {page.brand}
            </Link>
            <Link href="/varer" className="tbtn tbtn-u">
              Se alt annet
            </Link>
          </div>
        </div>
      )}

      <div className="border-t border-line pt-6">
        <h2 className="text-[17px] font-[620] [font-stretch:100%]">Andre merker</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {BRAND_PAGES.filter((b) => b.slug !== page.slug).map((b) => (
            <Link
              key={b.slug}
              href={`/brukt/${b.slug}`}
              className="chip hover:shadow-[inset_0_0_0_1px_#1C1E18]"
            >
              Brukt {b.brand}
            </Link>
          ))}
        </div>
      </div>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
    </section>
  );
}
