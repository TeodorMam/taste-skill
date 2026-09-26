import Link from "next/link";

export const metadata = {
  title: "Vilkår for bruk, Aktivbruk",
  description: "Vilkår og betingelser for kjøp og salg på Aktivbruk.",
};

export default function VilkarPage() {
  return (
    <section className="max-w-xl space-y-8">
      <div>
        <p className="mb-4 text-sm text-ink-3">
          <Link href="/varer" className="hover:text-ink">← Tilbake</Link>
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Vilkår for bruk</h1>
        <p className="mt-2 text-sm text-ink-3">Sist oppdatert: september 2026</p>
      </div>

      <p className="text-sm leading-relaxed text-ink-2">
        Ved å bruke Aktivbruk («tjenesten») godtar du disse vilkårene. Les dem
        nøye. Har du spørsmål, ta kontakt på{" "}
        <a
          href="mailto:kontakt@aktivbruk.com"
          className="underline underline-offset-2 hover:text-ink"
        >
          kontakt@aktivbruk.com
        </a>
        .
      </p>

      <Block title="1. Hva er Aktivbruk?">
        <p>
          Aktivbruk er en markedsplass for kjøp og salg av brukte treningsklær i
          Norge. Tjenesten legger til rette for handel mellom kjøper og selger,
          men er ikke part i kjøpsavtalen mellom dem.
        </p>
        <p>
          Aktivbruk tilbyr tekniske funksjoner for annonsering, kommunikasjon,
          betaling og kjøperbeskyttelse. Kjøper og selger er selv ansvarlige for
          at handelen og varen er i samsvar med gjeldende lov.
        </p>
      </Block>

      <Block title="2. Brukerkonto">
        <ul className="space-y-1.5">
          <li>Du må være minst 15 år for å opprette konto på Aktivbruk.</li>
          <li>Du er ansvarlig for all aktivitet som skjer fra kontoen din.</li>
          <li>Du skal ikke dele, låne bort eller overføre kontoen din til andre.</li>
          <li>Informasjonen du oppgir skal være korrekt og oppdatert.</li>
          <li>
            Aktivbruk kan begrense, suspendere eller avslutte kontoer ved brudd på
            disse vilkårene eller ved mistanke om misbruk av tjenesten.
          </li>
        </ul>
      </Block>

      <Block title="3. Selgerens ansvar">
        <ul className="space-y-1.5">
          <li>
            Annonsen skal gi en ærlig og nøyaktig beskrivelse av varen,
            inkludert feil, skader og slitasje.
          </li>
          <li>
            Bilder skal vise varen på en korrekt måte og skal ikke være
            villedende.
          </li>
          <li>
            Du kan bruke egne bilder eller produktbilder fra produsent eller
            nettbutikk. Produktbilder må vise nøyaktig samme modell og farge
            som varen du selger. Aktivbruk anbefaler minst ett bilde du har tatt
            selv, som viser varens faktiske tilstand. Du er selv ansvarlig for at du
            kan bruke bildene du laster opp. Ved å laste opp et bilde gir du
            Aktivbruk rett til å vise det i annonsen. Bilder du har tatt selv
            kan i tillegg brukes i markedsføring av annonsen.
          </li>
          <li>
            Du kan per i dag kun selge treningsklær på Aktivbruk. Andre
            kategorier innen trening og sport kan bli tilgjengelige senere.
          </li>
          <li>
            Forfalskninger, tyvegods eller varer som bryter norsk lov er ikke
            tillatt.
          </li>
          <li>
            Selger skal sende varen innen 7 dager etter at betalingen er
            gjennomført. Dersom varen ikke sendes innen fristen, kan ordren
            kanselleres og kjøper refunderes.
          </li>
          <li>
            Selger må være minst 15 år. For å motta betaling må selger koble til
            en Stripe-konto og akseptere Stripes vilkår. Selger over 18 gjør
            dette selv. Selger under 18 må ha en foresatt som oppretter
            Stripe-kontoen og mottar utbetalingene på vegne av selger.
            Utbetalingen går da til foresattes bankkonto, og foresatte er
            ansvarlig for skatterapportering. Ta kontakt på{" "}
            <a
              href="mailto:kontakt@aktivbruk.com"
              className="underline underline-offset-2 hover:text-ink"
            >
              kontakt@aktivbruk.com
            </a>{" "}
            for å sette dette opp.
          </li>
          <li>
            Selger er ansvarlig for å pakke og sende varen på en forsvarlig
            måte.
          </li>
          <li>
            Aktivbruk er ikke ansvarlig for forsinkelser eller skader som
            oppstår hos fraktselskapet, med mindre annet følger av lov.
          </li>
        </ul>
      </Block>

      <Block title="4. Kjøperens ansvar">
        <ul className="space-y-1.5">
          <li>
            Du har 48 timer etter registrert levering til å bekrefte at alt er
            OK eller melde fra om et problem.
          </li>
          <li>
            Du kan melde problem dersom varen ikke er levert, er vesentlig
            feilbeskrevet eller er skadet på en måte som ikke fremgikk av
            annonsen.
          </li>
          <li>
            Dersom du ikke melder problem innen fristen, kan betalingen
            frigjøres automatisk til selger.
          </li>
          <li>
            Kjøper skal bruke «Meld problem»-funksjonen på en ærlig og rimelig
            måte.
          </li>
          <li>
            Ved handel mellom to privatpersoner gjelder normalt ikke angrerett
            etter forbrukerreglene. Dersom selger opptrer som næringsdrivende,
            kan andre regler gjelde.
          </li>
          <li>
            Misbruk av kjøperbeskyttelsen eller «Meld problem»-funksjonen kan
            føre til begrensning eller stenging av konto.
          </li>
        </ul>
      </Block>

      <Block title="5. Betaling og gebyrer">
        <ul className="space-y-1.5">
          <li>Betalinger behandles gjennom Stripe.</li>
          <li>
            Betalingen holdes tilbake frem til kjøper bekrefter at alt er OK,
            eller til 48 timer etter registrert levering har gått uten at kjøper
            har meldt et problem.
          </li>
          <li>
            Aktivbruk tar et transaksjonsgebyr per gjennomført salg. Det
            aktuelle gebyret vises før kjøpet gjennomføres.
          </li>
          <li>
            Fraktkostnader betales av kjøper og legges til i kassen basert på
            valgt fraktalternativ.
          </li>
          <li>
            Ved godkjent refusjon behandles tilbakebetalingen gjennom Stripe.
            Hvor raskt pengene er tilgjengelige på kjøpers konto, kan variere
            og avhenger blant annet av betalingsmåte og kortutsteder.
          </li>
        </ul>
      </Block>

      <Block title="6. Tvister og kjøperbeskyttelse">
        <p>
          Dersom det oppstår en uenighet mellom kjøper og selger, kan begge
          parter kontakte Aktivbruk på{" "}
          <a
            href="mailto:kontakt@aktivbruk.com"
            className="underline underline-offset-2 hover:text-ink"
          >
            kontakt@aktivbruk.com
          </a>
          .
        </p>
        <p>
          Aktivbruk kan vurdere saken basert på tilgjengelig dokumentasjon, for
          eksempel annonsen, kommunikasjon mellom partene, bilder og informasjon
          om levering.
        </p>
        <p>
          Dersom saken omfattes av Aktivbruks kjøperbeskyttelse, kan Aktivbruk
          avgjøre om kjøperen skal få refusjon eller om betalingen skal
          frigjøres til selger basert på tilgjengelig dokumentasjon.
        </p>
        <p>
          Aktivbruks vurdering gjelder håndteringen av betalingen og
          kjøperbeskyttelsen på plattformen. Den begrenser ikke kjøperens eller
          selgerens rettigheter etter norsk lov.
        </p>
      </Block>

      <Block title="7. Forbudt innhold og atferd">
        <p>Følgende er ikke tillatt:</p>
        <ul className="mt-2 space-y-1.5">
          <li>Falske eller villedende annonser.</li>
          <li>
            Villedende bilder eller uriktige opplysninger om en vares tilstand.
          </li>
          <li>Salg av forfalskede merkevarer eller tyvegods.</li>
          <li>
            Spam, trakassering, trusler eller annen upassende kommunikasjon.
          </li>
          <li>
            Forsøk på å omgå Aktivbruks betalingssystem eller kjøperbeskyttelse.
          </li>
          <li>Bruk av tjenesten til aktiviteter som bryter norsk lov.</li>
          <li>
            Opprettelse av flere kontoer for å omgå begrensninger eller
            sanksjoner.
          </li>
        </ul>
        <p className="mt-2">
          Brudd på vilkårene kan føre til at innhold fjernes, betaling eller
          handel begrenses, eller at kontoen suspenderes eller avsluttes. Ved
          mistanke om straffbare forhold kan saken bli meldt til relevante
          myndigheter.
        </p>
      </Block>

      <Block title="8. Ansvarsbegrensning">
        <p>
          Aktivbruk er en teknisk markedsplass som legger til rette for handel
          mellom brukere. Aktivbruk er verken selger eller kjøper av varene som
          formidles gjennom tjenesten.
        </p>
        <p>
          Aktivbruk er derfor som utgangspunkt ikke ansvarlig for varens
          kvalitet, tilstand, autentisitet eller levering når dette skyldes
          forhold mellom kjøper og selger eller forhold utenfor Aktivbruks
          kontroll.
        </p>
        <p>
          Aktivbruk er heller ikke ansvarlig for driftsforstyrrelser,
          forsinkelser eller andre forhold som skyldes tredjeparter eller
          tekniske forhold utenfor Aktivbruks rimelige kontroll.
        </p>
        <p>
          Dette begrenser ikke rettigheter eller ansvar som ikke kan fraskrives
          etter gjeldende lov.
        </p>
      </Block>

      <Block title="9. Endringer i vilkårene">
        <p>
          Aktivbruk kan oppdatere disse vilkårene dersom tjenesten endres,
          eller dersom det skjer endringer i relevant lovgivning.
        </p>
        <p>
          Ved vesentlige endringer vil Aktivbruk informere på en egnet måte, for
          eksempel via e-post eller en tydelig melding på tjenesten.
        </p>
        <p>
          Den nyeste versjonen av vilkårene er alltid tilgjengelig på Aktivbruk.
          Datoen øverst viser når vilkårene sist ble oppdatert.
        </p>
      </Block>

      <Block title="10. Gjeldende lov">
        <p>Disse vilkårene er underlagt norsk rett.</p>
        <p>
          Tvister skal så langt som mulig forsøkes løst i minnelighet. Dersom
          en tvist ikke kan løses på denne måten, gjelder norske regler om
          verneting.
        </p>
      </Block>

      <div className="rounded-sm border border-line bg-raised p-5">
        <p className="text-sm font-medium text-ink">Spørsmål om vilkårene?</p>
        <p className="mt-1 text-sm text-ink-2">
          Ta kontakt på{" "}
          <a
            href="mailto:kontakt@aktivbruk.com"
            className="font-medium underline underline-offset-2 hover:text-ink"
          >
            kontakt@aktivbruk.com
          </a>
        </p>
      </div>

      <p className="text-xs text-ink-3">
        Aktivbruk drives av Teodor Mamelund som privatperson. Bruktmarked for
        treningsklær. Et uavhengig prosjekt, ikke tilknyttet noen merkevare.
      </p>
    </section>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h2 className="text-base font-semibold tracking-tight">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-ink-2">{children}</div>
    </div>
  );
}
