import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getPublicOrigin } from "@/utils/origin";

export async function POST(request: NextRequest) {
  const supabase = createClient(await cookies());
  await supabase.auth.signOut();
  return NextResponse.redirect(`${getPublicOrigin(request)}/`, { status: 303 });
}
