import React, { useEffect, useMemo } from 'react';
// StatusBar is now managed by ThemeProvider
import { I18nManager } from 'react-native';
import { Provider as ReduxProvider } from 'react-redux';
import { Provider as PaperProvider, MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StripeProvider } from '@stripe/stripe-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { secureStorage } from './utils/secureStorage';
import Constants from 'expo-constants';
import * as Sentry from '@sentry/react-native';
import { store } from './store';
import { setCredentials, restoreAuth, restoreLanguage, LANGUAGE_STORAGE_KEY } from './store/slices/authSlice';
import { RootNavigator } from './navigation/RootNavigator';
import { colors } from './theme/colors';
import { ThemeProvider, useAppTheme } from './theme/ThemeProvider';
import { API_CONFIG } from './config/api';
import { setCurrencyConfig } from './config/currency';
import { identifyUser as sentryIdentifyUser } from './config/sentry';
import { identifyAnalyticsUser } from './hooks/useAnalytics';
import i18n, { isRTL } from './i18n';
import { I18nextProvider } from 'react-i18next';

// ── Sentry init (DSN injecté par le plugin @sentry/react-native/expo au build) ──
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? '',
  environment: __DEV__ ? 'development' : 'production',
  enabled: !__DEV__,
  tracesSampleRate: 0.2,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  integrations: [
    Sentry.mobileReplayIntegration(),
    Sentry.feedbackIntegration(),
  ],
  _experiments: {
    enableLogs: true,
  },
});

// ── Expo Go guard — native modules unavailable in Expo Go ──
const isExpoGo = Constants.appOwnership === 'expo';

if (!isExpoGo) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Mapbox = require('@rnmapbox/maps').default;
  Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '');
}

if (!isExpoGo) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Notifications = require('expo-notifications');
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
  Notifications.setNotificationChannelAsync('default', {
    name: 'Notifications',
    importance: Notifications.AndroidImportance.MAX,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
    enableVibrate: true,
  }).catch(() => {});
}

async function registerDriverPushToken(accessToken: string): Promise<void> {
  try {
    if (isExpoGo) return;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Notifications = require('expo-notifications');
    const { status: existing } = await Notifications.getPermissionsAsync();
    const { status } =
      existing === 'granted'
        ? { status: existing }
        : await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;
    const tokenData = await Notifications.getExpoPushTokenAsync();
    await fetch(`${API_CONFIG.BASE_URL}/transport/driver/push-token`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
      body: JSON.stringify({ pushToken: tokenData.data }),
    });
  } catch {
    // Non-blocking
  }
}

// Thème Paper dynamique — lit les tokens du ThemeProvider à chaque changement de mode
const ThemedPaperProvider = ({ children }: { children: React.ReactNode }) => {
  const { tokens, isDark } = useAppTheme();
  const paperTheme = useMemo(() => ({
    ...(isDark ? MD3DarkTheme : MD3LightTheme),
    colors: {
      ...(isDark ? MD3DarkTheme : MD3LightTheme).colors,
      primary:           tokens.primary,
      primaryContainer:  tokens.primary + '30',
      secondary:         tokens.secondary,
      secondaryContainer:tokens.secondary + '30',
      background:        tokens.background,
      surface:           tokens.card,
      surfaceVariant:    tokens.backgroundAlt,
      error:             colors.error,
      onPrimary:         tokens.text.inverse,
      onPrimaryContainer:tokens.text.primary,
      onSecondary:       tokens.text.primary,
      onBackground:      tokens.text.primary,
      onSurface:         tokens.text.primary,
      onSurfaceVariant:  tokens.text.secondary,
      onError:           colors.white,
      outline:           tokens.border,
      outlineVariant:    tokens.borderLight,
    },
  }), [tokens, isDark]);
  return <PaperProvider theme={paperTheme}>{children}</PaperProvider>;
};

function AppContent() {
  useEffect(() => {
    const applyLanguage = async (lang: string) => {
      store.dispatch(restoreLanguage(lang));
      await i18n.changeLanguage(lang);
      const shouldBeRTL = isRTL(lang);
      if (I18nManager.isRTL !== shouldBeRTL) {
        I18nManager.allowRTL(shouldBeRTL);
        I18nManager.forceRTL(shouldBeRTL);
      }
    };

    const initialize = async () => {
      // 1. Restore local language
      try {
        const saved = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        await applyLanguage(saved || 'fr');
      } catch {}

      // 2. Restore auth
      try {
        const accessToken = await secureStorage.getToken();
        const refreshToken = await secureStorage.getRefreshToken();

        if (accessToken && refreshToken) {
          store.dispatch(restoreAuth({ accessToken, refreshToken }));

          try {
            const response = await fetch(`${API_CONFIG.BASE_URL}/auth/me`, {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'ngrok-skip-browser-warning': 'true',
              },
            });

            if (response.ok) {
              const user = await response.json();
              store.dispatch(setCredentials({ user, accessToken, refreshToken }));

              // Identifier dans Sentry et Analytics
              sentryIdentifyUser(user.id, user.email);
              identifyAnalyticsUser(user.id, {
                isDriver: !!user.driver,
                isPro: !!user.pro,
                isSeller: !!user.marketplaceSeller,
              });

              if (user.driver) registerDriverPushToken(accessToken);

              if (user.preferredLanguage && user.preferredLanguage !== i18n.language) {
                await applyLanguage(user.preferredLanguage);
                AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, user.preferredLanguage);
              }
            }
          } catch (error) {
            console.error('Failed to fetch user profile:', error);
          }
        }
      } catch (error) {
        console.error('Failed to restore auth state:', error);
      }

      // 3. Platform settings (non-blocking)
      fetch(`${API_CONFIG.BASE_URL}/admin/settings/public`, {
        headers: { 'ngrok-skip-browser-warning': 'true' },
      })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
        .then((settings) => {
          const locationState = store.getState().location;
          const activeCountryCode = locationState.selectedCountryCode ?? locationState.detectedCountryCode;
          const zones: Array<{ countryCode?: string; currency: string; enabled: boolean }> =
            settings.serviceZones ?? [];
          const matchedZone = activeCountryCode
            ? zones.find((z) => z.enabled && z.countryCode?.toLowerCase() === activeCountryCode.toLowerCase())
            : undefined;
          setCurrencyConfig(matchedZone?.currency ?? settings.currency ?? 'EGP');
        })
        .catch((error) => console.error('Failed to load platform settings:', error));
    };

    initialize();
  }, []);

  return <RootNavigator />;
}

export default Sentry.wrap(function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <ReduxProvider store={store}>
        <StripeProvider
          publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''}
          merchantIdentifier="merchant.com.digiltizeme.checkallat"
        >
          <ThemeProvider>
            <ThemedPaperProvider>
              <SafeAreaProvider>
                <AppContent />
              </SafeAreaProvider>
            </ThemedPaperProvider>
          </ThemeProvider>
        </StripeProvider>
      </ReduxProvider>
    </I18nextProvider>
  );
});
