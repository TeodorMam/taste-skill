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

type ItemRecord = {
  id: number;
  title: string;
  price: number;
  brand?: string;
  category?: string;
  size?: string;
  condition?: string;
  location?: string;
  shipping?: string;
  seller_id: string;
  is_sold: boolean;
};

type Filters = Record<string, string>;

function itemMatchesFilters(item: ItemRecord, filters: Filters): boolean {
  if (filters.brand && item.brand !== filters.brand) return false;
  if (filters.size && item.size !== filters.size) return false;
  if (filters.condition && item.condition !== filters.condition) return false;
  if (filters.location && item.location !== filters.location) return false;
  if (filters.shipping === "sendes" && item.shipping === "Kun henting") return false;
  if (filters.q) {
    const needle = filters.q.toLowerCase();
    const haystack = `${item.title} ${item.brand ?? ""}`.toLowerCase();
    if (!haystack.includes(needle)) return false;
  }
  return true;
}

export async function POST(req: Request) {
  if (!WEBHOOK_SECRET || !SERVICE_ROLE_KEY || !RESEND_API_KEY)
    return NextResponse.json({ error: "not configured" }, { status: 500 });
  if (req.headers.get("x-webhook-secret") !== WEBHOOK_SECRET)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const payload = await req.json();
  if (payload.type !== "INSERT" || payload.table !== "items")
    return NextResponse.json({ ok: true, skipped: true });

  const item: ItemRecord = payload.record;
  if (item.is_sold) return NextResponse.json({ ok: true, skipped: "already sold" });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  const { data: searches } = await admin
    .from("saved_searches")
    .select("user_id, filters, last_seen_at")
    .neq("user_id", item.seller_id);

  if (!searches?.length) return NextResponse.json({ ok: true, skipped: "no searches" });

  const link = `${SITE_URL}/item/${item.id}`;
  const price = new Intl.NumberFormat("nb-NO").format(item.price);

  // Group by user so each user gets max 1 email per new item event
  const notified = new Set<string>();

  for (const search of searches) {
    if (notified.has(search.user_id)) continue;
    if (!itemMatchesFilters(item, search.filters as Filters)) continue;

    const { data: userData } = await admin.auth.admin.getUserById(search.user_id);
    const email = userData.user?.email;
    if (!email) continue;

    const subject = `Ny vare matcher ditt søk: "${item.title}"`;
    await sendEmail(email, subject, `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1c1917;max-width:560px">
        <h2 style="margin:0 0 8px;font-size:18px">${subject}</h2>
        <div style="background:#f5f5f4;padding:16px;border-radius:12px;margin-bottom:16px">
          <p style="margin:0 0 4px;font-size:15px;font-weight:600">${item.title}</p>
          <p style="margin:0;font-size:18px;font-weight:700">${price} kr</p>
          ${item.brand ? `<p style="margin:4px 0 0;font-size:13px;color:#78716c">${item.brand}${item.size ? ` · Str. ${item.size}` : ""}</p>` : ""}
        </div>
        <a href="${link}" style="display:inline-block;background:#1c1917;color:#fafaf9;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:500;font-size:14px">
          Se annonsen
        </a>
        <p style="color:#a8a29e;font-size:12px;margin:24px 0 0">Aktivbruk — bruktmarked for treningsklær</p>
      </div>
    `);

    notified.add(search.user_id);
  }

  return NextResponse.json({ ok: true, notified: notified.size });
}

async function sendEmail(to: string, subject: string, html: string) {
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  });
}
