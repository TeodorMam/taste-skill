import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { type Item, formatPrice, itemImages } from "@/lib/supabase";
import ItemPageClient from "./ItemPageClient";

// maybeSingle returns null when the row does not exist instead of throwing
// "Cannot coerce the result to a single JSON object". Google was scraping
// that error string as the page title.
async function fetchItem(id: string): Promise<Item | null> {
  const supabase = createClient(await cookies());
  const { data } = await supabase.from("items").select("*").eq("id", id).maybeSingle();
  return (data as Item | null) ?? null;
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;
  const item = await fetchItem(id);
  if (!item) {
    return { title: "Varen finnes ikke — Aktivbruk", robots: { index: false, follow: false } };
  }
  const cover = itemImages(item)[0];
  const title = `${item.title} — ${formatPrice(item.price)}`;
  const description = [item.brand, item.condition, `Str. ${item.size}`, item.location]
    .filter(Boolean).join(" · ");
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: cover ? [{ url: cover }] : [],
      type: "website",
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
  return <ItemPageClient />;
}
