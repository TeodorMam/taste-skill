"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { type Item, type Profile, formatPrice, profileDisplayName } from "@/lib/supabase";
import { ItemCard } from "@/components/ItemCard";
import { ItemCardSkeleton } from "@/components/ItemCardSkeleton";
import { useToast } from "@/components/ToastProvider";

type Tab = "active" | "sold" | "all";

export default function MinePage() {
  const toast = useToast();
  const supabase = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("active");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [soldPickerItemId, setSoldPickerItemId] = useState<string | null>(null);
  const [pickerBuyers, setPickerBuyers] = useState<{ buyerId: string; name: string }[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);

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

  async function openSoldPicker(item: Item) {
    setSoldPickerItemId(item.id);
    setPickerBuyers([]);
    setPickerLoading(true);
    const { data: msgs } = await supabase
      .from("messages")
      .select("buyer_id")
      .eq("item_id", item.id);
    const buyerIds = Array.from(new Set((msgs ?? []).map((m: { buyer_id: string }) => m.buyer_id)));
    if (buyerIds.length > 0) {
      const { data: pData } = await supabase
        .from("profiles_public")
        .select("*")
        .in("user_id", buyerIds);
      const pMap: Record<string, Profile> = {};
      for (const p of (pData ?? []) as Profile[]) pMap[p.user_id] = p;
      setPickerBuyers(buyerIds.map((id) => ({ buyerId: id, name: profileDisplayName(pMap[id] ?? null, id) })));
    }
    setPickerLoading(false);
  }

  async function markSoldWithBuyer(item: Item, buyerId: string | null) {
    setBusyId(item.id);
    const update: Record<string, unknown> = { is_sold: true };
    if (buyerId) update.sold_to_buyer_id = buyerId;
    const { data, error } = await supabase
      .from("items")
      .update(update)
      .eq("id", item.id)
      .select("*")
      .single();
    setBusyId(null);
    setSoldPickerItemId(null);
    if (error) { setError(error.message); return; }
    if (data) {
      setItems((prev) => (prev ?? []).map((i) => (i.id === item.id ? (data as Item) : i)));
      if (buyerId) localStorage.setItem(`soldToBuyer:${item.id}`, buyerId);
      toast("Annonsen er markert som solgt");
    }
  }

  async function reactivate(item: Item) {
    setBusyId(item.id);
    const { data, error } = await supabase
      .from("items")
      .update({ is_sold: false })
      .eq("id", item.id)
      .select("*")
      .single();
    setBusyId(null);
    if (error) { setError(error.message); return; }
    if (data) {
      setItems((prev) => (prev ?? []).map((i) => (i.id === item.id ? (data as Item) : i)));
      toast("Annonsen er aktiv igjen");
    }
  }

  function askDelete(itemId: string) {
    if (confirmTimer.current) clearTimeout(confirmTimer.current);
    setConfirmId(itemId);
    confirmTimer.current = setTimeout(() => setConfirmId(null), 3000);
  }

  async function deleteItem(item: Item) {
    if (confirmTimer.current) clearTimeout(confirmTimer.current);
    setConfirmId(null);
    setBusyId(item.id);
    // Server side, so the photos go with the row. See api/items/[id].
    const res = await fetch(`/api/items/${item.id}`, { method: "DELETE" });
    setBusyId(null);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Klarte ikke slette annonsen");
      return;
    }
    setItems((prev) => (prev ?? []).filter((i) => i.id !== item.id));
    toast("Annonsen er slettet");
  }

  if (userId === undefined) {
    return <p className="py-6 text-sm text-ink-3">Laster…</p>;
  }
  if (userId === null) {
    return (
      <section className="space-y-3 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">Mine annonser</h1>
        <p className="text-sm text-ink-2">
          Logg inn for å se annonsene dine.
        </p>
        <Link
          href="/logg-inn?next=/mine"
          className="inline-block rounded-sm bg-ink px-5 py-3 text-sm font-medium text-paper hover:bg-ink"
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
          <p className="mt-1 text-sm text-ink-3">
            Alt du har lagt ut, på ett sted.
          </p>
        </div>
        <Link
          href="/ny-annonse"
          className="rounded-sm bg-ink px-5 py-2.5 text-sm font-medium text-paper hover:bg-ink"
        >
          + Ny annonse
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Stat label="Aktive" value={counts.active} />
        <Stat label="Solgt" value={counts.sold} />
        <Stat label="Omsetning" value={formatPrice(totalRevenue)} />
      </div>

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
        <p className="rounded-sm bg-clay-soft p-3 text-sm text-clay">{error}</p>
      )}

      {filtered === null && !error && (
        <div className="item-grid">
          {Array.from({ length: 3 }).map((_, i) => (
            <ItemCardSkeleton key={i} />
          ))}
        </div>
      )}

      {filtered && filtered.length === 0 && (
        <div className="rounded-sm border border-dashed border-line-2 p-10 text-center text-sm text-ink-3">
          <p className="font-medium text-ink-2">
            {tab === "active"
              ? "Ingen aktive annonser"
              : tab === "sold"
                ? "Ingen solgte annonser enda"
                : "Ingen annonser enda"}
          </p>
          <p className="mt-1">Legg ut din første vare, det tar under ett minutt.</p>
          <Link
            href="/ny-annonse"
            className="mt-4 inline-block rounded-sm bg-ink px-5 py-2.5 text-xs font-medium text-paper hover:bg-ink"
          >
            Legg ut vare
          </Link>
        </div>
      )}

      {filtered && filtered.length > 0 && (
        <div className="item-grid">
          {filtered.map((item) => (
            <div key={item.id} className="space-y-2">
              <ItemCard item={item} hideSeller />
              {soldPickerItemId === item.id ? (
                <div className="space-y-1.5 rounded-sm border border-line bg-paper p-3">
                  <p className="text-[11px] font-medium text-ink-2">Hva skjedde?</p>
                  {pickerLoading && <p className="text-[11px] text-ink-3">Laster…</p>}
                  {pickerBuyers.map(({ buyerId, name }) => (
                    <button
                      key={buyerId}
                      onClick={() => markSoldWithBuyer(item, buyerId)}
                      disabled={busyId === item.id}
                      className="w-full rounded-sm border border-line-2 bg-raised px-3 py-1.5 text-left text-[11px] font-medium text-ink hover:border-olive hover:bg-olive/5 disabled:opacity-50"
                    >
                      Solgt til {name}
                    </button>
                  ))}
                  <button
                    onClick={() => markSoldWithBuyer(item, null)}
                    disabled={busyId === item.id}
                    className="w-full rounded-sm border border-line-2 bg-raised px-3 py-1.5 text-left text-[11px] text-ink-2 hover:border-ink disabled:opacity-50"
                  >
                    Solgte et annet sted
                  </button>
                  <button
                    onClick={() => markSoldWithBuyer(item, null)}
                    disabled={busyId === item.id}
                    className="w-full rounded-sm border border-line-2 bg-raised px-3 py-1.5 text-left text-[11px] text-ink-2 hover:border-ink disabled:opacity-50"
                  >
                    Bestemte meg for å ikke selge
                  </button>
                  <button
                    onClick={() => setSoldPickerItemId(null)}
                    className="w-full pt-0.5 text-center text-[11px] text-ink-3 hover:text-ink-2"
                  >
                    Avbryt
                  </button>
                </div>
              ) : (
                <div className="flex gap-1.5">
                  {confirmId === item.id ? (
                    <>
                      <span className="flex-1 rounded-sm border border-clay/40 bg-clay-soft px-2 py-1.5 text-center text-[11px] font-medium text-clay">
                        Sikker?
                      </span>
                      <button
                        onClick={() => deleteItem(item)}
                        className="flex-1 rounded-sm border border-clay bg-clay px-2 py-1.5 text-[11px] font-medium text-raised hover:bg-clay"
                      >
                        Slett
                      </button>
                      <button
                        onClick={() => setConfirmId(null)}
                        className="rounded-sm border border-line-2 bg-raised px-2.5 py-1.5 text-[11px] font-medium text-ink-2 hover:border-ink"
                      >
                        Avbryt
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => item.is_sold ? reactivate(item) : openSoldPicker(item)}
                        disabled={busyId === item.id}
                        className="flex-1 rounded-sm border border-line-2 bg-raised px-2 py-1.5 text-[11px] font-medium text-ink-2 hover:border-ink disabled:opacity-50"
                      >
                        {busyId === item.id ? "…" : item.is_sold ? "Gjør aktiv" : "Marker solgt"}
                      </button>
                      <Link
                        href={`/vare/${item.id}/rediger`}
                        className="rounded-sm border border-line-2 bg-raised px-2.5 py-1.5 text-[11px] font-medium text-ink-2 hover:border-ink"
                      >
                        ✎
                      </Link>
                      <button
                        onClick={() => askDelete(item.id)}
                        disabled={busyId === item.id}
                        className="rounded-sm border border-clay/40 bg-raised px-2.5 py-1.5 text-[11px] font-medium text-clay hover:border-clay/40 hover:bg-clay-soft disabled:opacity-50"
                        aria-label="Slett"
                      >
                        🗑
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-sm border border-line bg-raised p-3 sm:p-4">
      <p className="text-[10px] font-medium uppercase tracking-wider text-ink-3">
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
      className={`rounded-sm border px-4 py-1.5 text-xs font-medium transition ${
        active
          ? "border-olive bg-olive text-raised"
          : "border-line-2 bg-raised text-ink-2 hover:border-ink"
      }`}
    >
      {children}
    </button>
  );
}
