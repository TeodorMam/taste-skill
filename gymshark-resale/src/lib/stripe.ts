import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia",
  typescript: true,
});

export const PLATFORM_FEE_PERCENT = 7;

export function calcFee(amountNok: number): number {
  return Math.round(amountNok * PLATFORM_FEE_PERCENT / 100);
}
