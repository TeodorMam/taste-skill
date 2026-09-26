"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";

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
    router.push(`/varer?q=${encodeURIComponent(query.trim())}`);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Søk"
        className="flex h-11 w-11 items-center justify-center rounded-sm text-ink transition-colors hover:bg-ink/5"
      >
        <Icon name="soek" size={20} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-20 bg-ink/35" onClick={() => setOpen(false)} />
          <div className="fixed inset-x-0 top-0 z-30 border-b border-line bg-raised">
            <form onSubmit={submit} className="mx-auto flex h-14 max-w-[1280px] items-center gap-3 px-4 sm:h-16 lg:px-10">
              <Icon name="soek" size={20} className="text-ink-3" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Søk etter merke, kategori, størrelse…"
                className="min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-ink-3"
              />
              {query && (
                <button type="button" onClick={() => setQuery("")} className="flex h-11 w-11 shrink-0 items-center justify-center text-ink-3 hover:text-ink">
                  <Icon name="kryss" size={18} />
                </button>
              )}
              <button type="button" onClick={() => setOpen(false)} className="tbtn shrink-0 text-sm">
                Avbryt
              </button>
            </form>
          </div>
        </>
      )}
    </>
  );
}
