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
        router.replace("/login?next=/sell");
        return;
      }

      if (fromStripe) {
        setStep("success");
        return;
      }

      const res = await fetch("/api/stripe/connect");
      const json = await res.json() as { charges_enabled: boolean; account_id: string | null };

      if (json.charges_enabled) {
        router.replace("/post");
        return;
      }

      setStep("intro");
    }

    void init();
  }, [router, searchParams]);

  async function handleConnect() {
    setConnecting(true);
    try {
      const res = await fetch("/api/stripe/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnPath: "/sell?stripe=return" }),
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
    return <p className="py-10 text-sm text-stone-500">Laster…</p>;
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
            <li key={b} className="flex items-center gap-3 text-sm text-stone-700">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#5a6b32] text-[10px] font-bold text-white">
                ✓
              </span>
              {b}
            </li>
          ))}
        </ul>

        <button
          onClick={() => setStep("connect")}
          className="w-full rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-stone-50 hover:bg-black"
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
            className="mb-4 text-sm text-stone-500 hover:text-black"
          >
            ← Tilbake
          </button>
          <h1 className="text-2xl font-semibold tracking-tight">Koble til Stripe</h1>
          <p className="mt-2 text-sm leading-relaxed text-stone-600">
            For å motta betaling må du koble til Stripe. Det tar ca. 2 minutter.
          </p>
        </div>

        <div className="space-y-3 text-sm text-stone-700">
          <p>
            Du trenger ikke ha et firma.<br />
            Velg det som passer best — dette gjelder også privatpersoner.
          </p>
          <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
            <p className="mb-1 font-medium text-stone-800">Har du ikke nettside?</p>
            <p className="text-stone-600">
              Velg <strong>«Produktbeskrivelse»</strong> og skriv f.eks:<br />
              <span className="italic">«Jeg selger brukte treningsklær via Aktivbruk»</span>
            </p>
          </div>
        </div>

        <button
          onClick={handleConnect}
          disabled={connecting}
          className="w-full rounded-full bg-[#5a6b32] px-5 py-3 text-sm font-medium text-white hover:bg-[#435022] disabled:opacity-50"
        >
          {connecting ? "Sender til Stripe…" : "Koble til Stripe →"}
        </button>
      </section>
    );
  }

  return (
    <section className="max-w-sm space-y-5">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <p className="text-4xl">✅</p>
        <h1 className="mt-3 text-xl font-semibold tracking-tight text-emerald-900">
          Klar til å selge
        </h1>
        <p className="mt-1 text-sm text-emerald-700">
          Stripe-kontoen din er koblet til. Du kan nå ta imot betaling.
        </p>
      </div>
      <Link
        href="/post"
        className="block w-full rounded-full bg-stone-900 px-5 py-3 text-center text-sm font-medium text-stone-50 hover:bg-black"
      >
        Legg ut din første annonse
      </Link>
    </section>
  );
}
