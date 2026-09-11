import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia",
  typescript: true,
});

// Platform fee constants moved to src/lib/fees.ts (client-safe).
// The seller-side deduction model was replaced by a buyer-side
// "Kjøperbeskyttelse" line item — see calcBuyerFee in that file.
