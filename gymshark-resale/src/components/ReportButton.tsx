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
        className="min-h-[36px] text-[13px] text-ink-2 underline decoration-1 underline-offset-[3px] hover:text-clay"
      >
        {label}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/35 sm:items-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-[420px] rounded-t-sheet bg-raised p-5 pb-8 sm:rounded-sheet sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-1.5 text-[26px] leading-[1.08]">{label}</h2>
            <p className="mb-4 text-sm text-ink-2">
              {type === "listing"
                ? "Rapporter annonser som er ulovlige, misvisende eller bryter retningslinjene."
                : "Rapporter brukere som opptrer svindleraktig eller bryter retningslinjene."}
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Beskriv hva som er galt (valgfritt)"
              rows={3}
              className="field resize-none"
            />
            <div className="mt-4 flex items-center gap-4">
              <button
                onClick={submit}
                disabled={submitting}
                className="btn flex-1 bg-clay text-raised hover:bg-clay/90"
              >
                {submitting ? "Sender…" : "Send rapport"}
              </button>
              <button
                onClick={() => { setOpen(false); setReason(""); }}
                className="tbtn px-2"
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
