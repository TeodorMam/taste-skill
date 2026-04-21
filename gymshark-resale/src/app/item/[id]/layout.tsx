import type { Metadata } from "next";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { type Item, formatPrice, itemImages } from "@/lib/supabase";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  try {
    const supabase = createClient(await cookies());
    const { data } = await supabase
      .from("items")
      .select("*")
      .eq("id", id)
      .single();
    if (!data) return { title: "Vare — Aktivbruk" };
    const item = data as Item;
    const images = itemImages(item);
    const title = `${item.title} — ${formatPrice(item.price)} | Aktivbruk`;
    const description =
      item.description?.slice(0, 160) ||
      `${item.brand ?? "Treningsklær"} · Str. ${item.size} · ${item.condition} · ${item.location}`;
    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: "website",
        siteName: "Aktivbruk",
        locale: "nb_NO",
        images: images.length > 0 ? images.slice(0, 1) : undefined,
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: images.length > 0 ? images.slice(0, 1) : undefined,
      },
    };
  } catch {
    return { title: "Vare — Aktivbruk" };
  }
}

export default function ItemLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
