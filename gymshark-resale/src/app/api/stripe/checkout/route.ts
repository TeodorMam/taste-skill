import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createSupabaseServerClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import Stripe from "stripe";
import { stripe, calcFee } from "@/lib/stripe";
import { getPackageOption } from "@/lib/shipping";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aktivbruk.com";

export async function POST(req: NextRequest) {
  try {
  const cookieStore = await cookies();
  const supabase = createSupabaseServerClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Logg inn for å kjøpe" }, { status: 401 });

  const body = await req.json() as { item_id: string; offer_id?: string; delivery_method?: "shipping" | "meetup" };
  const { item_id, offer_id, delivery_method = "shipping" } = body;

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  // Fetch item (source of truth for price and shipping)
  const { data: item } = await admin.from("items").select("id, title, image_url, image_urls, seller_id, price, is_sold, shipping, package_size").eq("id", item_id).maybeSingle();
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

  // Idempotency: if a non-cancelled order already exists for this item/offer,
  // resume its checkout session if still open; otherwise cancel any orphaned
  // rows (previous attempts errored before storing a valid session) and let a
  // fresh order be created below. We iterate every match rather than using
  // maybeSingle() so repeat attempts don't blow up on multiple stale rows.
  {
    const dupQuery = admin
      .from("orders")
      .select("id, stripe_checkout_session_id, status")
      .eq("item_id", Number(item_id))
      .neq("status", "cancelled");
    const { data: dups } = await (offer_id
      ? dupQuery.eq("offer_id", offer_id)
      : dupQuery.eq("buyer_id", user.id)
    );

    const rows = dups ?? [];
    const alreadyPaid = rows.find((r) => r.status !== "pending");
    if (alreadyPaid) {
      return NextResponse.json({ error: "Denne varen er allerede betalt" }, { status: 409 });
    }

    for (const row of rows) {
      if (row.stripe_checkout_session_id) {
        try {
          const existing = await stripe.checkout.sessions.retrieve(row.stripe_checkout_session_id);
          if (existing.status === "open" && existing.url) {
            return NextResponse.json({ url: existing.url });
          }
        } catch (e) {
          console.warn("[stripe/checkout] could not retrieve existing session:", e);
        }
      }
    }

    if (rows.length > 0) {
      await admin
        .from("orders")
        .update({ status: "cancelled" })
        .in("id", rows.map((r) => r.id));
    }
  }

  // Calculate shipping cost from seller's chosen package size
  const shippingCostNok = delivery_method === "shipping" && item.package_size
    ? (getPackageOption(item.package_size)?.price ?? 0)
    : 0;

  // Validate buyer has shipping info
  const { data: buyerProfile } = await admin.from("profiles")
    .select("full_name, address, postal_code, city, phone")
    .eq("user_id", user.id).maybeSingle();

  if (delivery_method === "shipping" && (
    !buyerProfile?.full_name || !buyerProfile?.address ||
    !buyerProfile?.postal_code || !buyerProfile?.city || !buyerProfile?.phone
  )) {
    return NextResponse.json({ error: "Fyll inn leveringsinformasjon i profilen din før du kjøper" }, { status: 400 });
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

  // Fee is calculated on the total (item + shipping) because Stripe's own fee
  // also lands on the total. Charging 7% of item price alone was leaving
  // negative or near-zero margin on small orders — the Stripe cut on
  // (item + shipping) exceeded the 7% we took on item.
  const platformFeeNok = calcFee(amountNok + shippingCostNok);

  // Create order record before Stripe call
  const { data: order, error: orderErr } = await admin.from("orders").insert({
    item_id: Number(item_id),
    buyer_id: user.id,
    seller_id: item.seller_id,
    offer_id: offer_id ?? null,
    amount_nok: amountNok,
    platform_fee_nok: platformFeeNok,
    delivery_method,
    shipping_cost_nok: shippingCostNok,
    status: "pending",
    item_title: item.title,
    item_image: (item.image_urls as string[] | null)?.[0] ?? (item.image_url as string | null) ?? null,
    buyer_name: buyerProfile?.full_name ?? null,
    buyer_address: buyerProfile?.address ?? null,
    buyer_postal_code: buyerProfile?.postal_code ?? null,
    buyer_city: buyerProfile?.city ?? null,
    buyer_phone: buyerProfile?.phone ?? null,
  }).select("id").single();

  if (orderErr || !order) {
    return NextResponse.json({ error: "Kunne ikke opprette ordre" }, { status: 500 });
  }

  // Get buyer email for Stripe
  const { data: buyerData } = await admin.auth.admin.getUserById(user.id);
  const buyerEmail = buyerData.user?.email;

  const lineItems: { price_data: { currency: string; unit_amount: number; product_data: { name: string; metadata?: Record<string, string> } }; quantity: number }[] = [
    {
      price_data: {
        currency: "nok",
        unit_amount: amountNok * 100,
        product_data: {
          name: item.title,
          metadata: { item_id: String(item.id) },
        },
      },
      quantity: 1,
    },
  ];

  if (shippingCostNok > 0) {
    const pkg = getPackageOption(item.package_size);
    lineItems.push({
      price_data: {
        currency: "nok",
        unit_amount: shippingCostNok * 100,
        product_data: { name: `Frakt — Posten ${pkg?.label ?? "Norgespakke"}` },
      },
      quantity: 1,
    });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: lineItems,
    payment_intent_data: {
      // No transfer_data: funds held on platform until buyer confirms delivery
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
  } catch (err) {
    console.error("[stripe/checkout POST]", err);
    return NextResponse.json({ error: "Noe gikk galt, prøv igjen" }, { status: 500 });
  }
}
