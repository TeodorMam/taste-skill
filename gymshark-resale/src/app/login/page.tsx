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

type Tab = "signin" | "signup";
type ForgotStage = "idle" | "sent" | "verified";
type SignupStage = "email" | "code" | "password";

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/";

  const [tab, setTab] = useState<Tab>("signin");
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotStage, setForgotStage] = useState<ForgotStage>("idle");
  const [signupStage, setSignupStage] = useState<SignupStage>("email");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  function resetState() {
    setError(null);
    setInfo(null);
    setCode("");
    setPassword("");
    setConfirmPassword("");
    setSignupStage("email");
  }

  function closeForgot() {
    setForgotOpen(false);
    setForgotStage("idle");
    resetState();
  }

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const sb = createClient();
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) {
      setSubmitting(false);
      return setError(error.message);
    }
    await sb.auth.updateUser({ data: { has_password: true } });
    setSubmitting(false);
    router.push(next);
    router.refresh();
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) return setError("Passord må være minst 6 tegn");
    if (password !== confirmPassword) return setError("Passordene er ikke like");
    setSubmitting(true);
    const sb = createClient();
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: { data: { has_password: true } },
    });
    setSubmitting(false);
    if (error) return setError(error.message);
    if (data.session) {
      router.push(next);
      router.refresh();
    } else {
      setInfo(
        "Sjekk e-posten for å bekrefte kontoen din (eller slå av bekreftelse i Supabase → Authentication → Providers → Email).",
      );
    }
  }

  async function sendForgotCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email) return setError("Skriv inn e-posten din");
    setSubmitting(true);
    const sb = createClient();
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    setSubmitting(false);
    if (error) return setError(error.message);
    setForgotStage("sent");
    setInfo("Vi sendte koden til e-posten din.");
  }

  async function verifyForgotCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const token = code.trim();
    if (token.length < 6) return setError("Skriv inn hele koden");
    setSubmitting(true);
    const sb = createClient();
    const { error } = await sb.auth.verifyOtp({
      email,
      token,
      type: "email",
    });
    setSubmitting(false);
    if (error) return setError(error.message);
    setForgotStage("verified");
    setInfo("Kode bekreftet. Sett et nytt passord.");
  }

  async function setNewPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) return setError("Passord må være minst 6 tegn");
    if (password !== confirmPassword) return setError("Passordene er ikke like");
    setSubmitting(true);
    const sb = createClient();
    const { error } = await sb.auth.updateUser({
      password,
      data: { has_password: true },
    });
    setSubmitting(false);
    if (error) return setError(error.message);
    router.push(next);
    router.refresh();
  }

  async function sendSignupCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email) return setError("Skriv inn e-posten din");
    setSubmitting(true);
    const sb = createClient();
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    setSubmitting(false);
    if (error) return setError(error.message);
    setSignupStage("code");
    setInfo("Vi sendte en bekreftelseskode til e-posten din.");
  }

  async function verifySignupCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const token = code.trim();
    if (token.length < 6) return setError("Skriv inn hele koden");
    setSubmitting(true);
    const sb = createClient();
    const { error } = await sb.auth.verifyOtp({
      email,
      token,
      type: "email",
    });
    setSubmitting(false);
    if (error) return setError(error.message);
    setSignupStage("password");
    setInfo(null);
    setCode("");
  }

  async function setSignupPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) return setError("Passord må være minst 6 tegn");
    if (password !== confirmPassword) return setError("Passordene er ikke like");
    setSubmitting(true);
    const sb = createClient();
    const { error } = await sb.auth.updateUser({
      password,
      data: { has_password: true },
    });
    setSubmitting(false);
    if (error) return setError(error.message);
    router.push(next);
    router.refresh();
  }

  if (forgotOpen) {
    return (
      <section className="space-y-5 py-8">
        <button
          onClick={closeForgot}
          className="text-sm text-stone-500 hover:text-black"
        >
          ← Tilbake til innlogging
        </button>

        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Glemt passord</h1>
          <p className="mt-1 text-sm text-stone-500">
            {forgotStage === "idle" &&
              "Skriv inn e-posten din — vi sender en engangskode."}
            {forgotStage === "sent" && "Skriv inn koden fra e-posten."}
            {forgotStage === "verified" && "Velg et nytt passord."}
          </p>
        </div>

        {forgotStage === "idle" && (
          <form onSubmit={sendForgotCode} className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="deg@eksempel.no"
              required
              autoComplete="email"
              className={input}
            />
            {error && (
              <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}
            <button type="submit" disabled={submitting} className={primaryBtn}>
              {submitting ? "Sender…" : "Send kode"}
            </button>
          </form>
        )}

        {forgotStage === "sent" && (
          <form onSubmit={verifyForgotCode} className="space-y-3">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 10))
              }
              placeholder="Engangskode"
              autoFocus
              autoComplete="one-time-code"
              className={`${input} text-center text-lg tracking-[0.3em]`}
            />
            {info && (
              <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
                {info}
              </p>
            )}
            {error && (
              <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}
            <button type="submit" disabled={submitting} className={primaryBtn}>
              {submitting ? "Verifiserer…" : "Verifiser kode"}
            </button>
            <button
              type="button"
              onClick={() => {
                setForgotStage("idle");
                setCode("");
                setInfo(null);
                setError(null);
              }}
              className="w-full text-center text-xs text-stone-500 hover:text-black"
            >
              Bruk en annen e-post
            </button>
          </form>
        )}

        {forgotStage === "verified" && (
          <form onSubmit={setNewPassword} className="space-y-3">
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
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Bekreft nytt passord"
              required
              autoComplete="new-password"
              className={input}
            />
            {error && (
              <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}
            <button type="submit" disabled={submitting} className={primaryBtn}>
              {submitting ? "Lagrer…" : "Lagre nytt passord"}
            </button>
          </form>
        )}
      </section>
    );
  }

  return (
    <section className="space-y-5 py-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          {tab === "signin"
            ? "Logg inn"
            : signupStage === "code"
              ? "Bekreft e-post"
              : signupStage === "password"
                ? "Velg passord"
                : "Opprett ny bruker"}
        </h1>
        <p className="mt-1 text-sm text-stone-500">
          {tab === "signin"
            ? "Med e-post og passord. Du forblir innlogget på denne enheten."
            : signupStage === "code"
              ? `Vi sendte en kode til ${email}.`
              : signupStage === "password"
                ? "Nesten ferdig — velg et passord for kontoen din."
                : "Lag en konto på under ett minutt."}
        </p>
      </div>

      <div className="flex gap-2">
        <TabChip
          active={tab === "signin"}
          onClick={() => {
            setTab("signin");
            resetState();
          }}
        >
          Logg inn
        </TabChip>
        <TabChip
          active={tab === "signup"}
          onClick={() => {
            setTab("signup");
            resetState();
          }}
        >
          Opprett ny bruker
        </TabChip>
      </div>

      {tab === "signin" && (
        <form onSubmit={signIn} className="space-y-3">
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
            autoComplete="current-password"
            className={input}
          />
          {error && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}
          <button type="submit" disabled={submitting} className={primaryBtn}>
            {submitting ? "Et øyeblikk…" : "Logg inn"}
          </button>
          <button
            type="button"
            onClick={() => {
              setForgotOpen(true);
              resetState();
            }}
            className="w-full text-center text-xs text-[#5a6b32] underline hover:text-[#435022]"
          >
            Glemt passord?
          </button>
        </form>
      )}

      {tab === "signup" && signupStage === "email" && (
        <form onSubmit={sendSignupCode} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="deg@eksempel.no"
            required
            autoComplete="email"
            className={input}
          />
          {error && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}
          <button type="submit" disabled={submitting} className={primaryBtn}>
            {submitting ? "Sender…" : "Send bekreftelseskode"}
          </button>
        </form>
      )}

      {tab === "signup" && signupStage === "code" && (
        <form onSubmit={verifySignupCode} className="space-y-3">
          {info && (
            <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
              {info}
            </p>
          )}
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={code}
            onChange={(e) =>
              setCode(e.target.value.replace(/\D/g, "").slice(0, 10))
            }
            placeholder="Bekreftelseskode"
            autoFocus
            autoComplete="one-time-code"
            className={`${input} text-center text-lg tracking-[0.3em]`}
          />
          {error && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}
          <button type="submit" disabled={submitting} className={primaryBtn}>
            {submitting ? "Verifiserer…" : "Bekreft kode"}
          </button>
          <button
            type="button"
            onClick={() => {
              setSignupStage("email");
              setCode("");
              setInfo(null);
              setError(null);
            }}
            className="w-full text-center text-xs text-stone-500 hover:text-black"
          >
            Bruk en annen e-post
          </button>
        </form>
      )}

      {tab === "signup" && signupStage === "password" && (
        <form onSubmit={setSignupPassword} className="space-y-3">
          <p className="text-sm text-stone-500">E-post bekreftet. Velg et passord.</p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Passord (minst 6 tegn)"
            required
            minLength={6}
            autoFocus
            autoComplete="new-password"
            className={input}
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Bekreft passord"
            required
            autoComplete="new-password"
            className={input}
          />
          {error && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}
          <button type="submit" disabled={submitting} className={primaryBtn}>
            {submitting ? "Oppretter…" : "Opprett konto"}
          </button>
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

const primaryBtn =
  "w-full rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-stone-50 hover:bg-black disabled:opacity-50";
