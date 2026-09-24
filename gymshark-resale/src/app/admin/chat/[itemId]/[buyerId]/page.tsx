import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminDb, fmtWhen, fmtAgo } from "@/lib/admin";
import {
  type Item,
  type Message,
  type Profile,
  formatPrice,
  profileDisplayName,
} from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Admin, samtale",
  robots: { index: false, follow: false },
};

/**
 * Read-only view of one chat thread, for handling disputes, abuse reports and
 * support questions. The privacy policy names those purposes as why messages
 * are retained.
 *
 * Read-only on purpose. There is no way to post from here: a message from the
 * platform owner appearing inside a conversation between two other people,
 * with no indication of who sent it, would be worse than useless.
 */

/** Lifecycle events carry their meaning in message_type, not in body. */
const SYSTEM_LABELS: Record<string, string> = {
  bid: "💸 Bud",
  bid_accepted: "✅ Bud godtatt",
  payment: "✅ Betaling gjennomført",
  shipped: "📦 Varen er sendt",
  delivered: "📬 Varen er levert",
  payout: "💰 Utbetaling sendt",
};

function systemText(m: Message): string {
  const label = SYSTEM_LABELS[m.message_type] ?? m.message_type;
  const amount = (m.metadata as { amount?: number; amount_nok?: number } | null);
  const value = amount?.amount ?? amount?.amount_nok;
  return value ? `${label}: ${formatPrice(value)}` : label;
}

export default async function AdminThreadPage({
  params,
}: {
  params: Promise<{ itemId: string; buyerId: string }>;
}) {
  const { itemId, buyerId } = await params;
  const db = await requireAdminDb();

  if (!db) {
    return (
      <div className="space-y-4 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">Samtale</h1>
        <p className="rounded-2xl border border-dashed border-stone-200 bg-white px-4 py-8 text-center text-sm text-stone-500">
          SUPABASE_SERVICE_ROLE_KEY mangler i miljøet.
        </p>
      </div>
    );
  }

  const [itemRes, messagesRes] = await Promise.all([
    db.from("items").select("*").eq("id", itemId).maybeSingle(),
    db
      .from("messages")
      .select("*")
      .eq("item_id", itemId)
      .eq("buyer_id", buyerId)
      .order("created_at", { ascending: true }),
  ]);

  const messages = (messagesRes.data ?? []) as Message[];
  const item = (itemRes.data as Item | null) ?? null;

  // A thread with no messages is not a thread. Better a 404 than an empty
  // shell that looks like the data failed to load.
  if (messages.length === 0) notFound();

  const sellerId = item?.seller_id ?? null;
  const ids = [...new Set([buyerId, sellerId].filter((x): x is string => !!x))];
  const profileMap: Record<string, Profile> = {};
  if (ids.length > 0) {
    const { data } = await db.from("profiles_public").select("*").in("user_id", ids);
    for (const p of (data ?? []) as Profile[]) profileMap[p.user_id] = p;
  }

  const buyerName = profileDisplayName(profileMap[buyerId], buyerId);
  const sellerName = profileDisplayName(sellerId ? profileMap[sellerId] : null, sellerId);
  const last = messages[messages.length - 1];

  return (
    <div className="space-y-6 py-8 sm:py-10">
      <div>
        <Link href="/admin" className="text-xs text-stone-500 hover:text-black">
          ← Tilbake til admin
        </Link>
      </div>

      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
          {item?.title ?? "Slettet vare"}
        </h1>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-stone-500">
          <span>
            <span className="font-medium text-stone-700">{buyerName}</span> og{" "}
            <span className="font-medium text-stone-700">{sellerName}</span>
          </span>
          {item && <span className="text-stone-300">·</span>}
          {item && <span>{formatPrice(item.price)}</span>}
          <span className="text-stone-300">·</span>
          <span>
            {messages.length} {messages.length === 1 ? "melding" : "meldinger"}
          </span>
          <span className="text-stone-300">·</span>
          <span>siste {fmtAgo(last.created_at)}</span>
        </div>
        {item && (
          <Link
            href={`/vare/${item.id}`}
            className="inline-block text-xs font-medium text-[#5a6b32] underline underline-offset-2 hover:text-[#435022]"
          >
            Se annonsen
          </Link>
        )}
      </header>

      <div className="flex items-center gap-4 rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-xs text-stone-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-stone-200" />
          {buyerName} (kjøper)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-stone-900" />
          {sellerName} (selger)
        </span>
        <span className="ml-auto text-stone-500">Kun lesing</span>
      </div>

      <div className="space-y-3 rounded-2xl border border-stone-200 bg-white p-4">
        {messages.map((m) => {
          const type = m.message_type ?? "text";

          if (SYSTEM_LABELS[type]) {
            return (
              <div key={m.id} className="flex justify-center py-1">
                <span className="rounded-full bg-[#5a6b32]/10 px-3 py-1 text-[11px] font-medium text-[#435022]">
                  {systemText(m)} · {fmtWhen(m.created_at)}
                </span>
              </div>
            );
          }

          // Right-aligned and dark for the seller, matching how the seller sees
          // this same conversation in their own inbox.
          const fromSeller = !!sellerId && m.sender_id === sellerId;
          return (
            <div key={m.id} className={`flex flex-col ${fromSeller ? "items-end" : "items-start"}`}>
              {m.image_url ? (
                <a
                  href={m.image_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="max-w-[75%]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.image_url} alt="" className="max-h-56 w-full rounded-2xl object-cover" />
                </a>
              ) : (
                <div
                  className={`max-w-[75%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                    fromSeller ? "bg-stone-900 text-stone-50" : "bg-stone-100 text-stone-900"
                  }`}
                >
                  {m.body}
                </div>
              )}
              <span className="mt-0.5 px-1 text-[10px] text-stone-500">
                {fromSeller ? sellerName : buyerName} · {fmtWhen(m.created_at)}
                {m.edited_at ? " · redigert" : ""}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
