"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  BUCKET,
  BRANDS,
  SIZES,
  CONDITIONS,
  AREAS,
  GENDERS,
  COLORS,
  FITS,
  MAX_IMAGES,
  SHIPPING_OPTIONS,
  CATEGORY_TREE,
  CATEGORY_PARENTS,
  type CategoryParent,
} from "@/lib/supabase";
import { POSTEN_PACKAGES } from "@/lib/shipping";
import { prepareImagesForUpload } from "@/lib/image";
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
  const [gender, setGender] = useState("");
  const [color, setColor] = useState("");
  const [fit, setFit] = useState("");
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
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/logg-inn?next=/ny-annonse");
        return;
      }
      // Hard gate: sellers must have completed Stripe onboarding before
      // they're allowed to list. Otherwise their listing goes live but
      // "Kjøp nå" never shows because the buyer flow needs a real
      // connected account to route funds to.
      try {
        const res = await fetch("/api/stripe/connect");
        const json = await res.json() as { charges_enabled?: boolean };
        if (!json.charges_enabled) {
          router.replace("/selg");
          return;
        }
      } catch {
        // If the check fails, fall back to /selg so we don't accidentally
        // let a broken listing slip through.
        router.replace("/selg");
        return;
      }
      setUserId(user.id);
    })();
  }, [router]);

  useEffect(() => {
    return () => {
      slots.forEach((s) => URL.revokeObjectURL(s.preview));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const remaining = useMemo(() => MAX_IMAGES - slots.length, [slots.length]);

  async function addFiles(picked: FileList | null) {
    if (!picked || picked.length === 0) return;
    // Convert any iPhone HEIC files to JPEG in the browser before slotting
    // them, so previews render everywhere and the eventual upload is a
    // format every browser can display.
    const raw = Array.from(picked).slice(0, remaining);
    const converted = await prepareImagesForUpload(raw);
    const toAdd = converted.map(makeSlot);
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
          gender: gender || null,
          color: color || null,
          fit: fit || null,
        })
        .select("id")
        .single();
      if (insertErr) throw insertErr;

      router.push(`/vare/${data.id}?welcome=1`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Noe gikk galt");
      setSubmitting(false);
    }
  }

  if (userId === undefined) {
    return <p className="py-6 text-sm text-ink-3">Laster…</p>;
  }
  if (userId === null) {
    router.replace("/logg-inn?next=/ny-annonse");
    return <p className="py-6 text-sm text-ink-3">Laster…</p>;
  }

  return (
    <section className="space-y-6 pb-28 sm:pb-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Legg ut vare</h1>
        <p className="mt-1 text-sm text-ink-3">
          Bare treningsklær. Fyll inn under ett minutt.
        </p>
      </div>

      <FirstListingTips userId={userId} />

      <form id="post-form" onSubmit={handleSubmit} className="space-y-4">
        <Field label={`Bilder (opp til ${MAX_IMAGES})`}>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {slots.map((s, i) => (
              <div
                key={s.id}
                className="group relative aspect-square overflow-hidden rounded-sm border border-line bg-sunk"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.preview} alt="" className="h-full w-full object-cover" />
                {i === 0 && (
                  <span className="absolute left-1 top-1 rounded-sm bg-olive px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-raised">
                    Cover
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removeSlot(s.id)}
                  aria-label="Fjern"
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-sm bg-ink/70 text-xs text-raised transition hover:bg-ink"
                >
                  ✕
                </button>
                <div className="absolute bottom-1 left-1 flex gap-0.5">
                  <button
                    type="button"
                    onClick={() => moveSlot(s.id, -1)}
                    disabled={i === 0}
                    aria-label="Flytt venstre"
                    className="flex h-6 w-6 items-center justify-center rounded-sm bg-raised/90 text-xs text-ink disabled:opacity-30"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={() => moveSlot(s.id, 1)}
                    disabled={i === slots.length - 1}
                    aria-label="Flytt høyre"
                    className="flex h-6 w-6 items-center justify-center rounded-sm bg-raised/90 text-xs text-ink disabled:opacity-30"
                  >
                    ›
                  </button>
                </div>
              </div>
            ))}
            {remaining > 0 && (
              <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-sm border-2 border-dashed border-line-2 bg-paper text-ink-3 transition hover:border-olive hover:text-olive">
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
            <p className="mt-1.5 text-xs text-ink-3">
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
          <span className="block text-sm font-medium text-ink">Kategori</span>
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
                className={`rounded-sm border px-3 py-1.5 text-xs font-medium transition ${
                  categoryParent === p
                    ? "border-olive bg-olive text-raised"
                    : "border-line-2 bg-raised text-ink-2 hover:border-ink"
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
                    className={`rounded-sm border px-3 py-1.5 text-xs font-medium transition ${
                      category === c
                        ? "border-olive bg-olive text-raised"
                        : "border-line-2 bg-paper text-ink-2 hover:border-ink"
                    }`}
                  >
                    {c}
                  </button>
                ),
              )}
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <span className="block text-sm font-medium text-ink">Kjønn</span>
          <div className="flex flex-wrap gap-2">
            {GENDERS.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGender(gender === g ? "" : g)}
                className={`rounded-sm border px-3 py-1.5 text-xs font-medium transition ${
                  gender === g
                    ? "border-olive bg-olive text-raised"
                    : "border-line-2 bg-raised text-ink-2 hover:border-ink"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <span className="block text-sm font-medium text-ink">Farge (valgfritt)</span>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(color === c ? "" : c)}
                className={`rounded-sm border px-3 py-1.5 text-xs font-medium transition ${
                  color === c
                    ? "border-olive bg-olive text-raised"
                    : "border-line-2 bg-raised text-ink-2 hover:border-ink"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <span className="block text-sm font-medium text-ink">Passform (valgfritt)</span>
          <div className="flex flex-wrap gap-2">
            {FITS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFit(fit === f ? "" : f)}
                className={`rounded-sm border px-3 py-1.5 text-xs font-medium transition ${
                  fit === f
                    ? "border-olive bg-olive text-raised"
                    : "border-line-2 bg-raised text-ink-2 hover:border-ink"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
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
            onChange={(e) => {
              setDescription(e.target.value);
              const el = e.target;
              const scrollY = window.scrollY;
              el.style.height = "auto";
              el.style.height = `${el.scrollHeight}px`;
              window.scrollTo(0, scrollY);
            }}
            placeholder="Fortell om varen, størrelse, bruk, tilstand, grunnen til salg…"
            rows={6}
            className={`${input} resize-none overflow-hidden`}
          />
        </Field>

        <div className="space-y-1.5">
          <span className="block text-sm font-medium text-ink">Frakt</span>
          <div className="grid grid-cols-3 gap-2">
            {SHIPPING_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setShipping(opt.value)}
                className={`rounded-sm border p-3 text-left transition ${
                  shipping === opt.value
                    ? "border-olive bg-olive/5 ring-1 ring-olive"
                    : "border-line bg-raised hover:border-ink"
                }`}
              >
                <p className="text-sm font-medium">{opt.label}</p>
                <p className="mt-0.5 text-[11px] text-ink-3">{opt.hint}</p>
              </button>
            ))}
          </div>
        </div>

        {shipping !== "Kun henting" && (
          <div className="space-y-1.5">
            <span className="block text-sm font-medium text-ink">Pakkestørrelse (Posten)</span>
            <p className="text-xs text-ink-3">Velg den størrelsen som passer varen din. Kjøper betaler frakten.</p>
            <div className="space-y-2">
              {POSTEN_PACKAGES.map((pkg) => (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => setPackageSize(pkg.id)}
                  className={`w-full rounded-sm border p-3 text-left transition ${
                    packageSize === pkg.id
                      ? "border-olive bg-olive/5 ring-1 ring-olive"
                      : "border-line bg-raised hover:border-ink"
                  }`}
                >
                  <p className="text-sm font-medium">{pkg.label}</p>
                  <p className="mt-0.5 text-[11px] text-ink-3">{pkg.weightLabel} · {pkg.dimensions}</p>
                </button>
              ))}
            </div>
          </div>
        )}

      </form>

      {/* Sticky submit bar, mobile only, sits above the bottom nav */}
      <div className="fixed bottom-14 left-0 right-0 z-30 border-t border-line bg-raised/95 px-4 py-3 sm:hidden">
        {error && (
          <p className="mb-2 rounded-sm bg-clay-soft px-3 py-2 text-xs text-clay">{error}</p>
        )}
        {submitting && slots.length > 0 && (
          <div className="mb-2 space-y-1">
            <p className="text-xs text-ink-3">Laster opp bilde {uploadIdx + 1} av {slots.length}…</p>
            <div className="h-1 overflow-hidden rounded-sm bg-line">
              <div
                className="h-full rounded-sm bg-olive transition-all duration-300"
                style={{ width: `${((uploadIdx + 1) / slots.length) * 100}%` }}
              />
            </div>
          </div>
        )}
        <button
          type="submit"
          form="post-form"
          disabled={submitting}
          className="w-full rounded-sm bg-ink py-3 text-sm font-medium text-paper hover:bg-ink disabled:opacity-50"
        >
          {submitting ? "Legger ut…" : "Legg ut"}
        </button>
      </div>

      {/* Inline submit for desktop */}
      <div className="hidden sm:block -mt-2">
        {error && (
          <p className="mb-3 rounded-sm bg-clay-soft p-3 text-sm text-clay">{error}</p>
        )}
        {submitting && slots.length > 0 && (
          <div className="mb-3 space-y-1.5">
            <p className="text-xs text-ink-3">Laster opp bilde {uploadIdx + 1} av {slots.length}…</p>
            <div className="h-1.5 overflow-hidden rounded-sm bg-line">
              <div
                className="h-full rounded-sm bg-ink transition-all duration-300"
                style={{ width: `${((uploadIdx + 1) / slots.length) * 100}%` }}
              />
            </div>
          </div>
        )}
        <button
          type="submit"
          form="post-form"
          disabled={submitting}
          className="w-full rounded-sm bg-ink px-5 py-3 text-sm font-medium text-paper hover:bg-ink disabled:opacity-50"
        >
          {submitting ? "Legger ut…" : "Legg ut"}
        </button>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-sm font-medium text-ink">{label}</span>
      {children}
    </label>
  );
}

const input =
  "block w-full rounded-sm border border-line-2 bg-raised px-3 py-2 text-sm outline-none focus:border-olive focus:ring-1 focus:ring-olive/30";
