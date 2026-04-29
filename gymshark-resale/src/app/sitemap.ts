import { MetadataRoute } from "next";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createClient(await cookies());

  const { data: items } = await supabase
    .from("items")
    .select("id, updated_at")
    .eq("status", "active");

  const itemUrls: MetadataRoute.Sitemap = (items ?? []).map((item) => ({
    url: `https://aktivbruk.com/item/${item.id}`,
    lastModified: item.updated_at ? new Date(item.updated_at) : new Date(),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [
    {
      url: "https://aktivbruk.com",
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: "https://aktivbruk.com/browse",
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: "https://aktivbruk.com/about",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    ...itemUrls,
  ];
}
