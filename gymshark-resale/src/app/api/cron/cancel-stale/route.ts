import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const CRON_SECRET = process.env.CRON_SECRET ?? "";
const RESEND_API_KEY = process.env.RESEND_API_KEY!;
const FROM_EMAIL = process.env.RESEND_FROM ?? "Aktivbruk <kontakt@aktivbruk.com>";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aktivbruk.com";

const SHIPPING_DEADLINE_DAYS = 7;

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret") ?? req.nextUrl.searchParams.get("secret") ?? "";
  if (CRON_SECRET && secret !== CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const cutoff = new Date(Date.now() - SHIPPING_DEADLINE_DAYS * 24 * 60 * 60 * 1000).toISOString();

  // Paid shipping orders older than 7 days with no tracking info yet
  const { data: stale } = await admin
    .from("orders")
    .select("id, buyer_id, seller_id, item_id, stripe_payment_intent_id")
    .eq("status", "paid")
    .eq("delivery_method", "shipping")
    .is("shipped_at", null)
    .lt("paid_at", cutoff);

  if (!stale || stale.length === 0) return NextResponse.json({ cancelled: 0 });

  const results: { id: string; cancelled: boolean; error?: string }[] = [];

  for (const order of stale) {
    try {
      if (order.stripe_payment_intent_id) {
        await stripe.refunds.create({ payment_intent: order.stripe_payment_intent_id });
      }

      await admin.from("orders").update({ status: "refunded" }).eq("id", order.id);

      const [buyerRes, itemRes] = await Promise.all([
        admin.auth.admin.getUserById(order.buyer_id),
        order.item_id
          ? admin.from("items").select("title").eq("id", order.item_id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      const buyerEmail = buyerRes.data.user?.email;
      const itemTitle = (itemRes as { data: { title: string } | null }).data?.title ?? "varen";

      if (buyerEmail) {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: buyerEmail,
            subject: `Ordre kansellert — ${itemTitle}`,
            html: `<div style="font-family:-apple-system,sans-serif;color:#1c1917;max-width:560px">
              <h2 style="margin:0 0 8px;font-size:18px">Ordren er kansellert</h2>
              <p style="margin:0 0 12px;font-size:14px;color:#57534e">Selger sendte ikke <strong>${itemTitle}</strong> innen ${SHIPPING_DEADLINE_DAYS} dager. Ordren er kansellert og du refunderes fullt.</p>
              <p style="margin:0 0 16px;font-size:14px;color:#57534e">Refusjonen vil vises på kontoen din innen 5–10 virkedager avhengig av kortutstederen din.</p>
              <a href="${SITE_URL}/orders" style="display:inline-block;background:#1c1917;color:#fafaf9;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:500;font-size:14px">Se dine ordre</a>
              <p style="color:#a8a29e;font-size:12px;margin:24px 0 0">Aktivbruk — bruktmarked for treningsklær</p>
            </div>`,
          }),
        });
      }

      results.push({ id: order.id, cancelled: true });
    } catch (err) {
      console.error(`[cron/cancel-stale] order ${order.id}:`, err);
      results.push({ id: order.id, cancelled: false, error: String(err) });
    }
  }

  return NextResponse.json({
    cancelled: results.filter((r) => r.cancelled).length,
    results,
  });
}
