import Link from "next/link";

export const metadata = {
  title: "Kjøperbeskyttelse, Aktivbruk",
  description:
    "Aktivbruk holder pengene dine trygge til du har bekreftet at varen er som forventet. Les om hvordan tvister og problemer håndteres.",
};

export default function KjoperbeskyttelsePage() {
  return (
    <section className="space-y-8 max-w-xl">
      <div>
        <p className="text-sm text-ink-3 mb-4">
          <Link href="/varer" className="hover:text-ink">← Tilbake</Link>
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Kjøperbeskyttelse</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-2">
          Når du kjøper på Aktivbruk, holdes pengene dine trygt hos Aktivbruk til du har bekreftet at alt er i orden. Selger får ikke utbetalt før du er fornøyd.
        </p>
      </div>

      <div className="rounded-sm border border-olive/30 bg-olive/5 p-5 space-y-2">
        <p className="font-semibold text-olive-press">Slik fungerer det</p>
        <ol className="space-y-2 text-sm text-ink-2 list-none">
          <li className="flex gap-3"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-sm bg-olive text-[11px] font-bold text-raised">1</span><span>Du betaler, pengene holdes hos Aktivbruk, ikke selger.</span></li>
          <li className="flex gap-3"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-sm bg-olive text-[11px] font-bold text-raised">2</span><span>Selger sender varen. Du får varsel når den er levert.</span></li>
          <li className="flex gap-3"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-sm bg-olive text-[11px] font-bold text-raised">3</span><span>Du har 48 timer på å bekrefte at alt er ok, eller melde et problem.</span></li>
          <li className="flex gap-3"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-sm bg-olive text-[11px] font-bold text-raised">4</span><span>Bekrefter du, utbetales pengene til selger. Melder du problem, settes pengene på vent og jeg ser på saken.</span></li>
        </ol>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Hva regnes som et problem?</h2>
        <p className="text-sm text-ink-2">Du kan melde problem hvis:</p>
        <ul className="space-y-3">
          {[
            { icon: "📦", title: "Varen kom ikke frem", desc: "Pakken er registrert som levert, men du har ikke mottatt noe." },
            { icon: "🔍", title: "Varen er vesentlig annerledes enn beskrevet", desc: "F.eks. feil størrelse, farge eller stand, og det ikke fremgikk av annonsen." },
            { icon: "💔", title: "Varen er skadet", desc: "Varen er ødelagt eller har skader som ikke ble oppgitt av selger." },
            { icon: "📭", title: "Varen ble aldri sendt", desc: "Selger markerte som sendt, men pakken dukker ikke opp." },
          ].map(({ icon, title, desc }) => (
            <li key={title} className="flex gap-3 rounded-sm border border-line bg-raised p-4">
              <span className="text-xl">{icon}</span>
              <div>
                <p className="text-sm font-medium text-ink">{title}</p>
                <p className="mt-0.5 text-xs text-ink-3">{desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Hva skjer når du melder et problem?</h2>
        <div className="space-y-3 text-sm text-ink-2">
          <p>Når du trykker <strong>«Meld problem»</strong> i dine ordre:</p>
          <ul className="space-y-2 pl-1">
            <li className="flex gap-2"><span>→</span><span>Betalingen settes på vent. Selger får ikke utbetalt mens saken er åpen.</span></li>
            <li className="flex gap-2"><span>→</span><span>Jeg ser på saken manuelt og tar kontakt med deg og selger om nødvendig.</span></li>
            <li className="flex gap-2"><span>→</span><span>Jeg gjør en vurdering basert på annonsen, kommunikasjonen og eventuell dokumentasjon.</span></li>
          </ul>
          <p className="text-ink-2">Det er <strong>Aktivbruk</strong> som tar den endelige avgjørelsen i en tvist, ikke kjøper eller selger alene.</p>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Hva dekkes ikke?</h2>
        <ul className="space-y-2 text-sm text-ink-2">
          {[
            "Angrer du på kjøpet uten at det er noe galt med varen.",
            "Varen er nøyaktig som beskrevet, men du liker den ikke.",
            "Du rapporterte ikke problemet innen 48 timer etter levering.",
            "Kjøp gjort utenfor Aktivbruk (f.eks. Vipps direkte til selger).",
          ].map((t) => (
            <li key={t} className="flex gap-2"><span className="text-ink-3">✕</span><span>{t}</span></li>
          ))}
        </ul>
      </div>

      <div className="rounded-sm border border-line bg-raised p-5 space-y-2">
        <p className="font-medium text-ink">Trenger du hjelp?</p>
        <p className="text-sm text-ink-2">Ta kontakt på <a href="mailto:kontakt@aktivbruk.com" className="font-medium underline underline-offset-2 hover:text-ink">kontakt@aktivbruk.com</a>, jeg svarer raskt.</p>
        <div className="pt-2">
          <Link href="/ordre" className="inline-block rounded-sm bg-ink px-5 py-2.5 text-sm font-medium text-paper hover:bg-ink">
            Se dine ordre
          </Link>
        </div>
      </div>
    </section>
  );
}
