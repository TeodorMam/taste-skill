import Link from "next/link";

export const metadata = {
  title: "Vilkår for bruk — Aktivbruk",
  description: "Vilkår og betingelser for kjøp og salg på Aktivbruk.",
};

export default function VilkarPage() {
  return (
    <section className="max-w-xl space-y-8">
      <div>
        <p className="mb-4 text-sm text-stone-500">
          <Link href="/browse" className="hover:text-black">← Tilbake</Link>
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Vilkår for bruk</h1>
        <p className="mt-2 text-sm text-stone-500">Sist oppdatert: mai 2025</p>
      </div>

      <p className="text-sm leading-relaxed text-stone-600">
        Ved å bruke Aktivbruk («tjenesten») godtar du disse vilkårene. Les dem nøye. Har du spørsmål, ta kontakt på{" "}
        <a href="mailto:kontakt@aktivbruk.com" className="underline underline-offset-2 hover:text-stone-900">kontakt@aktivbruk.com</a>.
      </p>

      <Block title="1. Hva er Aktivbruk?">
        <p>Aktivbruk er en markedsplass for kjøp og salg av brukte treningsklær i Norge. Vi legger til rette for handel mellom privatpersoner, men er ikke part i avtalen mellom kjøper og selger.</p>
      </Block>

      <Block title="2. Brukerkonto">
        <ul className="space-y-1.5">
          <li>Du må være minst 15 år for å opprette konto. Er du under 18, trenger du foresattes samtykke.</li>
          <li>Du er ansvarlig for all aktivitet som skjer fra kontoen din.</li>
          <li>Du kan ikke overføre eller dele kontoen din med andre.</li>
          <li>Vi kan suspendere eller slette kontoer som bryter disse vilkårene.</li>
        </ul>
      </Block>

      <Block title="3. Selgerens ansvar">
        <ul className="space-y-1.5">
          <li>Annonsen skal gi en ærlig og nøyaktig beskrivelse av varen, inkludert feil og slitasje.</li>
          <li>Du kan bare selge treningsklær og treningsrelatert utstyr.</li>
          <li>Forfalskninger, stjålgods eller varer som bryter norsk lov er ikke tillatt.</li>
          <li>Du plikter å sende varen innen 7 dager etter betaling. Sender du ikke innen fristen, kanselleres ordren og kjøper refunderes fullt.</li>
          <li>For å motta betaling må du koble til en Stripe Express-konto og akseptere Stripes vilkår.</li>
        </ul>
      </Block>

      <Block title="4. Kjøperens ansvar">
        <ul className="space-y-1.5">
          <li>Du har 48 timer etter levering til å bekrefte mottak eller melde et problem. Gjøres ingenting, frigjøres betalingen automatisk til selger.</li>
          <li>Du kan melde problem dersom varen ikke er levert, er vesentlig feilbeskrevet, eller er skadet på en måte som ikke fremgikk av annonsen.</li>
          <li>Angrerett etter forbrukerkjøpsloven gjelder ikke for handel mellom privatpersoner med mindre selger er næringsdrivende.</li>
        </ul>
      </Block>

      <Block title="5. Betaling og gebyrer">
        <ul className="space-y-1.5">
          <li>Betaling skjer via Stripe og holdes i escrow hos Aktivbruk frem til kjøper bekrefter mottak.</li>
          <li>Aktivbruk tar et transaksjonsgebyr per gjennomført salg. Gebyret fremgår av kjøpsprosessen.</li>
          <li>Fraktkostnader betales av kjøper og legges til i kassen basert på selgers valgte pakkestørrelse.</li>
          <li>Refusjoner behandles via Stripe og kan ta 5–10 virkedager avhengig av kortutstederen.</li>
        </ul>
      </Block>

      <Block title="6. Tvister">
        <p>Oppstår det en tvist mellom kjøper og selger, kan begge parter kontakte oss på <a href="mailto:kontakt@aktivbruk.com" className="underline underline-offset-2 hover:text-stone-900">kontakt@aktivbruk.com</a>. Aktivbruk vil vurdere saken basert på annonsen, kommunikasjon og dokumentasjon, og ta en endelig avgjørelse. Vi er ikke forpliktet til å fatte en avgjørelse i favor av noen part, men tilstreber en rettferdig behandling.</p>
      </Block>

      <Block title="7. Forbudt innhold og atferd">
        <ul className="space-y-1.5">
          <li>Falske annonser, villedende bilder eller løgn om varens tilstand.</li>
          <li>Spam, trakassering eller upassende kommunikasjon.</li>
          <li>Forsøk på å gjennomføre betaling utenfor plattformen for å omgå kjøperbeskyttelse.</li>
          <li>Salg av forfalskede merkevarer.</li>
        </ul>
        <p className="mt-2">Brudd kan føre til umiddelbar suspensjon og eventuell politianmeldelse.</p>
      </Block>

      <Block title="8. Ansvarsbegrensning">
        <p>Aktivbruk er en teknisk plattform og er ikke ansvarlig for varenes kvalitet, autentisitet eller levering. Vi er heller ikke ansvarlig for indirekte tap, tapte inntekter eller andre konsekvenstap som følge av bruk av tjenesten. Vårt totale ansvar overfor deg kan ikke overstige det beløpet du har betalt i gebyrer til Aktivbruk de siste 12 månedene.</p>
      </Block>

      <Block title="9. Endringer i vilkårene">
        <p>Vi kan endre disse vilkårene. Vesentlige endringer varsles per e-post eller ved tydelig melding på tjenesten. Fortsetter du å bruke Aktivbruk etter at endringene trer i kraft, aksepterer du de nye vilkårene.</p>
      </Block>

      <Block title="10. Gjeldende lov">
        <p>Disse vilkårene er underlagt norsk rett. Tvister som ikke løses i minnelighet, skal bringes inn for Oslo tingrett som verneting.</p>
      </Block>

      <div className="rounded-2xl border border-stone-200 bg-white p-5">
        <p className="text-sm font-medium text-stone-800">Spørsmål om vilkårene?</p>
        <p className="mt-1 text-sm text-stone-600">
          Ta kontakt på{" "}
          <a href="mailto:kontakt@aktivbruk.com" className="font-medium underline underline-offset-2 hover:text-stone-900">kontakt@aktivbruk.com</a>
        </p>
      </div>
    </section>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h2 className="text-base font-semibold tracking-tight">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-stone-600">{children}</div>
    </div>
  );
}
