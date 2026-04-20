"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function LoginPage() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/";
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSending(true);
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });
    setSending(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  if (sent) {
    return (
      <section className="space-y-3 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">Sjekk e-posten din</h1>
        <p className="text-sm text-stone-600">
          Vi sendte en innloggingslenke til{" "}
          <span className="font-medium">{email}</span>. Åpne den på denne enheten
          for å fortsette.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4 py-10">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Logg inn</h1>
        <p className="mt-1 text-sm text-stone-500">
          Vi sender deg en engangslenke på e-post. Ingen passord.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="deg@eksempel.no"
          required
          autoComplete="email"
          className="block w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#5a6b32] focus:ring-1 focus:ring-[#5a6b32]/30"
        />
        {error && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
        )}
        <button
          type="submit"
          disabled={sending}
          className="w-full rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-stone-50 hover:bg-black disabled:opacity-50"
        >
          {sending ? "Sender…" : "Send innloggingslenke"}
        </button>
      </form>
    </section>
  );
}
