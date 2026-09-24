import { type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// Matches /vare/123 and nothing deeper, so /vare/123/rediger is left alone.
const LISTING_PATH = /^\/vare\/([^/]+)\/?$/;

// Next has no way to set a status code from a page, so a deleted listing can
// only answer 410 from here.
//
// NextResponse.rewrite(url, { status }) does carry the status in Next itself,
// verified against a scratch app, but on Netlify the rewrite is an instruction
// the edge runtime carries out, and it answers with the rewritten route's own
// 200. Netlify's redirect engine refuses 410 outright and serves 404 instead,
// so the status has to come from us: middleware fetches the page and returns
// it as a finished response, which the edge function passes through untouched.
async function isGone(id: string): Promise<boolean> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return false;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/deleted_items?id=eq.${encodeURIComponent(id)}&select=id`,
      {
        headers: { apikey: SUPABASE_KEY, authorization: `Bearer ${SUPABASE_KEY}` },
        cache: "no-store",
      },
    );
    if (!res.ok) return false;
    return ((await res.json()) as unknown[]).length > 0;
  } catch {
    // A lookup that fails must never take a live listing down. Saying nothing
    // leaves the page to answer exactly as it did before this existed.
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const listing = LISTING_PATH.exec(request.nextUrl.pathname);
  if (listing && (await isGone(listing[1]))) {
    const url = request.nextUrl.clone();
    url.pathname = `/borte/${listing[1]}`;
    url.search = "";

    // The cookie goes along so the header renders signed in, as it would on
    // any other page. /borte is not a listing path, so this never re-enters
    // the branch above.
    const cookie = request.headers.get("cookie");
    const page = await fetch(url, {
      headers: cookie ? { cookie } : undefined,
      cache: "no-store",
    });

    if (page.ok) {
      return new Response(page.body, {
        status: 410,
        headers: {
          "content-type": page.headers.get("content-type") ?? "text/html; charset=utf-8",
          "cache-control": "no-store",
        },
      });
    }
    // If that page cannot be fetched, fall through rather than serve a blank
    // 410. A listing that answers as it always did beats an empty one.
  }
  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
