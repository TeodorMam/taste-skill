import { type SupabaseClient } from "@supabase/supabase-js";
import Stripe from "stripe";
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

  const desiredOre = (amountNok - platformFeeNok) * 100;

  // Fetch the charge so we can use source_transaction and know the actual net
  // amount Stripe deposited (charge amount minus Stripe's own processing fees).
  const { data: orderRow } = await admin
    .from("orders")
    .select("stripe_payment_intent_id")
    .eq("id", orderId)
    .maybeSingle();

  let transferAmountOre = desiredOre;
  let sourceTransaction: string | undefined;

  if (orderRow?.stripe_payment_intent_id) {
    try {
      const pi = await stripe.paymentIntents.retrieve(
        orderRow.stripe_payment_intent_id,
        { expand: ["latest_charge.balance_transaction"] },
      );
      const charge = pi.latest_charge as Stripe.Charge | null;
      if (charge?.id) {
        sourceTransaction = charge.id;
        const bt = charge.balance_transaction as Stripe.BalanceTransaction | null;
        if (bt?.net) {
          // Never transfer more than what Stripe actually deposited after its fees.
          // For normal-sized orders the desired amount is always lower; this only
          // kicks in for tiny test payments where the fixed Stripe fee dominates.
          transferAmountOre = Math.min(desiredOre, bt.net);
        }
      }
    } catch (e) {
      // Non-fatal — proceed without source_transaction
      console.warn("[payout] could not retrieve payment intent:", e);
    }
  }

  const transferParams: Stripe.TransferCreateParams = {
    amount: transferAmountOre,
    currency: "nok",
    destination: profile.stripe_account_id,
    metadata: { order_id: orderId },
  };
  if (sourceTransaction) {
    transferParams.source_transaction = sourceTransaction;
  }

  const transfer = await stripe.transfers.create(
    transferParams,
    { idempotencyKey: `payout-${orderId}` },
  );

  await admin
    .from("orders")
    .update({
      status: "paid_out",
      payout_transfer_id: transfer.id,
      payout_amount_nok: Math.round(transferAmountOre / 100),
      ...extraUpdates,
    })
    .eq("id", orderId);

  return transfer;
}
