"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  AVATAR_BUCKET,
  type Profile,
  profileDisplayName,
} from "@/lib/supabase";
import { useToast } from "@/components/ToastProvider";

type EmailStage = "idle" | "editing" | "code";

export function ProfileEditor({ email: initialEmail }: { email?: string | null }) {
  const toast = useToast();
  const supabase = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dob, setDob] = useState("");

  // Email change state
  const [currentEmail, setCurrentEmail] = useState<string | null>(initialEmail ?? null);
  const [emailStage, setEmailStage] = useState<EmailStage>("idle");
  const [newEmail, setNewEmail] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
      setDob(data.user?.user_metadata?.date_of_birth ?? "");
      setCurrentEmail(data.user?.email ?? null);
    });
  }, [supabase]);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        const p = (data ?? null) as Profile | null;
        setProfile(p);
        setDisplayName(p?.display_name ?? "");
        setBio(p?.bio ?? "");
        setAvatarUrl(p?.avatar_url ?? null);
        setFullName(p?.full_name ?? "");
        setAddress(p?.address ?? "");
        setPostalCode(p?.postal_code ?? "");
        setCity(p?.city ?? "");
        setPhone(p?.phone ?? "");
      });
  }, [userId, supabase]);

  if (!userId) return null;

  const name = profileDisplayName(profile, userId);

  function formatDob(raw: string): string {
    const digits = raw.replace(/\D/g, "").slice(0, 8);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
    return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`;
  }

  async function onAvatarFile(file: File) {
    setError(null);
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `avatars/${userId}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(path, file, { cacheControl: "3600", upsert: true });
    setUploading(false);
    if (upErr) {
      setError(upErr.message);
      return;
    }
    const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
    setAvatarUrl(data.publicUrl);
  }

  async function sendEmailChange() {
    setEmailError(null);
    setSavingEmail(true);
    const { error: err } = await supabase.auth.updateUser({ email: newEmail.trim() });
    setSavingEmail(false);
    if (err) {
      setEmailError(err.message);
      return;
    }
    setEmailStage("code");
  }

  async function verifyEmailChange() {
    setEmailError(null);
    setSavingEmail(true);
    const { error: err } = await supabase.auth.verifyOtp({
      email: newEmail.trim(),
      token: emailCode.trim(),
      type: "email_change",
    });
    setSavingEmail(false);
    if (err) {
      setEmailError(err.message);
      return;
    }
    setCurrentEmail(newEmail.trim());
    setEmailStage("idle");
    setNewEmail("");
    setEmailCode("");
    toast("E-post oppdatert");
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const payload = {
      user_id: userId!,
      display_name: displayName.trim() || null,
      bio: bio.trim() || null,
      avatar_url: avatarUrl,
      full_name: fullName.trim() || null,
      address: address.trim() || null,
      postal_code: postalCode.trim() || null,
      city: city.trim() || null,
      phone: phone.trim() || null,
    };
    const [profileRes] = await Promise.all([
      supabase.from("profiles").upsert(payload, { onConflict: "user_id" }).select("*").single(),
      dob.length === 10
        ? supabase.auth.updateUser({ data: { date_of_birth: dob } })
        : Promise.resolve(null),
    ]);
    setSaving(false);
    if (profileRes.error) {
      setError(profileRes.error.message);
      return;
    }
    if (profileRes.data) setProfile(profileRes.data as Profile);
    setSavedAt(Date.now());
    setOpen(false);
    toast("Profil lagret");
  }

  if (!open) {
    const missingShipping = !profile?.full_name || !profile?.address || !profile?.postal_code || !profile?.city || !profile?.phone;
    const missingName = !profile?.display_name;
    const missingAvatar = !avatarUrl;
    const isIncomplete = missingShipping || missingName || missingAvatar;

    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setOpen(true)}
        className="cursor-pointer rounded-2xl border border-[#5a6b32]/40 bg-white p-4 transition hover:border-[#5a6b32] hover:bg-[#5a6b32]/5"
      >
        <div className="flex items-center gap-3">
          <Avatar url={avatarUrl} displayName={displayName} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold tracking-tight">{name}</p>
            <p className="truncate text-xs text-stone-500">{currentEmail ?? ""}</p>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-stone-400" aria-hidden>
            <path d="M9 18l6-6-6-6" />
          </svg>
        </div>

        {isIncomplete && (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs font-semibold text-amber-900">
              {missingShipping ? "Leveringsinformasjon mangler" : "Profilen din er ikke fullført"}
            </p>
            <p className="mt-0.5 text-xs text-amber-800">
              {missingShipping
                ? "Fyll inn navn, adresse og telefon for å kunne kjøpe og motta varer."
                : missingName && missingAvatar
                  ? "Legg til visningsnavn og profilbilde — kjøpere stoler mer på fullstendige profiler."
                  : missingName
                    ? "Legg til et visningsnavn — kjøpere stoler mer på fullstendige profiler."
                    : "Legg til profilbilde — kjøpere stoler mer på fullstendige profiler."}
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <form
      onSubmit={save}
      className="space-y-3 rounded-2xl border border-stone-200 bg-white p-4"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Profil</p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-stone-500 hover:text-black"
        >
          Lukk
        </button>
      </div>

      <div className="flex items-center gap-3">
        <Avatar url={avatarUrl} displayName={displayName} />
        <div className="space-y-1.5">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:border-stone-500">
            {uploading ? "Laster opp…" : avatarUrl ? "Bytt bilde" : "Last opp bilde"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onAvatarFile(f);
                e.target.value = "";
              }}
            />
          </label>
          {avatarUrl && (
            <button
              type="button"
              onClick={() => setAvatarUrl(null)}
              className="block text-[11px] text-stone-500 underline underline-offset-2 hover:text-black"
            >
              Fjern bilde
            </button>
          )}
        </div>
      </div>

      <Field label="Visningsnavn">
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={40}
          placeholder="f.eks. Kari N. eller Treningskari"
          className={inp}
        />
      </Field>

      {/* Email change */}
      <div>
        <span className="block text-xs font-medium text-stone-600">E-post</span>
        {emailStage === "idle" && (
          <div className="mt-1 flex items-center gap-2">
            <span className="flex-1 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-700">
              {currentEmail ?? ""}
            </span>
            <button
              type="button"
              onClick={() => { setEmailStage("editing"); setEmailError(null); }}
              className="shrink-0 rounded-full border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-700 hover:border-stone-500"
            >
              Endre
            </button>
          </div>
        )}
        {emailStage === "editing" && (
          <div className="mt-1 space-y-2">
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="Ny e-postadresse"
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
              className={inp}
            />
            {emailError && <p className="text-xs text-red-600">{emailError}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={sendEmailChange}
                disabled={savingEmail || !newEmail.trim()}
                className="rounded-full bg-stone-900 px-4 py-2 text-xs font-medium text-white hover:bg-black disabled:opacity-50"
              >
                {savingEmail ? "Sender…" : "Send bekreftelseskode"}
              </button>
              <button
                type="button"
                onClick={() => { setEmailStage("idle"); setEmailError(null); setNewEmail(""); }}
                className="rounded-full border border-stone-300 px-3 py-2 text-xs font-medium text-stone-700 hover:border-stone-500"
              >
                Avbryt
              </button>
            </div>
          </div>
        )}
        {emailStage === "code" && (
          <div className="mt-1 space-y-2">
            <p className="text-xs text-stone-500">
              Vi sendte en kode til <span className="font-medium">{newEmail}</span>. Sjekk innboksen din.
            </p>
            <input
              type="text"
              inputMode="numeric"
              value={emailCode}
              onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, ""))}
              placeholder="6-sifret kode"
              maxLength={6}
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
              className={`${inp} tracking-widest`}
            />
            {emailError && <p className="text-xs text-red-600">{emailError}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={verifyEmailChange}
                disabled={savingEmail || emailCode.length < 6}
                className="rounded-full bg-stone-900 px-4 py-2 text-xs font-medium text-white hover:bg-black disabled:opacity-50"
              >
                {savingEmail ? "Verifiserer…" : "Bekreft"}
              </button>
              <button
                type="button"
                onClick={() => { setEmailStage("idle"); setEmailError(null); setNewEmail(""); setEmailCode(""); }}
                className="rounded-full border border-stone-300 px-3 py-2 text-xs font-medium text-stone-700 hover:border-stone-500"
              >
                Avbryt
              </button>
            </div>
          </div>
        )}
      </div>

      <Field label="Bio (valgfritt)">
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={3}
          maxLength={280}
          placeholder="Litt om deg — hva du selger, hvor du trener, osv."
          className={`${inp} resize-none`}
        />
        <p className="mt-1 text-[10px] text-stone-400">{bio.length}/280</p>
      </Field>

      <div className="border-t border-stone-100 pt-3">
        <p className="mb-2 text-xs font-semibold text-stone-700">Leveringsinformasjon <span className="font-normal text-stone-500">(kreves for kjøp)</span></p>
        <div className="space-y-2.5">
          <Field label="Fullt navn *">
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ola Nordmann" className={inp} />
          </Field>
          <Field label="Adresse *">
            <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Storgata 1" className={inp} />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Postnummer *">
              <input type="text" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="0123" inputMode="numeric" className={inp} />
            </Field>
            <Field label="Sted *">
              <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Oslo" className={inp} />
            </Field>
          </div>
          <Field label="Telefon *">
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="40012345" inputMode="tel" className={inp} />
          </Field>
        </div>
      </div>

      <div className="border-t border-stone-100 pt-3">
        <p className="mb-2 text-xs font-semibold text-stone-700">Fødselsdato</p>
        <Field label="DD.MM.ÅÅÅÅ">
          <input
            type="text"
            inputMode="numeric"
            value={dob}
            onChange={(e) => setDob(formatDob(e.target.value))}
            placeholder="DD.MM.ÅÅÅÅ"
            maxLength={10}
            className={`${inp} tracking-widest`}
          />
        </Field>
        <p className="mt-1 text-[10px] text-stone-400">Lagres privat — vises ikke på profilen din.</p>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{error}</p>
      )}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={saving || uploading}
          className="rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-stone-50 hover:bg-black disabled:opacity-50"
        >
          {saving ? "Lagrer…" : "Lagre profil"}
        </button>
        {savedAt && Date.now() - savedAt < 4000 && (
          <span className="text-xs text-emerald-700">✓ Lagret</span>
        )}
      </div>
    </form>
  );
}

function Avatar({ url, displayName }: { url: string | null; displayName: string }) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        className="h-14 w-14 shrink-0 rounded-full object-cover"
      />
    );
  }
  const hasName = !!displayName.trim();
  const initials = hasName
    ? displayName.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase()
    : null;
  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#5a6b32]/10">
      {initials ? (
        <span className="text-base font-semibold text-[#5a6b32]">{initials}</span>
      ) : (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-stone-400" aria-hidden>
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="block text-xs font-medium text-stone-600">{label}</span>
      {children}
    </label>
  );
}

const inp =
  "block w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#5a6b32] focus:ring-1 focus:ring-[#5a6b32]/30";
