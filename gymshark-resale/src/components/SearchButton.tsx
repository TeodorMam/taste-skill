"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function SearchButton() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setOpen(false);
    setQuery("");
    router.push(`/browse?q=${encodeURIComponent(query.trim())}`);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Søk"
        className="flex h-8 w-8 items-center justify-center rounded-full text-stone-500 transition hover:bg-stone-100 hover:text-stone-900"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-20 bg-black/25 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="fixed inset-x-0 top-0 z-30 border-b border-stone-200 bg-white/95 shadow-lg backdrop-blur">
            <form onSubmit={submit} className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-stone-400" aria-hidden>
                <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
              </svg>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Søk etter merke, kategori, størrelse…"
                className="flex-1 bg-transparent text-sm text-stone-900 outline-none placeholder:text-stone-400"
              />
              {query && (
                <button type="button" onClick={() => setQuery("")} className="shrink-0 text-stone-400 hover:text-stone-700">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              )}
              <button type="button" onClick={() => setOpen(false)} className="shrink-0 text-xs font-medium text-stone-500 hover:text-stone-900">
                Avbryt
              </button>
            </form>
          </div>
        </>
      )}
    </>
  );
}
