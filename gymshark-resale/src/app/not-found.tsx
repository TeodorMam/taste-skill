import Link from "next/link";

export default function NotFound() {
  return (
    <section className="space-y-6 py-16 text-center">
      <p className="text-sm font-medium uppercase tracking-widest text-olive">
        404
      </p>
      <h1 className="text-4xl font-semibold tracking-tight">Ikke funnet</h1>
      <p className="mx-auto max-w-md text-sm text-ink-2">
        Siden du leter etter finnes ikke, den er kanskje solgt, slettet, eller
        så har lenken en skrivefeil.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Link
          href="/varer"
          className="rounded-sm bg-ink px-5 py-3 text-sm font-medium text-paper hover:bg-ink"
        >
          Utforsk varer
        </Link>
        <Link
          href="/"
          className="rounded-sm border border-line-2 bg-raised px-5 py-3 text-sm font-medium text-ink-2 hover:border-ink"
        >
          Til forsiden
        </Link>
      </div>
    </section>
  );
}
