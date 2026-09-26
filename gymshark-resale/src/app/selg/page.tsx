"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";

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
        <h1 className="text-3xl font-semibold tracking-tight">
          Tjen penger på klær du ikke bruker
        </h1>

        <ul className="space-y-3">
          {[
            "Legg ut på 1 minutt",
            "Trygg betaling via Stripe",
            "Pengene utbetales etter levering",
          ].map((b) => (
            <li key={b} className="flex items-center gap-3 text-sm text-ink-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-sm bg-olive text-[10px] font-bold text-raised">
                ✓
              </span>
              {b}
            </li>
          ))}
        </ul>

        <button
          onClick={() => setStep("connect")}
          className="w-full rounded-sm bg-ink px-5 py-3 text-sm font-medium text-paper hover:bg-ink"
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
            className="mb-4 text-sm text-ink-3 hover:text-ink"
          >
            ← Tilbake
          </button>
          <h1 className="text-2xl font-semibold tracking-tight">Sett opp selgerkonto</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-2">
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
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm bg-sunk text-xs font-semibold text-ink-2">
                {step}
              </span>
              <span className="pt-0.5">{text}</span>
            </li>
          ))}
        </ol>

        <p className="rounded-sm bg-olive/5 px-4 py-3 text-xs leading-relaxed text-ink-2">
          💡 Bedriftsinfo har vi fylt ut for deg. Du skriver kun personlig info og IBAN.
        </p>

        <button
          onClick={handleConnect}
          disabled={connecting}
          className="w-full rounded-sm bg-olive px-5 py-3 text-sm font-medium text-raised hover:bg-olive-press disabled:opacity-50"
        >
          {connecting ? "Sender til Stripe…" : "Fortsett →"}
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
      <div className="rounded-sm border border-olive/30 bg-olive-soft p-6 text-center">
        <p className="text-4xl">✅</p>
        <h1 className="mt-3 text-xl font-semibold tracking-tight text-olive">
          Klar til å selge
        </h1>
        <p className="mt-1 text-sm text-olive">
          Stripe-kontoen din er koblet til. Du kan nå ta imot betaling.
        </p>
      </div>
      <Link
        href="/ny-annonse"
        className="block w-full rounded-sm bg-ink px-5 py-3 text-center text-sm font-medium text-paper hover:bg-ink"
      >
        Legg ut din første annonse
      </Link>
    </section>
  );
}
