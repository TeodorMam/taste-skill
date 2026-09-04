import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createSupabaseServerClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const RESEND_API_KEY = process.env.RESEND_API_KEY!;
const FROM_EMAIL = process.env.RESEND_FROM ?? "Aktivbruk <kontakt@aktivbruk.com>";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aktivbruk.com";
const REVIEW_HOURS = 48;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: orderId } = await params;
    const cookieStore = await cookies();
    const supabase = createSupabaseServerClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Logg inn først" }, { status: 401 });

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const { data: order } = await admin.from("orders")
      .select("id, status, seller_id, buyer_id, item_id")
      .eq("id", orderId).maybeSingle();

    if (!order) return NextResponse.json({ error: "Ordre ikke funnet" }, { status: 404 });
    // Buyer marks as received — not the seller
    if (order.buyer_id !== user.id) return NextResponse.json({ error: "Ikke autorisert" }, { status: 403 });
    if (order.status !== "shipped") return NextResponse.json({ error: `Ordre er i status '${order.status}'` }, { status: 400 });

    const now = new Date();
    const deadline = new Date(now.getTime() + REVIEW_HOURS * 60 * 60 * 1000);

    await admin.from("orders").update({
      status: "delivered",
      delivered_at: now.toISOString(),
      review_deadline: deadline.toISOString(),
    }).eq("id", orderId);

    // Insert a delivered system message into the chat timeline
    await admin.from("messages").insert({
      item_id: String(order.item_id),
      buyer_id: order.buyer_id,
      sender_id: order.buyer_id,
      body: "",
      message_type: "delivered",
      metadata: { order_id: orderId },
    });

    // Email seller so they know buyer received it
    const [sellerRes, itemRes] = await Promise.all([
      admin.auth.admin.getUserById(order.seller_id),
      order.item_id ? admin.from("items").select("title").eq("id", order.item_id).maybeSingle() : Promise.resolve({ data: null }),
    ]);
    const sellerEmail = sellerRes.data.user?.email;
    const itemTitle = (itemRes as { data: { title: string } | null }).data?.title ?? "varen";

    if (sellerEmail) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
        body: JSON.stringify({
          from: FROM_EMAIL, to: sellerEmail,
          subject: `Kjøper har mottatt «${itemTitle}»`,
          html: `<div style="font-family:-apple-system,sans-serif;color:#1c1917;max-width:560px">
            <h2 style="margin:0 0 8px;font-size:18px">Kjøper bekreftet mottak!</h2>
            <p style="font-size:14px;color:#57534e">Kjøper har mottatt <strong>${itemTitle}</strong> og har ${REVIEW_HOURS} timer på å bekrefte at alt er ok eller melde problem. Hvis de ikke gjør noe, utbetales betalingen automatisk til deg.</p>
            <a href="${SITE_URL}/orders" style="display:inline-block;background:#1c1917;color:#fafaf9;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:500;font-size:14px">Se mine ordre</a>
            <p style="color:#a8a29e;font-size:12px;margin:24px 0 0">Aktivbruk — bruktmarked for treningsklær</p>
          </div>`,
        }),
      });
    }

    return NextResponse.json({ ok: true, review_deadline: deadline.toISOString() });
  } catch (err) {
    console.error("[orders/deliver POST]", err);
    return NextResponse.json({ error: "Noe gikk galt, prøv igjen" }, { status: 500 });
  }
}
