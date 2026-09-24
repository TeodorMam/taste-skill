import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createSessionClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { BUCKET, itemImages, type Item } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// A public URL looks like
//   <project>/storage/v1/object/public/item-images/<path>
// and only the part after the bucket name is what remove() wants. Anything
// that is not in our own bucket, such as a seeded external image, is left
// alone rather than guessed at.
function storagePath(url: string): string | null {
  const marker = `/object/public/${BUCKET}/`;
  const at = url.indexOf(marker);
  if (at === -1) return null;
  const path = url.slice(at + marker.length).split("?")[0];
  return path ? decodeURIComponent(path) : null;
}

/**
 * Deleting a listing used to be a single client-side delete of the row, which
 * left every photo in the bucket, reachable at its URL, for good. A seller who
 * removed a listing because the background of a photo showed their living room
 * had not removed anything at all.
 *
 * It runs here rather than in the browser so the files and the row go together
 * and neither half depends on the client staying open, and so the removal can
 * use the service role instead of a storage policy that would have to let
 * users delete objects.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const session = createSessionClient(await cookies());
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: "Logg inn først" }, { status: 401 });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  const { data: item } = await admin
    .from("items")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!item) return NextResponse.json({ error: "Annonsen finnes ikke" }, { status: 404 });
  if ((item as Item).seller_id !== user.id) {
    return NextResponse.json({ error: "Ikke autorisert" }, { status: 403 });
  }

  // Files first. If this half fails the row survives, so the seller sees the
  // listing still there and can try again; the reverse would leave orphans
  // nobody can ever find, let alone remove.
  const paths = itemImages(item as Item)
    .map(storagePath)
    .filter((p): p is string => !!p);

  if (paths.length > 0) {
    const { error: rmErr } = await admin.storage.from(BUCKET).remove(paths);
    if (rmErr) {
      console.error("[items DELETE] storage remove failed:", rmErr.message, paths);
      return NextResponse.json({ error: "Klarte ikke slette bildene, prøv igjen" }, { status: 500 });
    }
  }

  const { error: delErr } = await admin.from("items").delete().eq("id", id);
  if (delErr) {
    console.error("[items DELETE] row delete failed:", delErr.message);
    return NextResponse.json({ error: "Klarte ikke slette annonsen" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
