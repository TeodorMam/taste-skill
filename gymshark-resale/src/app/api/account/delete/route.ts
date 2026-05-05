import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const TERMINAL = ["cancelled", "refunded", "paid_out"];

export async function POST() {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Block if the user has any non-terminal orders
  const { data: activeOrders } = await admin
    .from("orders")
    .select("id")
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    .not("status", "in", `(${TERMINAL.join(",")})`);

  if (activeOrders && activeOrders.length > 0) {
    return NextResponse.json(
      { error: "Du har aktive ordre. Fullfør dem før du sletter kontoen." },
      { status: 400 },
    );
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.auth.signOut();

  return NextResponse.json({ ok: true });
}
