"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Icon, type IconName } from "@/components/Icon";

const STORAGE_KEY = "aktivbruk_onboarding_dismissed_v1";

const STEPS = [
  {
    icon: "kamera",
    title: "Bilder selger varen",
    body: "Ta 3–5 bilder i dagslys, mot en ren bakgrunn. Vis fronten, baksiden, eventuelle merker eller slitasje. Det første bildet blir cover.",
    tip: "Tips: Brett ut plagget på sengen, det er enkelt og ser ryddig ut.",
  },
  {
    icon: "bud",
    title: "Riktig pris = rask salg",
    body: "Sjekk hva lignende plagg går for på Aktivbruk og Finn. Brukt godt selger best på 30–50 % av nypris. Hoodier og tights går raskest.",
    tip: "Tips: Sett gjerne litt over det du forventer, folk forhandler.",
  },
  {
    icon: "rediger",
    title: "Ærlig beskrivelse bygger tillit",
    body: "Nevn størrelse, hvor mye du har brukt det, og eventuelle feil. Kjøpere belønner ærlighet med raske svar og gode vurderinger.",
    tip: "Tips: Nevn høyden din om plagget passer en spesifikk størrelse.",
  },
] satisfies { icon: IconName; title: string; body: string; tip: string }[];

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
        className="flex min-h-[52px] w-full items-center justify-between border-y border-line text-left text-[15px] text-ink hover:bg-ink/5"
      >
        <span className="flex items-center gap-3">
          <Icon name="tips" size={20} className="text-olive" />
          <span className="font-[620]">
            Første gang? Se 3 raske tips
          </span>
        </span>
        <Icon name="chevron-h" size={18} className="text-ink-3" />
      </button>
    );
  }

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/35 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      onClick={dismiss}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[420px] overflow-hidden rounded-t-sheet bg-raised sm:rounded-sheet"
      >
        <div className="px-5 pt-3 sm:px-6">
          <div className="flex items-center justify-between">
            <span className="num text-[13px] font-medium text-ink-3">
              Steg {step + 1} av {STEPS.length}
            </span>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Lukk"
              className="-mr-3 flex h-11 w-11 items-center justify-center text-ink hover:bg-ink/5"
            >
              <Icon name="kryss" size={20} />
            </button>
          </div>
          <div className="mt-1 flex gap-1">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-0.5 flex-1 transition-colors ${
                  i <= step ? "bg-ink" : "bg-line"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="space-y-3 px-5 py-6 sm:px-6">
          <Icon name={current.icon} size={28} className="text-olive" />
          <h3 className="text-[26px] font-[680] leading-[1.08] text-ink [font-stretch:80%]">
            {current.title}
          </h3>
          <p className="text-[15px] leading-[1.55] text-ink-2">{current.body}</p>
          <p className="rounded-sm bg-ochre-soft px-3 py-2 text-[13px] text-ochre">
            {current.tip}
          </p>
        </div>

        <div className="flex items-center gap-4 px-5 pb-8 pt-2 sm:px-6 sm:pb-6">
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="tbtn"
            >
              Tilbake
            </button>
          )}
          <button
            type="button"
            onClick={dismiss}
            className="tbtn font-medium text-ink-2"
          >
            Hopp over
          </button>
          <div className="flex-1" />
          <button
            type="button"
            onClick={() => (isLast ? dismiss() : setStep((s) => s + 1))}
            className="btn btn-ink"
          >
            {isLast ? "La oss starte" : "Neste"}
          </button>
        </div>
      </div>
    </div>
  );
}
