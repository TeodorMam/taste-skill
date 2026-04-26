"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

export function PasswordSetter() {
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const flag = data.user?.user_metadata?.has_password === true;
      setHasPassword(flag);
    });
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Passordet må være minst 6 tegn");
      return;
    }
    if (password !== confirm) {
      setError("Passordene er ikke like");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      password,
      data: { has_password: true },
    });
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
    setHasPassword(true);
    setPassword("");
    setConfirm("");
  }

  if (hasPassword === null) return null;
  if (hasPassword && !done) return null;

  if (done) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
        ✓ Passord lagret. Neste gang kan du logge inn med e-post og passord.
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl border border-stone-200 bg-white p-3 text-left text-sm text-stone-700 hover:border-stone-400 w-full"
      >
        <p className="font-medium">Sett et passord</p>
        <p className="mt-0.5 text-xs text-stone-500">
          For raskere innlogging neste gang — slipper koden på e-post.
        </p>
      </button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-2 rounded-xl border border-stone-200 bg-white p-4"
    >
      <p className="text-sm font-medium text-stone-800">Sett et passord</p>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Nytt passord (minst 6 tegn)"
        required
        minLength={6}
        autoComplete="new-password"
        className={input}
      />
      <input
        type="password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        placeholder="Bekreft passord"
        required
        autoComplete="new-password"
        className={input}
      />
      {error && (
        <p className="rounded-lg bg-red-50 p-2 text-xs text-red-700">{error}</p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="flex-1 rounded-full border border-stone-300 bg-white px-4 py-2 text-xs font-medium text-stone-700 hover:border-stone-500"
        >
          Avbryt
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex-1 rounded-full bg-stone-900 px-4 py-2 text-xs font-medium text-stone-50 hover:bg-black disabled:opacity-50"
        >
          {saving ? "Lagrer…" : "Lagre passord"}
        </button>
      </div>
    </form>
  );
}

const input =
  "block w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#5a6b32] focus:ring-1 focus:ring-[#5a6b32]/30";
