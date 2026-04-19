import Link from "next/link";

export default function HomePage() {
  return (
    <section className="flex flex-col items-start gap-6 py-10 sm:py-20">
      <span className="rounded-full border border-neutral-300 px-3 py-1 text-xs uppercase tracking-wider text-neutral-600">
        Oslo only — Gymshark only
      </span>
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
        Buy and sell Gymshark in Oslo.
      </h1>
      <p className="max-w-xl text-neutral-600">
        A dedicated, no-noise place to trade pre-loved Gymshark pieces with other
        lifters in the city. Post an item in under a minute — no account needed.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link
          href="/post"
          className="rounded-full bg-black px-5 py-3 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Post item
        </Link>
        <Link
          href="/browse"
          className="rounded-full border border-neutral-300 bg-white px-5 py-3 text-sm font-medium text-neutral-900 hover:border-neutral-500"
        >
          Browse items
        </Link>
      </div>
    </section>
  );
}
