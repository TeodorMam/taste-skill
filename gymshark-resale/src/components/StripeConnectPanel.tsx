"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useToast } from "@/components/ToastProvider";

type Status = "loading" | "none" | "pending" | "active";

export function StripeConnectPanel() {
  const [status, setStatus] = useState<Status>("loading");
  const [connecting, setConnecting] = useState(false);
  const toast = useToast();
  const searchParams = useSearchParams();

  useEffect(() => {
    fetchStatus();
    if (searchParams.get("stripe") === "return") {
      toast("Kobler til Stripe — dette tar noen sekunder…");
      // Re-check after a short delay to catch webhook sync
      const t = setTimeout(fetchStatus, 4000);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchStatus() {
    const res = await fetch("/api/stripe/connect");
    if (!res.ok) { setStatus("none"); return; }
    const json = await res.json() as { charges_enabled: boolean; account_id: string | null };
    if (!json.account_id) setStatus("none");
    else if (json.charges_enabled) setStatus("active");
    else setStatus("pending");
  }

  async function handleConnect() {
    setConnecting(true);
    const res = await fetch("/api/stripe/connect", { method: "POST" });
    const json = await res.json() as { url?: string; error?: string };
    if (json.url) {
      window.location.href = json.url;
    } else {
      toast(json.error ?? "Noe gikk galt");
      setConnecting(false);
    }
  }

  if (status === "loading") return null;

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-stone-500">Selgerkonto</p>

      {status === "none" && (
        <div className="mt-3 space-y-3">
          <p className="text-sm text-stone-700">
            For å selge via Aktivbruk må du koble til en Stripe-konto. Stripe håndterer betaling og utbetaling trygt og sikkert.
          </p>
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="rounded-full bg-[#5a6b32] px-4 py-2 text-sm font-medium text-white hover:bg-[#435022] disabled:opacity-50"
          >
            {connecting ? "Sender til Stripe…" : "Koble til Stripe →"}
          </button>
        </div>
      )}

      {status === "pending" && (
        <div className="mt-3 space-y-3">
          <p className="text-sm text-stone-700">
            Stripe behandler informasjonen din. Fullfør verifiseringen for å aktivere betaling.
          </p>
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="rounded-full bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
          >
            {connecting ? "Sender til Stripe…" : "Fortsett verifisering →"}
          </button>
        </div>
      )}

      {status === "active" && (
        <div className="mt-3 space-y-1">
          <p className="text-sm font-medium text-emerald-700">✓ Selgerkonto aktivert</p>
          <p className="text-xs text-stone-500">Betalinger er aktivert. Utbetalinger skjer automatisk via Stripe Express-dashbordet ditt.</p>
          <a
            href="https://dashboard.stripe.com/express"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-xs font-medium text-[#5a6b32] underline underline-offset-2 hover:text-[#435022]"
          >
            Åpne Stripe-dashboard ↗
          </a>
        </div>
      )}
    </div>
  );
}
