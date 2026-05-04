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
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "kontakt@aktivbruk.com";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: orderId } = await params;
    const cookieStore = await cookies();
    const supabase = createSupabaseServerClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Logg inn først" }, { status: 401 });

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const { data: order } = await admin.from("orders")
      .select("id, status, buyer_id, seller_id, amount_nok, item_id, payout_transfer_id")
      .eq("id", orderId).maybeSingle();

    if (!order) return NextResponse.json({ error: "Ordre ikke funnet" }, { status: 404 });
    if (order.buyer_id !== user.id) return NextResponse.json({ error: "Ikke autorisert" }, { status: 403 });
    if (order.status !== "delivered") return NextResponse.json({ error: `Ordre er i status '${order.status}', kan ikke melde problem nå` }, { status: 400 });
    if (order.payout_transfer_id) return NextResponse.json({ error: "Betaling er allerede frigjort" }, { status: 400 });

    const body = await req.json().catch(() => ({})) as { reason?: string };
    const reason = body.reason?.trim() ?? "";

    await admin.from("orders").update({
      status: "disputed",
      disputed_at: new Date().toISOString(),
      dispute_reason: reason || null,
    }).eq("id", orderId);

    // Notify all parties — no payout, no refund
    const [buyerRes, sellerRes, itemRes] = await Promise.all([
      admin.auth.admin.getUserById(order.buyer_id),
      admin.auth.admin.getUserById(order.seller_id),
      order.item_id ? admin.from("items").select("title").eq("id", order.item_id).maybeSingle() : Promise.resolve({ data: null }),
    ]);
    const buyerEmail = buyerRes.data.user?.email;
    const sellerEmail = sellerRes.data.user?.email;
    const itemTitle = (itemRes as { data: { title: string } | null }).data?.title ?? "varen";
    const fmt = (n: number) => new Intl.NumberFormat("nb-NO").format(n) + " kr";

    await Promise.all([
      buyerEmail ? fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
        body: JSON.stringify({
          from: FROM_EMAIL, to: buyerEmail,
          subject: `Problem meldt — ${itemTitle}`,
          html: `<div style="font-family:-apple-system,sans-serif;color:#1c1917;max-width:560px">
            <h2 style="margin:0 0 8px;font-size:18px">Vi har mottatt din melding</h2>
            <p style="font-size:14px;color:#57534e">Du har meldt et problem med <strong>${itemTitle}</strong>. Betalingen på <strong>${fmt(order.amount_nok)}</strong> er satt på vent — ingen penger overføres til selger.</p>
            <p style="font-size:14px;color:#57534e">Vi vil ta kontakt med deg og selger for å løse saken. Ingen automatisk refusjon skjer — vi behandler dette manuelt.</p>
            <p style="font-size:14px;color:#57534e">Kontakt oss på <a href="mailto:${ADMIN_EMAIL}">${ADMIN_EMAIL}</a> hvis du har spørsmål.</p>
            <p style="color:#a8a29e;font-size:12px;margin:24px 0 0">Aktivbruk — bruktmarked for treningsklær</p>
          </div>`,
        }),
      }) : Promise.resolve(),
      sellerEmail ? fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
        body: JSON.stringify({
          from: FROM_EMAIL, to: sellerEmail,
          subject: `Kjøper har meldt problem — ${itemTitle}`,
          html: `<div style="font-family:-apple-system,sans-serif;color:#1c1917;max-width:560px">
            <h2 style="margin:0 0 8px;font-size:18px">Kjøper har meldt et problem</h2>
            <p style="font-size:14px;color:#57534e">Kjøper har meldt et problem med <strong>${itemTitle}</strong>. Betalingen på <strong>${fmt(order.amount_nok)}</strong> er satt på vent mens vi undersøker saken.</p>
            ${reason ? `<p style="font-size:14px;color:#57534e">Årsak oppgitt av kjøper: <em>${reason}</em></p>` : ""}
            <p style="font-size:14px;color:#57534e">Vi vil kontakte deg for mer informasjon. Ingen automatisk refusjon skjer.</p>
            <p style="color:#a8a29e;font-size:12px;margin:24px 0 0">Aktivbruk — bruktmarked for treningsklær</p>
          </div>`,
        }),
      }) : Promise.resolve(),
      // Alert admin
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
        body: JSON.stringify({
          from: FROM_EMAIL, to: ADMIN_EMAIL,
          subject: `[Tvist] Ordre ${orderId} — ${itemTitle}`,
          html: `<p>Ordre: ${orderId}<br>Vare: ${itemTitle}<br>Beløp: ${fmt(order.amount_nok)}<br>Kjøper: ${buyerEmail ?? order.buyer_id}<br>Selger: ${sellerEmail ?? order.seller_id}<br>Årsak: ${reason || "(ikke oppgitt)"}<br><br><a href="${SITE_URL}/orders">Administrer</a></p>`,
        }),
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[orders/dispute POST]", err);
    return NextResponse.json({ error: "Noe gikk galt, prøv igjen" }, { status: 500 });
  }
}
