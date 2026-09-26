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
    <div>
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      {/* Headline, lead and buttons share one left edge, on phones and on
          desktop. No image: the grid right below is the picture, so the hero
          is sized to leave the first row of items peeking into the first
          screen. On desktop the headline also scales with the window height
          (up to 120 px), so short laptop screens still show items. On phones
          the headline keeps its three lines and never meets the margin. */}
      <section className="-mt-2 flex flex-col items-start pb-8 sm:mt-0 sm:pb-10 sm:pt-2">
        <h1 className="dsp text-[clamp(40px,12.5vw,56px)] leading-[0.9] tracking-[-0.022em] sm:text-[clamp(56px,min(11.5vw,12.5vh),120px)] sm:leading-[0.88] sm:tracking-[-0.024em]">
          Brukte<br className="sm:hidden" /> treningsklær,
          <br />
          bedre priser.
        </h1>
        <p className="mt-4 max-w-[560px] text-base leading-[1.5] text-ink-2 sm:mt-6 sm:text-lg">
          Kjøp og selg brukte treningsklær fra Gymshark, Nike, YoungLA, Craft,
          DFYNE og mange flere. Ett minutt å legge ut, gratis å bruke.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3 sm:mt-6 sm:gap-x-6">
          <Link href="/varer" className="btn btn-ink px-9 sm:btn-lg sm:px-10">
            Utforsk
          </Link>
          <Link href="/ny-annonse" className="tbtn tbtn-u">
            Legg ut vare
          </Link>
          <p className="basis-full text-[13px] text-ink-3 sm:basis-auto">Gratis å bruke – ingen skjulte gebyrer</p>
        </div>
      </section>

      {/* ── Nytt inne ─────────────────────────────────────────────────────── */}
      {/* Rendered unconditionally. An empty grid is a far smaller failure
          than the whole section vanishing, which is what a guard here did
          when the query silently returned nothing. */}
      <section className="border-t border-ink pb-4 sm:pb-10">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 pb-4 pt-3 sm:gap-x-5 sm:pb-6 sm:pt-4">
          <h2 className="text-[26px] leading-[1.08] sm:text-[32px]">Nytt inne</h2>
          <p className="text-[13px] text-ink-3 sm:text-[15px]">Nylig lagt ut treningsklær</p>
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
