"use client";

import { useEffect, useRef, useState } from "react";
import { browserSafeImage } from "@/lib/image";

export function Carousel({ images, alt }: { images: string[]; alt: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => {
      const w = el.clientWidth;
      if (w === 0) return;
      const i = Math.round(el.scrollLeft / w);
      setActive(Math.max(0, Math.min(images.length - 1, i)));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [images.length]);

  useEffect(() => {
    if (lightbox === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
      if (e.key === "ArrowRight") setLightbox((i) => Math.min(images.length - 1, (i ?? 0) + 1));
      if (e.key === "ArrowLeft") setLightbox((i) => Math.max(0, (i ?? 0) - 1));
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [lightbox, images.length]);

  function scrollTo(i: number) {
    const el = ref.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  }

  if (images.length === 0) {
    return (
      <div className="flex aspect-[3/4] w-full items-center justify-center bg-sunk text-sm text-ink-3">
        Ingen bilde
      </div>
    );
  }

  if (images.length === 1) {
    return (
      <>
        <button
          type="button"
          onClick={() => setLightbox(0)}
          className="block w-full cursor-zoom-in bg-sunk"
          aria-label="Forstørr bilde"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={browserSafeImage(images[0])}
            alt={alt}
            className="block h-auto max-h-[85vh] w-full object-contain"
          />
        </button>
        {lightbox !== null && <Lightbox images={images} index={lightbox} alt={alt} onClose={() => setLightbox(null)} onChange={setLightbox} />}
      </>
    );
  }

  return (
    <>
      <div className="relative">
        <div
          ref={ref}
          className="flex w-full snap-x snap-mandatory items-center overflow-x-auto scroll-smooth bg-sunk [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {images.map((src, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setLightbox(i)}
              className="relative flex w-full shrink-0 snap-center items-center justify-center cursor-zoom-in"
              aria-label={`Forstørr bilde ${i + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={browserSafeImage(src)}
                alt={`${alt} ${i + 1}`}
                className="block h-auto max-h-[85vh] w-full object-contain"
                loading={i === 0 ? "eager" : "lazy"}
              />
            </button>
          ))}
        </div>

        <button type="button" onClick={() => scrollTo(Math.max(0, active - 1))} disabled={active === 0} aria-label="Forrige bilde"
          className="absolute left-2 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-sm bg-raised/85 text-ink transition hover:bg-raised disabled:opacity-0 sm:flex">‹</button>
        <button type="button" onClick={() => scrollTo(Math.min(images.length - 1, active + 1))} disabled={active === images.length - 1} aria-label="Neste bilde"
          className="absolute right-2 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-sm bg-raised/85 text-ink transition hover:bg-raised disabled:opacity-0 sm:flex">›</button>

        <div className="pointer-events-none absolute right-3 top-3 rounded-sm bg-ink/60 px-2.5 py-1 text-[11px] font-medium text-raised">
          {active + 1} / {images.length}
        </div>

        <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5">
          {images.map((_, i) => (
            <button key={i} type="button" onClick={() => scrollTo(i)} aria-label={`Bilde ${i + 1}`}
              className={`pointer-events-auto h-1.5 rounded-sm bg-raised/70 transition-all ${active === i ? "w-5 bg-raised" : "w-1.5 hover:bg-raised"}`} />
          ))}
        </div>
      </div>

      {lightbox !== null && <Lightbox images={images} index={lightbox} alt={alt} onClose={() => setLightbox(null)} onChange={setLightbox} />}
    </>
  );
}

function Lightbox({ images, index, alt, onClose, onChange }: {
  images: string[];
  index: number;
  alt: string;
  onClose: () => void;
  onChange: (i: number) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ink/95" onClick={onClose}>
      {/* Top bar */}
      <div className="flex shrink-0 items-center justify-between px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <span className="text-sm text-raised/60">{index + 1} / {images.length}</span>
        <button onClick={onClose} aria-label="Lukk" className="flex h-9 w-9 items-center justify-center rounded-sm bg-raised/10 text-raised hover:bg-raised/20">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Image, overflow-auto + touch-action lets browser handle pinch-zoom on mobile */}
      <div
        className="flex min-h-0 flex-1 items-center justify-center overflow-auto"
        style={{ touchAction: "pinch-zoom" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={browserSafeImage(images[index])}
          alt={`${alt} ${index + 1}`}
          className="max-h-full max-w-full cursor-zoom-in object-contain"
          draggable={false}
        />
      </div>

      {/* Arrow navigation */}
      {images.length > 1 && (
        <div className="flex shrink-0 items-center justify-center gap-6 py-4" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => onChange(Math.max(0, index - 1))} disabled={index === 0}
            className="flex h-10 w-10 items-center justify-center rounded-sm bg-raised/10 text-raised text-xl hover:bg-raised/20 disabled:opacity-30">‹</button>
          <div className="flex gap-1.5">
            {images.map((_, i) => (
              <button key={i} onClick={() => onChange(i)}
                className={`h-1.5 rounded-sm transition-all ${i === index ? "w-5 bg-raised" : "w-1.5 bg-raised/40 hover:bg-raised/70"}`} />
            ))}
          </div>
          <button onClick={() => onChange(Math.min(images.length - 1, index + 1))} disabled={index === images.length - 1}
            className="flex h-10 w-10 items-center justify-center rounded-sm bg-raised/10 text-raised text-xl hover:bg-raised/20 disabled:opacity-30">›</button>
        </div>
      )}
    </div>
  );
}
