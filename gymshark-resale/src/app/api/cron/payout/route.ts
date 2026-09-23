import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { payoutOrder } from "@/lib/payout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const CRON_SECRET = process.env.CRON_SECRET ?? "";
const RESEND_API_KEY = process.env.RESEND_API_KEY!;
const FROM_EMAIL = process.env.RESEND_FROM ?? "Aktivbruk <kontakt@aktivbruk.com>";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aktivbruk.com";

export async function GET(req: NextRequest) {
  try {
  const secret = req.headers.get("x-cron-secret") ?? req.nextUrl.searchParams.get("secret") ?? "";
  if (CRON_SECRET && secret !== CRON_SECRET) {
    // Always 200 so cron-job.org doesn't auto-disable us; misconfig shows up in body
    return NextResponse.json({ ok: false, error: "unauthorized" });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  // Find delivered orders past their review window with no payout yet
  const { data: orders } = await admin.from("orders")
    .select("id, amount_nok, platform_fee_nok, shipping_cost_nok, seller_id, buyer_id, item_id")
    .eq("status", "delivered")
    .is("payout_transfer_id", null)
    .lt("review_deadline", new Date().toISOString());

  const results: { id: string; ok: boolean; error?: string }[] = [];

  for (const order of orders ?? []) {
    try {
      await payoutOrder(admin, order.id, order.amount_nok, order.platform_fee_nok, order.seller_id);

      // Notify both parties
      const [buyerRes, sellerRes, itemRes] = await Promise.all([
        admin.auth.admin.getUserById(order.buyer_id),
        admin.auth.admin.getUserById(order.seller_id),
        order.item_id ? admin.from("items").select("title").eq("id", order.item_id).maybeSingle() : Promise.resolve({ data: null }),
      ]);
      const buyerEmail = buyerRes.data.user?.email;
      const sellerEmail = sellerRes.data.user?.email;
      const itemTitle = (itemRes as { data: { title: string } | null }).data?.title ?? "varen";
      const shippingCost = order.shipping_cost_nok ?? 0;
      // Seller receives full item price + shipping (buyer-fee model, no deduction).
      const sellerReceives = order.amount_nok + shippingCost;
      const fmt = (n: number) => new Intl.NumberFormat("nb-NO").format(n) + " kr";

      await Promise.all([
        buyerEmail ? fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
          body: JSON.stringify({
            from: FROM_EMAIL, to: buyerEmail,
            subject: `Betaling frigjort automatisk, ${itemTitle}`,
            html: `<div style="font-family:-apple-system,sans-serif;color:#1c1917;max-width:560px">
              <p style="font-size:14px;color:#57534e">Bekreftelsesvinduet for <strong>${itemTitle}</strong> utløp uten at du tok handling. Betalingen er automatisk frigjort til selger.</p>
              <p style="font-size:14px;color:#57534e">Hvordan var handelen? Det tar et halvt minutt, og det betyr mye for neste kjøper.</p>
              <a href="${SITE_URL}/orders" style="display:inline-block;background:#5a6b32;color:#ffffff;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:500;font-size:14px">Legg igjen en vurdering</a>
              <p style="font-size:14px;color:#57534e;margin-top:20px">Har du et problem med varen? Kontakt oss på <a href="mailto:${FROM_EMAIL.match(/<(.+)>/)?.[1] ?? "kontakt@aktivbruk.com"}">${FROM_EMAIL.match(/<(.+)>/)?.[1] ?? "kontakt@aktivbruk.com"}</a>.</p>
              <p style="color:#a8a29e;font-size:12px;margin:24px 0 0">Aktivbruk, bruktmarked for treningsklær</p>
            </div>`,
          }),
        }) : Promise.resolve(),
        sellerEmail ? fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
          body: JSON.stringify({
            from: FROM_EMAIL, to: sellerEmail,
            subject: `Betaling utbetalt, ${itemTitle}`,
            html: `<div style="font-family:-apple-system,sans-serif;color:#1c1917;max-width:560px">
              <h2 style="margin:0 0 8px;font-size:18px">Betaling automatisk frigjort</h2>
              <div style="background:#f0fdf4;padding:16px;border-radius:12px;margin-bottom:16px">
                <p style="margin:0 0 4px;font-size:13px;color:#166534">Du mottar</p>
                <p style="margin:0;font-size:22px;font-weight:700;color:#16a34a">${fmt(sellerReceives)}</p>
              </div>
              <p style="font-size:14px;color:#57534e">48-timersvinduet gikk ut. Pengene er på vei til bankkontoen din, vanligvis fremme innen 1-3 virkedager.</p>
              <a href="https://dashboard.stripe.com/express" style="display:inline-block;background:#1c1917;color:#fafaf9;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:500;font-size:14px">Åpne Stripe-dashboard</a>
              <p style="font-size:14px;color:#57534e;margin-top:20px">Hvordan var kjøperen? En vurdering hjelper andre selgere.</p>
              <a href="${SITE_URL}/orders" style="display:inline-block;background:#5a6b32;color:#ffffff;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:500;font-size:14px">Vurder kjøperen</a>
              <p style="color:#a8a29e;font-size:12px;margin:24px 0 0">Aktivbruk, bruktmarked for treningsklær</p>
            </div>`,
          }),
        }) : Promise.resolve(),
      ]);

      results.push({ id: order.id, ok: true });
    } catch (err) {
      console.error(`[cron/payout] order ${order.id} failed:`, err);
      results.push({ id: order.id, ok: false, error: String(err) });
    }
  }

  const reminders = await sendReviewReminders();

  return NextResponse.json({ ok: true, processed: results.length, results, reminders });
  } catch (err) {
    console.error("[cron/payout] top-level error:", err);
    return NextResponse.json({ ok: false, error: String(err) });
  }
}


