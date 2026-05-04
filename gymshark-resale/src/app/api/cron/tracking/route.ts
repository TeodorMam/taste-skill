import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isPackageDelivered, type Carrier } from "@/lib/tracking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const CRON_SECRET = process.env.CRON_SECRET ?? "";
const RESEND_API_KEY = process.env.RESEND_API_KEY!;
const FROM_EMAIL = process.env.RESEND_FROM ?? "Aktivbruk <kontakt@aktivbruk.com>";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aktivbruk.com";
const REVIEW_HOURS = 48;

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret") ?? req.nextUrl.searchParams.get("secret") ?? "";
  if (CRON_SECRET && secret !== CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  // Fetch all shipped orders that have a trackable carrier
  const { data: orders } = await admin
    .from("orders")
    .select("id, carrier, tracking_info, buyer_id, seller_id, item_id")
    .eq("status", "shipped")
    .not("tracking_info", "is", null)
    .not("carrier", "is", null)
    .neq("carrier", "other");

  if (!orders || orders.length === 0) {
    return NextResponse.json({ checked: 0 });
  }

  const results: { id: string; delivered: boolean; error?: string }[] = [];

  for (const order of orders) {
    try {
      const delivered = await isPackageDelivered(
        order.carrier as Carrier,
        order.tracking_info as string,
      );

      if (!delivered) {
        results.push({ id: order.id, delivered: false });
        continue;
      }

      // Mark as delivered and start review clock
      const now = new Date();
      const deadline = new Date(now.getTime() + REVIEW_HOURS * 60 * 60 * 1000);

      await admin.from("orders").update({
        status: "delivered",
        delivered_at: now.toISOString(),
        review_deadline: deadline.toISOString(),
      }).eq("id", order.id);

      // Notify buyer
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
            subject: `Varen er levert — ${itemTitle}`,
            html: `<div style="font-family:-apple-system,sans-serif;color:#1c1917;max-width:560px">
              <h2 style="margin:0 0 8px;font-size:18px">Varen er levert!</h2>
              <p style="margin:0 0 8px;font-size:14px;color:#57534e">Du har nå <strong>${REVIEW_HOURS} timer</strong> på å:</p>
              <ul style="margin:0 0 12px;padding-left:20px;font-size:14px;color:#57534e">
                <li>Bekrefte at alt er i orden</li>
                <li>Melde fra om et problem</li>
              </ul>
              <p style="margin:0 0 16px;font-size:14px;color:#57534e">Hvis du bekrefter at alt er OK, utbetales pengene til selger med én gang. Hvis du ikke gjør noe innen ${REVIEW_HOURS} timer, skjer dette automatisk.</p>
              <a href="${SITE_URL}/orders" style="display:inline-block;background:#1c1917;color:#fafaf9;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:500;font-size:14px">Se dine ordre</a>
              <p style="color:#a8a29e;font-size:12px;margin:24px 0 0">Aktivbruk — bruktmarked for treningsklær</p>
            </div>`,
          }),
        });
      }

      results.push({ id: order.id, delivered: true });
    } catch (err) {
      console.error(`[cron/tracking] order ${order.id}:`, err);
      results.push({ id: order.id, delivered: false, error: String(err) });
    }
  }

  return NextResponse.json({
    checked: results.length,
    delivered: results.filter((r) => r.delivered).length,
    results,
  });
}
