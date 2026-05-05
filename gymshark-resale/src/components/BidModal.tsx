"use client";

import { useState } from "react";
import { type Item, formatPrice } from "@/lib/supabase";

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
  const amount = parseInt(raw.replace(/\D/g, ""), 10) || 0;

  const quickAmounts = [0.7, 0.8, 0.9]
    .map((r) => Math.round((item.price * r) / 10) * 10)
    .filter((v, i, arr) => v > 0 && v < item.price && arr.indexOf(v) === i);

  const ratio = amount > 0 ? amount / item.price : 0;
  const helperText =
    ratio >= 0.9 ? "Sterkt bud – øker sjansen for rask aksept" :
    ratio > 0 && ratio < 0.7 ? "Lavt bud – kan bli avslått" :
    null;
  const helperColor = ratio >= 0.9 ? "text-emerald-600" : "text-amber-600";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-full rounded-t-3xl bg-white px-5 pb-10 pt-4 shadow-xl sm:max-w-sm sm:rounded-3xl sm:pb-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle (mobile only) */}
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-stone-200 sm:hidden" />

        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-stone-900">Gi et bud</h2>
            <p className="mt-0.5 text-sm text-stone-500">
              Selger kan godta eller avslå. Ingen betaling før aksept.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-3 shrink-0 rounded-full p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
            aria-label="Lukk"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
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
                className={`flex-1 rounded-full border py-2 text-sm font-medium transition ${
                  amount === v
                    ? "border-[#5a6b32] bg-[#5a6b32]/5 text-[#5a6b32] ring-1 ring-[#5a6b32]"
                    : "border-stone-200 text-stone-700 hover:border-stone-400"
                }`}
              >
                {formatPrice(v)}
              </button>
            ))}
          </div>
        )}

        {/* Amount input */}
        <div className="mb-1">
          <label className="mb-1.5 block text-xs font-medium text-stone-600">
            Ditt bud (kr)
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={raw}
            onChange={(e) => setRaw(e.target.value.replace(/\D/g, ""))}
            placeholder="F.eks. 300"
            className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-base outline-none focus:border-[#5a6b32] focus:ring-1 focus:ring-[#5a6b32]/30"
          />
        </div>
        <div className="mb-4 h-4">
          {helperText && (
            <p className={`text-xs ${helperColor}`}>{helperText}</p>
          )}
        </div>

        {/* Trust signals */}
        <div className="mb-5 space-y-1.5">
          <p className="text-xs text-stone-400">💬 Budet sendes som melding i chat</p>
          <p className="text-xs text-stone-400">🔒 Ingen betaling før budet er akseptert</p>
        </div>

        <button
          type="button"
          onClick={() => amount > 0 && onSubmit(amount)}
          disabled={submitting || amount <= 0}
          className="w-full rounded-full bg-[#5a6b32] py-3 text-sm font-semibold text-white hover:bg-[#435022] disabled:opacity-50"
        >
          {submitting ? "Sender…" : "Send bud"}
        </button>
      </div>
    </div>
  );
}
