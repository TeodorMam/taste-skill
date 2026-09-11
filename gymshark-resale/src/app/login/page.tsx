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
type SignupStage = "email" | "code" | "password" | "dob" | "profile" | "delivery";

const SIGNUP_STEPS: Record<SignupStage, number> = {
  email: 1, code: 1,
  password: 2,
  dob: 3,
  profile: 4,
  delivery: 5,
};

function formatDob(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`;
}

function calcAge(dob: string): number | null {
  const parts = dob.split(".");
  if (parts.length !== 3 || parts[2].length < 4) return null;
  const [dd, mm, yyyy] = parts.map(Number);
  if (!dd || !mm || !yyyy || yyyy < 1900) return null;
  const birth = new Date(yyyy, mm - 1, dd);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/";

  const [tab, setTab] = useState<Tab>("signin");
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotStage, setForgotStage] = useState<ForgotStage>("idle");
  const [signupStage, setSignupStage] = useState<SignupStage>("email");

  // Auth fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [dob, setDob] = useState("");

  // Profile step
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");

  // Delivery step
  const [fullName, setFullName] = useState("");
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  function resetState() {
    setError(null); setInfo(null);
    setCode(""); setPassword(""); setConfirmPassword(""); setDob("");
    setDisplayName(""); setBio("");
    setFullName(""); setAddress(""); setPostalCode(""); setCity(""); setPhone("");
    setSignupStage("email");
  }

  function closeForgot() { setForgotOpen(false); setForgotStage("idle"); resetState(); }

  // ── Sign-in ────────────────────────────────────────────────────────────────

  async function signIn(e: React.FormEvent) {
    e.preventDefault(); setError(null); setSubmitting(true);
    const sb = createClient();
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) { setSubmitting(false); return setError(error.message); }
    await sb.auth.updateUser({ data: { has_password: true } });
    setSubmitting(false); router.push(next); router.refresh();
  }

  // ── Forgot password ────────────────────────────────────────────────────────

  async function sendForgotCode(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    if (!email) return setError("Skriv inn e-posten din");
    setSubmitting(true);
    const sb = createClient();
    const { error } = await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
    setSubmitting(false);
    if (error) return setError(error.message);
    setForgotStage("sent"); setInfo("Vi sendte koden til e-posten din.");
  }

  async function verifyForgotCode(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    const token = code.trim();
    if (token.length < 6) return setError("Skriv inn hele koden");
    setSubmitting(true);
    const sb = createClient();
    const { error } = await sb.auth.verifyOtp({ email, token, type: "email" });
    setSubmitting(false);
    if (error) return setError(error.message);
    setForgotStage("verified"); setInfo("Kode bekreftet. Sett et nytt passord.");
  }

  async function setNewPassword(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    if (password.length < 6) return setError("Passord må være minst 6 tegn");
    if (password !== confirmPassword) return setError("Passordene er ikke like");
    setSubmitting(true);
    const sb = createClient();
    const { error } = await sb.auth.updateUser({ password, data: { has_password: true } });
    setSubmitting(false);
    if (error) return setError(error.message);
    router.push(next); router.refresh();
  }

  // ── Signup steps ───────────────────────────────────────────────────────────

  async function sendSignupCode(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    if (!email) return setError("Skriv inn e-posten din");
    setSubmitting(true);
    const sb = createClient();
    const { error } = await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    setSubmitting(false);
    if (error) return setError(error.message);
    setSignupStage("code"); setInfo("Vi sendte en bekreftelseskode til e-posten din.");
  }

  async function verifySignupCode(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    const token = code.trim();
    if (token.length < 6) return setError("Skriv inn hele koden");
    setSubmitting(true);
    const sb = createClient();
    const { error } = await sb.auth.verifyOtp({ email, token, type: "email" });
    setSubmitting(false);
    if (error) return setError(error.message);
    setSignupStage("password"); setInfo(null); setCode("");
  }

  async function setSignupPassword(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    if (password.length < 6) return setError("Passord må være minst 6 tegn");
    if (password !== confirmPassword) return setError("Passordene er ikke like");
    setSubmitting(true);
    const sb = createClient();
    const { error } = await sb.auth.updateUser({ password, data: { has_password: true } });
    setSubmitting(false);
    if (error) return setError(error.message);
    setSignupStage("dob"); setError(null);
  }

  async function submitDob(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    const age = calcAge(dob);
    if (age === null) return setError("Skriv inn fødselsdato i format DD.MM.ÅÅÅÅ");
    if (age < 15) return setError("Du må være minst 15 år for å bruke Aktivbruk");
    setSubmitting(true);
    const sb = createClient();
    await sb.auth.updateUser({ data: { date_of_birth: dob } });
    setSubmitting(false); setSignupStage("profile"); setError(null);
  }

  async function submitProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!displayName.trim() && !bio.trim()) { setSignupStage("delivery"); return; }
    setSubmitting(true); setError(null);
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (user) {
      await sb.from("profiles").upsert({
        user_id: user.id,
        display_name: displayName.trim() || null,
        bio: bio.trim() || null,
      }, { onConflict: "user_id" });
    }
    setSubmitting(false); setSignupStage("delivery");
  }

  async function submitDelivery(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true); setError(null);
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (user && (fullName.trim() || address.trim())) {
      await sb.from("profiles").upsert({
        user_id: user.id,
        full_name: fullName.trim() || null,
        address: address.trim() || null,
        postal_code: postalCode.trim() || null,
        city: city.trim() || null,
        phone: phone.trim() || null,
      }, { onConflict: "user_id" });
    }
    setSubmitting(false); router.push(next); router.refresh();
  }

  const isSignupInProgress = tab === "signup" && signupStage !== "email";

  // ── Forgot password screen ─────────────────────────────────────────────────

  if (forgotOpen) {
    return (
      <section className="space-y-5 py-8">
        <button onClick={closeForgot} className="text-sm text-stone-500 hover:text-black">← Tilbake til innlogging</button>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Glemt passord</h1>
          <p className="mt-1 text-sm text-stone-500">
            {forgotStage === "idle" && "Skriv inn e-posten din — vi sender en engangskode."}
            {forgotStage === "sent" && "Skriv inn koden fra e-posten."}
            {forgotStage === "verified" && "Velg et nytt passord."}
          </p>
        </div>

        {forgotStage === "idle" && (
          <form onSubmit={sendForgotCode} className="space-y-3">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="deg@eksempel.no" required autoComplete="email" className={inp} />
            {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            <button type="submit" disabled={submitting} className={btn}>{submitting ? "Sender…" : "Send kode"}</button>
          </form>
        )}

        {forgotStage === "sent" && (
          <form onSubmit={verifyForgotCode} className="space-y-3">
            <input type="text" inputMode="numeric" pattern="[0-9]*" value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="Engangskode" autoFocus autoComplete="one-time-code"
              className={`${inp} text-center text-lg tracking-[0.3em]`} />
            {info && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{info}</p>}
            {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            <button type="submit" disabled={submitting} className={btn}>{submitting ? "Verifiserer…" : "Verifiser kode"}</button>
            <button type="button" onClick={() => { setForgotStage("idle"); setCode(""); setInfo(null); setError(null); }}
              className="w-full text-center text-xs text-stone-500 hover:text-black">Bruk en annen e-post</button>
          </form>
        )}

        {forgotStage === "verified" && (
          <form onSubmit={setNewPassword} className="space-y-3">
            <PasswordInput value={password} onChange={setPassword} placeholder="Nytt passord (minst 6 tegn)"
              autoComplete="new-password" show={showPassword} onToggle={() => setShowPassword((v) => !v)} />
            <PasswordInput value={confirmPassword} onChange={setConfirmPassword} placeholder="Bekreft nytt passord"
              autoComplete="new-password" show={showConfirm} onToggle={() => setShowConfirm((v) => !v)} />
            {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            <button type="submit" disabled={submitting} className={btn}>{submitting ? "Lagrer…" : "Lagre nytt passord"}</button>
          </form>
        )}
      </section>
    );
  }

  // ── Main login / signup screen ─────────────────────────────────────────────

  return (
    <section className="space-y-5 py-8">
      {tab === "signup" && (
        <div className="flex items-center gap-3">
          <SignupProgress step={SIGNUP_STEPS[signupStage]} total={5} />
          <span className="text-xs text-stone-500">Steg {SIGNUP_STEPS[signupStage]} av 5</span>
        </div>
      )}

      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          {tab === "signin" ? "Logg inn"
            : signupStage === "code" ? "Bekreft e-post"
            : signupStage === "password" ? "Velg passord"
            : signupStage === "dob" ? "Bekreft alder"
            : signupStage === "profile" ? "Din profil"
            : signupStage === "delivery" ? "Leveringsinformasjon"
            : "Opprett ny bruker"}
        </h1>
        <p className="mt-1 text-sm text-stone-500">
          {tab === "signin" ? "Med e-post og passord. Du forblir innlogget på denne enheten."
            : signupStage === "code" ? `Vi sendte en kode til ${email}.`
            : signupStage === "password" ? "Velg et sikkert passord for kontoen din."
            : signupStage === "dob" ? "Du må være minst 15 år for å bruke Aktivbruk."
            : signupStage === "profile" ? "Legg til visningsnavn — kan endres når som helst."
            : signupStage === "delivery" ? "Brukes til levering. Kan legges til senere."
            : "Lag en konto på under ett minutt."}
        </p>
      </div>

      {!isSignupInProgress && (
        <div className="flex gap-2">
          <TabChip active={tab === "signin"} onClick={() => { setTab("signin"); resetState(); }}>Logg inn</TabChip>
          <TabChip active={tab === "signup"} onClick={() => { setTab("signup"); resetState(); }}>Opprett ny bruker</TabChip>
        </div>
      )}

      {/* Step 1 — email */}
      {tab === "signup" && signupStage === "email" && (
        <form onSubmit={sendSignupCode} className="space-y-3">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="deg@eksempel.no" required autoComplete="email" className={inp} />
          {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={submitting} className={btn}>{submitting ? "Sender…" : "Send bekreftelseskode"}</button>
        </form>
      )}

      {/* Step 1 — email code */}
      {tab === "signup" && signupStage === "code" && (
        <form onSubmit={verifySignupCode} className="space-y-3">
          {info && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{info}</p>}
          <input type="text" inputMode="numeric" pattern="[0-9]*" value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 10))}
            placeholder="Bekreftelseskode" autoFocus autoComplete="one-time-code"
            className={`${inp} text-center text-lg tracking-[0.3em]`} />
          {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={submitting} className={btn}>{submitting ? "Verifiserer…" : "Bekreft kode"}</button>
          <button type="button" onClick={() => { setSignupStage("email"); setCode(""); setInfo(null); setError(null); }}
            className="w-full text-center text-xs text-stone-500 hover:text-black">Bruk en annen e-post</button>
        </form>
      )}

      {/* Step 2 — password */}
      {tab === "signup" && signupStage === "password" && (
        <form onSubmit={setSignupPassword} className="space-y-3">
          <PasswordInput value={password} onChange={setPassword} placeholder="Passord (minst 6 tegn)"
            autoComplete="new-password" show={showPassword} onToggle={() => setShowPassword((v) => !v)} autoFocus />
          <PasswordInput value={confirmPassword} onChange={setConfirmPassword} placeholder="Bekreft passord"
            autoComplete="new-password" show={showConfirm} onToggle={() => setShowConfirm((v) => !v)} />
          {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={submitting} className={btn}>{submitting ? "Lagrer…" : "Fortsett"}</button>
        </form>
      )}

      {/* Step 3 — date of birth */}
      {tab === "signup" && signupStage === "dob" && (
        <form onSubmit={submitDob} className="space-y-3">
          <input type="text" inputMode="numeric" value={dob}
            onChange={(e) => setDob(formatDob(e.target.value))}
            placeholder="DD.MM.ÅÅÅÅ" autoFocus
            className={`${inp} text-center tracking-widest`} maxLength={10} />
          {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={submitting || dob.length < 10} className={btn}>{submitting ? "Lagrer…" : "Fortsett"}</button>
        </form>
      )}

      {/* Step 4 — basic profile */}
      {tab === "signup" && signupStage === "profile" && (
        <form onSubmit={submitProfile} className="space-y-3">
          <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Visningsnavn (f.eks. Kari N.)" maxLength={40} autoFocus className={inp} />
          <textarea value={bio} onChange={(e) => setBio(e.target.value)}
            placeholder="Kort bio (valgfritt) — hva du selger, hvor du trener"
            rows={3} maxLength={280} className={`${inp} resize-none`} />
          {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={submitting} className={btn}>{submitting ? "Lagrer…" : "Fortsett"}</button>
          <button type="button" onClick={() => setSignupStage("delivery")}
            className="w-full text-center text-xs text-stone-500 hover:text-black">Hopp over</button>
        </form>
      )}

      {/* Step 5 — delivery info */}
      {tab === "signup" && signupStage === "delivery" && (
        <form onSubmit={submitDelivery} className="space-y-3">
          <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
            placeholder="Fullt navn" autoFocus className={inp} />
          <input type="text" value={address} onChange={(e) => setAddress(e.target.value)}
            placeholder="Adresse (f.eks. Storgata 1)" className={inp} />
          <div className="grid grid-cols-2 gap-2">
            <input type="text" value={postalCode}
              onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="Postnummer" inputMode="numeric" className={inp} />
            <input type="text" value={city} onChange={(e) => setCity(e.target.value)}
              placeholder="Sted" className={inp} />
          </div>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
            placeholder="Telefon (f.eks. 40012345)" inputMode="tel" className={inp} />
          {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={submitting} className={btn}>{submitting ? "Fullfører…" : "Fullfør registrering"}</button>
          <button type="button" onClick={() => { router.push(next); router.refresh(); }}
            className="w-full text-center text-xs text-stone-500 hover:text-black">Hopp over</button>
        </form>
      )}

      {/* Sign-in form */}
      {tab === "signin" && (
        <form onSubmit={signIn} className="space-y-3">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="deg@eksempel.no" required autoComplete="email" className={inp} />
          <PasswordInput value={password} onChange={setPassword} placeholder="Passord"
            autoComplete="current-password" show={showPassword} onToggle={() => setShowPassword((v) => !v)} />
          {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={submitting} className={btn}>{submitting ? "Et øyeblikk…" : "Logg inn"}</button>
          <button type="button" onClick={() => { setForgotOpen(true); resetState(); }}
            className="w-full text-center text-xs text-[#5a6b32] underline hover:text-[#435022]">Glemt passord?</button>
        </form>
      )}
    </section>
  );
}

function SignupProgress({ step, total }: { step: number; total: number }) {
  const r = 18;
  const circ = 2 * Math.PI * r;
  const filled = (step / total) * circ;
  const isDone = step === total;
  const color = "#5a6b32";
  return (
    <svg width="44" height="44" viewBox="0 0 44 44">
      <circle cx="22" cy="22" r={r} fill="none" stroke="#e7e5e4" strokeWidth="3" />
      <circle cx="22" cy="22" r={r} fill="none" stroke={color} strokeWidth="3"
        strokeDasharray={`${filled} ${circ}`} strokeDashoffset={0} strokeLinecap="round"
        transform="rotate(-90 22 22)" style={{ transition: "stroke-dasharray 0.4s ease" }} />
      {isDone && <circle cx="22" cy="22" r={r - 5} fill={color} />}
      <text x="22" y="22" textAnchor="middle" dominantBaseline="central"
        fontSize="11" fontWeight="600" fill={isDone ? "white" : color}>
        {step}/{total}
      </text>
    </svg>
  );
}

function TabChip({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className={`rounded-full border px-4 py-1.5 text-xs font-medium transition ${
        active ? "border-[#5a6b32] bg-[#5a6b32] text-white" : "border-stone-300 bg-white text-stone-700 hover:border-stone-500"
      }`}>
      {children}
    </button>
  );
}

function PasswordInput({ value, onChange, placeholder, autoComplete, show, onToggle, autoFocus }: {
  value: string; onChange: (v: string) => void; placeholder: string;
  autoComplete: string; show: boolean; onToggle: () => void; autoFocus?: boolean;
}) {
  return (
    <div className="relative">
      <input type={show ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} autoComplete={autoComplete} autoFocus={autoFocus} className={`${inp} pr-10`} />
      <button type="button" onClick={onToggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
        aria-label={show ? "Skjul passord" : "Vis passord"}>
        {show ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
            <line x1="1" y1="1" x2="23" y2="23"/>
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        )}
      </button>
    </div>
  );
}

const inp =
  "block w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#5a6b32] focus:ring-1 focus:ring-[#5a6b32]/30";

const btn =
  "w-full rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-stone-50 hover:bg-black disabled:opacity-50";
