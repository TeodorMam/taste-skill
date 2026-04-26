"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { type Item, formatPrice } from "@/lib/supabase";
import { ItemCard } from "@/components/ItemCard";
import { ItemCardSkeleton } from "@/components/ItemCardSkeleton";
import { PasswordSetter } from "@/components/PasswordSetter";
import { ProfileEditor } from "@/components/ProfileEditor";

type Tab = "active" | "sold" | "all";

export default function MinePage() {
  const supabase = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("active");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, [supabase]);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from("items")
      .select("*")
      .eq("seller_id", userId)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setItems((data ?? []) as Item[]);
      });
  }, [userId, supabase]);

  const counts = useMemo(() => {
    if (!items) return { all: 0, active: 0, sold: 0 };
    return {
      all: items.length,
      active: items.filter((i) => !i.is_sold).length,
      sold: items.filter((i) => i.is_sold).length,
    };
  }, [items]);

  const filtered = useMemo(() => {
    if (!items) return null;
    if (tab === "active") return items.filter((i) => !i.is_sold);
    if (tab === "sold") return items.filter((i) => i.is_sold);
    return items;
  }, [items, tab]);

  const totalRevenue = useMemo(
    () =>
      items
        ? items
            .filter((i) => i.is_sold)
            .reduce((sum, i) => sum + (Number(i.price) || 0), 0)
        : 0,
    [items],
  );

  async function toggleSold(item: Item) {
    setBusyId(item.id);
    const { data, error } = await supabase
      .from("items")
      .update({ is_sold: !item.is_sold })
      .eq("id", item.id)
      .select("*")
      .single();
    setBusyId(null);
    if (error) {
      setError(error.message);
      return;
    }
    if (data) {
      setItems((prev) =>
        (prev ?? []).map((i) => (i.id === item.id ? (data as Item) : i)),
      );
    }
  }

  async function deleteItem(item: Item) {
    const ok = window.confirm(`Slette "${item.title}"? Dette kan ikke angres.`);
    if (!ok) return;
    setBusyId(item.id);
    const { error } = await supabase.from("items").delete().eq("id", item.id);
    setBusyId(null);
    if (error) {
      setError(error.message);
      return;
    }
    setItems((prev) => (prev ?? []).filter((i) => i.id !== item.id));
  }

  if (userId === undefined) {
    return <p className="py-6 text-sm text-stone-500">Laster…</p>;
  }
  if (userId === null) {
    return (
      <section className="space-y-3 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">Mine annonser</h1>
        <p className="text-sm text-stone-600">
          Logg inn for å se annonsene dine.
        </p>
        <Link
          href="/login?next=/mine"
          className="inline-block rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-stone-50 hover:bg-black"
        >
          Logg inn
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Mine annonser</h1>
          <p className="mt-1 text-sm text-stone-500">
            Alt du har lagt ut — på ett sted.
          </p>
        </div>
        <Link
          href="/post"
          className="rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-stone-50 hover:bg-black"
        >
          + Ny annonse
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Stat label="Aktive" value={counts.active} />
        <Stat label="Solgt" value={counts.sold} />
        <Stat label="Omsetning" value={formatPrice(totalRevenue)} />
      </div>

      <ProfileEditor />

      <PasswordSetter />

      <div className="flex gap-2">
        <TabChip active={tab === "active"} onClick={() => setTab("active")}>
          Aktive ({counts.active})
        </TabChip>
        <TabChip active={tab === "sold"} onClick={() => setTab("sold")}>
          Solgt ({counts.sold})
        </TabChip>
        <TabChip active={tab === "all"} onClick={() => setTab("all")}>
          Alle ({counts.all})
        </TabChip>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}

      {filtered === null && !error && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <ItemCardSkeleton key={i} />
          ))}
        </div>
      )}

      {filtered && filtered.length === 0 && (
        <div className="rounded-2xl border border-dashed border-stone-300 p-10 text-center text-sm text-stone-500">
          <p className="font-medium text-stone-700">
            {tab === "active"
              ? "Ingen aktive annonser"
              : tab === "sold"
                ? "Ingen solgte annonser enda"
                : "Ingen annonser enda"}
          </p>
          <p className="mt-1">Legg ut din første vare — det tar under ett minutt.</p>
          <Link
            href="/post"
            className="mt-4 inline-block rounded-full bg-stone-900 px-5 py-2.5 text-xs font-medium text-stone-50 hover:bg-black"
          >
            Legg ut vare
          </Link>
        </div>
      )}

      {filtered && filtered.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {filtered.map((item) => (
            <div key={item.id} className="space-y-2">
              <ItemCard item={item} hideSeller />
              <div className="flex gap-1.5">
                <button
                  onClick={() => toggleSold(item)}
                  disabled={busyId === item.id}
                  className="flex-1 rounded-full border border-stone-300 bg-white px-2 py-1.5 text-[11px] font-medium text-stone-700 hover:border-stone-500 disabled:opacity-50"
                >
                  {busyId === item.id
                    ? "…"
                    : item.is_sold
                      ? "Gjør aktiv"
                      : "Marker solgt"}
                </button>
                <Link
                  href={`/item/${item.id}/edit`}
                  className="rounded-full border border-stone-300 bg-white px-2.5 py-1.5 text-[11px] font-medium text-stone-700 hover:border-stone-500"
                >
                  ✎
                </Link>
                <button
                  onClick={() => deleteItem(item)}
                  disabled={busyId === item.id}
                  className="rounded-full border border-red-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-red-700 hover:border-red-400 hover:bg-red-50 disabled:opacity-50"
                  aria-label="Slett"
                >
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-3 sm:p-4">
      <p className="text-[10px] font-medium uppercase tracking-wider text-stone-500">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">
        {value}
      </p>
    </div>
  );
}

function TabChip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-4 py-1.5 text-xs font-medium transition ${
        active
          ? "border-[#5a6b32] bg-[#5a6b32] text-white"
          : "border-stone-300 bg-white text-stone-700 hover:border-stone-500"
      }`}
    >
      {children}
    </button>
  );
}
