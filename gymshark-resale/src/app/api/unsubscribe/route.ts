import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aktivbruk.com";

/**
 * Turns review reminders off for the profile holding this token.
 *
 * POST only, on purpose. Mail clients and security scanners fetch every link
 * in a message before a human sees it, so a GET that changed state would
 * unsubscribe people who never clicked. The emailed link opens a page with a
 * button, and this runs when that button is pressed.
 *
 * The token is a random uuid, unguessable and per profile, so no session is
 * needed. Nobody is reading a mailbox they do not own.
 */
export async function POST(req: NextRequest) {
  if (!SERVICE_ROLE_KEY) {
    return NextResponse.redirect(`${SITE_URL}/avmeld?feil=1`, { status: 303 });
  }

  const form = await req.formData().catch(() => null);
  const token = String(form?.get("token") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(token)) {
    return NextResponse.redirect(`${SITE_URL}/avmeld?feil=1`, { status: 303 });
  }

  const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const { data, error } = await db
    .from("profiles")
    .update({ review_emails_off: true })
    .eq("email_token", token)
    .select("user_id");

  if (error || !data || data.length === 0) {
    return NextResponse.redirect(`${SITE_URL}/avmeld?feil=1`, { status: 303 });
  }

  return NextResponse.redirect(`${SITE_URL}/avmeld?ok=1`, { status: 303 });
}
