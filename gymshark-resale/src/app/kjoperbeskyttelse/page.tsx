import Link from "next/link";

export const metadata = {
  title: "Kjøperbeskyttelse — Aktivbruk",
  description:
    "Aktivbruk holder pengene dine trygge til du har bekreftet at varen er som forventet. Les om hvordan vi håndterer tvister og problemer.",
};

export default function KjoperbeskyttelsePage() {
  return (
    <section className="space-y-8 max-w-xl">
      <div>
        <p className="text-sm text-stone-500 mb-4">
          <Link href="/browse" className="hover:text-black">← Tilbake</Link>
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Kjøperbeskyttelse</h1>
        <p className="mt-2 text-sm leading-relaxed text-stone-600">
          Når du kjøper på Aktivbruk, holdes pengene dine trygt hos oss til du har bekreftet at alt er i orden. Selger får ikke utbetalt før du er fornøyd.
        </p>
      </div>

      <div className="rounded-2xl border border-[#5a6b32]/30 bg-[#5a6b32]/5 p-5 space-y-2">
        <p className="font-semibold text-[#435022]">Slik fungerer det</p>
        <ol className="space-y-2 text-sm text-stone-700 list-none">
          <li className="flex gap-3"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#5a6b32] text-[11px] font-bold text-white">1</span><span>Du betaler — pengene holdes hos Aktivbruk, ikke selger.</span></li>
          <li className="flex gap-3"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#5a6b32] text-[11px] font-bold text-white">2</span><span>Selger sender varen. Du får varsel når den er levert.</span></li>
          <li className="flex gap-3"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#5a6b32] text-[11px] font-bold text-white">3</span><span>Du har 48 timer på å bekrefte at alt er ok, eller melde et problem.</span></li>
          <li className="flex gap-3"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#5a6b32] text-[11px] font-bold text-white">4</span><span>Bekrefter du — utbetales pengene til selger. Melder du problem — settes pengene på vent og vi ser på saken.</span></li>
        </ol>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Hva regnes som et problem?</h2>
        <p className="text-sm text-stone-600">Du kan melde problem hvis:</p>
        <ul className="space-y-3">
          {[
            { icon: "📦", title: "Varen kom ikke frem", desc: "Pakken er registrert som levert, men du har ikke mottatt noe." },
            { icon: "🔍", title: "Varen er vesentlig annerledes enn beskrevet", desc: "F.eks. feil størrelse, farge eller stand — og det ikke fremgikk av annonsen." },
            { icon: "💔", title: "Varen er skadet", desc: "Varen er ødelagt eller har skader som ikke ble oppgitt av selger." },
            { icon: "📭", title: "Varen ble aldri sendt", desc: "Selger markerte som sendt, men pakken dukker ikke opp." },
          ].map(({ icon, title, desc }) => (
            <li key={title} className="flex gap-3 rounded-xl border border-stone-200 bg-white p-4">
              <span className="text-xl">{icon}</span>
              <div>
                <p className="text-sm font-medium text-stone-800">{title}</p>
                <p className="mt-0.5 text-xs text-stone-500">{desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Hva skjer når du melder et problem?</h2>
        <div className="space-y-3 text-sm text-stone-700">
          <p>Når du trykker <strong>«Meld problem»</strong> i dine ordre:</p>
          <ul className="space-y-2 pl-1">
            <li className="flex gap-2"><span>→</span><span>Betalingen settes på vent. Selger får ikke utbetalt mens saken er åpen.</span></li>
            <li className="flex gap-2"><span>→</span><span>Vi ser på saken manuelt og tar kontakt med deg og selger om nødvendig.</span></li>
            <li className="flex gap-2"><span>→</span><span>Vi gjør en vurdering basert på annonsen, kommunikasjonen og eventuell dokumentasjon.</span></li>
          </ul>
          <p className="text-stone-600">Det er <strong>Aktivbruk</strong> som tar den endelige avgjørelsen i en tvist — ikke kjøper eller selger alene.</p>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Hva dekkes ikke?</h2>
        <ul className="space-y-2 text-sm text-stone-600">
          {[
            "Angrer du på kjøpet uten at det er noe galt med varen.",
            "Varen er nøyaktig som beskrevet, men du liker den ikke.",
            "Du rapporterte ikke problemet innen 48 timer etter levering.",
            "Kjøp gjort utenfor Aktivbruk (f.eks. Vipps direkte til selger).",
          ].map((t) => (
            <li key={t} className="flex gap-2"><span className="text-stone-400">✕</span><span>{t}</span></li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-5 space-y-2">
        <p className="font-medium text-stone-800">Trenger du hjelp?</p>
        <p className="text-sm text-stone-600">Ta kontakt med oss på <a href="mailto:kontakt@aktivbruk.com" className="font-medium underline underline-offset-2 hover:text-stone-900">kontakt@aktivbruk.com</a> — vi svarer raskt.</p>
        <div className="pt-2">
          <Link href="/orders" className="inline-block rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-stone-50 hover:bg-black">
            Se dine ordre
          </Link>
        </div>
      </div>
    </section>
  );
}
