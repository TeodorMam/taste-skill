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
        toast("Rapport sendt — vi ser på det");
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
        className="text-xs text-stone-400 hover:text-red-600 underline underline-offset-2 transition"
      >
        {label}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-t-2xl bg-white p-5 sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-1 text-base font-semibold">{label}</h2>
            <p className="mb-4 text-xs text-stone-500">
              {type === "listing"
                ? "Rapporter annonser som er ulovlige, misvisende eller bryter retningslinjene."
                : "Rapporter brukere som opptrer svindleraktig eller bryter retningslinjene."}
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Beskriv hva som er galt (valgfritt)"
              rows={3}
              className="block w-full resize-none rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-stone-500"
            />
            <div className="mt-3 flex gap-2">
              <button
                onClick={submit}
                disabled={submitting}
                className="flex-1 rounded-full bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {submitting ? "Sender…" : "Send rapport"}
              </button>
              <button
                onClick={() => { setOpen(false); setReason(""); }}
                className="rounded-full border border-stone-300 px-4 py-2.5 text-sm font-medium text-stone-600 hover:border-stone-500"
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
