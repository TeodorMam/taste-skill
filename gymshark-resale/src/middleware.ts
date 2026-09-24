import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// Matches /vare/123 and nothing deeper, so /vare/123/rediger is left alone.
const LISTING_PATH = /^\/vare\/([^/]+)\/?$/;

// Next has no way to set a status code from a page, so a deleted listing can
// only answer 410 from here. Rewriting keeps the original URL in the address
// bar and still renders a real page, which a hand-written HTML response in
// middleware would not.
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
    return NextResponse.rewrite(url, { status: 410 });
  }
  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
