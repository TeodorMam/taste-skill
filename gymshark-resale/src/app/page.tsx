import Link from "next/link";

const SHORTCUTS: { label: string; href: string }[] = [
  { label: "Nyeste", href: "/browse" },
  { label: "Under 200 kr", href: "/browse?price=u200" },
  { label: "Oslo", href: "/browse?location=Oslo" },
  { label: "Størrelse S", href: "/browse?size=S" },
  { label: "Størrelse M", href: "/browse?size=M" },
  { label: "Gymshark", href: "/browse?brand=Gymshark" },
  { label: "Nike", href: "/browse?brand=Nike" },
  { label: "Lululemon", href: "/browse?brand=Lululemon" },
  { label: "Som ny", href: "/browse?condition=Som+ny" },
];

export default function HomePage() {
  return (
    <div className="space-y-14 py-10 sm:py-16">
      <section className="flex flex-col items-start gap-6">
        <span className="rounded-full border border-[#5a6b32]/30 bg-[#5a6b32]/5 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-[#5a6b32]">
          Treningsklær · Norge
        </span>
        <h1 className="text-5xl font-semibold tracking-tight text-stone-900 sm:text-6xl">
          Brukte treningsklær, <br className="hidden sm:inline" />
          <span className="text-[#5a6b32]">bedre priser.</span>
        </h1>
        <p className="max-w-xl text-base text-stone-600 sm:text-lg">
          Kjøp og selg brukte treningsklær fra Gymshark, Nike, Lululemon, Alphalete
          og flere. Ett minutt å legge ut — gratis å bruke.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/post"
            className="rounded-full bg-stone-900 px-6 py-3 text-sm font-medium text-stone-50 hover:bg-black"
          >
            Legg ut vare
          </Link>
          <Link
            href="/browse"
            className="rounded-full border border-stone-300 bg-white px-6 py-3 text-sm font-medium text-stone-900 hover:border-stone-500"
          >
            Utforsk
          </Link>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-medium uppercase tracking-wider text-stone-500">
          Hopp rett inn
        </h2>
        <div className="-mx-4 overflow-x-auto px-4">
          <div className="flex gap-2 pb-1">
            {SHORTCUTS.map((s) => (
              <Link
                key={s.label}
                href={s.href}
                className="shrink-0 rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 transition hover:border-[#5a6b32] hover:text-[#5a6b32]"
              >
                {s.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 rounded-2xl border border-stone-200 bg-white p-6 sm:grid-cols-3 sm:p-8">
        <Highlight
          title="Trygt og enkelt"
          body="Chat direkte med selger i appen. Ingen skjulte gebyrer."
        />
        <Highlight
          title="Lokalt i Norge"
          body="Finn varer i byen din — møtes, eller send via Posten."
        />
        <Highlight
          title="Spar og gjenbruk"
          body="Gi treningstøyet et nytt liv og kjøp til brøkdelen av pris."
        />
      </section>
    </div>
  );
}

function Highlight({ title, body }: { title: string; body: string }) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-semibold text-stone-900">{title}</p>
      <p className="text-sm text-stone-600">{body}</p>
    </div>
  );
}
