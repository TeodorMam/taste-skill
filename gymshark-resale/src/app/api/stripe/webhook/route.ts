import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";
import type Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;
const RESEND_API_KEY = process.env.RESEND_API_KEY!;
const FROM_EMAIL = process.env.RESEND_FROM ?? "Aktivbruk <kontakt@aktivbruk.com>";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aktivbruk.com";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "missing signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.order_id;
    const itemId = session.metadata?.item_id;
    const offerId = session.metadata?.offer_id;

    console.log("[webhook] checkout.session.completed orderId:", orderId, "itemId:", itemId);

    if (!orderId || !itemId) {
      console.log("[webhook] missing orderId or itemId — skipping");
      return NextResponse.json({ received: true });
    }

    const { data: existing, error: orderFetchErr } = await admin.from("orders").select("status, buyer_id, seller_id, amount_nok, platform_fee_nok").eq("id", orderId).maybeSingle();
    console.log("[webhook] order fetch:", existing?.status, "fetchErr:", orderFetchErr?.message);
    if (!existing || existing.status === "paid") return NextResponse.json({ received: true });

    const [ordersUpdate, itemsUpdate] = await Promise.all([
      admin.from("orders").update({
        status: "paid",
        paid_at: new Date().toISOString(),
        stripe_payment_intent_id: session.payment_intent as string,
      }).eq("id", orderId),
      admin.from("items").update({ is_sold: true }).eq("id", Number(itemId)),
      offerId ? admin.from("offers").update({ status: "accepted" }).eq("id", offerId) : Promise.resolve({ error: null }),
    ]);

    console.log("[webhook] orders update error:", ordersUpdate.error?.message);
    console.log("[webhook] items update error:", itemsUpdate.error?.message, "itemId used:", Number(itemId));

    // Send confirmation emails
    const [buyerRes, sellerRes, itemRes] = await Promise.all([
      admin.auth.admin.getUserById(existing.buyer_id),
      admin.auth.admin.getUserById(existing.seller_id),
      admin.from("items").select("title").eq("id", Number(itemId)).maybeSingle(),
    ]);

    const buyerEmail = buyerRes.data.user?.email;
    const sellerEmail = sellerRes.data.user?.email;
    const itemTitle = itemRes.data?.title ?? "varen";
    const sellerReceives = existing.amount_nok - existing.platform_fee_nok;
    const link = `${SITE_URL}/item/${itemId}`;

    const fmt = (n: number) => new Intl.NumberFormat("nb-NO").format(n) + " kr";

    if (buyerEmail) {
      await sendEmail(buyerEmail, `Betaling bekreftet — ${itemTitle}`, `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1c1917;max-width:560px">
          <h2 style="margin:0 0 8px;font-size:18px">Betaling bekreftet!</h2>
          <p style="margin:0 0 16px;color:#57534e;font-size:14px">Du har kjøpt <strong>${escapeHtml(itemTitle)}</strong> for <strong>${fmt(existing.amount_nok)}</strong>.</p>
          <p style="margin:0 0 16px;font-size:14px">Kontakt selger i chatten for å avtale levering/frakt.</p>
          <a href="${link}" style="display:inline-block;background:#1c1917;color:#fafaf9;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:500;font-size:14px">Se annonsen</a>
          <p style="color:#a8a29e;font-size:12px;margin:24px 0 0">Aktivbruk — bruktmarked for treningsklær</p>
        </div>
      `);
    }

    if (sellerEmail) {
      await sendEmail(sellerEmail, `Du har solgt «${itemTitle}»!`, `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1c1917;max-width:560px">
          <h2 style="margin:0 0 8px;font-size:18px">Du har solgt «${escapeHtml(itemTitle)}»!</h2>
          <div style="background:#f5f5f4;padding:16px;border-radius:12px;margin-bottom:16px">
            <p style="margin:0 0 4px;font-size:13px;color:#78716c">Du mottar</p>
            <p style="margin:0;font-size:22px;font-weight:700;color:#16a34a">${fmt(sellerReceives)}</p>
            <p style="margin:6px 0 0;font-size:12px;color:#a8a29e">Salgspris ${fmt(existing.amount_nok)} − 7% plattformavgift (${fmt(existing.platform_fee_nok)})</p>
          </div>
          <p style="margin:0 0 16px;font-size:14px">Utbetaling skjer automatisk via Stripe Express-dashbordet ditt. Kontakt kjøperen i chatten for å avtale levering.</p>
          <a href="${link}" style="display:inline-block;background:#1c1917;color:#fafaf9;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:500;font-size:14px">Se annonsen</a>
          <p style="color:#a8a29e;font-size:12px;margin:24px 0 0">Aktivbruk — bruktmarked for treningsklær</p>
        </div>
      `);
    }
  }

  if (event.type === "checkout.session.expired") {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.order_id;
    if (orderId) {
      await admin.from("orders").update({ status: "cancelled" }).eq("id", orderId).eq("status", "pending");
    }
  }

  if (event.type === "account.updated") {
    const account = event.data.object as Stripe.Account;
    await admin.from("profiles").update({
      stripe_charges_enabled: account.charges_enabled,
      stripe_onboarding_complete: account.details_submitted,
    }).eq("stripe_account_id", account.id);
  }

  return NextResponse.json({ received: true });
}

async function sendEmail(to: string, subject: string, html: string) {
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  });
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
