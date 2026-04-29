import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aktivbruk.com";

// POST — create/retrieve Connect Express account and return onboarding URL
export async function POST() {
  const cookieStore = cookies();
  const supabase = createServerClient(
    SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  const { data: profile } = await admin.from("profiles").select("stripe_account_id").eq("user_id", user.id).maybeSingle();

  let accountId: string = profile?.stripe_account_id ?? "";

  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      country: "NO",
      default_currency: "nok",
      capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
      business_type: "individual",
      metadata: { supabase_user_id: user.id },
    });
    accountId = account.id;
    await admin.from("profiles").update({ stripe_account_id: accountId }).eq("user_id", user.id);
  }

  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${SITE_URL}/api/stripe/connect/refresh?account=${accountId}`,
    return_url: `${SITE_URL}/profil?stripe=return`,
    type: "account_onboarding",
  });

  return NextResponse.json({ url: link.url });
}

// GET — check current Stripe status for the logged-in seller
export async function GET() {
  const cookieStore = cookies();
  const supabase = createServerClient(
    SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const { data: profile } = await admin.from("profiles")
    .select("stripe_account_id, stripe_charges_enabled, stripe_onboarding_complete")
    .eq("user_id", user.id).maybeSingle();

  if (!profile?.stripe_account_id) {
    return NextResponse.json({ charges_enabled: false, account_id: null });
  }

  // Live-check in case the webhook hasn't arrived yet
  if (!profile.stripe_charges_enabled) {
    const account = await stripe.accounts.retrieve(profile.stripe_account_id);
    if (account.charges_enabled) {
      await admin.from("profiles").update({
        stripe_charges_enabled: true,
        stripe_onboarding_complete: account.details_submitted,
      }).eq("user_id", user.id);
      return NextResponse.json({ charges_enabled: true, account_id: profile.stripe_account_id });
    }
  }

  return NextResponse.json({
    charges_enabled: profile.stripe_charges_enabled,
    account_id: profile.stripe_account_id,
    onboarding_complete: profile.stripe_onboarding_complete,
  });
}
