import Link from "next/link";

export default function NotFound() {
  return (
    <section className="space-y-6 py-16 text-center">
      <p className="text-sm font-medium uppercase tracking-widest text-[#5a6b32]">
        404
      </p>
      <h1 className="text-4xl font-semibold tracking-tight">Ikke funnet</h1>
      <p className="mx-auto max-w-md text-sm text-stone-600">
        Siden du leter etter finnes ikke — den er kanskje solgt, slettet, eller
        så har lenken en skrivefeil.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Link
          href="/browse"
          className="rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-stone-50 hover:bg-black"
        >
          Utforsk varer
        </Link>
        <Link
          href="/"
          className="rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-medium text-stone-700 hover:border-stone-500"
        >
          Til forsiden
        </Link>
      </div>
    </section>
  );
}
