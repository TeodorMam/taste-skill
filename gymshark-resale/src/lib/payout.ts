import { type SupabaseClient } from "@supabase/supabase-js";
import { stripe } from "./stripe";

export async function payoutOrder(
  admin: SupabaseClient,
  orderId: string,
  amountNok: number,
  platformFeeNok: number,
  sellerUserId: string,
  extraUpdates: Record<string, unknown> = {},
) {
  const { data: profile } = await admin
    .from("profiles")
    .select("stripe_account_id")
    .eq("user_id", sellerUserId)
    .maybeSingle();

  if (!profile?.stripe_account_id) throw new Error("no_stripe_account");

  const payoutAmountNok = amountNok - platformFeeNok;

  const transfer = await stripe.transfers.create(
    {
      amount: payoutAmountNok * 100,
      currency: "nok",
      destination: profile.stripe_account_id,
      metadata: { order_id: orderId },
    },
    { idempotencyKey: `payout-${orderId}` },
  );

  await admin
    .from("orders")
    .update({
      status: "paid_out",
      payout_transfer_id: transfer.id,
      payout_amount_nok: payoutAmountNok,
      ...extraUpdates,
    })
    .eq("id", orderId);

  return transfer;
}
