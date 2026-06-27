import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { PaymentStackParamList } from './types';
import { useAppTheme } from '../theme/ThemeProvider';
import { defaultStackScreenOptions } from './stackOptions';
import { PaymentHistoryScreen } from '../screens/transport/PaymentHistoryScreen';
import { PaymentDetailsScreen } from '../screens/payment/PaymentDetailsScreen';

const Stack = createStackNavigator<PaymentStackParamList>();

export const PaymentStack = () => {
  const { t } = useTranslation();
  const { tokens } = useAppTheme();
  return (
    <Stack.Navigator
      screenOptions={defaultStackScreenOptions(tokens)}
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
