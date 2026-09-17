import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { ItemCard } from "@/components/ItemCard";
import { type Item, type Profile } from "@/lib/supabase";

export default async function HomePage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: rawItems } = await supabase
    .from("items")
    .select("*")
    .eq("is_sold", false)
    .order("created_at", { ascending: false });

  const items = (rawItems ?? []) as Item[];
  const sellerIds = [...new Set(items.map((i) => i.seller_id).filter((x): x is string => !!x))];
  const sellersMap: Record<string, Profile> = {};
  if (sellerIds.length > 0) {
    const { data: pData } = await supabase.from("profiles_public").select("*").in("user_id", sellerIds);
    for (const p of (pData ?? []) as Profile[]) sellersMap[p.user_id] = p;
  }

  return (
    <div className="space-y-14 py-10 sm:py-16">
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="flex flex-col items-start gap-6">
        <h1 className="text-5xl font-semibold tracking-tight text-stone-900 sm:text-6xl">
          Brukte treningsklær, <br className="hidden sm:inline" />
          <span className="text-[#5a6b32]">bedre priser.</span>
        </h1>
        <p className="max-w-xl text-base text-stone-600 sm:text-lg">
          Kjøp og selg brukte treningsklær fra Gymshark, Nike, YoungLA, Craft,
          DFYNE og mange flere. Ett minutt å legge ut, gratis å bruke.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/browse"
            className="rounded-full bg-stone-900 px-6 py-3 text-sm font-medium text-stone-50 hover:bg-black"
          >
            Utforsk
          </Link>
          <Link
            href="/post"
            className="rounded-full border border-stone-300 bg-white px-6 py-3 text-sm font-medium text-stone-900 hover:border-stone-500"
          >
            Legg ut vare
          </Link>
        </div>
        <p className="text-xs text-stone-400">Gratis å bruke – ingen skjulte gebyrer</p>
      </section>

      {/* ── Populært nå ───────────────────────────────────────────────────── */}
      {items.length > 0 && (
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Populært nå</h2>
            <p className="mt-0.5 text-sm text-stone-500">Nylig lagt ut treningsklær</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                seller={item.seller_id ? (sellersMap[item.seller_id] ?? null) : null}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
