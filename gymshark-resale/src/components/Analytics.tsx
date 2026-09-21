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
