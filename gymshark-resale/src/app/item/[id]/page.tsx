import type { Metadata } from "next";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { type Item, formatPrice, itemImages } from "@/lib/supabase";
import ItemPageClient from "./ItemPageClient";

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;
  const supabase = createClient(await cookies());
  const { data } = await supabase.from("items").select("*").eq("id", id).single();
  if (!data) return { title: "Aktivbruk" };
  const item = data as Item;
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

export default function ItemPage() {
  return <ItemPageClient />;
}
