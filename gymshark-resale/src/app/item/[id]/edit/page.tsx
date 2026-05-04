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
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.id);
    setSaving(false);
    if (upErr) {
      setError(upErr.message);
      return;
    }
    router.push(`/item/${params.id}`);
  }

  if (userId === undefined || (!item && !loadErr)) {
    return <p className="py-6 text-sm text-stone-500">Laster…</p>;
  }
  if (loadErr) {
    return <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{loadErr}</p>;
  }
  if (userId === null) {
    return (
      <section className="space-y-3 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">Logg inn</h1>
        <Link
          href={`/login?next=/item/${params.id}/edit`}
          className="inline-block rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-stone-50"
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
        <p className="text-sm text-stone-600">Du kan bare redigere dine egne annonser.</p>
        <Link href={`/item/${params.id}`} className="text-sm text-[#5a6b32] underline">
          Tilbake til annonsen
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div>
        <Link
          href={`/item/${params.id}`}
          className="text-sm text-stone-500 hover:text-black"
        >
          ← Tilbake til annonsen
        </Link>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Rediger annonse</h1>
        <p className="mt-1 text-sm text-stone-500">
          Bilder kan ikke byttes her — legg ut på nytt om du vil endre bilder.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
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
            onChange={(e) => setDescription(e.target.value)}
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

        <div className="flex gap-2">
          <Link
            href={`/item/${params.id}`}
            className="flex-1 rounded-full border border-stone-300 bg-white px-5 py-3 text-center text-sm font-medium text-stone-700 hover:border-stone-500"
          >
            Avbryt
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-stone-50 hover:bg-black disabled:opacity-50"
          >
            {saving ? "Lagrer…" : "Lagre endringer"}
          </button>
        </div>
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
