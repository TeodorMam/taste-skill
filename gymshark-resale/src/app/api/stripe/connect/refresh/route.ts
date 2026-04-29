import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aktivbruk.com";

export async function GET(req: NextRequest) {
  const accountId = req.nextUrl.searchParams.get("account");
  if (!accountId) return NextResponse.redirect(`${SITE_URL}/profil`);

  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${SITE_URL}/api/stripe/connect/refresh?account=${accountId}`,
    return_url: `${SITE_URL}/profil?stripe=return`,
    type: "account_onboarding",
  });

  return NextResponse.redirect(link.url);
}
