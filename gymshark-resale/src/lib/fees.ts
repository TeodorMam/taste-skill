// Buyer-side platform fee ("Kjøperbeskyttelse").
// - Charged to the buyer at Stripe checkout as a separate line item.
// - Seller receives 100% of the item price + shipping reimbursement.
// - Formula: max(FLOOR, FLAT + PERCENT% × item price)
//   The flat component covers Stripe's fixed 1.80 kr per-transaction fee
//   so we don't lose money on small orders. The floor guarantees minimum
//   margin on tiny items where the percentage alone is trivial.
//
// Client-safe: no server-only imports.

export const PLATFORM_FEE_PERCENT = 7;
export const PLATFORM_FEE_FLAT_NOK = 12;
export const PLATFORM_FEE_MIN_NOK = 20;

export function calcBuyerFee(itemPriceNok: number): number {
  const percent = Math.round((itemPriceNok * PLATFORM_FEE_PERCENT) / 100);
  return Math.max(PLATFORM_FEE_MIN_NOK, percent + PLATFORM_FEE_FLAT_NOK);
}
