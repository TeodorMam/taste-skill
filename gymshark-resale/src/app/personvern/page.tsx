import Link from "next/link";

export const metadata = {
  title: "Personvernerklæring — Aktivbruk",
  description: "Hvordan Aktivbruk samler inn, bruker og beskytter personopplysningene dine.",
};

export default function PersonvernPage() {
  return (
    <section className="max-w-xl space-y-8">
      <div>
        <p className="mb-4 text-sm text-stone-500">
          <Link href="/browse" className="hover:text-black">← Tilbake</Link>
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Personvernerklæring</h1>
        <p className="mt-2 text-sm text-stone-500">Sist oppdatert: september 2026</p>
      </div>

      <p className="text-sm leading-relaxed text-stone-600">
        Aktivbruk («vi», «oss») er behandlingsansvarlig for personopplysningene dine.
        Denne erklæringen forklarer hvilke opplysninger vi samler inn, hvorfor vi
        behandler dem, hvordan de brukes, og hvilke rettigheter du har. Vi følger
        EUs personvernforordning (GDPR) slik den er gjennomført i norsk rett.
      </p>

      <Block title="1. Behandlingsansvarlig">
        <p>
          Aktivbruk, drevet av Teodor Mamelund, Norge.<br />
          Kontakt:{" "}
          <a
            href="mailto:kontakt@aktivbruk.com"
            className="underline underline-offset-2 hover:text-stone-900"
          >
            kontakt@aktivbruk.com
          </a>
        </p>
      </Block>

      <Block title="2. Hvilke opplysninger samler vi inn?">
        <p>
          Vi samler inn og behandler opplysninger som er nødvendige for å tilby
          Aktivbruk, gjennomføre kjøp og salg og holde tjenesten trygg.
        </p>
        <Table
          cols={["Kategori", "Opplysninger"]}
          rows={[
            [
              "Konto",
              "E-postadresse, passord (lagret som sikker hash), profilinformasjon som visningsnavn, profilbilde, sted og bio",
            ],
            [
              "Annonser",
              "Bilder, beskrivelse, pris, kategori, merke, størrelse, tilstand og annen informasjon du legger inn",
            ],
            [
              "Ordre og betaling",
              "Ordredetaljer, betalingsstatus, leveringsinformasjon og informasjon som er nødvendig for å gjennomføre kjøp, salg og utbetalinger. Kortopplysninger håndteres av Stripe og lagres ikke av Aktivbruk",
            ],
            [
              "Meldinger",
              "Innholdet i chat mellom kjøper og selger",
            ],
            [
              "Aktivitet",
              "Informasjon om innlogging og brukerøkter, samt nødvendige opplysninger knyttet til varsler og leste meldinger",
            ],
            [
              "Teknisk",
              "IP-adresse, nettleser- og enhetsinformasjon samt andre tekniske opplysninger som er nødvendige for sikkerhet, drift og feilsøking",
            ],
          ]}
        />
        <p>
          Vi samler ikke inn mer personopplysninger enn det som er nødvendig for
          de formålene som er beskrevet i denne erklæringen.
        </p>
      </Block>

      <Block title="3. Hvorfor behandler vi opplysningene?">
        <Table
          cols={["Formål", "Beskrivelse", "Rettslig grunnlag"]}
          rows={[
            [
              "Levere tjenesten",
              "Opprette og administrere kontoer, vise og administrere annonser, tilby chat og gjøre det mulig å kjøpe og selge varer",
              "Avtale (GDPR art. 6 nr. 1 bokstav b)",
            ],
            [
              "Betaling og utbetaling",
              "Gjennomføre betalinger, håndtere ordre og utbetale penger til selgere gjennom Stripe",
              "Avtale (GDPR art. 6 nr. 1 bokstav b) og, der det er relevant, rettslig forpliktelse",
            ],
            [
              "Kommunikasjon",
              "Sende nødvendige e-poster og varsler om blant annet konto, kjøp, salg, betaling, levering, meldinger og tvister. Vi sender ikke markedsførings-e-post uten nødvendig samtykke",
              "Avtale (GDPR art. 6 nr. 1 bokstav b)",
            ],
            [
              "Sikkerhet og misbruk",
              "Oppdage og forebygge svindel, misbruk, ulovlig aktivitet og sikkerhetshendelser, samt sikre og feilsøke tjenesten",
              "Berettiget interesse (GDPR art. 6 nr. 1 bokstav f)",
            ],
            [
              "Lovpålagte krav",
              "Oppfylle regnskaps-, bokførings- og andre rettslige forpliktelser",
              "Rettslig forpliktelse (GDPR art. 6 nr. 1 bokstav c)",
            ],
          ]}
        />
      </Block>

      <Block title="4. Deling med tredjeparter">
        <p>
          Vi deler kun personopplysninger med tredjeparter når det er nødvendig
          for å levere Aktivbruk, gjennomføre betalinger og utbetalinger, sende
          nødvendige e-poster eller oppfylle våre rettslige forpliktelser.
        </p>
        <ul className="mt-2 space-y-2">
          <li>
            <strong>Stripe</strong> – brukes til betalingsbehandling og
            utbetalinger til selgere. Stripe kan behandle personopplysninger
            både som databehandler og som selvstendig behandlingsansvarlig,
            avhengig av hvilken behandling det gjelder. Aktivbruk lagrer ikke
            kortopplysninger.{" "}
            <a
              href="https://stripe.com/en-no/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-stone-900"
            >
              Stripes personvernpolicy ↗
            </a>
          </li>
          <li>
            <strong>Supabase</strong> – brukes til autentisering, lagring av
            brukerdata, annonser, meldinger, bilder og annen nødvendig
            infrastruktur. Aktivbruk-prosjektet er plassert i Supabase sin West
            EU-region i Irland (eu-west-1).{" "}
            <a
              href="https://supabase.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-stone-900"
            >
              Supabase personvernpolicy ↗
            </a>
          </li>
          <li>
            <strong>Resend</strong> – brukes til utsending av nødvendige
            transaksjons- og tjeneste-e-poster. Resend kan behandle blant annet
            e-postadresser, e-postinnhold og leveringsinformasjon. Resend
            opplyser at kundedata lagres i USA og at de bruker relevante
            mekanismer for overføring av personopplysninger fra EU/EØS.{" "}
            <a
              href="https://resend.com/legal/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-stone-900"
            >
              Resends personvernpolicy ↗
            </a>
          </li>
        </ul>
        <p className="mt-2">
          Når personopplysninger behandles utenfor EU/EØS, sørger vi for at
          behandlingen skjer i samsvar med kravene i personvernregelverket og at
          det finnes et gyldig overføringsgrunnlag.
        </p>
        <p>Vi selger aldri personopplysninger til tredjeparter.</p>
      </Block>

      <Block title="5. Lagring og sletting">
        <p>
          Vi lagrer personopplysninger så lenge det er nødvendig for formålet de
          ble samlet inn for, eller så lenge vi er juridisk forpliktet til å
          oppbevare dem.
        </p>
        <ul className="mt-2 space-y-1.5">
          <li>Kontoinformasjon lagres så lenge kontoen er aktiv.</li>
          <li>
            Annonser og bilder lagres så lenge de er nødvendige for å tilby og
            administrere tjenesten og håndtere kjøp og salg.
          </li>
          <li>
            Ordre- og transaksjonsdata kan lagres etter at en handel er
            avsluttet dersom det er nødvendig for å dokumentere handelen,
            håndtere eventuelle tvister eller oppfylle regnskapsmessige eller
            andre lovpålagte krav.
          </li>
          <li>
            Meldinger lagres så lenge det er nødvendig for å tilby chatfunksjonen
            og for å kunne håndtere blant annet tvister, misbruk og henvendelser
            knyttet til tjenesten.
          </li>
        </ul>
        <p className="mt-2">
          Du kan slette kontoen din direkte fra profilsiden på Aktivbruk.
        </p>
        <p>
          Når du sletter kontoen, sletter vi personopplysninger som ikke lenger
          er nødvendige å beholde. Opplysninger som vi er juridisk forpliktet
          til å oppbevare, kan beholdes så lenge loven krever det.
        </p>
        <p>Vi forsøker å unngå å lagre personopplysninger lenger enn nødvendig.</p>
      </Block>

      <Block title="6. Dine rettigheter">
        <p>Etter GDPR har du rett til å:</p>
        <ul className="mt-2 space-y-1.5">
          <li>
            <strong>Innsyn</strong> – be om en kopi av personopplysningene vi
            behandler om deg.
          </li>
          <li>
            <strong>Retting</strong> – be oss rette opplysninger som er feil
            eller ufullstendige.
          </li>
          <li>
            <strong>Sletting</strong> – i enkelte tilfeller be oss slette
            personopplysningene dine («retten til å bli glemt»). Denne retten
            gjelder ikke i alle tilfeller, blant annet når vi er juridisk
            forpliktet til å oppbevare enkelte opplysninger.
          </li>
          <li>
            <strong>Begrensning</strong> – i enkelte tilfeller be oss begrense
            behandlingen av personopplysningene dine.
          </li>
          <li>
            <strong>Dataportabilitet</strong> – i enkelte tilfeller motta
            personopplysninger du selv har gitt oss i et strukturert og
            maskinlesbart format.
          </li>
          <li>
            <strong>Innsigelse</strong> – i enkelte tilfeller protestere mot
            behandling som skjer på grunnlag av vår berettigede interesse.
          </li>
        </ul>
        <p className="mt-2">
          Send henvendelser om personvern til{" "}
          <a
            href="mailto:kontakt@aktivbruk.com"
            className="underline underline-offset-2 hover:text-stone-900"
          >
            kontakt@aktivbruk.com
          </a>
          .
        </p>
        <p>
          Vi behandler slike henvendelser uten ugrunnet opphold og normalt
          senest innen én måned. I enkelte tilfeller kan fristen forlenges i
          samsvar med personvernregelverket.
        </p>
      </Block>

      <Block title="7. Informasjonskapsler (cookies)">
        <p>
          Vi bruker kun nødvendige informasjonskapsler for innlogging og
          sesjonshåndtering.
        </p>
        <p>
          Vi bruker per i dag ikke Google Analytics, Vercel Analytics, Meta
          Pixel eller andre sporings- og reklamecookies.
        </p>
        <p>
          Nødvendige informasjonskapsler brukes for at Aktivbruk skal fungere
          som tiltenkt, og kan ikke slås av gjennom et vanlig samtykkevalg uten
          at dette kan påvirke funksjonaliteten i tjenesten.
        </p>
      </Block>

      <Block title="8. Klage til Datatilsynet">
        <p>
          Hvis du mener at vi behandler personopplysningene dine i strid med
          personvernregelverket, kan du først kontakte oss på{" "}
          <a
            href="mailto:kontakt@aktivbruk.com"
            className="underline underline-offset-2 hover:text-stone-900"
          >
            kontakt@aktivbruk.com
          </a>
          , slik at vi får mulighet til å undersøke saken.
        </p>
        <p>
          Du har også rett til å klage til Datatilsynet dersom du mener at
          behandlingen av personopplysningene dine ikke er i samsvar med
          regelverket.{" "}
          <a
            href="https://www.datatilsynet.no"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-stone-900"
          >
            Datatilsynet ↗
          </a>
        </p>
      </Block>

      <Block title="9. Endringer">
        <p>
          Vi kan oppdatere denne personvernerklæringen dersom måten vi behandler
          personopplysninger på endres, eller dersom det skjer endringer i
          relevant lovgivning.
        </p>
        <p>
          Ved vesentlige endringer vil vi informere deg på en egnet måte, for
          eksempel via e-post eller på Aktivbruk.
        </p>
        <p>
          Den nyeste versjonen av personvernerklæringen er alltid tilgjengelig
          på denne siden. Datoen øverst viser når erklæringen sist ble oppdatert.
        </p>
      </Block>

      <div className="rounded-2xl border border-stone-200 bg-white p-5">
        <p className="text-sm font-medium text-stone-800">Spørsmål om personvern?</p>
        <p className="mt-1 text-sm text-stone-600">
          Ta kontakt på{" "}
          <a
            href="mailto:kontakt@aktivbruk.com"
            className="font-medium underline underline-offset-2 hover:text-stone-900"
          >
            kontakt@aktivbruk.com
          </a>
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

function Table({
  rows,
  cols,
}: {
  rows: string[][];
  cols?: string[];
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-stone-200">
      <table className="w-full text-xs">
        {cols && (
          <thead className="bg-stone-50">
            <tr>
              {cols.map((c) => (
                <th key={c} className="px-3 py-2 text-left font-medium text-stone-700">{c}</th>
              ))}
            </tr>
          </thead>
        )}
        <tbody className="divide-y divide-stone-100">
          {rows.map((row, i) => (
            <tr key={i} className="bg-white">
              {row.map((cell, j) => (
                <td key={j} className={`px-3 py-2 text-stone-600 align-top ${j === 0 ? "font-medium text-stone-800 whitespace-nowrap" : ""}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
