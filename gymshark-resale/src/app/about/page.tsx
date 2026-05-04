import Link from "next/link";

export const metadata = {
  title: "Om Aktivbruk — bruktmarked for treningsklær",
  description:
    "Aktivbruk er bruktmarkedet for treningsklær i Norge. Gymshark, Nike, Lululemon, Alphalete og flere hundre andre merker.",
};

export default function AboutPage() {
  return (
    <section className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Om Aktivbruk.</h1>
        <p className="mt-2 text-sm text-stone-600">
          Aktivbruk er en markedsplass for brukte treningsklær. Enklere å finne
          det du faktisk vil ha. Enklere å selge det du ikke bruker.
        </p>
      </div>

      <div className="space-y-5 border-l-2 border-[#5a6b32]/20 pl-5">
        <p className="text-xs font-medium uppercase tracking-widest text-stone-400">
          Grunnleggeren
        </p>
        <div className="space-y-4 text-sm leading-relaxed text-stone-700">
          <p>
            Aktivbruk ble startet av Teodor Mamelund, 16 år.
          </p>
          <p>
            Som aktiv utøver — med maraton på 3:03 som 15-åring, erfaring fra
            ultraløp over 80 km og styrketrening — har jeg brukt mye tid på
            trening. Og på utstyr.
          </p>
          <p>
            Jeg oppdaget raskt hvor vanskelig det er å finne gode treningsklær
            brukt. De forsvinner i støyen.
          </p>
          <p className="font-medium text-stone-900">
            Aktivbruk er bygget for å fjerne den støyen.
          </p>
          <p className="font-medium text-stone-900">
            Kun treningsklær. Enklere å finne. Enklere å selge.
          </p>
          <p className="text-xs font-medium uppercase tracking-widest text-stone-400">
            Laget for folk som trener.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Hva skiller oss</h2>
        <ul className="space-y-2 text-sm text-stone-700">
          <li className="flex gap-2">
            <span aria-hidden>✓</span>
            <span>
              <strong>Kun treningsklær.</strong> Ingenting blir borte i en haug
              av jeans og barneklær.
            </span>
          </li>
          <li className="flex gap-2">
            <span aria-hidden>✓</span>
            <span>
              <strong>1000+ merker.</strong> Fra Gymshark til Alphalete, NVGTN,
              AYBL, Breathe Divinity, Ekkovision — de som er vanskelige å finne
              brukt andre steder.
            </span>
          </li>
          <li className="flex gap-2">
            <span aria-hidden>✓</span>
            <span>
              <strong>Chat direkte i appen.</strong> Ingen grunn til å gi ut
              telefonnummeret ditt først.
            </span>
          </li>
          <li className="flex gap-2">
            <span aria-hidden>✓</span>
            <span>
              <strong>Trygg betaling.</strong> Kjøperbeskyttelse inkludert —
              pengene holdes til du bekrefter at varen stemmer.
            </span>
          </li>
        </ul>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Vanlige spørsmål</h2>

        <Faq q="Hvordan betaler jeg?">
          Du betaler trygt med kort direkte på Aktivbruk — drevet av Stripe.
          Pengene holdes hos oss til du har bekreftet at varen er som forventet,
          og selger får ikke utbetalt før alt er i orden.
        </Faq>

        <Faq q="Hvordan fungerer frakt?">
          Selger velger om varen kan sendes med Posten eller hentes lokalt.
          Kjøper betaler frakten, som legges til i kassen. Selger slipper pakken
          på nærmeste Posten-punkt etter betaling.
        </Faq>

        <Faq q="Er det trygt?">
          Ja. Aktivbruk holder pengene dine til du bekrefter at varen stemmer —
          vi kaller det kjøperbeskyttelse. Melder du et problem innen 48 timer
          etter levering, setter vi betalingen på vent og ser på saken.
        </Faq>

        <Faq q="Hva er kjøperbeskyttelse?">
          Kjøperbeskyttelse betyr at pengene holdes hos Aktivbruk — ikke selger
          — frem til du bekrefter at varen er som forventet. Du har 48 timer
          etter levering til å melde et problem. Stemmer ikke varen med
          beskrivelsen, er den skadet, eller ikke levert, ser vi på saken og
          refunderer deg om nødvendig.{" "}
          <a href="/kjoperbeskyttelse" className="font-medium underline underline-offset-2 hover:text-stone-900">
            Les mer om kjøperbeskyttelse →
          </a>
        </Faq>

        <Faq q="Koster det noe å legge ut en annonse?">
          Nei. Aktivbruk er helt gratis både for kjøpere og selgere.
        </Faq>

        <Faq q="Kan jeg selge andre ting enn treningsklær?">
          Nei, vi er strengt dedikert til treningsklær og -utstyr. Dette gjør
          oppdagelse mye bedre for alle.
        </Faq>

        <Faq q="Hvordan markerer jeg noe som solgt?">
          Gå til annonsen din og trykk “Marker som solgt”. Du finner alle dine
          annonser under “Mine annonser”.
        </Faq>

        <Faq q="Jeg har et forslag eller problem.">
          Send en e-post til{" "}
          <a href="mailto:kontakt@aktivbruk.com" className="underline hover:text-stone-900">
            kontakt@aktivbruk.com
          </a>{" "}
          — vi svarer raskt.
        </Faq>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-5 text-center">
        <p className="text-sm text-stone-600">Klar til å komme i gang?</p>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          <Link
            href="/browse"
            className="rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-stone-50 hover:bg-black"
          >
            Utforsk varer
          </Link>
          <Link
            href="/post"
            className="rounded-full border border-stone-300 bg-white px-5 py-2.5 text-sm font-medium text-stone-700 hover:border-stone-500"
          >
            Legg ut vare
          </Link>
        </div>
      </div>
    </section>
  );
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <details className="group rounded-xl border border-stone-200 bg-white p-4">
      <summary className="flex cursor-pointer items-center justify-between text-sm font-medium text-stone-800">
        {q}
        <span className="text-stone-400 transition group-open:rotate-45">＋</span>
      </summary>
      <p className="mt-2 text-sm leading-relaxed text-stone-600">{children}</p>
    </details>
  );
}
