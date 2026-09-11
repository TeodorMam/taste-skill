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

type Body = {
  offer_id: string;
  cancelled_by: "buyer" | "seller";
  was_accepted: boolean;
};

export async function POST(req: NextRequest) {
  try {
    if (!SERVICE_ROLE_KEY || !RESEND_API_KEY)
      return NextResponse.json({ error: "not configured" }, { status: 500 });

    const cookieStore = await cookies();
    const supabase = createSupabaseServerClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { offer_id, cancelled_by, was_accepted } = (await req.json()) as Body;
    if (!offer_id || !cancelled_by) return NextResponse.json({ error: "missing fields" }, { status: 400 });

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

    const { data: offer } = await admin
      .from("offers")
      .select("id, amount, buyer_id, item_id")
      .eq("id", offer_id)
      .maybeSingle();
    if (!offer) return NextResponse.json({ error: "offer not found" }, { status: 404 });

    const { data: item } = await admin
      .from("items")
      .select("id, title, seller_id")
      .eq("id", offer.item_id)
      .maybeSingle();
    if (!item?.seller_id) return NextResponse.json({ ok: true, skipped: "no seller" });

    // Authorization: only the buyer or seller involved can trigger this
    if (user.id !== offer.buyer_id && user.id !== item.seller_id)
      return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const [buyerRes, sellerRes] = await Promise.all([
      admin.auth.admin.getUserById(offer.buyer_id),
      admin.auth.admin.getUserById(item.seller_id),
    ]);
    const buyerEmail = buyerRes.data.user?.email;
    const sellerEmail = sellerRes.data.user?.email;
    const price = new Intl.NumberFormat("nb-NO").format(offer.amount);
    const link = `${SITE_URL}/item/${item.id}`;

    const actor = cancelled_by === "buyer" ? "Kjøper" : "Selger";
    const stateNote = was_accepted ? "det godkjente budet" : "budet";
    const subject = `${actor} avbrøt ${stateNote} på "${item.title}"`;

    function html(recipient: "buyer" | "seller") {
      const audienceLine = recipient === cancelled_by
        ? `Du avbrøt ${stateNote} på <strong>${escape(item!.title)}</strong>.`
        : `${actor} avbrøt ${stateNote} på <strong>${escape(item!.title)}</strong>.`;
      return `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1c1917;max-width:560px">
          <h2 style="margin:0 0 8px;font-size:18px">${subject}</h2>
          <p style="margin:0 0 12px;font-size:14px;color:#57534e">${audienceLine}</p>
          <div style="background:#f5f5f4;padding:16px;border-radius:12px;margin-bottom:16px">
            <p style="margin:0 0 4px;font-size:13px;color:#78716c">Budbeløp</p>
            <p style="margin:0;font-size:22px;font-weight:700">${price} kr</p>
          </div>
          <a href="${link}" style="display:inline-block;background:#1c1917;color:#fafaf9;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:500;font-size:14px">
            Se annonsen
          </a>
          <p style="color:#a8a29e;font-size:12px;margin:24px 0 0">Aktivbruk — bruktmarked for treningsklær</p>
        </div>
      `;
    }

    await Promise.all([
      buyerEmail ? sendEmail(buyerEmail, subject, html("buyer")) : Promise.resolve(),
      sellerEmail ? sendEmail(sellerEmail, subject, html("seller")) : Promise.resolve(),
    ]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[offer-cancel-notify POST]", err);
    return NextResponse.json({ error: "notification failed" }, { status: 500 });
  }
}

async function sendEmail(to: string, subject: string, html: string) {
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  });
}

function escape(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
