import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const CRON_SECRET = process.env.CRON_SECRET ?? "";

// One-time (and idempotent) migration: force every existing Connect
// account onto manual payouts so the escrow model actually holds. New
// accounts already get this on creation. Existing accounts get it here.
//
// Call with:
//   GET /api/admin/migrate-payouts?secret=YOUR_CRON_SECRET
export async function GET(req: NextRequest) {
  try {
    const secret = req.headers.get("x-cron-secret") ?? req.nextUrl.searchParams.get("secret") ?? "";
    if (!CRON_SECRET || secret !== CRON_SECRET) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const { data: profiles } = await admin
      .from("profiles")
      .select("user_id, stripe_account_id")
      .not("stripe_account_id", "is", null);

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ ok: true, checked: 0, migrated: 0, results: [] });
    }

    const results: { user_id: string; account_id: string; before?: string; after?: string; changed: boolean; error?: string }[] = [];

    for (const p of profiles as { user_id: string; stripe_account_id: string }[]) {
      try {
        const account = await stripe.accounts.retrieve(p.stripe_account_id);
        const before = account.settings?.payouts?.schedule?.interval;
        if (before === "manual") {
          results.push({ user_id: p.user_id, account_id: p.stripe_account_id, before, after: before, changed: false });
          continue;
        }
        await stripe.accounts.update(p.stripe_account_id, {
          settings: { payouts: { schedule: { interval: "manual" } } },
        });
        results.push({ user_id: p.user_id, account_id: p.stripe_account_id, before, after: "manual", changed: true });
      } catch (e) {
        results.push({ user_id: p.user_id, account_id: p.stripe_account_id, changed: false, error: String(e) });
      }
    }

    return NextResponse.json({
      ok: true,
      checked: results.length,
      migrated: results.filter((r) => r.changed).length,
      results,
    });
  } catch (err) {
    console.error("[admin/migrate-payouts] top-level error:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
