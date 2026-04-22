import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const WEBHOOK_SECRET = process.env.MESSAGE_WEBHOOK_SECRET;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.RESEND_FROM ?? "Aktivbruk <noreply@aktivbruk.com>";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aktivbruk.com";

type MessageRow = {
  id: string;
  item_id: number | string;
  buyer_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

type WebhookPayload = {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: MessageRow;
};

export async function POST(req: Request) {
  if (!WEBHOOK_SECRET || !SERVICE_ROLE_KEY || !SUPABASE_URL || !RESEND_API_KEY) {
    return NextResponse.json({ error: "server not configured" }, { status: 500 });
  }

  const providedSecret = req.headers.get("x-webhook-secret");
  if (providedSecret !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let payload: WebhookPayload;
  try {
    payload = (await req.json()) as WebhookPayload;
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  if (payload.type !== "INSERT" || payload.table !== "messages") {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const msg = payload.record;
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { data: item } = await admin
    .from("items")
    .select("id, title, seller_id")
    .eq("id", msg.item_id)
    .maybeSingle();

  if (!item || !item.seller_id) {
    return NextResponse.json({ ok: true, skipped: "item or seller missing" });
  }

  const senderIsSeller = msg.sender_id === item.seller_id;
  const recipientId = senderIsSeller ? msg.buyer_id : item.seller_id;
  if (recipientId === msg.sender_id) {
    return NextResponse.json({ ok: true, skipped: "self message" });
  }

  const { data: recipientData } = await admin.auth.admin.getUserById(recipientId);
  const recipientEmail = recipientData.user?.email;
  if (!recipientEmail) {
    return NextResponse.json({ ok: true, skipped: "no recipient email" });
  }

  const title = item.title ?? "Ny melding";
  const preview = msg.body.length > 200 ? `${msg.body.slice(0, 200)}…` : msg.body;
  const link = `${SITE_URL}/item/${item.id}`;

  const subject = senderIsSeller
    ? `Selger svarte på "${title}"`
    : `Ny melding om "${title}"`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1c1917; max-width: 560px;">
      <h2 style="margin: 0 0 8px; font-size: 18px;">${subject}</h2>
      <p style="margin: 0 0 16px; color: #57534e; font-size: 14px;">På Aktivbruk</p>
      <div style="background: #f5f5f4; padding: 16px; border-radius: 12px; margin-bottom: 16px;">
        <p style="margin: 0; font-size: 15px; line-height: 1.5; white-space: pre-wrap;">${escapeHtml(preview)}</p>
      </div>
      <p style="margin: 0 0 16px;">
        <a href="${link}" style="display: inline-block; background: #1c1917; color: #fafaf9; padding: 12px 20px; border-radius: 999px; text-decoration: none; font-weight: 500; font-size: 14px;">
          Åpne samtalen
        </a>
      </p>
      <p style="color: #a8a29e; font-size: 12px; margin: 24px 0 0;">
        Du får denne e-posten fordi noen skrev til deg på Aktivbruk.
      </p>
    </div>
  `;

  const text = `${subject}\n\n${preview}\n\n${link}`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: recipientEmail,
      subject,
      html,
      text,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json(
      { error: "resend failed", detail: err },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
