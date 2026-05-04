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
    if (order.seller_id !== user.id) return NextResponse.json({ error: "Ikke autorisert" }, { status: 403 });
    if (order.status !== "shipped") return NextResponse.json({ error: `Ordre er i status '${order.status}', kan ikke markere som levert` }, { status: 400 });

    const now = new Date();
    const deadline = new Date(now.getTime() + REVIEW_HOURS * 60 * 60 * 1000);

    await admin.from("orders").update({
      status: "delivered",
      delivered_at: now.toISOString(),
      review_deadline: deadline.toISOString(),
    }).eq("id", orderId);

    const [buyerRes, itemRes] = await Promise.all([
      admin.auth.admin.getUserById(order.buyer_id),
      order.item_id ? admin.from("items").select("title").eq("id", order.item_id).maybeSingle() : Promise.resolve({ data: null }),
    ]);
    const buyerEmail = buyerRes.data.user?.email;
    const itemTitle = (itemRes as { data: { title: string } | null }).data?.title ?? "varen";

    if (buyerEmail) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
        body: JSON.stringify({
          from: FROM_EMAIL, to: buyerEmail,
          subject: `Bekreft mottak av «${itemTitle}»`,
          html: `<div style="font-family:-apple-system,sans-serif;color:#1c1917;max-width:560px">
            <h2 style="margin:0 0 8px;font-size:18px">Har du mottatt varen?</h2>
            <p style="margin:0 0 12px;font-size:14px;color:#57534e">Selger har markert <strong>${itemTitle}</strong> som levert.</p>
            <p style="margin:0 0 16px;font-size:14px;color:#57534e">Du har <strong>${REVIEW_HOURS} timer</strong> på å bekrefte mottak eller melde et problem. Hvis du ikke gjør noe, frigjøres betalingen automatisk til selger.</p>
            <div style="display:flex;gap:12px;margin-bottom:16px">
              <a href="${SITE_URL}/orders" style="display:inline-block;background:#16a34a;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:500;font-size:14px">Alt OK — bekreft mottak</a>
              <a href="${SITE_URL}/orders" style="display:inline-block;background:#fff;color:#1c1917;border:1px solid #d6d3d1;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:500;font-size:14px">Meld problem</a>
            </div>
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
