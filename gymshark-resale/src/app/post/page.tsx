"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BUCKET,
  BRANDS,
  SIZES,
  CONDITIONS,
  AREAS,
  MAX_IMAGES,
  SHIPPING_OPTIONS,
  CATEGORY_TREE,
  CATEGORY_PARENTS,
  type CategoryParent,
} from "@/lib/supabase";
import { POSTEN_PACKAGES } from "@/lib/shipping";
import { createClient } from "@/utils/supabase/client";
import { FirstListingTips } from "@/components/FirstListingTips";

type Slot = { id: string; file: File; preview: string };

function makeSlot(file: File): Slot {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    file,
    preview: URL.createObjectURL(file),
  };
}

export default function PostPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [brand, setBrand] = useState("");
  const [categoryParent, setCategoryParent] = useState<CategoryParent | "">("");
  const [category, setCategory] = useState("");
  const [size, setSize] = useState("M");
  const [price, setPrice] = useState("");
  const [condition, setCondition] = useState<(typeof CONDITIONS)[number]>("God");
  const [location, setLocation] = useState<string>(AREAS[0]);
  const [description, setDescription] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [shipping, setShipping] = useState<string>(SHIPPING_OPTIONS[0].value);
  const [packageSize, setPackageSize] = useState<string>("small");
  const [submitting, setSubmitting] = useState(false);
  const [uploadIdx, setUploadIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    return () => {
      slots.forEach((s) => URL.revokeObjectURL(s.preview));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const remaining = useMemo(() => MAX_IMAGES - slots.length, [slots.length]);

  function addFiles(picked: FileList | null) {
    if (!picked || picked.length === 0) return;
    const toAdd = Array.from(picked).slice(0, remaining).map(makeSlot);
    setSlots((prev) => [...prev, ...toAdd]);
  }

  function removeSlot(id: string) {
    setSlots((prev) => {
      const found = prev.find((s) => s.id === id);
      if (found) URL.revokeObjectURL(found.preview);
      return prev.filter((s) => s.id !== id);
    });
  }

  function moveSlot(id: string, dir: -1 | 1) {
    setSlots((prev) => {
      const i = prev.findIndex((s) => s.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) return setError("Skriv inn en tittel");
    if (!brand.trim()) return setError("Velg et merke");
    const priceNum = Number(price);
    if (!Number.isFinite(priceNum) || priceNum < 0) return setError("Ugyldig pris");

    setSubmitting(true);
    setUploadIdx(0);
    try {
      const sb = createClient();
      const uploaded: string[] = [];
      for (let i = 0; i < slots.length; i++) {
        setUploadIdx(i);
        const slot = slots[i];
        const ext = slot.file.name.split(".").pop() || "jpg";
        const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await sb.storage
          .from(BUCKET)
          .upload(path, slot.file, { cacheControl: "3600", upsert: false });
        if (upErr) throw upErr;
        const { data } = sb.storage.from(BUCKET).getPublicUrl(path);
        uploaded.push(data.publicUrl);
      }

      const image_url = uploaded[0] ?? null;
      const image_urls = uploaded.length > 0 ? uploaded : null;

      const { data, error: insertErr } = await sb
        .from("items")
        .insert({
          title: title.trim(),
          brand: brand.trim(),
          category: category || null,
          size,
          price: priceNum,
          condition,
          location,
          description: description.trim() || null,
          contact: null,
          seller_id: userId,
          image_url,
          image_urls,
          shipping,
          package_size: shipping !== "Kun henting" ? packageSize : null,
        })
        .select("id")
        .single();
      if (insertErr) throw insertErr;

      router.push(`/item/${data.id}?welcome=1`);
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

      <FirstListingTips userId={userId} />

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label={`Bilder (opp til ${MAX_IMAGES})`}>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {slots.map((s, i) => (
              <div
                key={s.id}
                className="group relative aspect-square overflow-hidden rounded-lg border border-stone-200 bg-stone-100"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.preview} alt="" className="h-full w-full object-cover" />
                {i === 0 && (
                  <span className="absolute left-1 top-1 rounded-full bg-[#5a6b32] px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-white">
                    Cover
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removeSlot(s.id)}
                  aria-label="Fjern"
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-xs text-white transition hover:bg-black"
                >
                  ✕
                </button>
                <div className="absolute bottom-1 left-1 flex gap-0.5">
                  <button
                    type="button"
                    onClick={() => moveSlot(s.id, -1)}
                    disabled={i === 0}
                    aria-label="Flytt venstre"
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-xs text-stone-800 shadow-sm disabled:opacity-30"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={() => moveSlot(s.id, 1)}
                    disabled={i === slots.length - 1}
                    aria-label="Flytt høyre"
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-xs text-stone-800 shadow-sm disabled:opacity-30"
                  >
                    ›
                  </button>
                </div>
              </div>
            ))}
            {remaining > 0 && (
              <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-stone-300 bg-stone-50 text-stone-500 transition hover:border-[#5a6b32] hover:text-[#5a6b32]">
                <span className="text-2xl leading-none">＋</span>
                <span className="text-[10px] font-medium">
                  {slots.length === 0 ? "Legg til bilder" : `${remaining} igjen`}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
                />
              </label>
            )}
          </div>
          {slots.length > 1 && (
            <p className="mt-1.5 text-xs text-stone-500">
              Første bilde blir coverbildet. Bruk piltastene for å sortere.
            </p>
          )}
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
            {BRANDS.map((b) => <option key={b} value={b} />)}
          </datalist>
        </Field>

        <div className="space-y-1.5">
          <span className="block text-sm font-medium text-stone-800">Kategori</span>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_PARENTS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  if (categoryParent === p) {
                    setCategoryParent("");
                    setCategory("");
                  } else {
                    setCategoryParent(p);
                    setCategory("");
                  }
                }}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  categoryParent === p
                    ? "border-[#5a6b32] bg-[#5a6b32] text-white"
                    : "border-stone-300 bg-white text-stone-700 hover:border-stone-500"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          {categoryParent && (
            <div className="flex flex-wrap gap-2 pt-1">
              {CATEGORY_TREE.find((g) => g.name === categoryParent)?.children.map(
                (c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(category === c ? "" : c)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                      category === c
                        ? "border-[#5a6b32] bg-[#5a6b32] text-white"
                        : "border-stone-300 bg-stone-50 text-stone-700 hover:border-stone-500"
                    }`}
                  >
                    {c}
                  </button>
                ),
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Størrelse">
            <select value={size} onChange={(e) => setSize(e.target.value)} className={input}>
              {SIZES.map((s) => <option key={s}>{s}</option>)}
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
            {CONDITIONS.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>

        <Field label="Sted">
          <select value={location} onChange={(e) => setLocation(e.target.value)} className={input}>
            {AREAS.map((a) => <option key={a}>{a}</option>)}
          </select>
        </Field>

        <Field label="Beskrivelse (valgfritt)">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Fortell om varen — størrelse, bruk, tilstand, grunnen til salg…"
            rows={3}
            className={`${input} resize-none`}
          />
        </Field>

        <div className="space-y-1.5">
          <span className="block text-sm font-medium text-stone-800">Frakt</span>
          <div className="grid grid-cols-3 gap-2">
            {SHIPPING_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setShipping(opt.value)}
                className={`rounded-xl border p-3 text-left transition ${
                  shipping === opt.value
                    ? "border-[#5a6b32] bg-[#5a6b32]/5 ring-1 ring-[#5a6b32]"
                    : "border-stone-200 bg-white hover:border-stone-400"
                }`}
              >
                <p className="text-sm font-medium">{opt.label}</p>
                <p className="mt-0.5 text-[11px] text-stone-500">{opt.hint}</p>
              </button>
            ))}
          </div>
        </div>

        {shipping !== "Kun henting" && (
          <div className="space-y-1.5">
            <span className="block text-sm font-medium text-stone-800">Pakkestørrelse (Posten)</span>
            <p className="text-xs text-stone-500">Velg den størrelsen som passer varen din. Kjøper betaler frakten.</p>
            <div className="space-y-2">
              {POSTEN_PACKAGES.map((pkg) => (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => setPackageSize(pkg.id)}
                  className={`w-full rounded-xl border p-3 text-left transition ${
                    packageSize === pkg.id
                      ? "border-[#5a6b32] bg-[#5a6b32]/5 ring-1 ring-[#5a6b32]"
                      : "border-stone-200 bg-white hover:border-stone-400"
                  }`}
                >
                  <p className="text-sm font-medium">{pkg.label}</p>
                  <p className="mt-0.5 text-[11px] text-stone-500">Maks {pkg.maxWeight} · {pkg.dimensions}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
        )}

        {submitting && slots.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs text-stone-500">
              Laster opp bilde {uploadIdx + 1} av {slots.length}…
            </p>
            <div className="h-1.5 overflow-hidden rounded-full bg-stone-200">
              <div
                className="h-full rounded-full bg-stone-900 transition-all duration-300"
                style={{ width: `${((uploadIdx + 1) / slots.length) * 100}%` }}
              />
            </div>
          </div>
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
