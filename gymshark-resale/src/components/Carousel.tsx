"use client";

import { useEffect, useRef, useState } from "react";

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
      <div className="flex aspect-square w-full items-center justify-center bg-stone-100 text-sm text-stone-400">
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
          className="block aspect-square w-full cursor-zoom-in bg-stone-100"
          aria-label="Forstørr bilde"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={images[0]} alt={alt} className="h-full w-full object-cover" />
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
          className="flex aspect-square w-full snap-x snap-mandatory overflow-x-auto scroll-smooth bg-stone-100 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {images.map((src, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setLightbox(i)}
              className="relative h-full w-full shrink-0 snap-center cursor-zoom-in"
              aria-label={`Forstørr bilde ${i + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`${alt} ${i + 1}`}
                className="h-full w-full object-cover"
                loading={i === 0 ? "eager" : "lazy"}
              />
            </button>
          ))}
        </div>

        <button type="button" onClick={() => scrollTo(Math.max(0, active - 1))} disabled={active === 0} aria-label="Forrige bilde"
          className="absolute left-2 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-stone-800 shadow-sm backdrop-blur transition hover:bg-white disabled:opacity-0 sm:flex">‹</button>
        <button type="button" onClick={() => scrollTo(Math.min(images.length - 1, active + 1))} disabled={active === images.length - 1} aria-label="Neste bilde"
          className="absolute right-2 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-stone-800 shadow-sm backdrop-blur transition hover:bg-white disabled:opacity-0 sm:flex">›</button>

        <div className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
          {active + 1} / {images.length}
        </div>

        <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5">
          {images.map((_, i) => (
            <button key={i} type="button" onClick={() => scrollTo(i)} aria-label={`Bilde ${i + 1}`}
              className={`pointer-events-auto h-1.5 rounded-full bg-white/70 transition-all ${active === i ? "w-5 bg-white" : "w-1.5 hover:bg-white"}`} />
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
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95" onClick={onClose}>
      {/* Top bar */}
      <div className="flex shrink-0 items-center justify-between px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <span className="text-sm text-white/60">{index + 1} / {images.length}</span>
        <button onClick={onClose} aria-label="Lukk" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Image — overflow-auto + touch-action lets browser handle pinch-zoom on mobile */}
      <div
        className="flex min-h-0 flex-1 items-center justify-center overflow-auto"
        style={{ touchAction: "pinch-zoom" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images[index]}
          alt={`${alt} ${index + 1}`}
          className="max-h-full max-w-full cursor-zoom-in object-contain"
          draggable={false}
        />
      </div>

      {/* Arrow navigation */}
      {images.length > 1 && (
        <div className="flex shrink-0 items-center justify-center gap-6 py-4" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => onChange(Math.max(0, index - 1))} disabled={index === 0}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white text-xl hover:bg-white/20 disabled:opacity-30">‹</button>
          <div className="flex gap-1.5">
            {images.map((_, i) => (
              <button key={i} onClick={() => onChange(i)}
                className={`h-1.5 rounded-full transition-all ${i === index ? "w-5 bg-white" : "w-1.5 bg-white/40 hover:bg-white/70"}`} />
            ))}
          </div>
          <button onClick={() => onChange(Math.min(images.length - 1, index + 1))} disabled={index === images.length - 1}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white text-xl hover:bg-white/20 disabled:opacity-30">›</button>
        </div>
      )}
    </div>
  );
}
