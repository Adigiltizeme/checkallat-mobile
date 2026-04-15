import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { PaymentStackParamList } from './types';
import { colors } from '../theme/colors';
import { PaymentHistoryScreen } from '../screens/transport/PaymentHistoryScreen';
import { PaymentDetailsScreen } from '../screens/payment/PaymentDetailsScreen';

const Stack = createStackNavigator<PaymentStackParamList>();

export const PaymentStack = () => {
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
        name="PaymentHistory"
        component={PaymentHistoryScreen}
        options={{ title: t('nav.payments'), headerShown: true }}
      />
      <Stack.Screen
        name="PaymentDetails"
        component={PaymentDetailsScreen}
        options={{ title: t('payment.details_title'), headerShown: true }}
      />
    </Stack.Navigator>
  );
};
