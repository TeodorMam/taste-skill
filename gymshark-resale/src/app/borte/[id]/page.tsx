import Link from "next/link";
import { cookies } from "next/headers";
import type { Metadata } from "next";
import { createClient } from "@/utils/supabase/server";
import type { Item } from "@/lib/supabase";
import { ItemCard } from "@/components/ItemCard";

// Middleware rewrites a deleted listing here and serves the result as 410, so
// the visitor keeps seeing /vare/<id> in the address bar. Reached directly
// this page is just a dead end, hence noindex: the only version Google should
// ever weigh is the 410 one.
export const metadata: Metadata = {
  title: "Varen er borte, Aktivbruk",
  robots: { index: false, follow: true },
};

type Tombstone = { brand: string | null; category: string | null; title: string | null };

const MAX = 6;

function topUp(into: Item[], rows: Item[] | null) {
  const seen = new Set(into.map((i) => String(i.id)));
  for (const row of rows ?? []) {
    if (into.length >= MAX) return;
    if (seen.has(String(row.id))) continue;
    seen.add(String(row.id));
    into.push(row);
  }
}

export default async function BortePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createClient(await cookies());

  const { data: gone } = await supabase
    .from("deleted_items")
    .select("brand, category, title")
    .eq("id", id)
    .maybeSingle();

  const tomb = (gone as Tombstone | null) ?? null;

  // Closest first: same brand, then same category, then simply what is newest.
  // A deleted listing with no brand recorded still gets a useful page.
  const similar: Item[] = [];
  const base = () => supabase.from("items").select("*").eq("is_sold", false);

  if (tomb?.brand) {
    const { data } = await base().eq("brand", tomb.brand).order("created_at", { ascending: false }).limit(MAX);
    topUp(similar, data as Item[] | null);
  }
  if (similar.length < 3 && tomb?.category) {
    const { data } = await base().eq("category", tomb.category).order("created_at", { ascending: false }).limit(MAX);
    topUp(similar, data as Item[] | null);
  }
  if (similar.length < 3) {
    const { data } = await base().order("created_at", { ascending: false }).limit(MAX);
    topUp(similar, data as Item[] | null);
  }

  const seeAll = tomb?.brand
    ? `/varer?brand=${encodeURIComponent(tomb.brand)}`
    : tomb?.category
      ? `/varer?sub=${encodeURIComponent(tomb.category)}`
      : "/varer";

  return (
    <section className="space-y-8 py-10">
      <div className="space-y-4 text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-olive">Borte</p>
        <h1 className="text-3xl font-semibold tracking-tight">Denne varen er borte</h1>
        <p className="mx-auto max-w-md text-sm leading-relaxed text-ink-2">
          {tomb?.title
            ? `«${tomb.title}» er slettet av selgeren og finnes ikke lenger.`
            : "Varen er slettet av selgeren og finnes ikke lenger."}{" "}
          {similar.length > 0 ? "Se lignende her:" : "Se hva som ligger ute nå:"}
        </p>
        <div className="flex flex-wrap justify-center gap-2 pt-1">
          <Link
            href="/varer"
            className="rounded-sm bg-ink px-5 py-3 text-sm font-medium text-paper hover:bg-ink"
          >
            Utforsk varer
          </Link>
          {seeAll !== "/varer" && (
            <Link
              href={seeAll}
              className="rounded-sm border border-line-2 bg-raised px-5 py-3 text-sm font-medium text-ink-2 hover:border-ink"
            >
              {tomb?.brand ? `Alt fra ${tomb.brand}` : "Samme kategori"}
            </Link>
          )}
        </div>
      </div>

      {similar.length > 0 && (
        <div className="item-grid">
          {similar.map((s) => (
            <ItemCard key={s.id} item={s} hideSeller />
          ))}
        </div>
      )}
    </section>
  );
}
