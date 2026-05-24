/**
 * Helpers Sentry — l'init est dans App.tsx via Sentry.init() + Sentry.wrap().
 *
 * DSN : récupère-le sur https://digiltizeme.sentry.io/settings/projects/react-native/keys/
 * Puis ajoute dans .env :
 *   EXPO_PUBLIC_SENTRY_DSN=https://xxxx@xxxxxxx.ingest.sentry.io/xxxxxxx
 *
 * SENTRY_AUTH_TOKEN est déjà dans .env.local (pour l'upload des source maps au build EAS).
 */

import * as Sentry from '@sentry/react-native';

export function captureException(error: unknown, context?: Record<string, unknown>) {
  if (context) Sentry.setContext('extra', context);
  Sentry.captureException(error);
}

export function identifyUser(userId: string, email?: string) {
  Sentry.setUser(userId ? { id: userId, email } : null);
}

export function clearUser() {
  Sentry.setUser(null);
}
