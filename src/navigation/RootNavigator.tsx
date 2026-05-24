import React, { useEffect, useState } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootState } from '../store';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { RoleSelectorScreen } from '../screens/auth/RoleSelectorScreen';
import { OnboardingScreen, ONBOARDING_DONE_KEY } from '../screens/onboarding/OnboardingScreen';
import { useDriverApprovalPolling } from '../hooks/useDriverApprovalPolling';
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
  useEffect(() => {
    fetch(`${API_CONFIG.BASE_URL.replace('/api/v1', '')}/api/v1`, {
      headers: { 'ngrok-skip-browser-warning': 'true' },
    })
      .then((r) => r.json())
      .then((data: { minAppVersion?: string }) => {
        const min = data.minAppVersion;
        if (min && isOutdated(APP_VERSION, min)) {
          Alert.alert(
            'Mise à jour requise',
            `La version ${min} est requise. Veuillez mettre à jour l'application pour continuer.`,
            [
              { text: 'Mettre à jour', onPress: () => Linking.openURL(STORE_URL!) },
            ],
            { cancelable: false },
          );
        }
      })
      .catch(() => {});
  }, []);
}

const AuthenticatedRoot = () => {
  useDriverApprovalPolling();
  useForceUpdateCheck();
  const needsRoleSelection = useSelector((state: RootState) => state.auth.needsRoleSelection);
  return needsRoleSelection ? <RoleSelectorScreen /> : <MainNavigator />;
};

export const RootNavigator = () => {
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_DONE_KEY).then((val) => {
      setOnboardingDone(val === 'true');
    });
  }, []);

  // Attendre la lecture AsyncStorage avant de rendre
  if (onboardingDone === null) return null;

  return (
    <NavigationContainer>
      {!onboardingDone ? (
        <OnboardingScreen onDone={() => setOnboardingDone(true)} />
      ) : isAuthenticated ? (
        <AuthenticatedRoot />
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
};
