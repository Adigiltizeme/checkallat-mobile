/**
 * Hook d'analytics léger et découplé du provider.
 *
 * Pour brancher Firebase Analytics :
 *   npx expo install @react-native-firebase/app @react-native-firebase/analytics
 *   puis décommenter le bloc Firebase ci-dessous.
 *
 * Pour brancher Amplitude :
 *   npm install @amplitude/analytics-react-native
 *   puis décommenter le bloc Amplitude.
 */

const IS_DEV = __DEV__;

type EventName =
  | 'onboarding_complete'
  | 'login'
  | 'register'
  | 'booking_started'
  | 'booking_completed'
  | 'transport_requested'
  | 'payment_initiated'
  | 'payment_completed'
  | 'payout_account_added'
  | 'profile_updated'
  | 'support_opened';

type EventProps = Record<string, string | number | boolean | undefined>;

function track(event: EventName, props?: EventProps) {
  if (IS_DEV) {
    console.log(`[Analytics] ${event}`, props ?? '');
    return;
  }

  // ── Firebase Analytics ──────────────────────────────────────────────────
  // try {
  //   const analytics = require('@react-native-firebase/analytics').default;
  //   analytics().logEvent(event, props);
  // } catch {}

  // ── Amplitude ───────────────────────────────────────────────────────────
  // try {
  //   const { track: ampTrack } = require('@amplitude/analytics-react-native');
  //   ampTrack(event, props);
  // } catch {}
}

function identifyUser(userId: string, traits?: EventProps) {
  if (IS_DEV) {
    console.log(`[Analytics] identify: ${userId}`, traits ?? '');
    return;
  }
  // ── Firebase ────────────────────────────────────────────────────────────
  // try {
  //   const analytics = require('@react-native-firebase/analytics').default;
  //   analytics().setUserId(userId);
  //   if (traits) analytics().setUserProperties(traits as any);
  // } catch {}
}

function reset() {
  // Called on logout
  if (IS_DEV) { console.log('[Analytics] reset'); return; }
  // try { require('@react-native-firebase/analytics').default().setUserId(null); } catch {}
}

export const useAnalytics = () => ({ track, identifyUser, reset });

// Named exports for direct usage outside hooks
export { track as trackEvent, identifyUser as identifyAnalyticsUser, reset as resetAnalytics };
