import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const WEBHOOK_SECRET = process.env.MESSAGE_WEBHOOK_SECRET!;
const RESEND_API_KEY = process.env.RESEND_API_KEY!;
const FROM_EMAIL = process.env.RESEND_FROM ?? "Aktivbruk <kontakt@aktivbruk.com>";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aktivbruk.com";

export async function POST(req: Request) {
  if (!WEBHOOK_SECRET || !SERVICE_ROLE_KEY || !RESEND_API_KEY)
    return NextResponse.json({ error: "not configured" }, { status: 500 });
  if (req.headers.get("x-webhook-secret") !== WEBHOOK_SECRET)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const payload = await req.json();
  if (payload.type !== "INSERT" || payload.table !== "offers")
    return NextResponse.json({ ok: true, skipped: true });

  const offer = payload.record;
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  const { data: item } = await admin
    .from("items").select("id, title, seller_id").eq("id", offer.item_id).maybeSingle();
  if (!item?.seller_id || item.seller_id === offer.buyer_id)
    return NextResponse.json({ ok: true, skipped: "no seller or self-offer" });

  const { data: sellerData } = await admin.auth.admin.getUserById(item.seller_id);
  const sellerEmail = sellerData.user?.email;
  if (!sellerEmail) return NextResponse.json({ ok: true, skipped: "no email" });

  const price = new Intl.NumberFormat("nb-NO").format(offer.amount);
  const link = `${SITE_URL}/item/${item.id}`;
  const subject = `Du har fått et bud på "${item.title}"`;

  await sendEmail(sellerEmail, subject, `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1c1917;max-width:560px">
      <h2 style="margin:0 0 8px;font-size:18px">${subject}</h2>
      <div style="background:#f5f5f4;padding:16px;border-radius:12px;margin-bottom:16px">
        <p style="margin:0;font-size:22px;font-weight:700">${price} kr</p>
      </div>
      <a href="${link}" style="display:inline-block;background:#1c1917;color:#fafaf9;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:500;font-size:14px">
        Se budet
      </a>
      <p style="color:#a8a29e;font-size:12px;margin:24px 0 0">Aktivbruk — bruktmarked for treningsklær</p>
    </div>
  `);

  return NextResponse.json({ ok: true });
}

async function sendEmail(to: string, subject: string, html: string) {
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  });
}
