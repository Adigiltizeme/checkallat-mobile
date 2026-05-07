import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { ProfileStackParamList } from './types';
import { colors } from '../theme/colors';

import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { EditProfileScreen } from '../screens/profile/EditProfileScreen';
import { AddressesScreen } from '../screens/profile/AddressesScreen';
import { LanguageScreen } from '../screens/profile/LanguageScreen';
import { SupportScreen } from '../screens/profile/SupportScreen';
import { ChangePasswordScreen } from '../screens/profile/ChangePasswordScreen';
import { ChangePhoneScreen } from '../screens/profile/ChangePhoneScreen';
import { DriverApplicationScreen } from '../screens/profile/DriverApplicationScreen';
import { DriverDocumentsScreen } from '../screens/profile/DriverDocumentsScreen';

const Stack = createStackNavigator<ProfileStackParamList>();

export const ProfileStack = () => {
  const { t } = useTranslation();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.white,
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Stack.Screen
        name="ProfileHome"
        component={ProfileScreen}
        options={{ title: t('profile.title') }}
      />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ title: t('profile.edit_title') }}
      />
      <Stack.Screen
        name="Addresses"
        component={AddressesScreen}
        options={{ title: t('addresses.title') }}
      />
      <Stack.Screen
        name="Language"
        component={LanguageScreen}
        options={{ title: t('language.title') }}
      />
      <Stack.Screen
        name="Support"
        component={SupportScreen}
        options={{ title: t('support.title') }}
      />
      <Stack.Screen
        name="ChangePassword"
        component={ChangePasswordScreen}
        options={{ title: t('profile.change_password') }}
      />
      <Stack.Screen
        name="ChangePhone"
        component={ChangePhoneScreen}
        options={{ title: t('profile.change_phone') }}
      />
      <Stack.Screen
        name="DriverApplication"
        component={DriverApplicationScreen}
        options={{ title: t('driver_apply.title') }}
      />
      <Stack.Screen
        name="DriverDocuments"
        component={DriverDocumentsScreen}
        options={{ title: t('driver_docs.title') }}
      />
    </Stack.Navigator>
  );
};
