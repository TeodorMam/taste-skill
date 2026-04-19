"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BUCKET } from "@/lib/supabase";
import { createClient } from "@/utils/supabase/client";

const CONDITIONS = ["New with tags", "Like new", "Good", "Fair"] as const;
const OSLO_AREAS = [
  "Oslo — Sentrum",
  "Oslo — Grünerløkka",
  "Oslo — Frogner",
  "Oslo — Majorstuen",
  "Oslo — Grønland",
  "Oslo — St. Hanshaugen",
  "Oslo — Other",
];

export default function PostPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [size, setSize] = useState("M");
  const [price, setPrice] = useState("");
  const [condition, setCondition] = useState<(typeof CONDITIONS)[number]>("Good");
  const [location, setLocation] = useState(OSLO_AREAS[0]);
  const [contact, setContact] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!/gymshark/i.test(title)) {
      setError("Only Gymshark items allowed");
      return;
    }
    const priceNum = Number(price);
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      setError("Please enter a valid price");
      return;
    }
    if (!contact.trim()) {
      setError("Add an Instagram handle or phone number");
      return;
    }

    setSubmitting(true);
    try {
      const sb = createClient();
      let image_url: string | null = null;
      if (file) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await sb.storage
          .from(BUCKET)
          .upload(path, file, { cacheControl: "3600", upsert: false });
        if (upErr) throw upErr;
        const { data } = sb.storage.from(BUCKET).getPublicUrl(path);
        image_url = data.publicUrl;
      }

      const { data, error: insertErr } = await sb
        .from("items")
        .insert({
          title: title.trim(),
          size,
          price: priceNum,
          condition,
          location,
          contact: contact.trim(),
          image_url,
        })
        .select("id")
        .single();
      if (insertErr) throw insertErr;

      router.push(`/item/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Post item</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Gymshark only. Title must include the word &ldquo;Gymshark&rdquo;.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Photo">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-black file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-neutral-800"
          />
        </Field>

        <Field label="Title">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Gymshark Vital Seamless Hoodie"
            className={input}
            required
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Size">
            <select value={size} onChange={(e) => setSize(e.target.value)} className={input}>
              {["XS", "S", "M", "L", "XL", "XXL"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="Price (NOK)">
            <input
              type="number"
              min={0}
              inputMode="numeric"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="250"
              className={input}
              required
            />
          </Field>
        </div>

        <Field label="Condition">
          <select
            value={condition}
            onChange={(e) => setCondition(e.target.value as (typeof CONDITIONS)[number])}
            className={input}
          >
            {CONDITIONS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>

        <Field label="Location (Oslo area)">
          <select value={location} onChange={(e) => setLocation(e.target.value)} className={input}>
            {OSLO_AREAS.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </Field>

        <Field label="Contact (Instagram handle or phone)">
          <input
            type="text"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="@yourhandle or +47 ..."
            className={input}
            required
          />
        </Field>

        {error && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-black px-5 py-3 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {submitting ? "Posting…" : "Post item"}
        </button>
      </form>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-sm font-medium text-neutral-800">{label}</span>
      {children}
    </label>
  );
}

const input =
  "block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-black";
