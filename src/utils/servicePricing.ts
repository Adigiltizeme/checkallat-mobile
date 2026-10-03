/**
 * Prix d'un service pour l'affichage — même formule que le serveur (PricingCalculatorService),
 * qui recalcule toujours le montant réellement facturé.
 *
 * - Forfait : prix de base
 * - À l'heure : déplacement + tarif horaire × max(durée choisie, minimum d'heures)
 * - Urgence (immédiat) : multiplicateur sur déplacement + main-d'œuvre, jamais sur les suppléments
 */

/** Durées proposées au client pour une prestation à l'heure */
export const HOUR_OPTIONS = [1, 1.5, 2, 3, 4, 6, 8];
/** Tranche de facturation du temps réel */
export const BILLING_STEP_MINUTES = 15;
/** Temps supplémentaire proposé au prestataire (minutes) */
export const OVERTIME_OPTIONS = [15, 30, 60, 90, 120];

const ZERO_DECIMAL = new Set(['BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF']);

export function roundMoney(amount: number, currency?: string | null): number {
  return ZERO_DECIMAL.has((currency ?? '').toUpperCase()) ? Math.round(amount) : Math.round(amount * 100) / 100;
}

export interface CategoryPricingMeta {
  basePrice?: number | null;
  currency?: string | null;
  urgencyEnabled?: boolean;
  urgencyMultiplier?: number;
  pricingMode?: 'flat' | 'hourly';
  hourlyRate?: number | null;
  callOutFee?: number | null;
  minimumHours?: number | null;
}

export interface ServicePriceBreakdown {
  mode: 'flat' | 'hourly';
  currency: string;
  hourlyRate: number | null;
  callOutFee: number;
  minimumHours: number;
  hours: number | null;
  labor: number;
  urgencyApplied: boolean;
  urgencyPct: number;
  urgencyAmount: number;
  extras: number;
  total: number;
}

export function isHourly(meta?: CategoryPricingMeta | null): boolean {
  return meta?.pricingMode === 'hourly' && (meta?.hourlyRate ?? 0) > 0;
}

export function computeServicePrice(
  meta: CategoryPricingMeta | null | undefined,
  opts: { immediate: boolean; hours?: number | null; extras?: number },
): ServicePriceBreakdown | null {
  if (!meta || (meta.basePrice == null && !isHourly(meta))) return null;
  const currency = meta.currency ?? '';
  const hourly = isHourly(meta);
  const minimumHours = hourly ? Math.max(0.5, meta.minimumHours ?? 1) : 1;
  const hours = hourly ? Math.max(minimumHours, opts.hours ?? minimumHours) : null;
  const callOutFee = hourly ? meta.callOutFee ?? 0 : 0;
  const labor = hourly ? (meta.hourlyRate ?? 0) * (hours ?? 0) : meta.basePrice ?? 0;
  const multiplier = meta.urgencyMultiplier ?? 1.3;
  const urgencyApplied = opts.immediate && (meta.urgencyEnabled ?? true) && multiplier > 1;
  const subtotal = labor + callOutFee;
  const service = roundMoney(subtotal * (urgencyApplied ? multiplier : 1), currency);
  const extras = roundMoney(opts.extras ?? 0, currency);
  return {
    mode: hourly ? 'hourly' : 'flat',
    currency,
    hourlyRate: hourly ? meta.hourlyRate ?? null : null,
    callOutFee,
    minimumHours,
    hours,
    labor: roundMoney(labor, currency),
    urgencyApplied,
    urgencyPct: Math.round((multiplier - 1) * 100),
    urgencyAmount: roundMoney(service - subtotal, currency),
    extras,
    total: roundMoney(service + extras, currency),
  };
}

/**
 * Prix d'une offre de prestataire tel qu'affiché au client et au prestataire :
 * prix proposé, sinon tarif horaire de la plateforme (à l'heure), sinon prix affiché à la réservation.
 */
export function bidPriceLabel(
  bid: { proposedPrice?: number | null } | null | undefined,
  booking: { pricingMode?: string | null; hourlyRate?: number | null; callOutFee?: number | null; currency?: string | null; estimatedPrice?: number | null } | null | undefined,
  money: (amount: number) => string,
  t: (k: string, o?: any) => string,
): string {
  if (bid?.proposedPrice != null) return money(bid.proposedPrice);
  if (booking?.pricingMode === 'hourly' && booking.hourlyRate) {
    const rate = t('service_pricing.rate_badge', { rate: booking.hourlyRate, currency: booking.currency ?? '' });
    return booking.callOutFee
      ? `${rate} + ${t('service_pricing.call_out_short', { amount: money(booking.callOutFee) })}`
      : rate;
  }
  return money(booking?.estimatedPrice ?? 0);
}

/** Paiement in-app pas encore confirmé : le prestataire ne peut ni partir ni commencer */
export const isAwaitingClientPayment = (booking: { paymentMethod?: string | null; paymentId?: string | null } | null | undefined): boolean =>
  booking?.paymentMethod === 'in_app' && !booking?.paymentId;

/** « 1 h 30 » / « 45 min » */
export function formatDuration(minutes: number, t: (k: string, o?: any) => string): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return t('service_pricing.duration_min', { m });
  if (m === 0) return t('service_pricing.duration_h', { h });
  return t('service_pricing.duration_hm', { h, m: String(m).padStart(2, '0') });
}
