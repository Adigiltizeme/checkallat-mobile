import { useSyncExternalStore } from 'react';
import {
  trackEvent,
  trackScreen,
  identifyAnalyticsUser,
  resetAnalytics,
  getAnalyticsConsent,
  isAnalyticsConsentLoaded,
  setAnalyticsConsent,
  subscribeAnalyticsConsent,
} from '../services/analytics';

/** Mesure d'usage (voir services/analytics.ts) */
export const useAnalytics = () => ({ track: trackEvent, trackScreen, identifyUser: identifyAnalyticsUser, reset: resetAnalytics });

/** Choix de la personne sur la mesure d'usage, mis à jour en direct */
export function useAnalyticsConsent() {
  const consent = useSyncExternalStore(subscribeAnalyticsConsent, getAnalyticsConsent);
  const loaded = useSyncExternalStore(subscribeAnalyticsConsent, isAnalyticsConsentLoaded);
  return { consent, loaded, setConsent: setAnalyticsConsent };
}

export { trackEvent, identifyAnalyticsUser, resetAnalytics };
