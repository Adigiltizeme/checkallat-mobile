import React, { useEffect, useState } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootState } from '../store';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { RoleSelectorScreen } from '../screens/auth/RoleSelectorScreen';
import { TermsUpdateGate } from '../components/shared/TermsUpdateGate';
import { OnboardingScreen, ONBOARDING_DONE_KEY } from '../screens/onboarding/OnboardingScreen';
import { useAccountStatusSync } from '../hooks/useAccountStatusSync';
import { useNotificationRouting } from '../hooks/useNotificationRouting';
import { navigationRef } from './navigationRef';
import { AnalyticsConsentPrompt } from '../components/shared/AnalyticsConsentPrompt';
import { trackScreen } from '../services/analytics';
import { useAppTheme } from '../theme/ThemeProvider';
import { colors } from '../theme/colors';
import { API_CONFIG } from '../config/api';

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

/** Compare semver : retourne true si current < required */
function isOutdated(current: string, required: string): boolean {
  const parse = (v: string) => v.split('.').map((n) => parseInt(n, 10) || 0);
  const [ca, cb, cc] = parse(current);
  const [ra, rb, rc] = parse(required);
  if (ca !== ra) return ca < ra;
  if (cb !== rb) return cb < rb;
  return cc < rc;
}

const STORE_URL = Platform.select({
  ios: 'https://apps.apple.com/app/checkallat/id000000000',
  android: 'https://play.google.com/store/apps/details?id=com.digiltizeme.checkallat',
  default: 'https://checkallat.com',
});

function useForceUpdateCheck() {
  const { t } = useTranslation();
  useEffect(() => {
    fetch(`${API_CONFIG.BASE_URL.replace('/api/v1', '')}/api/v1`)
      .then((r) => r.json())
      .then((data: { minAppVersion?: string }) => {
        const min = data.minAppVersion;
        if (min && isOutdated(APP_VERSION, min)) {
          Alert.alert(
            t('common.update_required_title'),
            t('common.update_required_msg', { version: min }),
            [
              { text: t('common.update_required_btn'), onPress: () => Linking.openURL(STORE_URL!) },
            ],
            { cancelable: false },
          );
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

const AuthenticatedRoot = () => {
  useAccountStatusSync();
  // Toucher une notification ouvre l'écran concerné
  useNotificationRouting();
  const needsRoleSelection = useSelector((state: RootState) => state.auth.needsRoleSelection);
  return (
    <>
      {needsRoleSelection ? <RoleSelectorScreen /> : <MainNavigator />}
      {/* Ré-acceptation obligatoire des CGU si une nouvelle version est publiée */}
      <TermsUpdateGate />
    </>
  );
};

export const RootNavigator = () => {
  const { tokens, isDark } = useAppTheme();
  // Version minimale exigée par le serveur : vérifiée dès l'ouverture, connecté ou non
  useForceUpdateCheck();
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_DONE_KEY).then((val) => {
      setOnboardingDone(val === 'true');
    });
  }, []);

  // Attendre la lecture AsyncStorage avant de rendre
  if (onboardingDone === null) return null;

  // Thème React Navigation — background appliqué à tous les écrans automatiquement
  const navTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme : DefaultTheme).colors,
      primary:      tokens.secondary,
      background:   tokens.background,       // ← fond de tous les écrans
      card:         tokens.header,           // en-têtes de navigation
      text:         tokens.text.primary,
      border:       tokens.border,
      notification: colors.accent,
    },
  };

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={navTheme}
      // Mesure d'usage : écran affiché (uniquement avec l'accord de la personne)
      onReady={() => trackScreen(navigationRef.getCurrentRoute()?.name)}
      onStateChange={() => trackScreen(navigationRef.getCurrentRoute()?.name)}
    >
      {!onboardingDone ? (
        <OnboardingScreen onDone={() => setOnboardingDone(true)} />
      ) : isAuthenticated ? (
        <AuthenticatedRoot />
      ) : (
        <AuthNavigator />
      )}
      {onboardingDone && <AnalyticsConsentPrompt />}
    </NavigationContainer>
  );
};
