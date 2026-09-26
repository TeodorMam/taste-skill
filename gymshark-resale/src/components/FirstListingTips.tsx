"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";

const STORAGE_KEY = "aktivbruk_onboarding_dismissed_v1";

const STEPS = [
  {
    emoji: "📸",
    title: "Bilder selger varen",
    body: "Ta 3–5 bilder i dagslys, mot en ren bakgrunn. Vis fronten, baksiden, eventuelle merker eller slitasje. Det første bildet blir cover.",
    tip: "Tips: Brett ut plagget på sengen, det er enkelt og ser ryddig ut.",
  },
  {
    emoji: "💸",
    title: "Riktig pris = rask salg",
    body: "Sjekk hva lignende plagg går for på Aktivbruk og Finn. Brukt godt selger best på 30–50 % av nypris. Hoodier og tights går raskest.",
    tip: "Tips: Sett gjerne litt over det du forventer, folk forhandler.",
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
        className="flex w-full items-center justify-between rounded-sm border border-olive/30 bg-olive/5 px-4 py-3 text-left text-sm text-ink-2 transition hover:border-olive/60"
      >
        <span className="flex items-center gap-2">
          <span className="text-lg">✨</span>
          <span className="font-medium text-olive-press">
            Første gang? Se 3 raske tips
          </span>
        </span>
        <span className="text-ink-3">›</span>
      </button>
    );
  }

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      onClick={dismiss}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md overflow-hidden rounded-t-sheet bg-raised sm:rounded-sm"
      >
        <div className="bg-olive px-5 py-3 text-raised">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider opacity-80">
              Steg {step + 1} av {STEPS.length}
            </span>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Lukk"
              className="text-lg text-raised/70 transition hover:text-raised"
            >
              ✕
            </button>
          </div>
          <div className="mt-2 flex gap-1">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-sm transition ${
                  i <= step ? "bg-raised" : "bg-raised/30"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="space-y-3 px-5 py-6">
          <div className="text-4xl">{current.emoji}</div>
          <h3 className="text-xl font-semibold tracking-tight text-ink">
            {current.title}
          </h3>
          <p className="text-sm leading-relaxed text-ink-2">{current.body}</p>
          <p className="rounded-sm bg-ochre-soft px-3 py-2 text-xs text-ochre">
            {current.tip}
          </p>
        </div>

        <div className="flex gap-2 border-t border-line bg-paper px-5 py-3">
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="rounded-sm border border-line-2 bg-raised px-4 py-2 text-sm font-medium text-ink-2 hover:border-ink"
            >
              Tilbake
            </button>
          )}
          <button
            type="button"
            onClick={dismiss}
            className="rounded-sm px-4 py-2 text-sm text-ink-3 hover:text-ink"
          >
            Hopp over
          </button>
          <div className="flex-1" />
          <button
            type="button"
            onClick={() => (isLast ? dismiss() : setStep((s) => s + 1))}
            className="rounded-sm bg-ink px-5 py-2 text-sm font-medium text-raised hover:bg-ink"
          >
            {isLast ? "La oss starte" : "Neste"}
          </button>
        </div>
      </div>
    </div>
  );
}
