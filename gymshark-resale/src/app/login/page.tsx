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

type Mode = "code" | "password";

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/";

  const [mode, setMode] = useState<Mode>("code");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function sendCode() {
    setError(null);
    setInfo(null);
    if (!email) {
      setError("Skriv inn e-posten din");
      return;
    }
    setSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    setSubmitting(false);
    if (error) {
      setError(error.message);
      return;
    }
    setCodeSent(true);
    setInfo("Vi sendte en 6-sifret kode til e-posten din. Den gjelder i 60 minutter.");
  }

  async function verifyCode() {
    setError(null);
    const trimmed = code.trim();
    if (trimmed.length < 6) {
      setError("Skriv inn den 6-sifrede koden");
      return;
    }
    setSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: trimmed,
      type: "email",
    });
    setSubmitting(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push(next);
    router.refresh();
  }

  async function signInPassword() {
    setError(null);
    if (!email || password.length < 6) {
      setError("E-post og passord (minst 6 tegn) kreves");
      return;
    }
    setSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push(next);
    router.refresh();
  }

  function switchMode(m: Mode) {
    setMode(m);
    setError(null);
    setInfo(null);
    setCode("");
    setCodeSent(false);
  }

  return (
    <section className="space-y-5 py-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Logg inn</h1>
        <p className="mt-1 text-sm text-stone-500">
          {mode === "code"
            ? "Få en engangskode på e-post. Fungerer på tvers av enheter."
            : "Med e-post og passord."}
        </p>
      </div>

      <div className="flex gap-2">
        <TabChip active={mode === "code"} onClick={() => switchMode("code")}>
          Kode på e-post
        </TabChip>
        <TabChip active={mode === "password"} onClick={() => switchMode("password")}>
          Passord
        </TabChip>
      </div>

      {mode === "code" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            codeSent ? verifyCode() : sendCode();
          }}
          className="space-y-3"
        >
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="deg@eksempel.no"
            required
            disabled={codeSent}
            autoComplete="email"
            className={`${input} disabled:bg-stone-100`}
          />

          {codeSent && (
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="6-sifret kode"
              autoFocus
              autoComplete="one-time-code"
              className={`${input} text-center text-lg tracking-[0.4em]`}
            />
          )}

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
              : codeSent
                ? "Verifiser kode"
                : "Send kode"}
          </button>

          {codeSent && (
            <button
              type="button"
              onClick={() => {
                setCodeSent(false);
                setCode("");
                setInfo(null);
              }}
              className="w-full text-center text-xs text-stone-500 hover:text-black"
            >
              Bruk en annen e-post
            </button>
          )}
        </form>
      )}

      {mode === "password" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            signInPassword();
          }}
          className="space-y-3"
        >
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
            placeholder="Passord"
            required
            minLength={6}
            autoComplete="current-password"
            className={input}
          />

          {error && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-stone-50 hover:bg-black disabled:opacity-50"
          >
            {submitting ? "Et øyeblikk…" : "Logg inn"}
          </button>

          <p className="text-center text-xs text-stone-500">
            Har du ikke satt passord enda?{" "}
            <button
              type="button"
              onClick={() => switchMode("code")}
              className="font-medium text-[#5a6b32] hover:text-[#435022]"
            >
              Logg inn med kode
            </button>
          </p>
        </form>
      )}
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
