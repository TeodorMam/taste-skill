import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createSupabaseServerClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aktivbruk.com";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createSupabaseServerClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Logg inn først" }, { status: 401 });

    const body = await req.json().catch(() => ({})) as { returnPath?: string };
    const returnPath = body.returnPath ?? "/profil?stripe=return";

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const { data: profile } = await admin.from("profiles").select("stripe_account_id").eq("user_id", user.id).maybeSingle();

    let accountId: string = profile?.stripe_account_id ?? "";

    if (!accountId) {
      // Only request the transfers capability — that's all a destination
      // charge needs to route funds to the seller. Skipping card_payments
      // is what makes Stripe drop the "bransje", "nettsted",
      // "bedriftstype" and product-description screens: those exist to
      // vet a merchant taking card money directly, which the seller is
      // not doing in our destination-charge model.
      const account = await stripe.accounts.create({
        type: "express",
        country: "NO",
        default_currency: "nok",
        email: user.email ?? undefined,
        capabilities: { transfers: { requested: true } },
        business_type: "individual",
        business_profile: {
          // MCC 5651 — Family Clothing Stores. Stripe requires an MCC
          // and rejects "undefined". Pre-filling stops the hosted flow
          // from asking the seller which industry they're in.
          mcc: "5651",
          url: SITE_URL,
          product_description:
            "Bruktmarked for treningsklær. Kjøp og selg brukte treningstøy fra Gymshark, Nike, Craft, Lululemon og andre merker.",
          support_email: "kontakt@aktivbruk.com",
        },
        metadata: { supabase_user_id: user.id },
        // Manual payouts keep escrow honest: buyer's money lands on the
        // seller's Connect balance at payment time (via destination charge)
        // but doesn't hit their bank until we call stripe.payouts.create
        // when the buyer confirms delivery.
        settings: {
          payouts: { schedule: { interval: "manual" } },
        },
      });
      accountId = account.id;
      await admin.from("profiles").update({ stripe_account_id: accountId }).eq("user_id", user.id);
    }

    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${SITE_URL}/api/stripe/connect/refresh?account=${accountId}`,
      return_url: `${SITE_URL}${returnPath}`,
      type: "account_onboarding",
      // Only prompt for what's blocking activation right now. Defer the
      // "eventually due" fields (tax IDs at higher volumes, ID uploads,
      // etc.) until Stripe actually needs them.
      collection_options: { fields: "currently_due" },
    });

    return NextResponse.json({ url: link.url });
  } catch (err) {
    console.error("[stripe/connect POST]", err);
    return NextResponse.json({ error: "Noe gikk galt, prøv igjen" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createSupabaseServerClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const { data: profile } = await admin.from("profiles")
      .select("stripe_account_id, stripe_charges_enabled, stripe_onboarding_complete")
      .eq("user_id", user.id).maybeSingle();

    if (!profile?.stripe_account_id) {
      return NextResponse.json({ charges_enabled: false, account_id: null });
    }

    if (!profile.stripe_charges_enabled) {
      const account = await stripe.accounts.retrieve(profile.stripe_account_id);
      // New accounts only request the `transfers` capability, so
      // Stripe's `charges_enabled` flag (which is about *direct* card
      // acceptance) stays false. What we actually need is "can this
      // seller receive a destination-charge transfer" — which is
      // capabilities.transfers === "active" and details_submitted.
      const transfersActive = account.capabilities?.transfers === "active";
      const ready = account.charges_enabled || (transfersActive && account.details_submitted);
      if (ready) {
        await admin.from("profiles").update({
          stripe_charges_enabled: true,
          stripe_onboarding_complete: account.details_submitted,
        }).eq("user_id", user.id);
        // Fall through — will run the payout-schedule check below
      }
    }

    // Ensure existing Connect accounts use manual payouts so the escrow
    // model actually holds. New accounts get this on creation; accounts
    // created before the escrow refactor still have the default schedule
    // and are silently migrated here on their next visit.
    try {
      const account = await stripe.accounts.retrieve(profile.stripe_account_id);
      const currentInterval = account.settings?.payouts?.schedule?.interval;
      if (currentInterval && currentInterval !== "manual") {
        await stripe.accounts.update(profile.stripe_account_id, {
          settings: { payouts: { schedule: { interval: "manual" } } },
        });
      }
    } catch (e) {
      console.warn("[stripe/connect GET] payout schedule check failed:", e);
    }

    return NextResponse.json({
      charges_enabled: profile.stripe_charges_enabled,
      account_id: profile.stripe_account_id,
      onboarding_complete: profile.stripe_onboarding_complete,
    });
  } catch (err) {
    console.error("[stripe/connect GET]", err);
    return NextResponse.json({ error: "Noe gikk galt" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const cookieStore = await cookies();
    const supabase = createSupabaseServerClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Logg inn først" }, { status: 401 });

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    await admin.from("profiles").update({
      stripe_account_id: null,
      stripe_charges_enabled: false,
      stripe_onboarding_complete: false,
    }).eq("user_id", user.id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[stripe/connect DELETE]", err);
    return NextResponse.json({ error: "Noe gikk galt, prøv igjen" }, { status: 500 });
  }
}
