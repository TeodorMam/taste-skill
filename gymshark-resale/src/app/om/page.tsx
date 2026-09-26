import Link from "next/link";
import { Icon } from "@/components/Icon";

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
        <h1 className="text-[40px] leading-none">Om Aktivbruk.</h1>
        <p className="mt-3 text-base font-medium text-ink">
          Et bruktmarked for mennesker som trener.
        </p>
        <div className="mt-4 space-y-3 text-[15px] leading-[1.55] text-ink-2">
          <p>Aktivbruk er en markedsplass for brukt treningstøy.</p>
          <p>
            Jeg startet med treningstøy fordi det er her jeg så et tydelig behov.
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
      <div className="space-y-4 border-t border-ink pt-5">
        <h2 className="text-[26px] leading-[1.08]">
          Hvorfor startet jeg Aktivbruk?
        </h2>
        <div className="space-y-3 text-[15px] leading-[1.55] text-ink-2">
          <p>
            Jeg heter Teodor og startet Aktivbruk som 16-åring. Det er jeg som
            står bak.
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
          <p className="font-medium text-ink">
            Så jeg bestemte meg for å bygge løsningen selv.
          </p>
        </div>
      </div>

      {/* ── Hvorfor Aktivbruk? ───────────────────────────────────── */}
      <div className="space-y-3">
        <h2 className="text-[26px] leading-[1.08]">Hvorfor Aktivbruk?</h2>
        <div className="space-y-3 text-[15px] leading-[1.55] text-ink-2">
          <p>
            FINN og Tise er store og har enorme brukerbaser. Det er ikke målet
            å konkurrere med dem på å være størst på alt.
          </p>
          <p className="font-medium text-ink">Forskjellen er fokuset.</p>
          <p>
            Aktivbruk er bygget med trening som utgangspunkt. Her skal det være
            enklere å finne relevante produkter uten å måtte lete gjennom et
            helt generelt bruktmarked.
          </p>
          <p>Det er også derfor jeg starter smalt.</p>
        </div>
      </div>

      {/* ── Dette er bare starten ────────────────────────────────── */}
      <div className="space-y-3">
        <h2 className="text-[26px] leading-[1.08]">
          Dette er bare starten
        </h2>
        <div className="space-y-3 text-[15px] leading-[1.55] text-ink-2">
          <p>I dag fokuserer Aktivbruk på treningstøy.</p>
          <p className="font-medium text-ink">
            Men målet er større enn klær.
          </p>
          <p>
            Når Aktivbruk har fått et solid grunnlag med nok aktivitet, kjøpere
            og selgere, skal jeg gradvis utvide med flere kategorier innen
            trening og sport.
          </p>
          <p>Det kan blant annet være:</p>
          <ul className="ml-4 list-disc space-y-1">
            <li>Løpesko</li>
            <li>Treningsutstyr</li>
            <li>Annet utstyr for trening og aktivitet</li>
          </ul>
          <p>
            Jeg skal ikke åpne alt på én gang. Først bygger jeg en god
            markedsplass for treningstøy. Deretter utvider jeg når tiden er
            riktig.
          </p>
          <p className="pt-1 text-[13px] font-[620] text-ink-2">
            Fra brukt treningstøy til et større bruktmarked for trening og sport.
          </p>
        </div>
      </div>

      {/* ── Bygget fra bunnen av ─────────────────────────────────── */}
      <div className="space-y-3">
        <h2 className="text-[26px] leading-[1.08]">
          Bygget fra bunnen av
        </h2>
        <div className="space-y-3 text-[15px] leading-[1.55] text-ink-2">
          <p>
            Aktivbruk er et selvstendig prosjekt som jeg bygger fra bunnen av.
          </p>
          <p>
            Jeg jobber med utvikling, design, produkt, markedsføring og alt det
            andre som følger med å bygge en markedsplass.
          </p>
          <p>Det er fortsatt tidlig, og det er mye som skal bygges videre.</p>
          <p>Men retningen er klar:</p>
          <p className="text-base font-semibold text-ink">
            Å bygge det naturlige stedet for å kjøpe og selge brukt trening og
            sport.
          </p>
          <p className="text-sm text-ink-3">Aktivbruk er bare i starten.</p>
        </div>
      </div>

      {/* ── Divider mellom Om Aktivbruk og FAQ ───────────────────── */}
      <div className="h-px bg-ink" />

      {/* ── Vanlige spørsmål ─────────────────────────────────────── */}
      <div>
        <h2 className="border-b border-line pb-3 text-[26px] leading-[1.08]">
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
          Det kaller jeg kjøperbeskyttelse. Melder du et problem innen 48 timer
          etter levering, setter jeg utbetalingen på vent og ser på saken.
        </Faq>

        <Faq q="Hva er kjøperbeskyttelse?">
          Kjøperbeskyttelse betyr at pengene ikke går til selger før du har
          fått varen og bekreftet at den er som beskrevet. Du har 48 timer på
          deg til å melde fra hvis noe ikke stemmer. Er varen skadet, ikke som
          beskrevet, eller ikke levert, ser jeg på saken og refunderer hvis det
          er nødvendig.{" "}
          <a
            href="/kjoperbeskyttelse"
            className="inline-flex items-center gap-1 font-semibold text-ink underline underline-offset-2"
          >
            Les mer om kjøperbeskyttelse <Icon name="pil-h" size={16} />
          </a>
        </Faq>

        <Faq q="Koster det noe å legge ut en annonse?">
          Nei. Å legge ut en annonse er helt gratis for selger. Kjøper betaler
          en liten avgift i kassen for kjøperbeskyttelsen.
        </Faq>

        <Faq q="Hva kan jeg selge på Aktivbruk?">
          Akkurat nå kan du selge treningstøy. Etter hvert vil jeg utvide til
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
            className="underline hover:text-ink"
          >
            kontakt@aktivbruk.com
          </a>
          . Jeg svarer så raskt jeg kan.
        </Faq>
      </div>

      {/* ── CTA ──────────────────────────────────────────────────── */}
      <div className="border-t border-ink pt-5">
        <p className="text-sm text-ink-2">Klar til å komme i gang?</p>
        <div className="mt-3 flex flex-wrap items-center gap-5">
          <Link
            href="/varer"
            className="btn btn-ink"
          >
            Utforsk varer
          </Link>
          <Link
            href="/ny-annonse"
            className="tbtn tbtn-u"
          >
            Legg ut vare
          </Link>
        </div>
      </div>

      {/* ── Ansvarlig for siden ──────────────────────────────────── */}
      <div className="border-t border-line pt-5">
        <p className="text-[15px] leading-[1.55] text-ink-2">
          Aktivbruk er laget og drives av Teodor Mamelund i Oslo. Har du
          spørsmål om siden, eller om hvordan opplysningene dine behandles,
          nås jeg på{" "}
          <a
            href="mailto:kontakt@aktivbruk.com"
            className="underline hover:text-ink"
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
    <details className="group border-b border-line">
      <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-4 py-3 text-[15px] font-[620] text-ink [&::-webkit-details-marker]:hidden">
        {q}
        <Icon name="pluss" size={18} className="text-ink-2 transition-transform duration-200 ease-out group-open:rotate-45" />
      </summary>
      <p className="pb-4 text-[15px] leading-[1.55] text-ink-2">{children}</p>
    </details>
  );
}
