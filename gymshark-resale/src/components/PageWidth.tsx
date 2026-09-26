"use client";

import { usePathname } from "next/navigation";

// Browsing pages use the full 1280 px grid. Everything else (forms, chat,
// orders, text pages) stays in a narrow column that reads comfortably.
const WIDE = [/^\/$/, /^\/varer\/?$/, /^\/vare\/[^/]+\/?$/, /^\/brukt\//, /^\/selger\//, /^\/favoritter\/?$/, /^\/mine\/?$/, /^\/borte\//];

export function PageWidth({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const wide = WIDE.some((re) => re.test(path));
  return (
    <main
      className={`mx-auto w-full px-4 pb-24 pt-6 sm:pb-10 lg:px-10 ${
        wide ? "max-w-[1280px]" : "max-w-[calc(48rem+2rem)] lg:max-w-[calc(48rem+5rem)]"
      }`}
    >
      {children}
    </main>
  );
}
