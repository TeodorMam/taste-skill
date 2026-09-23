import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { type Item, formatPrice, itemImages } from "@/lib/supabase";
import { getPackageOption } from "@/lib/shipping";
import ItemPageClient from "./ItemPageClient";

const SITE_URL = "https://aktivbruk.com";

// maybeSingle returns null when the row does not exist instead of throwing
// "Cannot coerce the result to a single JSON object". Google was scraping
// that error string as the page title.
async function fetchItem(id: string): Promise<Item | null> {
  const supabase = createClient(await cookies());
  const { data } = await supabase.from("items").select("*").eq("id", id).maybeSingle();
  return (data as Item | null) ?? null;
}

// Build the browser-tab title Google, Chrome and shared-link previews use.
// Front-loads the keywords real buyers type: brand + product + size + condition.
function buildSeoTitle(item: Item): string {
  const parts: string[] = [];
  if (item.brand) parts.push(item.brand);
  parts.push(item.title);
  if (item.size) parts.push(`Str. ${item.size}`);
  if (item.condition) parts.push(item.condition);
  parts.push(formatPrice(item.price));
  return `${parts.join(" · ")} | Aktivbruk`;
}

// A tight two-sentence meta description that includes every keyword we can
// think of a Norwegian buyer typing into Google, brand, category, size,
// condition, city, and the seller's own first sentence when it exists.
function buildSeoDescription(item: Item): string {
  const facts = [item.brand, item.category, item.size ? `Str. ${item.size}` : null, item.condition, item.location]
    .filter(Boolean)
    .join(" · ");
  const priceLine = `Brukt ${(item.brand || "treningstøy").toString().toLowerCase()} til ${formatPrice(item.price)} på Aktivbruk, Norges første bruktmarked kun for treningsklær.`;
  const desc = (item.description || "").trim();
  const firstSentence = desc ? desc.split(/(?<=[.!?])\s+/)[0] : "";
  return [facts, priceLine, firstSentence].filter(Boolean).join(", ");
}

// Product schema Google understands as a real for-sale item, unlocking rich
// results (image + price + condition badge) and Google Shopping eligibility.
function buildProductJsonLd(item: Item, id: string) {
  const images = itemImages(item);
  const condMap: Record<string, string> = {
    "Som ny":  "https://schema.org/UsedCondition",
    "Ny":      "https://schema.org/NewCondition",
    "God":     "https://schema.org/UsedCondition",
    "Brukt":   "https://schema.org/UsedCondition",
  };
  // Only what this listing genuinely offers. A pickup-only item has no
  // shipping, and an item whose seller never picked a package size has no
  // price we can state. Declaring a rate Google can compare against checkout
  // and find wrong is worse than the missing-field warning it replaces.
  const pkg = item.shipping === "Kun henting" ? null : getPackageOption(item.package_size);
  const shipping = pkg
    ? {
        "@type": "OfferShippingDetails",
        shippingRate: {
          "@type": "MonetaryAmount",
          value: pkg.price,
          currency: "NOK",
        },
        shippingDestination: {
          "@type": "DefinedRegion",
          addressCountry: "NO",
        },
        deliveryTime: {
          "@type": "ShippingDeliveryTime",
          handlingTime: {
            "@type": "QuantitativeValue",
            minValue: 0,
            maxValue: 1,
            unitCode: "DAY",
          },
          transitTime: {
            "@type": "QuantitativeValue",
            minValue: 2,
            maxValue: 4,
            unitCode: "DAY",
          },
        },
      }
    : null;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: item.title,
    description: item.description || `${item.brand ?? ""} ${item.title}, brukt treningstøy fra Aktivbruk.`.trim(),
    image: images.length > 0 ? images : undefined,
    sku: `aktivbruk-${id}`,
    ...(item.brand && { brand: { "@type": "Brand", name: item.brand } }),
    ...(item.category && { category: item.category }),
    ...(item.color && { color: item.color }),
    ...(item.size && { size: item.size }),
    offers: {
      "@type": "Offer",
      price: String(item.price),
      priceCurrency: "NOK",
      availability: item.is_sold ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
      itemCondition: condMap[item.condition ?? ""] ?? "https://schema.org/UsedCondition",
      url: `${SITE_URL}/vare/${id}`,
      ...(shipping && { shippingDetails: shipping }),
      // Aktivbruk brokers sales between private individuals, where the
      // Norwegian angrerettlov gives no right of withdrawal, and the
      // kjopbeskyttelse page says plainly that changing your mind is not
      // covered. Declaring a return window here to clear a Search Console
      // warning would promise buyers something the platform does not offer.
      // The 48 hours are a deadline for reporting a problem, not a return.
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "NO",
        returnPolicyCategory: "https://schema.org/MerchantReturnNotPermitted",
      },
    },
  };
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;
  const item = await fetchItem(id);
  if (!item) {
    return { title: "Varen finnes ikke, Aktivbruk", robots: { index: false, follow: false } };
  }
  const cover = itemImages(item)[0];
  const title = buildSeoTitle(item);
  const description = buildSeoDescription(item);
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/vare/${id}` },
    openGraph: {
      title,
      description,
      images: cover ? [{ url: cover }] : [],
      type: "website",
      siteName: "Aktivbruk",
      locale: "nb_NO",
      url: `${SITE_URL}/vare/${id}`,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: cover ? [cover] : [],
    },
  };
}

export default async function ItemPage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const item = await fetchItem(id);
  if (!item) notFound();
  const jsonLd = buildProductJsonLd(item, id);
  return (
    <>
      {/* Product JSON-LD, invisible to users, read by Google, unlocks rich
          results (image + price + used-condition badge) in search. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ItemPageClient />
    </>
  );
}
