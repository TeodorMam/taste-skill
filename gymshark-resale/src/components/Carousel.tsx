"use client";

import { useEffect, useRef, useState } from "react";

export function Carousel({ images, alt }: { images: string[]; alt: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(0);

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
      <div className="aspect-square w-full bg-stone-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={images[0]} alt={alt} className="h-full w-full object-cover" />
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        ref={ref}
        className="flex aspect-square w-full snap-x snap-mandatory overflow-x-auto scroll-smooth bg-stone-100 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {images.map((src, i) => (
          <div key={i} className="relative h-full w-full shrink-0 snap-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={`${alt} ${i + 1}`}
              className="h-full w-full object-cover"
              loading={i === 0 ? "eager" : "lazy"}
            />
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => scrollTo(Math.max(0, active - 1))}
        disabled={active === 0}
        aria-label="Forrige bilde"
        className="absolute left-2 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-stone-800 shadow-sm backdrop-blur transition hover:bg-white disabled:opacity-0 sm:flex"
      >
        ‹
      </button>
      <button
        type="button"
        onClick={() => scrollTo(Math.min(images.length - 1, active + 1))}
        disabled={active === images.length - 1}
        aria-label="Neste bilde"
        className="absolute right-2 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-stone-800 shadow-sm backdrop-blur transition hover:bg-white disabled:opacity-0 sm:flex"
      >
        ›
      </button>

      <div className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
        {active + 1} / {images.length}
      </div>

      <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5">
        {images.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => scrollTo(i)}
            aria-label={`Bilde ${i + 1}`}
            className={`pointer-events-auto h-1.5 rounded-full bg-white/70 transition-all ${
              active === i ? "w-5 bg-white" : "w-1.5 hover:bg-white"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
