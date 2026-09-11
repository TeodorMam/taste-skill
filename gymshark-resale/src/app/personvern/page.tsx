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
        <p className="mt-2 text-sm text-stone-500">Sist oppdatert: mai 2025</p>
      </div>

      <p className="text-sm leading-relaxed text-stone-600">
        Aktivbruk («vi», «oss») er behandlingsansvarlig for personopplysningene dine. Denne erklæringen forklarer hvilke opplysninger vi samler inn, hvorfor, og hvilke rettigheter du har. Vi følger EUs personvernforordning (GDPR) slik den er gjennomført i norsk rett.
      </p>

      <Block title="1. Behandlingsansvarlig">
        <p>Aktivbruk, drevet av Teodor Mamelund, Norge.<br />Kontakt: <a href="mailto:kontakt@aktivbruk.com" className="underline underline-offset-2 hover:text-stone-900">kontakt@aktivbruk.com</a></p>
      </Block>

      <Block title="2. Hvilke opplysninger samler vi inn?">
        <Table rows={[
          ["Konto", "E-postadresse, passord (kryptert), profilinformasjon (visningsnavn, bilde, sted, bio)"],
          ["Annonser", "Bilder, beskrivelse, pris, kategori, størrelse, tilstand"],
          ["Ordre og betaling", "Ordredetaljer, betalingsstatus, leveringsinformasjon. Kortdata håndteres utelukkende av Stripe — vi lagrer ikke kortopplysninger"],
          ["Meldinger", "Innholdet i chat mellom kjøper og selger"],
          ["Aktivitet", "Sist sett, varsler, leste meldinger"],
          ["Teknisk", "IP-adresse, nettlesertype — brukes til sikkerhet og feilsøking"],
        ]} />
      </Block>

      <Block title="3. Hvorfor behandler vi opplysningene?">
        <Table rows={[
          ["Levere tjenesten", "Opprette konto, vise annonser, gjennomføre kjøp og salg", "Avtale (GDPR art. 6b)"],
          ["Betaling og utbetaling", "Prosessere betaling via Stripe, utbetale til selger", "Avtale (GDPR art. 6b)"],
          ["Kommunikasjon", "Sende e-postvarsler om ordre, levering og tvister. Vi sender kun e-post som er nødvendig for å levere tjenesten — ikke markedsføring uten samtykke.", "Avtale (GDPR art. 6b)"],
          ["Sikkerhet og misbruk", "Oppdage og forebygge svindel og ulovlig aktivitet", "Berettiget interesse (GDPR art. 6f)"],
          ["Lovpålagte krav", "Regnskapsplikt og andre rettslige forpliktelser", "Rettslig forpliktelse (GDPR art. 6c)"],
        ]} cols={["Formål", "Beskrivelse", "Rettslig grunnlag"]} />
      </Block>

      <Block title="4. Deling med tredjeparter">
        <p>Vi deler kun opplysninger med tredjeparter der det er nødvendig for å levere tjenesten:</p>
        <ul className="mt-2 space-y-2">
          <li><strong>Stripe</strong> — betalingsbehandling og utbetalinger til selgere. Stripe er selvstendig behandlingsansvarlig for betalingsdata. <a href="https://stripe.com/en-no/privacy" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-stone-900">Stripes personvernpolicy ↗</a></li>
          <li><strong>Supabase</strong> — lagring av brukerdata og innhold. Dataene lagres i EU (Frankfurt). <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-stone-900">Supabase personvernpolicy ↗</a></li>
          <li><strong>Resend</strong> — utsending av transaksjons-e-poster. <a href="https://resend.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-stone-900">Resends personvernpolicy ↗</a></li>
        </ul>
        <p className="mt-2">Vi selger aldri personopplysninger til tredjeparter.</p>
      </Block>

      <Block title="5. Lagring og sletting">
        <ul className="space-y-1.5">
          <li>Kontoinformasjon lagres så lenge kontoen er aktiv.</li>
          <li>Ordre og transaksjonsdata lagres i 5 år av regnskapsmessige hensyn.</li>
          <li>Meldinger lagres i 2 år etter siste aktivitet i samtalen.</li>
          <li>Sletter du kontoen din, slettes personopplysningene dine innen 30 dager, med unntak av det vi er pålagt å beholde ved lov.</li>
        </ul>
      </Block>

      <Block title="6. Dine rettigheter">
        <p>Etter GDPR har du rett til å:</p>
        <ul className="mt-2 space-y-1.5">
          <li><strong>Innsyn</strong> — be om en kopi av opplysningene vi har om deg.</li>
          <li><strong>Retting</strong> — be oss rette feilaktige opplysninger.</li>
          <li><strong>Sletting</strong> — be oss slette opplysningene dine («retten til å bli glemt»).</li>
          <li><strong>Begrensning</strong> — be oss begrense behandlingen i visse tilfeller.</li>
          <li><strong>Dataportabilitet</strong> — motta opplysningene dine i et maskinlesbart format.</li>
          <li><strong>Innsigelse</strong> — protestere mot behandling basert på berettiget interesse.</li>
        </ul>
        <p className="mt-2">Send henvendelser til <a href="mailto:kontakt@aktivbruk.com" className="underline underline-offset-2 hover:text-stone-900">kontakt@aktivbruk.com</a>. Vi svarer innen 30 dager.</p>
      </Block>

      <Block title="7. Informasjonskapsler (cookies)">
        <p>Vi bruker kun nødvendige informasjonskapsler for innlogging og sesjonshåndtering. Vi bruker ikke sporings- eller reklamecookies.</p>
      </Block>

      <Block title="8. Klage til Datatilsynet">
        <p>Mener du vi behandler opplysningene dine i strid med GDPR, kan du klage til <a href="https://www.datatilsynet.no" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-stone-900">Datatilsynet ↗</a>. Vi setter pris på om du kontakter oss først, slik at vi kan løse saken.</p>
      </Block>

      <Block title="9. Endringer">
        <p>Vi kan oppdatere denne erklæringen. Vesentlige endringer varsles per e-post. Datoen øverst på siden viser når erklæringen sist ble oppdatert.</p>
      </Block>

      <div className="rounded-2xl border border-stone-200 bg-white p-5">
        <p className="text-sm font-medium text-stone-800">Spørsmål om personvern?</p>
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
