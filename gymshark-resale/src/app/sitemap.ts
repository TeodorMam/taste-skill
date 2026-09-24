import type { MetadataRoute } from "next";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { BRAND_PAGES } from "@/lib/brand-pages";

const BASE_URL = "https://aktivbruk.com";

// Dynamic sitemap so Google (and other crawlers) index only the public,
// evergreen pages plus every currently-active listing. Anything omitted
// here won't be pushed as a preferred sitelink, that's how we keep
// user profiles and internal dashboards out of search results.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`,                 changeFrequency: "daily",   priority: 1.0, lastModified: now },
    { url: `${BASE_URL}/varer`,           changeFrequency: "hourly",  priority: 0.9, lastModified: now },
    { url: `${BASE_URL}/om`,            changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/vilkar`,           changeFrequency: "yearly",  priority: 0.3 },
    { url: `${BASE_URL}/personvern`,       changeFrequency: "yearly",  priority: 0.3 },
    { url: `${BASE_URL}/kjoperbeskyttelse`,changeFrequency: "yearly",  priority: 0.4 },
  ];

  try {
    const supabase = createClient(await cookies());
    const { data } = await supabase
      .from("items")
      .select("id, updated_at, created_at")
      .eq("is_sold", false)
      .order("created_at", { ascending: false })
      .limit(1000);

    const itemPages: MetadataRoute.Sitemap = (data ?? []).map((row: { id: string | number; updated_at?: string; created_at?: string }) => ({
      url: `${BASE_URL}/vare/${row.id}`,
      lastModified: row.updated_at || row.created_at,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));

    // Only brands that actually have something for sale. An empty brand page
    // sets noindex on itself anyway, and submitting a URL we are telling
    // Google not to index is a contradiction worth avoiding. It appears here
    // by itself the moment somebody lists that brand.
    const { data: brandRows } = await supabase
      .from("items")
      .select("brand")
      .eq("is_sold", false)
      .not("brand", "is", null);

    const stocked = new Set((brandRows ?? []).map((r: { brand: string }) => r.brand));
    const brandPages: MetadataRoute.Sitemap = BRAND_PAGES.filter((b) => stocked.has(b.brand)).map((b) => ({
      url: `${BASE_URL}/brukt/${b.slug}`,
      changeFrequency: "daily" as const,
      priority: 0.8,
      lastModified: now,
    }));

    return [...staticPages, ...brandPages, ...itemPages];
  } catch {
    return staticPages;
  }
}
