import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { ItemsWithLoadMore } from "@/components/ItemsWithLoadMore";
import { PAGE_SIZE } from "@/lib/pagination";
import { type Item, type Profile } from "@/lib/supabase";

export default async function HomePage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // First page only. The count tells ItemsWithLoadMore whether to show the
  // "Se flere" button without it having to make a throwaway request.
  const { data: rawItems, count } = await supabase
    .from("items")
    .select("*", { count: "exact" })
    .eq("is_sold", false)
    .order("created_at", { ascending: false })
    .range(0, PAGE_SIZE - 1);

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
        <h1 className="text-5xl font-semibold tracking-tight text-ink sm:text-6xl">
          Brukte treningsklær, <br className="hidden sm:inline" />
          <span className="text-olive">bedre priser.</span>
        </h1>
        <p className="max-w-xl text-base text-ink-2 sm:text-lg">
          Kjøp og selg brukte treningsklær fra Gymshark, Nike, YoungLA, Craft,
          DFYNE og mange flere. Ett minutt å legge ut, gratis å bruke.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/varer"
            className="rounded-sm bg-ink px-6 py-3 text-sm font-medium text-paper hover:bg-ink"
          >
            Utforsk
          </Link>
          <Link
            href="/ny-annonse"
            className="rounded-sm border border-line-2 bg-raised px-6 py-3 text-sm font-medium text-ink hover:border-ink"
          >
            Legg ut vare
          </Link>
        </div>
        <p className="text-xs text-ink-3">Gratis å bruke – ingen skjulte gebyrer</p>
      </section>

      {/* ── Nytt inne ─────────────────────────────────────────────────────── */}
      {/* Rendered unconditionally. An empty grid is a far smaller failure
          than the whole section vanishing, which is what a guard here did
          when the query silently returned nothing. */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Nytt inne</h2>
          <p className="mt-0.5 text-sm text-ink-3">Nylig lagt ut treningsklær</p>
        </div>
        <ItemsWithLoadMore
          initialItems={items}
          initialSellers={sellersMap}
          total={count ?? null}
        />
      </section>
    </div>
  );
}
