"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  AVATAR_BUCKET,
  type Profile,
  profileDisplayName,
} from "@/lib/supabase";
import { useToast } from "@/components/ToastProvider";
import { prepareImageForUpload } from "@/lib/image";
import { Icon } from "@/components/Icon";

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

  async function onAvatarFile(rawFile: File) {
    setError(null);
    setUploading(true);
    // iPhone HEIC → JPEG so avatars render on desktop too.
    const file = await prepareImageForUpload(rawFile);
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
        className="cursor-pointer border-y border-line py-4 hover:bg-ink/[0.03]"
      >
        <div className="flex items-center gap-3">
          <Avatar url={avatarUrl} displayName={displayName} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[17px] font-[620]">{name}</p>
            <p className="truncate text-[13px] text-ink-3">{currentEmail ?? ""}</p>
          </div>
          <Icon name="chevron-h" size={18} className="text-ink-3" />
        </div>

        {isIncomplete && (
          <div className="mt-3 rounded-sm bg-ochre-soft p-3">
            <p className="flex items-center gap-1.5 text-[13px] font-semibold text-ochre"><Icon name="advarsel" size={14} />
              {missingShipping ? "Leveringsinformasjon mangler" : "Profilen din er ikke fullført"}
            </p>
            <p className="mt-0.5 text-[13px] text-ochre">
              {missingShipping
                ? "Fyll inn navn, adresse og telefon for å kunne kjøpe og motta varer."
                : missingName && missingAvatar
                  ? "Legg til visningsnavn og profilbilde, kjøpere stoler mer på fullstendige profiler."
                  : missingName
                    ? "Legg til et visningsnavn, kjøpere stoler mer på fullstendige profiler."
                    : "Legg til profilbilde, kjøpere stoler mer på fullstendige profiler."}
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <form
      onSubmit={save}
      className="space-y-3 border-t border-ink pt-4"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-[17px] font-[620] leading-[1.3] [font-stretch:100%]">Profil</h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="tbtn text-sm font-medium text-ink-2"
        >
          Lukk
        </button>
      </div>

      <div className="flex items-center gap-3">
        <Avatar url={avatarUrl} displayName={displayName} />
        <div className="space-y-1.5">
          <label className="btn btn-quiet btn-sm cursor-pointer">
            <Icon name="kamera" size={16} />
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
              className="block text-xs text-ink-3 underline underline-offset-2 hover:text-ink"
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
        <span className="block text-sm font-[620] leading-[1.3] text-ink">E-post</span>
        {emailStage === "idle" && (
          <div className="mt-1 flex items-center gap-2">
            <span className="flex h-12 flex-1 items-center rounded-sm bg-sunk px-3.5 text-ink-2">
              {currentEmail ?? ""}
            </span>
            <button
              type="button"
              onClick={() => { setEmailStage("editing"); setEmailError(null); }}
              className="btn btn-quiet btn-sm shrink-0"
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
            {emailError && <p className="text-xs text-clay">{emailError}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={sendEmailChange}
                disabled={savingEmail || !newEmail.trim()}
                className="btn btn-ink btn-sm"
              >
                {savingEmail ? "Sender…" : "Send bekreftelseskode"}
              </button>
              <button
                type="button"
                onClick={() => { setEmailStage("idle"); setEmailError(null); setNewEmail(""); }}
                className="btn btn-quiet btn-sm"
              >
                Avbryt
              </button>
            </div>
          </div>
        )}
        {emailStage === "code" && (
          <div className="mt-1 space-y-2">
            <p className="text-xs text-ink-3">
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
            {emailError && <p className="text-xs text-clay">{emailError}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={verifyEmailChange}
                disabled={savingEmail || emailCode.length < 6}
                className="rounded-sm bg-ink px-4 py-2 text-xs font-medium text-raised hover:bg-ink disabled:opacity-50"
              >
                {savingEmail ? "Verifiserer…" : "Bekreft"}
              </button>
              <button
                type="button"
                onClick={() => { setEmailStage("idle"); setEmailError(null); setNewEmail(""); setEmailCode(""); }}
                className="btn btn-quiet btn-sm"
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
          placeholder="Litt om deg, hva du selger, hvor du trener, osv."
          className={`${inp} resize-none`}
        />
        <p className="mt-1 text-xs text-ink-3">{bio.length}/280</p>
      </Field>

      <div className="border-t border-line pt-3">
        <p className="mb-2 text-xs font-semibold text-ink-2">Leveringsinformasjon <span className="font-normal text-ink-3">(kreves for kjøp)</span></p>
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

      <div className="border-t border-line pt-3">
        <p className="mb-2 text-xs font-semibold text-ink-2">Fødselsdato</p>
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
        <p className="mt-1 text-xs text-ink-3">Lagres privat, vises ikke på profilen din.</p>
      </div>

      {error && (
        <p className="rounded-sm bg-clay-soft p-3 text-xs text-clay">{error}</p>
      )}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={saving || uploading}
          className="btn btn-ink"
        >
          {saving ? "Lagrer…" : "Lagre profil"}
        </button>
        {savedAt && Date.now() - savedAt < 4000 && (
          <span className="flex items-center gap-1 text-[13px] font-[620] text-olive"><Icon name="hake" size={14} />Lagret</span>
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
        className="h-14 w-14 shrink-0 rounded-circle object-cover"
      />
    );
  }
  const hasName = !!displayName.trim();
  const initials = hasName
    ? displayName.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase()
    : null;
  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-circle bg-[#DCD8CC]">
      {initials ? (
        <span className="text-base font-semibold text-ink-2">{initials}</span>
      ) : (
        <Icon name="profil" size={26} className="text-ink-3" />
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
    <label className="block space-y-2">
      <span className="block text-sm font-[620] leading-[1.3] text-ink">{label}</span>
      {children}
    </label>
  );
}

const inp =
  "field";
