import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient as createSessionClient } from "@/utils/supabase/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only helpers for the /admin pages.
 *
 * This module reads the service role key and must never be imported from a
 * "use client" file. next/headers and next/navigation would fail the build if
 * it were, and check:rsc guards the other direction.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_USER_ID = process.env.ADMIN_USER_ID;

/**
 * Redirects to / for anyone who is not the admin, then hands back a client
 * that bypasses RLS. orders and messages are scoped to their own participants,
 * so a platform-wide view has no other way in.
 *
 * Returns null when the service role key is missing, so a page can say so
 * rather than crash. Never returns a privileged client to a non-admin: the
 * redirect above throws before this line is reached.
 */
export async function requireAdminDb(): Promise<SupabaseClient | null> {
  const session = createSessionClient(await cookies());
  const { data: { user } } = await session.auth.getUser();

  // Fails closed: a missing ADMIN_USER_ID locks the page rather than opening it.
  if (!ADMIN_USER_ID || !user || user.id !== ADMIN_USER_ID) redirect("/");

  if (!SERVICE_ROLE_KEY) return null;
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
}

/** Server renders in UTC on Netlify, so the timezone has to be explicit. */
const osloTime = new Intl.DateTimeFormat("nb-NO", {
  timeZone: "Europe/Oslo",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export function fmtWhen(iso: string | null): string {
  if (!iso) return "–";
  return osloTime.format(new Date(iso));
}

export function fmtAgo(iso: string | null): string {
  if (!iso) return "";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "nå";
  if (mins < 60) return `${mins} min siden`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} t siden`;
  return `${Math.round(hours / 24)} d siden`;
}
