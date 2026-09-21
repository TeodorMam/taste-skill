"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Fire-and-forget pageview beacon.
 *
 * The session id lives in sessionStorage, not a cookie: it is gone when the
 * tab closes, it never travels to another site, and it exists only so the
 * dashboard can tell twelve visits by one person from twelve people.
 */
const KEY = "ab_session";

/**
 * Teodor's own visits would otherwise be a large share of the count at this
 * volume, and a number he cannot trust is worse than no number.
 *
 * Opting out is per browser and permanent: load /?notrack=1 once on each
 * device, /?notrack=0 to undo. localStorage rather than sessionStorage so it
 * survives closing the tab, and no server or login involved, so it works
 * logged out and in a second browser too.
 *
 * window.location is read directly instead of useSearchParams, which would
 * force every page in the app into dynamic rendering from the root layout.
 */
const OPT_OUT = "ab_notrack";

function optedOut(): boolean {
  try {
    const flag = new URLSearchParams(window.location.search).get("notrack");
    if (flag === "1") localStorage.setItem(OPT_OUT, "1");
    if (flag === "0") localStorage.removeItem(OPT_OUT);
    return localStorage.getItem(OPT_OUT) === "1";
  } catch {
    // Blocked storage. Better to count the visit than to lose it.
    return false;
  }
}

function sessionId(): string | null {
  try {
    const existing = sessionStorage.getItem(KEY);
    if (existing) return existing;
    const fresh = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    sessionStorage.setItem(KEY, fresh);
    return fresh;
  } catch {
    // Private mode, blocked storage. Still count the view, just without a session.
    return null;
  }
}

export function Analytics() {
  const pathname = usePathname();
  // React strict mode runs effects twice in dev; this keeps one view per path.
  const lastSent = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || lastSent.current === pathname) return;
    if (optedOut()) return;
    lastSent.current = pathname;

    const payload = JSON.stringify({
      path: pathname,
      referrer: document.referrer || null,
      session: sessionId(),
    });

    // keepalive so the request survives the user navigating straight away.
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {
      // Analytics must never surface an error to a visitor.
    });
  }, [pathname]);

  return null;
}
