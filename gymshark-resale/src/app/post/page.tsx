"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { BUCKET, BRANDS, SIZES, CONDITIONS, AREAS } from "@/lib/supabase";
import { createClient } from "@/utils/supabase/client";

export default function PostPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [brand, setBrand] = useState("");
  const [size, setSize] = useState("M");
  const [price, setPrice] = useState("");
  const [condition, setCondition] = useState<(typeof CONDITIONS)[number]>("God");
  const [location, setLocation] = useState<string>(AREAS[0]);
  const [contact, setContact] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Skriv inn en tittel");
      return;
    }
    if (!brand.trim()) {
      setError("Velg et merke");
      return;
    }
    const priceNum = Number(price);
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      setError("Ugyldig pris");
      return;
    }
    if (!contact.trim()) {
      setError("Legg til Instagram eller telefonnummer");
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
          brand: brand.trim(),
          size,
          price: priceNum,
          condition,
          location,
          contact: contact.trim(),
          seller_id: userId,
          image_url,
        })
        .select("id")
        .single();
      if (insertErr) throw insertErr;

      router.push(`/item/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Noe gikk galt");
      setSubmitting(false);
    }
  }

  if (userId === undefined) {
    return <p className="py-6 text-sm text-stone-500">Laster…</p>;
  }
  if (userId === null) {
    return (
      <section className="space-y-4 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">Logg inn for å selge</h1>
        <p className="text-sm text-stone-600">
          Du trenger en kort innlogging så kjøpere kan sende deg melding.
        </p>
        <Link
          href="/login?next=/post"
          className="inline-block rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-stone-50 hover:bg-black"
        >
          Logg inn
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Legg ut vare</h1>
        <p className="mt-1 text-sm text-stone-500">
          Bare treningsklær. Fyll inn under ett minutt.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Bilde">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-stone-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-stone-50 hover:file:bg-black"
          />
        </Field>

        <Field label="Tittel">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="f.eks. Vital Seamless Hoodie"
            className={input}
            required
          />
        </Field>

        <Field label="Merke">
          <input
            type="text"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            list="brand-options"
            placeholder="Søk eller velg…"
            className={input}
            required
          />
          <datalist id="brand-options">
            {BRANDS.map((b) => (
              <option key={b} value={b} />
            ))}
          </datalist>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Størrelse">
            <select value={size} onChange={(e) => setSize(e.target.value)} className={input}>
              {SIZES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="Pris (NOK)">
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

        <Field label="Tilstand">
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

        <Field label="Sted">
          <select value={location} onChange={(e) => setLocation(e.target.value)} className={input}>
            {AREAS.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </Field>

        <Field label="Kontakt (Instagram eller telefon)">
          <input
            type="text"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="@brukernavn eller +47 ..."
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
          className="w-full rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-stone-50 hover:bg-black disabled:opacity-50"
        >
          {submitting ? "Legger ut…" : "Legg ut"}
        </button>
      </form>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-sm font-medium text-stone-800">{label}</span>
      {children}
    </label>
  );
}

const input =
  "block w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#5a6b32] focus:ring-1 focus:ring-[#5a6b32]/30";
