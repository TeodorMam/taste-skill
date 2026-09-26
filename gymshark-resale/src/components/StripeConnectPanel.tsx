"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useToast } from "@/components/ToastProvider";
import { Icon } from "@/components/Icon";

type Status = "loading" | "none" | "pending" | "active";

export function StripeConnectPanel() {
  const [status, setStatus] = useState<Status>("loading");
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const toast = useToast();
  const searchParams = useSearchParams();

  useEffect(() => {
    fetchStatus();
    if (searchParams.get("stripe") === "return") {
      toast("Kobler til Stripe, dette tar noen sekunder…");
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
    try {
      const res = await fetch("/api/stripe/connect", { method: "POST" });
      const json = await res.json() as { url?: string; error?: string };
      if (json.url) {
        window.location.href = json.url;
      } else {
        toast(json.error ?? "Noe gikk galt");
        setConnecting(false);
      }
    } catch {
      toast("Noe gikk galt, prøv igjen");
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      const res = await fetch("/api/stripe/connect", { method: "DELETE" });
      const json = await res.json() as { error?: string };
      if (res.ok) {
        setStatus("none");
        toast("Stripe-konto koblet fra");
      } else {
        toast(json.error ?? "Noe gikk galt");
      }
    } catch {
      toast("Noe gikk galt, prøv igjen");
    } finally {
      setDisconnecting(false);
    }
  }

  if (status === "loading") return null;

  return (
    <div className="border-t border-ink pt-4">
      <p className="text-[13px] font-[620] text-ink-2">Selgerkonto</p>

      {status === "none" && (
        <div className="mt-3 space-y-4">
          <p className="text-sm text-ink-2">
            Sett opp selgerkonto for å motta betaling. Ett skjema med
            personlig info, ett med IBAN. Under 2 min.
          </p>
          <ol className="space-y-2.5">
            {[
              { n: "1", label: "Fyll inn navn, fødselsdato, adresse, telefon" },
              { n: "2", label: <>Legg inn <strong>IBAN</strong> (starter med NO)</> },
              { n: "3", label: "Ferdig, du er klar til å selge" },
            ].map(({ n, label }) => (
              <li key={n} className="flex items-start gap-2.5 text-sm text-ink-2">
                <span className="num flex h-5 w-5 shrink-0 items-center justify-center rounded-sm bg-ink text-xs font-semibold text-paper">
                  {n}
                </span>
                <span>{label}</span>
              </li>
            ))}
          </ol>
          <p className="flex gap-2 rounded-sm bg-olive-soft px-3 py-2 text-[13px] text-ink-2">
            <Icon name="tips" size={16} className="mt-px text-olive" />
            Bedriftsinfo har vi fylt ut for deg. Du skriver kun personlig info og IBAN.
          </p>
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="btn btn-olive"
          >
            {connecting ? "Sender til Stripe…" : <>Kom i gang <Icon name="pil-h" size={16} /></>}
          </button>
          <p className="text-xs text-ink-3">
            <span className="font-medium text-ink-3">Under 18?</span>{" "}
            Be en foresatt opprette utbetalingskontoen og motta pengene for deg.
          </p>
        </div>
      )}

      {status === "pending" && (
        <div className="mt-3 space-y-3">
          <p className="text-sm text-ink-2">
            Stripe behandler informasjonen din. Fullfør verifiseringen for å aktivere betaling.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="btn btn-sm bg-ochre text-raised hover:bg-ochre/90"
            >
              {connecting ? "Sender til Stripe…" : <>Fortsett verifisering <Icon name="pil-h" size={16} /></>}
            </button>
            {!confirmDisconnect ? (
              <button
                onClick={() => setConfirmDisconnect(true)}
                className="btn btn-quiet btn-sm"
              >
                Koble fra
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm text-ink-2">Er du sikker?</span>
                <button
                  onClick={() => { void handleDisconnect(); setConfirmDisconnect(false); }}
                  disabled={disconnecting}
                  className="btn btn-clayfill btn-sm"
                >
                  {disconnecting ? "Kobler fra…" : "Ja, koble fra"}
                </button>
                <button
                  onClick={() => setConfirmDisconnect(false)}
                  className="text-xs text-ink-3 hover:text-ink-2"
                >
                  Avbryt
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {status === "active" && (
        <div className="mt-3 space-y-1">
          <p className="flex items-center gap-1.5 text-sm font-[620] text-olive"><Icon name="hake" size={16} />Selgerkonto aktivert</p>
          <p className="text-xs text-ink-3">Betalinger er aktivert. Utbetalinger skjer automatisk via Stripe Express-dashbordet ditt.</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <a
              href="https://dashboard.stripe.com/express"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[13px] font-semibold text-ink underline underline-offset-2 hover:text-olive"
            >
              Åpne Stripe-dashboard <Icon name="ekstern" size={14} />
            </a>
            {!confirmDisconnect ? (
              <button
                onClick={() => setConfirmDisconnect(true)}
                className="text-xs text-ink-3 underline underline-offset-2 hover:text-ink-2"
              >
                Koble fra
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-ink-2">Er du sikker?</span>
                <button
                  onClick={() => { void handleDisconnect(); setConfirmDisconnect(false); }}
                  disabled={disconnecting}
                  className="text-xs font-medium text-clay hover:text-clay disabled:opacity-50"
                >
                  {disconnecting ? "Kobler fra…" : "Ja, koble fra"}
                </button>
                <button
                  onClick={() => setConfirmDisconnect(false)}
                  className="text-xs text-ink-3 hover:text-ink-2"
                >
                  Avbryt
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
