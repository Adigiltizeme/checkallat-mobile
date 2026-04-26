import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { I18nManager } from 'react-native';
import { Provider as ReduxProvider } from 'react-redux';
import { Provider as PaperProvider, MD3LightTheme } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StripeProvider } from '@stripe/stripe-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { store } from './store';
import { setCredentials, restoreAuth, restoreLanguage, setLanguage, LANGUAGE_STORAGE_KEY } from './store/slices/authSlice';
import { RootNavigator } from './navigation/RootNavigator';
import { DevDebugPanel } from './components/DevDebugPanel';
import { colors } from './theme/colors';
import { API_CONFIG } from './config/api';
import { setCurrencyConfig } from './config/currency';
import i18n, { isRTL } from './i18n';
import { I18nextProvider } from 'react-i18next';

// expo-notifications and @rnmapbox/maps crash at import time in Expo Go (native modules unavailable).
// We lazy-load them only in real builds.
const isExpoGo = Constants.appOwnership === 'expo';

if (!isExpoGo) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Mapbox = require('@rnmapbox/maps').default;
  Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '');
}

if (!isExpoGo) {
  // Dynamic require so the module never loads in Expo Go
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
  // Android requires a notification channel to play sound
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
    if (isExpoGo) return; // Remote push not supported in Expo Go (SDK 53+)

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Notifications = require('expo-notifications');

    const { status: existing } = await Notifications.getPermissionsAsync();
    const { status } =
      existing === 'granted'
        ? { status: existing }
        : await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;

    const tokenData = await Notifications.getExpoPushTokenAsync();
    const pushToken = tokenData.data;

    await fetch(`${API_CONFIG.BASE_URL}/transport/driver/push-token`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
      body: JSON.stringify({ pushToken }),
    });
  } catch {
    // Non-blocking — push notifications are a best-effort feature
  }
}

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.primary,
    primaryContainer: colors.primaryDark,
    secondary: colors.secondary,
    secondaryContainer: colors.secondary,
    background: colors.background,
    surface: colors.card,
    error: colors.error,
    onPrimary: colors.white,
    onSecondary: colors.white,
    onBackground: colors.text.primary,
    onSurface: colors.text.primary,
    onError: colors.white,
  },
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
      // 1. Restore local language first (fast AsyncStorage read)
      try {
        const saved = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        await applyLanguage(saved || 'fr');
      } catch {}

      // 2. Restore auth and let server language override if user has a preference
      try {
        const accessToken = await AsyncStorage.getItem('accessToken');
        const refreshToken = await AsyncStorage.getItem('refreshToken');

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
              console.log('[APP] User profile restored:', {
                id: user.id,
                email: user.email,
                isDriver: !!user.driver,
                isPro: !!user.pro,
                isSeller: !!user.marketplaceSeller,
              });
              store.dispatch(setCredentials({ user, accessToken, refreshToken }));

              // Register push token for drivers (fire-and-forget)
              if (user.driver) {
                registerDriverPushToken(accessToken);
              }

              // Sync i18n with server language preference and persist locally
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

      // 3. Load platform settings (fire and forget — non-blocking)
      fetch(`${API_CONFIG.BASE_URL}/admin/settings/public`, {
        headers: { 'ngrok-skip-browser-warning': 'true' },
      })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
        .then((settings) => {
          console.log('[APP] Platform settings loaded:', settings);
          if (settings.currency) setCurrencyConfig(settings.currency);
        })
        .catch((error) => console.error('Failed to load platform settings:', error));
    };

    initialize();
  }, []);

  return (
    <>
      <StatusBar style="auto" />
      <RootNavigator />
      {/* <DevDebugPanel /> */}
    </>
  );
}

export default function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <ReduxProvider store={store}>
        <StripeProvider
          publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''}
          merchantIdentifier="merchant.com.checkallat"
        >
          <PaperProvider theme={theme}>
            <SafeAreaProvider>
              <AppContent />
            </SafeAreaProvider>
          </PaperProvider>
        </StripeProvider>
      </ReduxProvider>
    </I18nextProvider>
  );
}
