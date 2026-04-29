import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { stripe, calcFee } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aktivbruk.com";

export async function POST(req: NextRequest) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Logg inn for å kjøpe" }, { status: 401 });

  const body = await req.json() as { item_id: string; offer_id?: string };
  const { item_id, offer_id } = body;

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  // Fetch item (source of truth for price)
  const { data: item } = await admin.from("items").select("id, title, seller_id, price, is_sold").eq("id", item_id).maybeSingle();
  if (!item) return NextResponse.json({ error: "Annonsen finnes ikke" }, { status: 404 });
  if (item.is_sold) return NextResponse.json({ error: "Denne varen er allerede solgt" }, { status: 400 });
  if (item.seller_id === user.id) return NextResponse.json({ error: "Du kan ikke kjøpe din egen vare" }, { status: 400 });

  // Determine amount: offer price if offer provided, else listing price
  let amountNok: number = item.price;
  if (offer_id) {
    const { data: offer } = await admin.from("offers").select("*").eq("id", offer_id).maybeSingle();
    if (!offer || offer.buyer_id !== user.id || offer.status !== "accepted") {
      return NextResponse.json({ error: "Tilbudet er ikke gyldig" }, { status: 400 });
    }
    amountNok = offer.amount;
  }

  // Check seller has Stripe enabled
  const { data: sellerProfile } = await admin.from("profiles")
    .select("stripe_account_id, stripe_charges_enabled")
    .eq("user_id", item.seller_id).maybeSingle();

  let sellerAccountId = sellerProfile?.stripe_account_id ?? null;
  let chargesEnabled = sellerProfile?.stripe_charges_enabled ?? false;

  // Live-check in case webhook hasn't synced yet
  if (sellerAccountId && !chargesEnabled) {
    const account = await stripe.accounts.retrieve(sellerAccountId);
    chargesEnabled = account.charges_enabled;
    if (chargesEnabled) {
      await admin.from("profiles").update({ stripe_charges_enabled: true }).eq("user_id", item.seller_id);
    }
  }

  if (!sellerAccountId || !chargesEnabled) {
    return NextResponse.json({ error: "Selgeren har ikke aktivert betaling enda" }, { status: 400 });
  }

  const platformFeeNok = calcFee(amountNok);

  // Create order record before Stripe call
  const { data: order, error: orderErr } = await admin.from("orders").insert({
    item_id: Number(item_id),
    buyer_id: user.id,
    seller_id: item.seller_id,
    offer_id: offer_id ?? null,
    amount_nok: amountNok,
    platform_fee_nok: platformFeeNok,
    status: "pending",
  }).select("id").single();

  if (orderErr || !order) {
    return NextResponse.json({ error: "Kunne ikke opprette ordre" }, { status: 500 });
  }

  // Get buyer email for Stripe
  const { data: buyerData } = await admin.auth.admin.getUserById(user.id);
  const buyerEmail = buyerData.user?.email;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [{
      price_data: {
        currency: "nok",
        unit_amount: amountNok * 100,
        product_data: {
          name: item.title,
          metadata: { item_id: String(item.id) },
        },
      },
      quantity: 1,
    }],
    payment_intent_data: {
      application_fee_amount: platformFeeNok * 100,
      transfer_data: { destination: sellerAccountId },
      metadata: {
        order_id: order.id,
        item_id: String(item.id),
        buyer_id: user.id,
        seller_id: item.seller_id,
      },
    },
    success_url: `${SITE_URL}/item/${item.id}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${SITE_URL}/item/${item.id}?payment=cancelled`,
    customer_email: buyerEmail,
    locale: "nb",
    metadata: {
      order_id: order.id,
      item_id: String(item.id),
      offer_id: offer_id ?? "",
    },
  });

  await admin.from("orders").update({ stripe_checkout_session_id: session.id }).eq("id", order.id);

  return NextResponse.json({ url: session.url });
}
