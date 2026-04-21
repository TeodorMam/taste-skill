"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function LoginPage() {
  return (
    <Suspense fallback={<p className="py-10 text-sm text-stone-500">Laster…</p>}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/";

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (password.length < 6) {
      setError("Passordet må være minst 6 tegn");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      setSubmitting(false);
      if (error) {
        setError(error.message);
        return;
      }
      if (data.session) {
        router.push(next);
        router.refresh();
      } else {
        setInfo(
          "Vi sendte en bekreftelseslenke til e-posten din. Åpne den for å fullføre registreringen.",
        );
      }
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push(next);
    router.refresh();
  }

  async function handleMagicLink() {
    if (!email) {
      setError("Skriv inn e-posten din først");
      return;
    }
    setError(null);
    setInfo(null);
    setSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    setSubmitting(false);
    if (error) setError(error.message);
    else setInfo("Sjekk e-posten din for en engangslenke.");
  }

  return (
    <section className="space-y-5 py-10">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          {mode === "signin" ? "Logg inn" : "Opprett konto"}
        </h1>
        <p className="mt-1 text-sm text-stone-500">
          {mode === "signin"
            ? "Med e-post og passord. Du forblir innlogget på denne enheten."
            : "Velg et passord du husker — ingen e-postbekreftelse nødvendig hvis vi slår det av."}
        </p>
      </div>

      <div className="flex gap-2">
        <TabChip active={mode === "signin"} onClick={() => setMode("signin")}>
          Logg inn
        </TabChip>
        <TabChip active={mode === "signup"} onClick={() => setMode("signup")}>
          Opprett konto
        </TabChip>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="deg@eksempel.no"
          required
          autoComplete="email"
          className={input}
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Passord (minst 6 tegn)"
          required
          minLength={6}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          className={input}
        />

        {error && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
        )}
        {info && (
          <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{info}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-stone-50 hover:bg-black disabled:opacity-50"
        >
          {submitting
            ? "Et øyeblikk…"
            : mode === "signin"
              ? "Logg inn"
              : "Opprett konto"}
        </button>

        {mode === "signin" && (
          <button
            type="button"
            onClick={handleMagicLink}
            disabled={submitting}
            className="w-full rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-medium text-stone-700 hover:border-stone-500 disabled:opacity-50"
          >
            Glemt passord? Send engangslenke
          </button>
        )}
      </form>
    </section>
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
      type="button"
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

const input =
  "block w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#5a6b32] focus:ring-1 focus:ring-[#5a6b32]/30";
