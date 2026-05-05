import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createSupabaseServerClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { payoutOrder } from "@/lib/payout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const RESEND_API_KEY = process.env.RESEND_API_KEY!;
const FROM_EMAIL = process.env.RESEND_FROM ?? "Aktivbruk <kontakt@aktivbruk.com>";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aktivbruk.com";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: orderId } = await params;
    const cookieStore = await cookies();
    const supabase = createSupabaseServerClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Logg inn først" }, { status: 401 });

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const { data: order } = await admin.from("orders")
      .select("id, status, buyer_id, seller_id, amount_nok, platform_fee_nok, item_id, payout_transfer_id")
      .eq("id", orderId).maybeSingle();

    if (!order) return NextResponse.json({ error: "Ordre ikke funnet" }, { status: 404 });
    if (order.buyer_id !== user.id) return NextResponse.json({ error: "Ikke autorisert" }, { status: 403 });
    if (order.status !== "delivered") return NextResponse.json({ error: `Ordre er i status '${order.status}', kan ikke bekrefte nå` }, { status: 400 });
    if (order.payout_transfer_id) return NextResponse.json({ error: "Betaling er allerede frigjort" }, { status: 400 });

    await payoutOrder(admin, orderId, order.amount_nok, order.platform_fee_nok, order.seller_id, {
      confirmed_at: new Date().toISOString(),
    });

    // Insert a payout system message into the chat timeline
    await admin.from("messages").insert({
      item_id: String(order.item_id),
      buyer_id: order.buyer_id,
      sender_id: order.buyer_id,
      body: "",
      message_type: "payout",
      metadata: { order_id: orderId, amount_nok: order.amount_nok - order.platform_fee_nok },
    });

    // Send emails
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
          subject: `Mottak bekreftet — ${itemTitle}`,
          html: `<div style="font-family:-apple-system,sans-serif;color:#1c1917;max-width:560px">
            <h2 style="margin:0 0 8px;font-size:18px">Takk for bekreftelsen!</h2>
            <p style="font-size:14px;color:#57534e">Du har bekreftet mottak av <strong>${itemTitle}</strong>. Betalingen er nå frigjort til selger.</p>
            <p style="color:#a8a29e;font-size:12px;margin:24px 0 0">Aktivbruk — bruktmarked for treningsklær</p>
          </div>`,
        }),
      }) : Promise.resolve(),
      sellerEmail ? fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
        body: JSON.stringify({
          from: FROM_EMAIL, to: sellerEmail,
          subject: `Betaling frigjort — ${itemTitle}`,
          html: `<div style="font-family:-apple-system,sans-serif;color:#1c1917;max-width:560px">
            <h2 style="margin:0 0 8px;font-size:18px">Kjøper bekreftet mottak!</h2>
            <div style="background:#f0fdf4;padding:16px;border-radius:12px;margin-bottom:16px">
              <p style="margin:0 0 4px;font-size:13px;color:#166534">Du mottar</p>
              <p style="margin:0;font-size:22px;font-weight:700;color:#16a34a">${fmt(sellerReceives)}</p>
              <p style="margin:6px 0 0;font-size:12px;color:#a8a29e">Salgspris ${fmt(order.amount_nok)} − 7% plattformavgift (${fmt(order.platform_fee_nok)})</p>
            </div>
            <p style="font-size:14px;color:#57534e">Betalingen er overført til din Stripe-konto og vil utbetales etter Stripes normale utbetalingsplan.</p>
            <a href="https://dashboard.stripe.com/express" style="display:inline-block;background:#1c1917;color:#fafaf9;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:500;font-size:14px">Åpne Stripe-dashboard</a>
            <p style="color:#a8a29e;font-size:12px;margin:24px 0 0">Aktivbruk — bruktmarked for treningsklær</p>
          </div>`,
        }),
      }) : Promise.resolve(),
    ]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[orders/confirm POST]", err);
    return NextResponse.json({ error: "Noe gikk galt, prøv igjen" }, { status: 500 });
  }
}
