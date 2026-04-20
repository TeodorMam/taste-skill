import Link from "next/link";

export default function HomePage() {
  return (
    <section className="flex flex-col items-start gap-7 py-12 sm:py-24">
      <span className="rounded-full border border-[#5a6b32]/30 bg-[#5a6b32]/5 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-[#5a6b32]">
        Treningsklær · Norge
      </span>
      <h1 className="text-5xl font-semibold tracking-tight text-stone-900 sm:text-6xl">
        Brukte treningsklær, <br className="hidden sm:inline" />
        <span className="text-[#5a6b32]">bedre priser.</span>
      </h1>
      <p className="max-w-xl text-base text-stone-600 sm:text-lg">
        Kjøp og selg brukte treningsklær fra Gymshark, Nike, Lululemon, Alphalete
        og flere. Ett minutt å legge ut — gratis å bruke.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link
          href="/post"
          className="rounded-full bg-stone-900 px-6 py-3 text-sm font-medium text-stone-50 hover:bg-black"
        >
          Legg ut vare
        </Link>
        <Link
          href="/browse"
          className="rounded-full border border-stone-300 bg-white px-6 py-3 text-sm font-medium text-stone-900 hover:border-stone-500"
        >
          Utforsk
        </Link>
      </div>
    </section>
  );
}
