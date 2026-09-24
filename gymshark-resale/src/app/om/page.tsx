import Link from "next/link";

export const metadata = {
  title: "Om Aktivbruk, bruktmarked for treningstøy",
  description:
    "Aktivbruk er en markedsplass for brukt treningstøy, bygget fra bunnen av en 16-åring. Målet er å bli det naturlige stedet for brukt trening og sport.",
};

export default function AboutPage() {
  return (
    <section className="space-y-10">
      {/* ── Om Aktivbruk ─────────────────────────────────────────── */}
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Om Aktivbruk.</h1>
        <p className="mt-3 text-base font-medium text-stone-800">
          Et bruktmarked for mennesker som trener.
        </p>
        <div className="mt-4 space-y-3 text-sm leading-relaxed text-stone-700">
          <p>Aktivbruk er en markedsplass for brukt treningstøy.</p>
          <p>
            Vi startet med treningstøy fordi det er her vi så et tydelig behov.
            På generelle bruktmarkedsplasser som FINN og Tise kan det være mye
            bra å finne, men treningstøy blir fort en liten del av et mye
            større marked.
          </p>
          <p>Aktivbruk er bygget med trening som utgangspunkt.</p>
          <p>
            Målet er å gjøre det enklere å finne ting du faktisk er ute etter,
            og enklere å selge det du ikke bruker lenger.
          </p>
        </div>
      </div>

      {/* ── Founder story (accent border) ────────────────────────── */}
      <div className="space-y-4 border-l-2 border-[#5a6b32]/20 pl-5">
        <h2 className="text-lg font-semibold tracking-tight">
          Hvorfor startet jeg Aktivbruk?
        </h2>
        <div className="space-y-3 text-sm leading-relaxed text-stone-700">
          <p>
            Jeg heter Teodor og er 16 år, og det er jeg som står bak Aktivbruk.
          </p>
          <p>
            Jeg har selv brukt mange år på trening, både løping og styrketrening.
            Som 15-åring løp jeg maraton på 3:03, og jeg har også løpt ultraløp
            på over 80 km.
          </p>
          <p>
            Gjennom egen trening har jeg kjøpt, brukt og solgt mye treningstøy
            og utstyr. Jeg så hvor mye bra som allerede finnes der ute, men
            også hvor vanskelig det kan være å finne akkurat det man leter etter
            brukt.
          </p>
          <p className="font-medium text-stone-900">
            Så jeg bestemte meg for å bygge løsningen selv.
          </p>
        </div>
      </div>

      {/* ── Hvorfor Aktivbruk? ───────────────────────────────────── */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Hvorfor Aktivbruk?</h2>
        <div className="space-y-3 text-sm leading-relaxed text-stone-700">
          <p>
            FINN og Tise er store og har enorme brukerbaser. Det er ikke målet
            å konkurrere med dem på å være størst på alt.
          </p>
          <p className="font-medium text-stone-900">Forskjellen er fokuset.</p>
          <p>
            Aktivbruk er bygget med trening som utgangspunkt. Her skal det være
            enklere å finne relevante produkter uten å måtte lete gjennom et
            helt generelt bruktmarked.
          </p>
          <p>Det er også derfor vi starter smalt.</p>
        </div>
      </div>

      {/* ── Dette er bare starten ────────────────────────────────── */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">
          Dette er bare starten
        </h2>
        <div className="space-y-3 text-sm leading-relaxed text-stone-700">
          <p>I dag fokuserer Aktivbruk på treningstøy.</p>
          <p className="font-medium text-stone-900">
            Men målet er større enn klær.
          </p>
          <p>
            Når Aktivbruk har fått et solid grunnlag med nok aktivitet, kjøpere
            og selgere, skal vi gradvis utvide med flere kategorier innen
            trening og sport.
          </p>
          <p>Det kan blant annet være:</p>
          <ul className="ml-4 list-disc space-y-1">
            <li>Løpesko</li>
            <li>Treningsutstyr</li>
            <li>Annet utstyr for trening og aktivitet</li>
          </ul>
          <p>
            Vi skal ikke åpne alt på én gang. Først bygger vi en god
            markedsplass for treningstøy. Deretter utvider vi når tiden er
            riktig.
          </p>
          <p className="pt-1 text-xs font-medium uppercase tracking-widest text-stone-500">
            Fra brukt treningstøy til et større bruktmarked for trening og sport.
          </p>
        </div>
      </div>

      {/* ── Bygget fra bunnen av ─────────────────────────────────── */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">
          Bygget fra bunnen av
        </h2>
        <div className="space-y-3 text-sm leading-relaxed text-stone-700">
          <p>
            Aktivbruk er et selvstendig prosjekt som jeg bygger fra bunnen av.
          </p>
          <p>
            Jeg jobber med utvikling, design, produkt, markedsføring og alt det
            andre som følger med å bygge en markedsplass.
          </p>
          <p>Det er fortsatt tidlig, og det er mye som skal bygges videre.</p>
          <p>Men retningen er klar:</p>
          <p className="text-base font-semibold text-stone-900">
            Å bygge det naturlige stedet for å kjøpe og selge brukt trening og
            sport.
          </p>
          <p className="text-sm text-stone-500">Aktivbruk er bare i starten.</p>
        </div>
      </div>

      {/* ── Divider mellom Om Aktivbruk og FAQ ───────────────────── */}
      <div className="h-px bg-stone-200" />

      {/* ── Vanlige spørsmål ─────────────────────────────────────── */}
      <div className="space-y-3">
        <h2 className="text-2xl font-semibold tracking-tight">
          Vanlige spørsmål
        </h2>

        <Faq q="Hvordan fungerer betaling?">
          Du betaler trygt med kort direkte på Aktivbruk, driftet av Stripe.
          Pengene holdes hos Aktivbruk til du bekrefter at varen stemmer. Selger
          får ikke utbetalt før du har mottatt og godkjent den.
        </Faq>

        <Faq q="Hvordan fungerer frakt?">
          Selger velger om varen kan sendes med Posten eller hentes lokalt.
          Kjøper betaler frakten, som legges til i kassen. Selger sender pakken
          fra nærmeste Posten-punkt etter betaling.
        </Faq>

        <Faq q="Er det trygt å handle på Aktivbruk?">
          Ja. Pengene holdes hos Aktivbruk til du bekrefter at varen stemmer.
          Vi kaller det kjøperbeskyttelse. Melder du et problem innen 48 timer
          etter levering, setter vi utbetalingen på vent og ser på saken.
        </Faq>

        <Faq q="Hva er kjøperbeskyttelse?">
          Kjøperbeskyttelse betyr at pengene ikke går til selger før du har
          fått varen og bekreftet at den er som beskrevet. Du har 48 timer på
          deg til å melde fra hvis noe ikke stemmer. Er varen skadet, ikke som
          beskrevet, eller ikke levert, ser vi på saken og refunderer hvis det
          er nødvendig.{" "}
          <a
            href="/kjoperbeskyttelse"
            className="font-medium underline underline-offset-2 hover:text-stone-900"
          >
            Les mer om kjøperbeskyttelse →
          </a>
        </Faq>

        <Faq q="Koster det noe å legge ut en annonse?">
          Nei. Å legge ut en annonse er helt gratis for selger. Kjøper betaler
          en liten avgift i kassen for kjøperbeskyttelsen.
        </Faq>

        <Faq q="Hva kan jeg selge på Aktivbruk?">
          Akkurat nå kan du selge treningstøy. Etter hvert vil vi utvide til
          flere kategorier innen trening og sport, som løpesko og
          treningsutstyr, men foreløpig er det kun treningstøy.
        </Faq>

        <Faq q="Hvordan markerer jeg en vare som solgt?">
          Gå til annonsen din og trykk “Marker som solgt”. Du finner alle
          annonsene dine under “Mine annonser”.
        </Faq>

        <Faq q="Jeg har et spørsmål eller forslag. Hvordan kontakter jeg dere?">
          Send en e-post til{" "}
          <a
            href="mailto:kontakt@aktivbruk.com"
            className="underline hover:text-stone-900"
          >
            kontakt@aktivbruk.com
          </a>
          . Jeg svarer så raskt jeg kan.
        </Faq>
      </div>

      {/* ── CTA ──────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-stone-200 bg-white p-5 text-center">
        <p className="text-sm text-stone-600">Klar til å komme i gang?</p>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          <Link
            href="/varer"
            className="rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-stone-50 hover:bg-black"
          >
            Utforsk varer
          </Link>
          <Link
            href="/ny-annonse"
            className="rounded-full border border-stone-300 bg-white px-5 py-2.5 text-sm font-medium text-stone-700 hover:border-stone-500"
          >
            Legg ut vare
          </Link>
        </div>
      </div>

      {/* ── Ansvarlig for siden ──────────────────────────────────── */}
      <div className="border-t border-stone-200 pt-5">
        <p className="text-sm leading-relaxed text-stone-600">
          Aktivbruk er laget og drives av Teodor Mamelund i Oslo. Har du
          spørsmål om siden, eller om hvordan opplysningene dine behandles,
          nås jeg på{" "}
          <a
            href="mailto:kontakt@aktivbruk.com"
            className="underline hover:text-stone-900"
          >
            kontakt@aktivbruk.com
          </a>
          .
        </p>
      </div>
    </section>
  );
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <details className="group rounded-xl border border-stone-200 bg-white p-4">
      <summary className="flex cursor-pointer items-center justify-between text-sm font-medium text-stone-800">
        {q}
        <span className="text-stone-500 transition group-open:rotate-45">＋</span>
      </summary>
      <p className="mt-2 text-sm leading-relaxed text-stone-600">{children}</p>
    </details>
  );
}
