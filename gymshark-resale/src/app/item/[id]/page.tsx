"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase, type Item } from "@/lib/supabase";

export default function ItemPage() {
  const params = useParams<{ id: string }>();
  const [item, setItem] = useState<Item | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showContact, setShowContact] = useState(false);

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
  }, [params.id]);

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

          {!showContact ? (
            <button
              onClick={() => setShowContact(true)}
              disabled={item.is_sold}
              className="w-full rounded-full bg-black px-5 py-3 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
            >
              {item.is_sold ? "Item sold" : "Contact seller"}
            </button>
          ) : (
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm">
              <p className="text-neutral-500">Contact the seller directly:</p>
              <p className="mt-1 break-all font-medium">{item.contact}</p>
            </div>
          )}

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
          <p className="text-xs text-neutral-400">
            The sold toggle is open in this MVP — only the seller should use it.
          </p>
        </div>
      </div>
    </article>
  );
}
