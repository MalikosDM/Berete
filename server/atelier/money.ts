/*
 * The amounts of a commission, computed by the server only (never by the page), in cents of its currency:
 *   total      = the price of the accepted quotation + its fees
 *   credited   = the professional design fee paid at the start (1 000 € by default, set per project) + the payments confirmed
 *   remaining  = total − credited (never below zero)
 *   deposit    = 50 % of the total, less what is already credited (the design fee counts towards it); never below zero
 *   balance    = what remains after the deposit (the same as "remaining" once the deposit is paid)
 * Option 1 « PAY 50% DEPOSIT » asks for the deposit, option 2 « PAY 100% » for everything remaining; once the deposit is paid,
 * the balance is paid at the same place.
 */
export type Money = {
  currency: string;
  total: number;
  designFee: number;
  paid: number;
  credited: number;
  remaining: number;
  deposit: number;
  depositPaid: boolean;
};

export const DEPOSIT_SHARE = 0.5;

export function moneyOf(input: { currency: string; priceCents: number; feesCents: number; designFeeCents: number; paidCents: number }): Money {
  const total = Math.max(0, input.priceCents + input.feesCents);
  const designFee = Math.max(0, input.designFeeCents);
  const paid = Math.max(0, input.paidCents);
  const credited = designFee + paid;
  const remaining = Math.max(0, total - credited);
  const half = Math.round(total * DEPOSIT_SHARE);
  const deposit = Math.max(0, Math.min(remaining, half - credited));
  return { currency: input.currency, total, designFee, paid, credited, remaining, deposit, depositPaid: credited >= half };
}

/** "€12,500.00" for the e-mails and the PDF (English, the language of the quotations). */
export function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(cents / 100);
}
