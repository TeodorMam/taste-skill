"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { Icon } from "@/components/Icon";

type Step = "loading" | "intro" | "connect" | "success";

export default function SellPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>("loading");
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    const fromStripe = searchParams.get("stripe") === "return";

    async function init() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/logg-inn?next=/selg");
        return;
      }

      // Always re-verify with Stripe, even on ?stripe=return. Users can
      // bail on onboarding partway and Stripe will still redirect them
      // back here, which used to falsely flash the "success" screen and
      // let them list a broken (unbuyable) item.
      const res = await fetch("/api/stripe/connect");
      const json = await res.json() as { charges_enabled: boolean; account_id: string | null };

      if (json.charges_enabled) {
        if (fromStripe) {
          setStep("success");
        } else {
          router.replace("/ny-annonse");
        }
        return;
      }

      // Not yet enabled, show either the intro (never started) or the
      // connect step (in-progress / needs to finish) so they can retry.
      setStep(json.account_id ? "connect" : "intro");
    }

    void init();
  }, [router, searchParams]);

  async function handleConnect() {
    setConnecting(true);
    try {
      const res = await fetch("/api/stripe/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnPath: "/selg?stripe=return" }),
      });
      const json = await res.json() as { url?: string; error?: string };
      if (json.url) {
        window.location.href = json.url;
      } else {
        setConnecting(false);
      }
    } catch {
      setConnecting(false);
    }
  }

  if (step === "loading") {
    return <p className="py-10 text-sm text-ink-3">Laster…</p>;
  }

  if (step === "intro") {
    return (
      <section className="max-w-sm space-y-8">
        <h1 className="text-[40px] leading-none">
          Tjen penger på klær du ikke bruker
        </h1>

        <ul className="space-y-3 border-t border-ink pt-3">
          {[
            "Legg ut på 1 minutt",
            "Trygg betaling via Stripe",
            "Pengene utbetales etter levering",
          ].map((b) => (
            <li key={b} className="flex items-center gap-3 border-b border-line pb-3 text-[15px] text-ink">
              <Icon name="hake" size={18} className="text-olive" />
              {b}
            </li>
          ))}
        </ul>

        <button
          onClick={() => setStep("connect")}
          className="btn btn-olive btn-lg w-full"
        >
          Kom i gang
        </button>
      </section>
    );
  }

  if (step === "connect") {
    return (
      <section className="max-w-sm space-y-6">
        <div>
          <button
            onClick={() => setStep("intro")}
            className="mb-4 -mt-2 inline-flex h-11 items-center gap-2 text-[15px] font-[550] text-ink-2 hover:text-ink"
          >
            <Icon name="pil-v" size={18} />
            Tilbake
          </button>
          <h1 className="text-[32px] leading-none">Sett opp selgerkonto</h1>
          <p className="mt-3 text-base leading-[1.55] text-ink-2">
            For å motta betaling. Ett skjema med personlig info, ett med IBAN. Under 2 min.
          </p>
        </div>

        <ol className="space-y-3">
          {[
            { step: "1", text: "Fyll inn navn, fødselsdato, adresse, telefon" },
            { step: "2", text: <>Legg inn <strong>IBAN</strong> (starter med NO)</> },
            { step: "3", text: "Ferdig, du er klar til å selge" },
          ].map(({ step, text }) => (
            <li key={step} className="flex items-start gap-3 text-sm text-ink-2">
              <span className="num flex h-6 w-6 shrink-0 items-center justify-center rounded-sm bg-ink text-xs font-semibold text-paper">
                {step}
              </span>
              <span className="pt-0.5">{text}</span>
            </li>
          ))}
        </ol>

        <p className="flex gap-2 rounded-sm bg-olive-soft px-4 py-3 text-[13px] leading-relaxed text-ink-2">
          <Icon name="tips" size={16} className="mt-px shrink-0 text-olive" />
          Bedriftsinfo har vi fylt ut for deg. Du skriver kun personlig info og IBAN.
        </p>

        <button
          onClick={handleConnect}
          disabled={connecting}
          className="btn btn-olive btn-lg w-full"
        >
          {connecting ? "Sender til Stripe…" : <>Fortsett <Icon name="pil-h" size={16} /></>}
        </button>

        <p className="text-xs text-ink-3">
          <span className="font-medium text-ink-3">Under 18?</span>{" "}
          Be en foresatt opprette utbetalingskontoen og motta pengene for deg.
        </p>
      </section>
    );
  }

  return (
    <section className="max-w-sm space-y-5">
      <div className="border-t border-ink pt-5">
        <Icon name="hake" size={28} className="text-olive" />
        <h1 className="mt-3 text-[40px] leading-none">
          Klar til å selge
        </h1>
        <p className="mt-3 text-base text-ink-2">
          Stripe-kontoen din er koblet til. Du kan nå ta imot betaling.
        </p>
      </div>
      <Link
        href="/ny-annonse"
        className="btn btn-olive btn-lg w-full"
      >
        Legg ut din første annonse
      </Link>
    </section>
  );
}
