"use client";

import { useEffect, useRef, useState } from "react";
import { browserSafeImage } from "@/lib/image";
import { Icon } from "@/components/Icon";

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
          className="block aspect-[3/4] w-full cursor-zoom-in bg-sunk"
          aria-label="Forstørr bilde"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={browserSafeImage(images[0])}
            alt={alt}
            className="block h-full w-full object-contain"
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
          className="flex aspect-[3/4] w-full snap-x snap-mandatory overflow-x-auto scroll-smooth bg-sunk [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {images.map((src, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setLightbox(i)}
              className="relative flex h-full w-full shrink-0 snap-center cursor-zoom-in items-center justify-center"
              aria-label={`Forstørr bilde ${i + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={browserSafeImage(src)}
                alt={`${alt} ${i + 1}`}
                className="block h-full w-full object-contain"
                loading={i === 0 ? "eager" : "lazy"}
              />
            </button>
          ))}
        </div>

        <button type="button" onClick={() => scrollTo(Math.max(0, active - 1))} disabled={active === 0} aria-label="Forrige bilde"
          className="absolute left-4 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-sm bg-raised text-ink transition-opacity disabled:opacity-40 sm:flex">
          <Icon name="chevron-v" size={20} />
        </button>
        <button type="button" onClick={() => scrollTo(Math.min(images.length - 1, active + 1))} disabled={active === images.length - 1} aria-label="Neste bilde"
          className="absolute right-4 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-sm bg-raised text-ink transition-opacity disabled:opacity-40 sm:flex">
          <Icon name="chevron-h" size={20} />
        </button>

        <div className="num pointer-events-none absolute right-3 top-3 flex h-[22px] items-center rounded-sm bg-ink px-[7px] text-xs font-semibold text-paper">
          {active + 1} / {images.length}
        </div>
      </div>

      {/* Position as segments under the photo, where they stay readable on
          dark pictures. */}
      <div className="flex gap-1 px-4 pt-2 sm:px-4">
        {images.map((_, i) => (
          <button key={i} type="button" onClick={() => scrollTo(i)} aria-label={`Bilde ${i + 1}`}
            className="flex h-4 flex-1 items-start">
            <span className={`block h-0.5 w-full transition-colors ${active === i ? "bg-ink" : "bg-line"}`} />
          </button>
        ))}
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
        <span className="num text-sm text-paper/70">{index + 1} / {images.length}</span>
        <button onClick={onClose} aria-label="Lukk" className="flex h-11 w-11 items-center justify-center rounded-sm text-paper hover:bg-paper/10">
          <Icon name="kryss" size={20} />
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
            aria-label="Forrige bilde" className="flex h-11 w-11 items-center justify-center rounded-sm text-paper hover:bg-paper/10 disabled:opacity-30"><Icon name="chevron-v" size={20} /></button>
          <div className="flex gap-1.5">
            {images.map((_, i) => (
              <button key={i} onClick={() => onChange(i)}
                className={`h-0.5 w-6 transition-colors ${i === index ? "bg-paper" : "bg-paper/35 hover:bg-paper/60"}`} />
            ))}
          </div>
          <button onClick={() => onChange(Math.min(images.length - 1, index + 1))} disabled={index === images.length - 1}
            aria-label="Neste bilde" className="flex h-11 w-11 items-center justify-center rounded-sm text-paper hover:bg-paper/10 disabled:opacity-30"><Icon name="chevron-h" size={20} /></button>
        </div>
      )}
    </div>
  );
}
