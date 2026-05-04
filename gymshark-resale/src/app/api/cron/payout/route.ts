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
  const secret = req.headers.get("x-cron-secret") ?? req.nextUrl.searchParams.get("secret") ?? "";
  if (CRON_SECRET && secret !== CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  // Find delivered orders past their review window with no payout yet
  const { data: orders } = await admin.from("orders")
    .select("id, amount_nok, platform_fee_nok, seller_id, buyer_id, item_id")
    .eq("status", "delivered")
    .is("payout_transfer_id", null)
    .lt("review_deadline", new Date().toISOString());

  if (!orders || orders.length === 0) {
    return NextResponse.json({ processed: 0 });
  }

  const results: { id: string; ok: boolean; error?: string }[] = [];

  for (const order of orders) {
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
      const sellerReceives = order.amount_nok - order.platform_fee_nok;
      const fmt = (n: number) => new Intl.NumberFormat("nb-NO").format(n) + " kr";

      await Promise.all([
        buyerEmail ? fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
          body: JSON.stringify({
            from: FROM_EMAIL, to: buyerEmail,
            subject: `Betaling frigjort automatisk — ${itemTitle}`,
            html: `<div style="font-family:-apple-system,sans-serif;color:#1c1917;max-width:560px">
              <p style="font-size:14px;color:#57534e">Bekreftelsesvinduet for <strong>${itemTitle}</strong> utløp uten at du tok handling. Betalingen er automatisk frigjort til selger.</p>
              <p style="font-size:14px;color:#57534e">Har du et problem med varen? Kontakt oss på <a href="mailto:${FROM_EMAIL.match(/<(.+)>/)?.[1] ?? "kontakt@aktivbruk.com"}">${FROM_EMAIL.match(/<(.+)>/)?.[1] ?? "kontakt@aktivbruk.com"}</a>.</p>
              <p style="color:#a8a29e;font-size:12px;margin:24px 0 0">Aktivbruk — bruktmarked for treningsklær</p>
            </div>`,
          }),
        }) : Promise.resolve(),
        sellerEmail ? fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
          body: JSON.stringify({
            from: FROM_EMAIL, to: sellerEmail,
            subject: `Betaling utbetalt — ${itemTitle}`,
            html: `<div style="font-family:-apple-system,sans-serif;color:#1c1917;max-width:560px">
              <h2 style="margin:0 0 8px;font-size:18px">Betaling automatisk frigjort</h2>
              <div style="background:#f0fdf4;padding:16px;border-radius:12px;margin-bottom:16px">
                <p style="margin:0 0 4px;font-size:13px;color:#166534">Du mottar</p>
                <p style="margin:0;font-size:22px;font-weight:700;color:#16a34a">${fmt(sellerReceives)}</p>
              </div>
              <p style="font-size:14px;color:#57534e">Bekreftelsesvinduet utløp, og betalingen er automatisk overført til din Stripe-konto.</p>
              <a href="https://dashboard.stripe.com/express" style="display:inline-block;background:#1c1917;color:#fafaf9;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:500;font-size:14px">Åpne Stripe-dashboard</a>
              <p style="color:#a8a29e;font-size:12px;margin:24px 0 0">Aktivbruk — bruktmarked for treningsklær</p>
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

  return NextResponse.json({ processed: results.length, results });
}
