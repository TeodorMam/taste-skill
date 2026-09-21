import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Records one pageview. Public by necessity, so it stores only what it is
 * given and nothing about who sent it: no IP, no cookie, no user agent.
 *
 * Bots are dropped rather than counted. Aktivbruk ranks first on Google for
 * its main term, so crawler traffic would otherwise drown the human numbers,
 * and the human number is the entire point of having this.
 */
const BOT = /bot|crawler|spider|crawling|facebookexternalhit|slurp|bingpreview|headless|lighthouse|pingdom|gtmetrix|curl|wget|python-requests|axios|node-fetch/i;

/** Paths that are nobody's business to count, or nobody's to see. */
const IGNORED = /^\/(admin|api|_next)/;

export async function POST(req: NextRequest) {
  try {
    if (!SERVICE_ROLE_KEY) return new NextResponse(null, { status: 204 });

    const ua = req.headers.get("user-agent") ?? "";
    if (!ua || BOT.test(ua)) return NextResponse.json({ ok: true });

    const body = (await req.json().catch(() => null)) as
      | { path?: unknown; referrer?: unknown; session?: unknown }
      | null;
    if (!body) return NextResponse.json({ ok: false }, { status: 400 });

    const rawPath = typeof body.path === "string" ? body.path : "";
    if (!rawPath.startsWith("/") || rawPath.length > 300) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    if (IGNORED.test(rawPath)) return NextResponse.json({ ok: true });

    // Only the host, never the full referring URL: a search query or a
    // private link in the path is not ours to keep.
    let referrerHost: string | null = null;
    if (typeof body.referrer === "string" && body.referrer) {
      try {
        const host = new URL(body.referrer).hostname.replace(/^www\./, "");
        if (host && host !== "aktivbruk.com") referrerHost = host.slice(0, 100);
      } catch {
        // A referrer we cannot parse tells us nothing. Drop it.
      }
    }

    const session =
      typeof body.session === "string" && /^[a-z0-9]{6,40}$/i.test(body.session)
        ? body.session
        : null;

    const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    await db.from("pageviews").insert({
      path: rawPath.split("?")[0].slice(0, 300),
      referrer_host: referrerHost,
      session_id: session,
    });

    return NextResponse.json({ ok: true });
  } catch {
    // Never let analytics break a page view. Failing quietly is correct here.
    return new NextResponse(null, { status: 204 });
  }
}
