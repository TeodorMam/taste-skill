"use client";

import { useState } from "react";
import { useToast } from "@/components/ToastProvider";

type ReportType = "listing" | "user";

export function ReportButton({ type, targetId }: { type: ReportType; targetId: string }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, targetId, reason: reason.trim() }),
      });
      if (res.ok) {
        setOpen(false);
        setReason("");
        toast("Rapport sendt, vi ser på det");
      } else {
        toast("Noe gikk galt, prøv igjen");
      }
    } catch {
      toast("Noe gikk galt, prøv igjen");
    } finally {
      setSubmitting(false);
    }
  }

  const label = type === "listing" ? "Rapporter annonse" : "Rapporter bruker";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-ink-3 hover:text-clay underline underline-offset-2 transition"
      >
        {label}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 sm:items-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-t-sheet bg-raised p-5 sm:rounded-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-1 text-base font-semibold">{label}</h2>
            <p className="mb-4 text-xs text-ink-3">
              {type === "listing"
                ? "Rapporter annonser som er ulovlige, misvisende eller bryter retningslinjene."
                : "Rapporter brukere som opptrer svindleraktig eller bryter retningslinjene."}
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Beskriv hva som er galt (valgfritt)"
              rows={3}
              className="block w-full resize-none rounded-sm border border-line-2 bg-raised px-3 py-2 text-sm outline-none focus:border-ink"
            />
            <div className="mt-3 flex gap-2">
              <button
                onClick={submit}
                disabled={submitting}
                className="flex-1 rounded-sm bg-clay px-4 py-2.5 text-sm font-medium text-raised hover:bg-clay disabled:opacity-50"
              >
                {submitting ? "Sender…" : "Send rapport"}
              </button>
              <button
                onClick={() => { setOpen(false); setReason(""); }}
                className="rounded-sm border border-line-2 px-4 py-2.5 text-sm font-medium text-ink-2 hover:border-ink"
              >
                Avbryt
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
