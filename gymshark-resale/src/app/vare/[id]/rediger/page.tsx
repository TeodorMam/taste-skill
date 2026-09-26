"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  type Item,
  BRANDS,
  SIZES,
  CONDITIONS,
  AREAS,
  GENDERS,
  COLORS,
  FITS,
  SHIPPING_OPTIONS,
  CATEGORY_TREE,
  CATEGORY_PARENTS,
  type CategoryParent,
  parentOfCategory,
} from "@/lib/supabase";
import { POSTEN_PACKAGES } from "@/lib/shipping";
import { createClient } from "@/utils/supabase/client";

export default function EditItemPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const [item, setItem] = useState<Item | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [brand, setBrand] = useState("");
  const [categoryParent, setCategoryParent] = useState<CategoryParent | "">("");
  const [category, setCategory] = useState("");
  const [size, setSize] = useState<string>("M");
  const [price, setPrice] = useState("");
  const [condition, setCondition] = useState<string>("God");
  const [location, setLocation] = useState<string>(AREAS[0]);
  const [description, setDescription] = useState("");
  const [shipping, setShipping] = useState<string>(SHIPPING_OPTIONS[0].value);
  const [packageSize, setPackageSize] = useState<string>("small");
  const [gender, setGender] = useState("");
  const [color, setColor] = useState("");
  const [fit, setFit] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, [supabase]);

  useEffect(() => {
    if (!params.id) return;
    supabase
      .from("items")
      .select("*")
      .eq("id", params.id)
      .single()
      .then(({ data, error }) => {
        if (error) {
          setLoadErr(error.message);
          return;
        }
        const it = data as Item;
        setItem(it);
        setTitle(it.title);
        setBrand(it.brand ?? "");
        setCategory(it.category ?? "");
        setCategoryParent((parentOfCategory(it.category) ?? "") as CategoryParent | "");
        setSize(it.size);
        setPrice(String(it.price));
        setCondition(it.condition);
        setLocation(it.location);
        setDescription(it.description ?? "");
        setShipping(it.shipping ?? SHIPPING_OPTIONS[0].value);
        setPackageSize(it.package_size ?? "small");
        setGender(it.gender ?? "");
        setColor(it.color ?? "");
        setFit(it.fit ?? "");
      });
  }, [params.id, supabase]);

  const isSeller = !!item && !!userId && userId === item.seller_id;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) return setError("Skriv inn en tittel");
    if (!brand.trim()) return setError("Velg et merke");
    const priceNum = Number(price);
    if (!Number.isFinite(priceNum) || priceNum < 0) return setError("Ugyldig pris");

    setSaving(true);
    const { error: upErr } = await supabase
      .from("items")
      .update({
        title: title.trim(),
        brand: brand.trim(),
        category: category || null,
        size,
        price: priceNum,
        condition,
        location,
        description: description.trim() || null,
        shipping,
        package_size: shipping !== "Kun henting" ? packageSize : null,
        gender: gender || null,
        color: color || null,
        fit: fit || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.id);
    setSaving(false);
    if (upErr) {
      setError(upErr.message);
      return;
    }
    router.push(`/vare/${params.id}`);
  }

  if (userId === undefined || (!item && !loadErr)) {
    return <p className="py-6 text-sm text-ink-3">Laster…</p>;
  }
  if (loadErr) {
    return <p className="rounded-sm bg-clay-soft p-3 text-sm text-clay">{loadErr}</p>;
  }
  if (userId === null) {
    return (
      <section className="space-y-3 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">Logg inn</h1>
        <Link
          href={`/logg-inn?next=/vare/${params.id}/rediger`}
          className="inline-block rounded-sm bg-ink px-5 py-3 text-sm font-medium text-paper"
        >
          Logg inn
        </Link>
      </section>
    );
  }
  if (!isSeller) {
    return (
      <section className="space-y-3 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">Ingen tilgang</h1>
        <p className="text-sm text-ink-2">Du kan bare redigere dine egne annonser.</p>
        <Link href={`/vare/${params.id}`} className="text-sm text-olive underline">
          Tilbake til annonsen
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-6 pb-28 sm:pb-6">
      <div>
        <Link
          href={`/vare/${params.id}`}
          className="text-sm text-ink-3 hover:text-ink"
        >
          ← Tilbake til annonsen
        </Link>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Rediger annonse</h1>
        <p className="mt-1 text-sm text-ink-3">
          Bilder kan ikke byttes her, legg ut på nytt om du vil endre bilder.
        </p>
      </div>

      <form id="edit-form" onSubmit={handleSubmit} className="space-y-4">
        <Field label="Tittel">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={input}
            required
          />
        </Field>

        <Field label="Merke">
          <input
            type="text"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            list="brand-options-edit"
            className={input}
            required
          />
          <datalist id="brand-options-edit">
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
              className={input}
              required
            />
          </Field>
        </div>

        <Field label="Tilstand">
          <select value={condition} onChange={(e) => setCondition(e.target.value)} className={input}>
            {CONDITIONS.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>

        <Field label="Sted">
          <select value={location} onChange={(e) => setLocation(e.target.value)} className={input}>
            {AREAS.map((a) => <option key={a}>{a}</option>)}
          </select>
        </Field>

        <Field label="Beskrivelse">
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
                  <p className="mt-0.5 text-[11px] text-ink-3">Maks {pkg.maxWeight} · {pkg.dimensions}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <p className="hidden rounded-sm bg-clay-soft p-3 text-sm text-clay sm:block">{error}</p>
        )}

        <div className="hidden gap-2 sm:flex">
          <Link
            href={`/vare/${params.id}`}
            className="flex-1 rounded-sm border border-line-2 bg-raised px-5 py-3 text-center text-sm font-medium text-ink-2 hover:border-ink"
          >
            Avbryt
          </Link>
          <button
            type="submit"
            form="edit-form"
            disabled={saving}
            className="flex-1 rounded-sm bg-ink px-5 py-3 text-sm font-medium text-paper hover:bg-ink disabled:opacity-50"
          >
            {saving ? "Lagrer…" : "Lagre endringer"}
          </button>
        </div>
      </form>

      {/* Sticky submit bar, mobile only */}
      <div className="fixed bottom-14 left-0 right-0 z-30 border-t border-line bg-raised/95 px-4 py-3 sm:hidden">
        {error && (
          <p className="mb-2 rounded-sm bg-clay-soft px-3 py-2 text-xs text-clay">{error}</p>
        )}
        <div className="flex gap-2">
          <Link
            href={`/vare/${params.id}`}
            className="flex-1 rounded-sm border border-line-2 bg-raised py-3 text-center text-sm font-medium text-ink-2"
          >
            Avbryt
          </Link>
          <button
            type="submit"
            form="edit-form"
            disabled={saving}
            className="flex-1 rounded-sm bg-ink py-3 text-sm font-medium text-paper hover:bg-ink disabled:opacity-50"
          >
            {saving ? "Lagrer…" : "Lagre endringer"}
          </button>
        </div>
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
