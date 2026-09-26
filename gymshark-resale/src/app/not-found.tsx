import Link from "next/link";

export default function NotFound() {
  return (
    <section className="space-y-6 py-12">
      <p className="text-sm font-[620] text-olive">
        404
      </p>
      <h1 className="text-[40px] leading-none">Ikke funnet</h1>
      <p className="max-w-md text-base text-ink-2">
        Siden du leter etter finnes ikke, den er kanskje solgt, slettet, eller
        så har lenken en skrivefeil.
      </p>
      <div className="flex flex-wrap items-center gap-5">
        <Link
          href="/varer"
          className="btn btn-ink"
        >
          Utforsk varer
        </Link>
        <Link
          href="/"
          className="tbtn tbtn-u"
        >
          Til forsiden
        </Link>
      </div>
    </section>
  );
}
