"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Icon } from "@/components/Icon";

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
      <div className="flex gap-2.5 rounded-sm bg-olive-soft p-4 text-sm text-olive">
        <Icon name="hake" size={18} />
        Passord lagret. Neste gang kan du logge inn med e-post og passord.
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full border-y border-line py-3.5 text-left text-sm text-ink-2 hover:bg-ink/5"
      >
        <p className="font-medium">Sett et passord</p>
        <p className="mt-0.5 text-xs text-ink-3">
          For raskere innlogging neste gang, slipper koden på e-post.
        </p>
      </button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-2 rounded-sm border border-line bg-raised p-4"
    >
      <p className="text-sm font-medium text-ink">Sett et passord</p>
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
        <p className="rounded-sm bg-clay-soft p-2 text-xs text-clay">{error}</p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="btn btn-quiet btn-sm flex-1"
        >
          Avbryt
        </button>
        <button
          type="submit"
          disabled={saving}
          className="btn btn-ink btn-sm flex-1"
        >
          {saving ? "Lagrer…" : "Lagre passord"}
        </button>
      </div>
    </form>
  );
}

const input =
  "field";
