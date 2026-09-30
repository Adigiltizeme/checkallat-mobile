import type { Middleware } from '@reduxjs/toolkit';
import { trackEvent, identifyAnalyticsUser, resetAnalytics, type AnalyticsEventName } from '../services/analytics';

type Mapping = { event: AnalyticsEventName; props?: (arg: any) => Record<string, string | undefined> };

const transportSector = (arg: any) => (arg?.vehicleCategory === 'courier' ? 'courier' : 'transport');

/**
 * Étapes clés mesurées au succès des requêtes correspondantes (un seul endroit pour tous les écrans).
 * Seuls le secteur et le mode de paiement sont retenus, jamais le contenu de la commande.
 */
const MUTATION_EVENTS: Record<string, Mapping> = {
  register: { event: 'register' },
  login: { event: 'login' },
  verifyOTP: { event: 'phone_verified' },
  verifyEmail: { event: 'email_verified' },
  createTransportRequest: {
    event: 'order_created',
    props: (a) => ({ sector: transportSector(a), payment: a?.paymentMethod }),
  },
  createBooking: { event: 'order_created', props: (a) => ({ sector: 'services', payment: a?.paymentMethod }) },
  checkoutOrder: { event: 'checkout_started', props: (a) => ({ sector: 'marketplace', payment: a?.paymentMethod }) },
  prepareTransportPayment: { event: 'payment_started', props: (a) => ({ sector: transportSector(a) }) },
  prepareBookingPayment: { event: 'payment_started', props: () => ({ sector: 'services' }) },
  prepareBookingPaymentById: { event: 'payment_started', props: () => ({ sector: 'services' }) },
  cancelTransport: { event: 'order_cancelled', props: () => ({ sector: 'transport' }) },
  cancelBooking: { event: 'order_cancelled', props: () => ({ sector: 'services' }) },
  cancelOrder: { event: 'order_cancelled', props: () => ({ sector: 'marketplace' }) },
  openDispute: { event: 'dispute_opened', props: () => ({ sector: 'transport' }) },
  openBookingDispute: { event: 'dispute_opened', props: () => ({ sector: 'services' }) },
  openOrderClaim: { event: 'dispute_opened', props: () => ({ sector: 'marketplace' }) },
  applyAsDriver: { event: 'application_submitted', props: () => ({ type: 'driver' }) },
  createProProfile: { event: 'application_submitted', props: () => ({ type: 'pro' }) },
  applySeller: { event: 'application_submitted', props: () => ({ type: 'seller' }) },
};

export const analyticsMiddleware: Middleware = () => (next) => (action: any) => {
  const result = next(action);
  try {
    const type: string = action?.type ?? '';
    if (type.endsWith('/executeMutation/fulfilled')) {
      const endpoint = action.meta?.arg?.endpointName as string | undefined;
      const mapping = endpoint ? MUTATION_EVENTS[endpoint] : undefined;
      if (mapping) trackEvent(mapping.event, mapping.props?.(action.meta.arg.originalArgs));
    } else if (type === 'auth/setCredentials') {
      identifyAnalyticsUser(action.payload?.user);
    } else if (type === 'auth/logout') {
      resetAnalytics();
    }
  } catch {
    // La mesure d'usage ne doit jamais perturber l'application
  }
  return result;
};
