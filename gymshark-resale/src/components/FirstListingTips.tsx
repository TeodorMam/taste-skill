"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";

const STORAGE_KEY = "aktivbruk_onboarding_dismissed_v1";

const STEPS = [
  {
    emoji: "📸",
    title: "Bilder selger varen",
    body: "Ta 3–5 bilder i dagslys, mot en ren bakgrunn. Vis fronten, baksiden, eventuelle merker eller slitasje. Det første bildet blir cover.",
    tip: "Tips: Brett ut plagget på sengen — det er enkelt og ser ryddig ut.",
  },
  {
    emoji: "💸",
    title: "Riktig pris = rask salg",
    body: "Sjekk hva lignende plagg går for på Aktivbruk og Finn. Brukt godt selger best på 30–50 % av nypris. Hoodier og tights går raskest.",
    tip: "Tips: Sett gjerne litt over det du forventer — folk forhandler.",
  },
  {
    emoji: "✍️",
    title: "Ærlig beskrivelse bygger tillit",
    body: "Nevn størrelse, hvor mye du har brukt det, og eventuelle feil. Kjøpere belønner ærlighet med raske svar og gode vurderinger.",
    tip: "Tips: Nevn høyden din om plagget passer en spesifikk størrelse.",
  },
] as const;

export function FirstListingTips({ userId }: { userId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [shouldShow, setShouldShow] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const dismissed = window.localStorage.getItem(STORAGE_KEY);
    if (dismissed === "1") {
      setShouldShow(false);
      return;
    }
    supabase
      .from("items")
      .select("id", { count: "exact", head: true })
      .eq("seller_id", userId)
      .then(({ count }) => {
        const isFirst = (count ?? 0) === 0;
        setShouldShow(isFirst);
        if (isFirst) setOpen(true);
      });
  }, [supabase, userId]);

  function dismiss() {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, "1");
    }
    setOpen(false);
  }

  if (!shouldShow) return null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setStep(0);
          setOpen(true);
        }}
        className="flex w-full items-center justify-between rounded-xl border border-[#5a6b32]/30 bg-[#5a6b32]/5 px-4 py-3 text-left text-sm text-stone-700 transition hover:border-[#5a6b32]/60"
      >
        <span className="flex items-center gap-2">
          <span className="text-lg">✨</span>
          <span className="font-medium text-[#3d4720]">
            Første gang? Se 3 raske tips
          </span>
        </span>
        <span className="text-stone-400">›</span>
      </button>
    );
  }

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      onClick={dismiss}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
      >
        <div className="bg-gradient-to-br from-[#5a6b32] to-[#3d4720] px-5 py-3 text-white">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider opacity-80">
              Steg {step + 1} av {STEPS.length}
            </span>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Lukk"
              className="text-lg text-white/70 transition hover:text-white"
            >
              ✕
            </button>
          </div>
          <div className="mt-2 flex gap-1">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition ${
                  i <= step ? "bg-white" : "bg-white/30"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="space-y-3 px-5 py-6">
          <div className="text-4xl">{current.emoji}</div>
          <h3 className="text-xl font-semibold tracking-tight text-stone-900">
            {current.title}
          </h3>
          <p className="text-sm leading-relaxed text-stone-600">{current.body}</p>
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
            {current.tip}
          </p>
        </div>

        <div className="flex gap-2 border-t border-stone-100 bg-stone-50 px-5 py-3">
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:border-stone-500"
            >
              Tilbake
            </button>
          )}
          <button
            type="button"
            onClick={dismiss}
            className="rounded-full px-4 py-2 text-sm text-stone-500 hover:text-stone-800"
          >
            Hopp over
          </button>
          <div className="flex-1" />
          <button
            type="button"
            onClick={() => (isLast ? dismiss() : setStep((s) => s + 1))}
            className="rounded-full bg-stone-900 px-5 py-2 text-sm font-medium text-white hover:bg-black"
          >
            {isLast ? "La oss starte" : "Neste"}
          </button>
        </div>
      </div>
    </div>
  );
}
