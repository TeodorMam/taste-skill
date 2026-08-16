import { type SupabaseClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { stripe } from "./stripe";

// Releases the seller's escrowed funds to their bank.
//
// Two payment-flow generations coexist:
//
// 1) Legacy "separate charges + transfers": funds sat on the platform
//    balance after checkout. Release = stripe.transfers.create() to the
//    seller's Connect account.
//
// 2) Current "destination charge + manual Connect payout": funds already
//    live on the seller's Connect balance from the moment of payment.
//    Release = stripe.payouts.create() on the connected account, moving
//    it from their Stripe balance to their bank.
//
// We detect which one by inspecting the PaymentIntent's transfer_data.
// Orders created before the escrow refactor have no transfer_data and
// use path (1); everything after uses path (2).
export async function payoutOrder(
  admin: SupabaseClient,
  orderId: string,
  amountNok: number,
  _platformFeeNok: number,
  sellerUserId: string,
  extraUpdates: Record<string, unknown> = {},
) {
  const { data: profile } = await admin
    .from("profiles")
    .select("stripe_account_id")
    .eq("user_id", sellerUserId)
    .maybeSingle();

  if (!profile?.stripe_account_id) throw new Error("no_stripe_account");
  const sellerAccountId = profile.stripe_account_id;

  const { data: orderRow } = await admin
    .from("orders")
    .select("stripe_payment_intent_id, shipping_cost_nok")
    .eq("id", orderId)
    .maybeSingle();

  void _platformFeeNok;
  const shippingCost = orderRow?.shipping_cost_nok ?? 0;
  // Seller keeps 100% of item + shipping. Platform fee was already routed
  // via application_fee_amount at charge time (new flow) or is subtracted
  // by transfer amount (legacy flow, handled in the branch below).
  const sellerAmountOre = (amountNok + shippingCost) * 100;

  // Detect payment flow generation
  let usesDestinationCharge = false;
  let paymentIntentId: string | undefined;
  let sourceTransaction: string | undefined;
  let stripeNetOre: number | undefined;

  if (orderRow?.stripe_payment_intent_id) {
    paymentIntentId = orderRow.stripe_payment_intent_id;
    try {
      const pi = await stripe.paymentIntents.retrieve(paymentIntentId, {
        expand: ["latest_charge.balance_transaction"],
      });
      usesDestinationCharge = !!pi.transfer_data?.destination;
      const charge = pi.latest_charge as Stripe.Charge | null;
      if (charge?.id) {
        sourceTransaction = charge.id;
        const bt = charge.balance_transaction as Stripe.BalanceTransaction | null;
        if (bt?.net) stripeNetOre = bt.net;
      }
    } catch (e) {
      console.warn("[payout] could not retrieve payment intent:", e);
    }
  }

  let releaseRef: string;
  let payoutAmountOre: number;

  if (usesDestinationCharge) {
    // NEW FLOW: funds are already on the seller's Connect balance. Trigger
    // a payout on that account to release them to the seller's bank.
    const payout = await stripe.payouts.create(
      {
        amount: sellerAmountOre,
        currency: "nok",
        metadata: { order_id: orderId },
      },
      { stripeAccount: sellerAccountId, idempotencyKey: `payout-${orderId}` },
    );
    releaseRef = payout.id;
    payoutAmountOre = sellerAmountOre;
  } else {
    // LEGACY FLOW: funds are on the platform balance. Transfer to the
    // seller's Connect account. Cap by Stripe's actual net so we never
    // try to transfer more than what deposited after Stripe fees.
    let transferAmountOre = sellerAmountOre;
    if (stripeNetOre !== undefined) {
      transferAmountOre = Math.min(sellerAmountOre, stripeNetOre);
    }
    const transferParams: Stripe.TransferCreateParams = {
      amount: transferAmountOre,
      currency: "nok",
      destination: sellerAccountId,
      metadata: { order_id: orderId },
    };
    if (sourceTransaction) transferParams.source_transaction = sourceTransaction;
    const transfer = await stripe.transfers.create(
      transferParams,
      { idempotencyKey: `payout-${orderId}` },
    );
    releaseRef = transfer.id;
    payoutAmountOre = transferAmountOre;
  }

  await admin
    .from("orders")
    .update({
      status: "paid_out",
      payout_transfer_id: releaseRef,
      payout_amount_nok: Math.round(payoutAmountOre / 100),
      ...extraUpdates,
    })
    .eq("id", orderId);

  return { id: releaseRef, amount: payoutAmountOre, mode: usesDestinationCharge ? "connect_payout" : "transfer" };
}
