"use client";

import { useState } from "react";
import { type Item, formatPrice } from "@/lib/supabase";
import { Icon } from "@/components/Icon";
import { useSwipeToClose } from "@/hooks/useSwipeToClose";

export function BidModal({
  item,
  onClose,
  onSubmit,
  submitting,
}: {
  item: Item;
  onClose: () => void;
  onSubmit: (amount: number) => Promise<void>;
  submitting: boolean;
}) {
  const defaultAmount = Math.round((item.price * 0.9) / 10) * 10 || item.price;
  const [raw, setRaw] = useState(String(defaultAmount));
  const { sheetRef, sheetStyle, backdropStyle } = useSwipeToClose(onClose);
  const amount = parseInt(raw.replace(/\D/g, ""), 10) || 0;

  const quickAmounts = [0.7, 0.8, 0.9]
    .map((r) => Math.round((item.price * r) / 10) * 10)
    .filter((v, i, arr) => v > 0 && v < item.price && arr.indexOf(v) === i);

  const ratio = amount > 0 ? amount / item.price : 0;
  const helperText =
    ratio >= 0.9 ? "Sterkt bud – øker sjansen for rask aksept" :
    ratio > 0 && ratio < 0.7 ? "Lavt bud – kan bli avslått" :
    null;
  const helperColor = ratio >= 0.9 ? "text-olive" : "text-ochre";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-ink/35" style={backdropStyle} />
      <div
        ref={sheetRef}
        style={sheetStyle}
        className="relative w-full rounded-t-sheet bg-raised px-5 pb-10 pt-3 sm:max-w-[420px] sm:rounded-sheet sm:px-6 sm:pb-6 sm:pt-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle (mobile only) */}
        <div className="mx-auto mb-5 h-1 w-10 rounded-sm bg-[#B3AFA2] sm:hidden" />

        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="text-[26px] leading-[1.08] text-ink">Gi et bud</h2>
            <p className="mt-1.5 text-sm text-ink-2">
              Selger kan godta eller avslå. Ingen betaling før aksept.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-mr-3 -mt-2 ml-3 flex h-11 w-11 shrink-0 items-center justify-center text-ink hover:bg-ink/5"
            aria-label="Lukk"
          >
            <Icon name="kryss" size={20} />
          </button>
        </div>

        {/* Quick amounts */}
        {quickAmounts.length > 0 && (
          <div className="mb-4 flex gap-2">
            {quickAmounts.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setRaw(String(v))}
                className={`chip num flex-1 justify-center ${amount === v ? "chip-on" : ""}`}
              >
                {formatPrice(v)}
              </button>
            ))}
          </div>
        )}

        {/* Amount input */}
        <div className="mb-1">
          <label className="field-label">
            Ditt bud (kr)
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={raw}
            onChange={(e) => setRaw(e.target.value.replace(/\D/g, ""))}
            placeholder="F.eks. 300"
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            className="field num"
          />
        </div>
        <div className="mb-4 h-4">
          {helperText && (
            <p className={`text-[13px] ${helperColor}`}>{helperText}</p>
          )}
        </div>

        {/* Trust signals */}
        <div className="mb-5 space-y-2">
          <p className="flex items-center gap-2 text-[13px] text-ink-2"><Icon name="chat" size={16} />Budet sendes som melding i chat</p>
          <p className="flex items-center gap-2 text-[13px] text-ink-2"><Icon name="laas" size={16} />Ingen betaling før budet er akseptert</p>
        </div>

        <button
          type="button"
          onClick={() => amount > 0 && onSubmit(amount)}
          disabled={submitting || amount <= 0}
          className="btn btn-olive btn-lg w-full"
        >
          {submitting ? "Sender…" : "Send bud"}
        </button>
        <p className="mt-3 text-center text-xs leading-relaxed text-ink-3">
          Bud er ikke bindende – du betaler først hvis du velger å kjøpe etter aksept.
        </p>
      </div>
    </div>
  );
}
