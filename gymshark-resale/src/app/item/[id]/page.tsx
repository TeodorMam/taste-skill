"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { type Item } from "@/lib/supabase";
import { createClient } from "@/utils/supabase/client";
import { ChatPanel } from "@/components/ChatPanel";

export default function ItemPage() {
  const params = useParams<{ id: string }>();
  const supabase = useMemo(() => createClient(), []);
  const [item, setItem] = useState<Item | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null | undefined>(undefined);

  const [buyerThreads, setBuyerThreads] = useState<string[]>([]);
  const [activeBuyer, setActiveBuyer] = useState<string | null>(null);

  useEffect(() => {
    if (!params.id) return;
    supabase
      .from("items")
      .select("*")
      .eq("id", params.id)
      .single()
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setItem(data as Item);
      });
    supabase.auth
      .getUser()
      .then(({ data }) => setUserId(data.user?.id ?? null));
  }, [params.id, supabase]);

  const isSeller = !!item && !!userId && userId === item.seller_id;

  useEffect(() => {
    if (!item || !isSeller) return;
    supabase
      .from("messages")
      .select("buyer_id, created_at")
      .eq("item_id", item.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        const seen = new Set<string>();
        const ordered: string[] = [];
        for (const row of (data ?? []) as { buyer_id: string }[]) {
          if (!seen.has(row.buyer_id)) {
            seen.add(row.buyer_id);
            ordered.push(row.buyer_id);
          }
        }
        setBuyerThreads(ordered);
        setActiveBuyer((prev) => prev ?? ordered[0] ?? null);
      });
  }, [item, isSeller, supabase]);

  async function toggleSold() {
    if (!item) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("items")
      .update({ is_sold: !item.is_sold })
      .eq("id", item.id)
      .select("*")
      .single();
    setSaving(false);
    if (error) setError(error.message);
    else if (data) setItem(data as Item);
  }

  if (error) {
    return (
      <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
    );
  }
  if (!item) {
    return <p className="text-sm text-neutral-500">Loading…</p>;
  }

  return (
    <article className="space-y-6">
      <Link href="/browse" className="text-sm text-neutral-500 hover:text-black">
        ← Back to browse
      </Link>

      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
        <div className="relative aspect-square w-full bg-neutral-100">
          {item.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.image_url} alt={item.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-neutral-400">
              No image
            </div>
          )}
          {item.is_sold && (
            <div className="absolute left-3 top-3 rounded-full bg-black px-3 py-1 text-xs font-medium text-white">
              Sold
            </div>
          )}
        </div>

        <div className="space-y-4 p-4 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h1 className="text-xl font-semibold tracking-tight">{item.title}</h1>
            <p className="text-xl font-semibold">{item.price} kr</p>
          </div>

          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-neutral-500">Size</dt>
            <dd className="text-right">{item.size}</dd>
            <dt className="text-neutral-500">Condition</dt>
            <dd className="text-right">{item.condition}</dd>
            <dt className="text-neutral-500">Location</dt>
            <dd className="text-right">{item.location}</dd>
            <dt className="text-neutral-500">Posted</dt>
            <dd className="text-right">
              {new Date(item.created_at).toLocaleDateString()}
            </dd>
          </dl>

          {userId === null && (
            <Link
              href={`/login?next=/item/${item.id}`}
              className="block w-full rounded-full bg-black px-5 py-3 text-center text-sm font-medium text-white hover:bg-neutral-800"
            >
              Sign in to chat with seller
            </Link>
          )}

          {userId && !item.seller_id && (
            <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
              This listing was posted before accounts existed, so chat isn&rsquo;t
              available. Use the contact field below instead.
            </p>
          )}

          {userId && item.seller_id && !isSeller && (
            <ChatPanel
              itemId={item.id}
              buyerId={userId}
              sellerId={item.seller_id}
              meId={userId}
            />
          )}

          {isSeller && item.seller_id && (
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-neutral-800">
                {buyerThreads.length
                  ? `Conversations (${buyerThreads.length})`
                  : "No buyer messages yet"}
              </h2>
              {buyerThreads.length > 1 && (
                <div className="flex flex-wrap gap-2">
                  {buyerThreads.map((b, i) => (
                    <button
                      key={b}
                      onClick={() => setActiveBuyer(b)}
                      className={`rounded-full border px-3 py-1 text-xs ${
                        activeBuyer === b
                          ? "border-black bg-black text-white"
                          : "border-neutral-300 text-neutral-700 hover:border-neutral-500"
                      }`}
                    >
                      Buyer {i + 1}
                    </button>
                  ))}
                </div>
              )}
              {activeBuyer && (
                <ChatPanel
                  itemId={item.id}
                  buyerId={activeBuyer}
                  sellerId={item.seller_id}
                  meId={userId}
                />
              )}
            </div>
          )}

          <details className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm">
            <summary className="cursor-pointer text-neutral-600">
              Off-platform contact
            </summary>
            <p className="mt-2 break-all font-medium">{item.contact}</p>
          </details>

          {isSeller && (
            <button
              onClick={toggleSold}
              disabled={saving}
              className="w-full rounded-full border border-neutral-300 bg-white px-5 py-3 text-sm font-medium hover:border-neutral-500 disabled:opacity-50"
            >
              {saving
                ? "Saving…"
                : item.is_sold
                  ? "Mark as available"
                  : "Mark as sold"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