type ReminderOrder = {
  id: string;
  item_id: number | string | null;
  buyer_id: string;
  seller_id: string;
  item_title: string | null;
  buyer_review_reminded_at: string | null;
  seller_review_reminded_at: string | null;
};

type ReminderProfile = {
  user_id: string;
  display_name: string | null;
  review_emails_off: boolean;
  email_token: string;
};

function reminderHtml(counterpartName: string, itemTitle: string, token: string): string {
  const unsubscribe = `${SITE_URL}/avmeld?token=${token}`;
  return `<div style="font-family:-apple-system,sans-serif;color:#1c1917;max-width:560px">
    <p style="font-size:14px;color:#57534e">Hei,</p>
    <p style="font-size:14px;color:#57534e">For to dager siden fullførte du handelen med <strong>${escapeHtml(counterpartName)}</strong> på Aktivbruk. Varen: «${escapeHtml(itemTitle)}».</p>
    <p style="font-size:14px;color:#57534e">Har du 30 sekunder til å legge igjen en anmeldelse? Det betyr mye for andre som vurderer å handle med ${escapeHtml(counterpartName)}.</p>
    <a href="${SITE_URL}/orders" style="display:inline-block;background:#5a6b32;color:#ffffff;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:500;font-size:14px">Legg igjen en vurdering</a>
    <p style="color:#a8a29e;font-size:12px;margin:24px 0 0">Aktivbruk, bruktmarked for treningsklær</p>
    <p style="color:#d6d3d1;font-size:11px;margin:8px 0 0"><a href="${unsubscribe}" style="color:#d6d3d1">Slutt å få påminnelser om anmeldelser</a></p>
  </div>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] ?? c));
}

/**
 * One nudge per person per order, two days after the money moved, and only to
 * someone who has not reviewed.
 *
 * Whether they reviewed comes from the reviews table. Whether we already asked
 * cannot: a person who never reviews leaves no row there, so without the
 * reminded_at columns this would mail them every day forever. The table
 * decides relevance, the columns decide idempotency.
 *
 * Cancelled and refunded orders are skipped. Asking someone to rate a trade
 * that was undone is worse than staying quiet.
 */
async function sendReviewReminders(): Promise<{ sent: number; skipped: number }> {
  // Its own client rather than a passed-in one: the parameter type for a
  // Supabase client is awkward to spell, and this keeps the pass self-contained.
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  const { data: rows } = await admin
    .from("orders")
    .select("id, item_id, buyer_id, seller_id, item_title, buyer_review_reminded_at, seller_review_reminded_at")
    .not("paid_out_at", "is", null)
    .lte("paid_out_at", cutoff)
    .not("status", "in", "(cancelled,refunded)")
    .or("buyer_review_reminded_at.is.null,seller_review_reminded_at.is.null")
    .limit(200);

  const orders = (rows ?? []) as ReminderOrder[];
  if (orders.length === 0) return { sent: 0, skipped: 0 };

  const userIds = [...new Set(orders.flatMap((o) => [o.buyer_id, o.seller_id]))];
  const { data: profileRows } = await admin
    .from("profiles")
    .select("user_id, display_name, review_emails_off, email_token")
    .in("user_id", userIds);
  const profiles: Record<string, ReminderProfile> = {};
  for (const p of (profileRows ?? []) as ReminderProfile[]) profiles[p.user_id] = p;

  const itemIds = [...new Set(orders.map((o) => o.item_id).filter((x) => x !== null))];
  const { data: reviewRows } = itemIds.length
    ? await admin.from("reviews").select("item_id, reviewer_id").in("item_id", itemIds)
    : { data: [] };
  const reviewed = new Set(
    ((reviewRows ?? []) as { item_id: string | number; reviewer_id: string }[])
      .map((r) => `${String(r.item_id)}:${r.reviewer_id}`),
  );

  let sent = 0;
  let skipped = 0;

  for (const order of orders) {
    const itemTitle = order.item_title ?? "varen";

    for (const side of ["buyer", "seller"] as const) {
      const isBuyer = side === "buyer";
      if (isBuyer ? order.buyer_review_reminded_at : order.seller_review_reminded_at) continue;

      const now = new Date().toISOString();
      const stamp = () =>
        admin
          .from("orders")
          .update(isBuyer ? { buyer_review_reminded_at: now } : { seller_review_reminded_at: now })
          .eq("id", order.id);

      const personId = isBuyer ? order.buyer_id : order.seller_id;
      const counterpartId = isBuyer ? order.seller_id : order.buyer_id;
      const person = profiles[personId];

      // Already reviewed, opted out, or deleted: nothing to send. Stamp the
      // column anyway so the row stops being considered on every run.
      const hasReviewed = order.item_id !== null && reviewed.has(`${String(order.item_id)}:${personId}`);
      if (!person || person.review_emails_off || hasReviewed) {
        await stamp();
        skipped += 1;
        continue;
      }

      const { data: authUser } = await admin.auth.admin.getUserById(personId);
      const email = authUser.user?.email;
      if (!email) {
        await stamp();
        skipped += 1;
        continue;
      }

      const counterpartName =
        profiles[counterpartId]?.display_name?.trim() || "den andre parten";

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: email,
          subject: "Har du 30 sekunder til å anmelde handelen?",
          html: reminderHtml(counterpartName, itemTitle, person.email_token),
        }),
      });

      // Stamp only on a send that actually left. A failed request should be
      // retried on the next run, not silently turned into a never.
      if (res.ok) {
        await stamp();
        sent += 1;
      } else {
        console.error(`[cron/payout] reminder ${side} on order ${order.id} failed:`, await res.text());
      }
    }
  }

  return { sent, skipped };
}
