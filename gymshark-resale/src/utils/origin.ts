import { type NextRequest } from "next/server";

/**
 * Resolve the user-facing origin (e.g. https://aktivbruk.com).
 * On Netlify, `request.url` reflects the underlying deploy URL
 * (foo--aktivbruk.netlify.app), not the custom domain. We use the
 * x-forwarded-host header — set by Netlify's edge — to get the right one.
 */
export function getPublicOrigin(request: NextRequest): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (forwardedHost) {
    const proto = forwardedProto ?? "https";
    return `${proto}://${forwardedHost}`;
  }
  return new URL(request.url).origin;
}
