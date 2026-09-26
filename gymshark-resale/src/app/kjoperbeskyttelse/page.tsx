import Link from "next/link";
import { BackLink } from "@/components/BackLink";
import { Icon } from "@/components/Icon";

export const metadata = {
  title: "Kjøperbeskyttelse, Aktivbruk",
  description:
    "Aktivbruk holder pengene dine trygge til du har bekreftet at varen er som forventet. Les om hvordan tvister og problemer håndteres.",
};

export default function KjoperbeskyttelsePage() {
  return (
    <section className="space-y-8 max-w-xl">
      <div>
        <div className="mb-4">
          <BackLink href="/varer">Tilbake</BackLink>
        </div>
        <h1 className="text-[40px] leading-none">Kjøperbeskyttelse</h1>
        <p className="mt-3 text-base leading-[1.55] text-ink-2">
          Når du kjøper på Aktivbruk, holdes pengene dine trygt hos Aktivbruk til du har bekreftet at alt er i orden. Selger får ikke utbetalt før du er fornøyd.
        </p>
      </div>

      <div className="space-y-3 border-t border-ink pt-4">
        <p className="flex items-center gap-2 text-[17px] font-[620] text-ink"><Icon name="skjold" size={20} className="text-olive" />Slik fungerer det</p>
        <ol className="list-none space-y-2.5 text-[15px] text-ink-2">
          <li className="flex gap-3"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-sm bg-ink text-xs font-semibold text-paper">1</span><span>Du betaler, pengene holdes hos Aktivbruk, ikke selger.</span></li>
          <li className="flex gap-3"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-sm bg-ink text-xs font-semibold text-paper">2</span><span>Selger sender varen. Du får varsel når den er levert.</span></li>
          <li className="flex gap-3"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-sm bg-ink text-xs font-semibold text-paper">3</span><span>Du har 48 timer på å bekrefte at alt er ok, eller melde et problem.</span></li>
          <li className="flex gap-3"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-sm bg-ink text-xs font-semibold text-paper">4</span><span>Bekrefter du, utbetales pengene til selger. Melder du problem, settes pengene på vent og jeg ser på saken.</span></li>
        </ol>
      </div>

      <div className="space-y-4">
        <h2 className="text-[26px] leading-[1.08]">Hva regnes som et problem?</h2>
        <p className="text-sm text-ink-2">Du kan melde problem hvis:</p>
        <ul className="border-t border-line">
          {[
            { icon: "pakke" as const, title: "Varen kom ikke frem", desc: "Pakken er registrert som levert, men du har ikke mottatt noe." },
            { icon: "soek" as const, title: "Varen er vesentlig annerledes enn beskrevet", desc: "F.eks. feil størrelse, farge eller stand, og det ikke fremgikk av annonsen." },
            { icon: "advarsel" as const, title: "Varen er skadet", desc: "Varen er ødelagt eller har skader som ikke ble oppgitt av selger." },
            { icon: "innboks-tom" as const, title: "Varen ble aldri sendt", desc: "Selger markerte som sendt, men pakken dukker ikke opp." },
          ].map(({ icon, title, desc }) => (
            <li key={title} className="flex gap-3 border-b border-line py-3.5">
              <Icon name={icon} size={20} className="mt-px text-ink-2" />
              <div>
                <p className="text-[15px] font-[620] text-ink">{title}</p>
                <p className="mt-0.5 text-[13px] text-ink-3">{desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-4">
        <h2 className="text-[26px] leading-[1.08]">Hva skjer når du melder et problem?</h2>
        <div className="space-y-3 text-sm text-ink-2">
          <p>Når du trykker <strong>«Meld problem»</strong> i dine ordre:</p>
          <ul className="space-y-2 pl-1">
            <li className="flex gap-2"><Icon name="pil-h" size={16} className="mt-0.5" /><span>Betalingen settes på vent. Selger får ikke utbetalt mens saken er åpen.</span></li>
            <li className="flex gap-2"><Icon name="pil-h" size={16} className="mt-0.5" /><span>Jeg ser på saken manuelt og tar kontakt med deg og selger om nødvendig.</span></li>
            <li className="flex gap-2"><Icon name="pil-h" size={16} className="mt-0.5" /><span>Jeg gjør en vurdering basert på annonsen, kommunikasjonen og eventuell dokumentasjon.</span></li>
          </ul>
          <p className="text-ink-2">Det er <strong>Aktivbruk</strong> som tar den endelige avgjørelsen i en tvist, ikke kjøper eller selger alene.</p>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-[26px] leading-[1.08]">Hva dekkes ikke?</h2>
        <ul className="space-y-2 text-sm text-ink-2">
          {[
            "Angrer du på kjøpet uten at det er noe galt med varen.",
            "Varen er nøyaktig som beskrevet, men du liker den ikke.",
            "Du rapporterte ikke problemet innen 48 timer etter levering.",
            "Kjøp gjort utenfor Aktivbruk (f.eks. Vipps direkte til selger).",
          ].map((t) => (
            <li key={t} className="flex gap-2"><Icon name="kryss" size={16} className="mt-0.5 text-ink-3" /><span>{t}</span></li>
          ))}
        </ul>
      </div>

      <div className="border-t border-ink pt-4 space-y-2">
        <p className="text-[17px] font-[620] text-ink">Trenger du hjelp?</p>
        <p className="text-sm text-ink-2">Ta kontakt på <a href="mailto:kontakt@aktivbruk.com" className="font-medium underline underline-offset-2 hover:text-ink">kontakt@aktivbruk.com</a>, jeg svarer raskt.</p>
        <div className="pt-2">
          <Link href="/ordre" className="btn btn-ink">
            Se dine ordre
          </Link>
        </div>
      </div>
    </section>
  );
}
