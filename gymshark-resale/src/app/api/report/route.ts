import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseServerClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RESEND_API_KEY = process.env.RESEND_API_KEY!;
const FROM_EMAIL = process.env.RESEND_FROM ?? "Aktivbruk <kontakt@aktivbruk.com>";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "kontakt@aktivbruk.com";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aktivbruk.com";

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createSupabaseServerClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();

    const body = await req.json() as { type: "listing" | "user"; targetId: string; reason?: string };
    if (!body.type || !body.targetId) {
      return NextResponse.json({ error: "Mangler data" }, { status: 400 });
    }

    const isListing = body.type === "listing";
    const targetUrl = isListing
      ? `${SITE_URL}/item/${body.targetId}`
      : `${SITE_URL}/seller/${body.targetId}`;

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: ADMIN_EMAIL,
        subject: `Rapport: ${isListing ? "Annonse" : "Bruker"} innrapportert`,
        html: `<div style="font-family:-apple-system,sans-serif;font-size:14px;color:#1c1917">
          <h2 style="font-size:16px;margin:0 0 12px">${isListing ? "Annonse" : "Bruker"} innrapportert</h2>
          <p><strong>Type:</strong> ${isListing ? "Annonse" : "Bruker"}</p>
          <p><strong>ID:</strong> ${body.targetId}</p>
          <p><strong>URL:</strong> <a href="${targetUrl}">${targetUrl}</a></p>
          <p><strong>Rapportert av:</strong> ${user ? `${user.email} (${user.id})` : "Ikke innlogget"}</p>
          ${body.reason ? `<p><strong>Begrunnelse:</strong> ${body.reason}</p>` : "<p><em>Ingen begrunnelse gitt</em></p>"}
        </div>`,
      }),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[report POST]", err);
    return NextResponse.json({ error: "Noe gikk galt" }, { status: 500 });
  }
}
