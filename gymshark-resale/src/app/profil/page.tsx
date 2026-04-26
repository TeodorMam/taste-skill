"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { ProfileEditor } from "@/components/ProfileEditor";
import { PasswordSetter } from "@/components/PasswordSetter";

export default function ProfilPage() {
  const supabase = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
      setEmail(data.user?.email ?? null);
    });
  }, [supabase]);

  if (userId === undefined) {
    return <p className="py-6 text-sm text-stone-500">Laster…</p>;
  }
  if (userId === null) {
    return (
      <section className="space-y-3 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">Min profil</h1>
        <p className="text-sm text-stone-600">
          Logg inn for å redigere profilen din.
        </p>
        <Link
          href="/login?next=/profil"
          className="inline-block rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-stone-50 hover:bg-black"
        >
          Logg inn
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Min profil</h1>
        <p className="mt-1 text-sm text-stone-500">
          Sett navn, bilde og bio så kjøpere ser hvem du er.
        </p>
      </div>

      <ProfileEditor />

      <PasswordSetter />

      <div className="rounded-2xl border border-stone-200 bg-white p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-stone-500">
          Konto
        </p>
        <p className="mt-2 text-sm text-stone-700">
          Innlogget som <span className="font-medium">{email ?? "ukjent"}</span>
        </p>
        <form action="/auth/signout" method="post" className="mt-3">
          <button
            type="submit"
            className="rounded-full border border-stone-300 bg-white px-4 py-2 text-xs font-medium text-stone-700 hover:border-stone-500"
          >
            Logg ut
          </button>
        </form>
      </div>
    </section>
  );
}
