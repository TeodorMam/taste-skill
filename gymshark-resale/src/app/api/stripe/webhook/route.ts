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
      console.log("[webhook] missing orderId or itemId, skipping");
      return NextResponse.json({ received: true });
    }

    // Claim the order and read it back in one statement. Reading first and
    // then updating let two deliveries of the same event both see "pending"
    // and both run everything below, which is two of every mail and two
    // payment messages in the chat. Stripe delivers at least once and retries
    // a slow response, and this route sends four mails before it answers, so
    // it is slow enough to be retried. Whichever delivery updates the row
    // first gets the row back; the others get nothing and stop here.
    const { data: claimed, error: claimErr } = await admin
      .from("orders")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        stripe_payment_intent_id: session.payment_intent as string,
      })
      .eq("id", orderId)
      .eq("status", "pending")
      .select("status, buyer_id, seller_id, amount_nok, platform_fee_nok, delivery_method, shipping_cost_nok");

    if (claimErr) {
      console.error("[webhook] claim failed:", claimErr.message);
      return NextResponse.json({ error: "claim failed" }, { status: 500 });
    }
    if (!claimed || claimed.length === 0) {
      console.log("[webhook] order already handled or not pending, skipping:", orderId);
      return NextResponse.json({ received: true });
    }
    const existing = claimed[0];

    // Everything from here is a side effect of a payment that has already been
    // recorded. None of it may throw: an exception answers 500, Stripe retries,
    // and the retry stops at the claim above because the order is no longer
    // pending. A seller would never learn they sold anything because a mail to
    // the buyer failed first.
    const [itemsUpdate, offersUpdate] = await Promise.all([
      admin.from("items").update({ is_sold: true }).eq("id", Number(itemId)),
      offerId ? admin.from("offers").update({ status: "accepted" }).eq("id", offerId) : Promise.resolve({ error: null }),
    ]);
    if (itemsUpdate.error) console.error("[webhook] items update error:", itemsUpdate.error.message, "itemId:", Number(itemId));
    if (offersUpdate.error) console.error("[webhook] offers update error:", offersUpdate.error.message);

    // Insert a payment system message so it appears in both parties' chat timeline
    const { error: messageErr } = await admin.from("messages").insert({
      item_id: itemId,
      buyer_id: existing.buyer_id,
      sender_id: existing.buyer_id,
      body: "",
      message_type: "payment",
      metadata: { amount_nok: existing.amount_nok, order_id: orderId, delivery_method: existing.delivery_method },
    });
    if (messageErr) console.error("[webhook] payment message failed:", messageErr.message);

    // Send confirmation emails
    let buyerEmail: string | undefined;
    let sellerEmail: string | undefined;
    let itemTitle = "varen";
    try {
      const [buyerRes, sellerRes, itemRes] = await Promise.all([
        admin.auth.admin.getUserById(existing.buyer_id),
        admin.auth.admin.getUserById(existing.seller_id),
        admin.from("items").select("title").eq("id", Number(itemId)).maybeSingle(),
      ]);
      buyerEmail = buyerRes.data.user?.email;
      sellerEmail = sellerRes.data.user?.email;
      itemTitle = itemRes.data?.title ?? "varen";
    } catch (err) {
      console.error("[webhook] could not look up parties for order", orderId, err);
    }
    const shippingCost = existing.shipping_cost_nok ?? 0;
    // Buyer paid: item + shipping + kjøperbeskyttelse (fee is a separate line).
    const buyerTotal = existing.amount_nok + shippingCost + existing.platform_fee_nok;
    // Seller receives full item price + shipping reimbursement (no fee deduction).
    const sellerReceives = existing.amount_nok + shippingCost;
    const link = `${SITE_URL}/vare/${itemId}`;

    const fmt = (n: number) => new Intl.NumberFormat("nb-NO").format(n) + " kr";

    const isMeetup = existing.delivery_method === "meetup";

    if (buyerEmail) {
      const buyerSteps = isMeetup
        ? `<p style="margin:0 0 8px;font-size:14px;color:#57534e">Avtal møte med selger i chatten. Når dere har møttes og selger har bekreftet overleveringen, får du beskjed og har <strong>48 timer</strong> på å:</p>
          <ul style="margin:0 0 12px;padding-left:20px;font-size:14px;color:#57534e">
            <li>Bekrefte at alt er i orden</li>
            <li>Melde fra om et problem</li>
          </ul>
          <p style="margin:0 0 16px;font-size:14px;color:#57534e">Hvis du ikke gjør noe innen 48 timer etter overleveringen, fullføres handelen automatisk og pengene utbetales til selger.</p>`
        : `<p style="margin:0 0 8px;font-size:14px;color:#57534e">Selger vil sende varen og markere den som sendt. Når varen er levert, får du beskjed og har <strong>48 timer</strong> på å:</p>
          <ul style="margin:0 0 12px;padding-left:20px;font-size:14px;color:#57534e">
            <li>Bekrefte at alt er i orden</li>
            <li>Melde fra om et problem</li>
          </ul>
          <p style="margin:0 0 16px;font-size:14px;color:#57534e">Hvis du ikke gjør noe innen 48 timer, fullføres handelen automatisk og pengene utbetales til selger.</p>`;
      await sendEmail(buyerEmail, `Betaling bekreftet, ${itemTitle}`, `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1c1917;max-width:560px">
          <h2 style="margin:0 0 8px;font-size:18px">Betaling bekreftet!</h2>
          <p style="margin:0 0 12px;color:#57534e;font-size:14px">Du har kjøpt <strong>${escapeHtml(itemTitle)}</strong> for totalt <strong>${fmt(buyerTotal)}</strong>${shippingCost > 0 ? ` (${fmt(existing.amount_nok)} vare + ${fmt(shippingCost)} frakt + ${fmt(existing.platform_fee_nok)} kjøperbeskyttelse)` : ` (${fmt(existing.amount_nok)} vare + ${fmt(existing.platform_fee_nok)} kjøperbeskyttelse)`}. Pengene holdes trygt hos Aktivbruk til handelen er fullført.</p>
          ${buyerSteps}
          <a href="${SITE_URL}/ordre" style="display:inline-block;background:#1c1917;color:#fafaf9;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:500;font-size:14px">Se dine ordre</a>
          <p style="color:#a8a29e;font-size:12px;margin:24px 0 0">Aktivbruk, bruktmarked for treningsklær</p>
        </div>
      `);
    }

    if (sellerEmail) {
      const sellerInstruction = isMeetup
        ? `Betalingen holdes trygt hos Aktivbruk. Avtal møte med kjøper i chatten og marker overleveringen som fullført i dine ordre når dere har møttes, utbetaling skjer etter kjøper bekrefter mottak (eller automatisk etter 48 timer).`
        : `Betalingen holdes trygt hos Aktivbruk. Send varen og marker som sendt i dine ordre, utbetaling skjer etter kjøper bekrefter mottak (eller automatisk etter 48 timer).`;
      await sendEmail(sellerEmail, `Du har solgt «${itemTitle}»!`, `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1c1917;max-width:560px">
          <h2 style="margin:0 0 8px;font-size:18px">Du har solgt «${escapeHtml(itemTitle)}»!</h2>
          <div style="background:#f5f5f4;padding:16px;border-radius:12px;margin-bottom:16px">
            <p style="margin:0 0 4px;font-size:13px;color:#78716c">Du mottar</p>
            <p style="margin:0;font-size:22px;font-weight:700;color:#1c1917">${fmt(sellerReceives)}</p>
            <p style="margin:6px 0 0;font-size:12px;color:#a8a29e">Hele salgsprisen${shippingCost > 0 ? ` + frakt (${fmt(shippingCost)})` : ""}, helt uten avgift for deg som selger</p>
          </div>
          <p style="margin:0 0 12px;font-size:14px">${sellerInstruction}</p>
          <a href="${SITE_URL}/ordre" style="display:inline-block;background:#1c1917;color:#fafaf9;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:500;font-size:14px">Se mine ordre</a>
          <p style="color:#a8a29e;font-size:12px;margin:24px 0 0">Aktivbruk, bruktmarked for treningsklær</p>
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
    // "Ready to receive payouts" = destination-charge model. New accounts
    // only ask for the transfers capability so charges_enabled stays false
    // for them; existing accounts still expose it via the old path.
    const transfersActive = account.capabilities?.transfers === "active";
    const ready = account.charges_enabled || (transfersActive && !!account.details_submitted);
    await admin.from("profiles").update({
      stripe_charges_enabled: ready,
      stripe_onboarding_complete: !!account.details_submitted,
    }).eq("stripe_account_id", account.id);
  }

  return NextResponse.json({ received: true });
}

// Never throws. A payment is already recorded by the time any of these go out,
// and the retry that an exception would trigger stops at the claim, so one
// failed mail must not be allowed to cancel the ones after it.
async function sendEmail(to: string, subject: string, html: string) {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
    });
    if (!res.ok) console.error("[webhook] email rejected:", subject, await res.text());
  } catch (err) {
    console.error("[webhook] email failed:", subject, err);
  }
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
