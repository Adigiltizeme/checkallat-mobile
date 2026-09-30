/**
 * Montant → plus petite unité Stripe (même règle que le backend, common/stripe-amount.ts).
 * Les devises « sans décimale » comme le franc CFA (XOF) ne sont pas multipliées par 100.
 */
const ZERO_DECIMAL_CURRENCIES = new Set([
  'BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF',
]);

export const toStripeAmount = (amount: number, currency: string): number =>
  ZERO_DECIMAL_CURRENCIES.has(currency.toUpperCase()) ? Math.round(amount) : Math.round(amount * 100);
