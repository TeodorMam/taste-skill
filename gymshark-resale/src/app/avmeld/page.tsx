import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Avmelding",
  robots: { index: false, follow: false },
};

/**
 * The page an unsubscribe link in a reminder email opens. It asks before it
 * does anything: the button posts to /api/unsubscribe. Opening the link, which
 * a mail client may do on its own, changes nothing.
 */
export default async function AvmeldPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; ok?: string; feil?: string }>;
}) {
  const { token, ok, feil } = await searchParams;

  if (ok) {
    return (
      <div className="space-y-4 py-16">
        <h1 className="text-2xl font-semibold tracking-tight">Avmeldt.</h1>
        <p className="text-sm text-stone-600">
          Du får ikke flere påminnelser om å legge igjen en vurdering. Beskjeder om
          egne kjøp og salg, som betaling og levering, kommer fortsatt.
        </p>
        <Link
          href="/"
          className="inline-block rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-stone-50 hover:bg-black"
        >
          Til forsiden
        </Link>
      </div>
    );
  }

  if (feil || !token) {
    return (
      <div className="space-y-4 py-16">
        <h1 className="text-2xl font-semibold tracking-tight">Lenken virket ikke.</h1>
        <p className="text-sm text-stone-600">
          Den kan være utdatert. Send oss en e-post på{" "}
          <a href="mailto:kontakt@aktivbruk.com" className="underline underline-offset-2">
            kontakt@aktivbruk.com
          </a>
          , så ordner vi det manuelt.
        </p>
        <Link
          href="/"
          className="inline-block rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-stone-50 hover:bg-black"
        >
          Til forsiden
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Slutte å få påminnelser?</h1>
      <p className="max-w-md text-sm text-stone-600">
        Du får da ingen flere e-poster som ber deg legge igjen en vurdering.
        Beskjeder om dine egne kjøp og salg, som betaling og levering, fortsetter som før.
      </p>
      <form action="/api/unsubscribe" method="post">
        <input type="hidden" name="token" value={token} />
        <button
          type="submit"
          className="rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-stone-50 hover:bg-black"
        >
          Ja, meld meg av
        </button>
      </form>
      <p className="text-xs text-stone-500">
        Ombestemte du deg? Bare lukk denne siden, ingenting er endret.
      </p>
    </div>
  );
}
