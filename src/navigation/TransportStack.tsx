import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { TransportStackParamList } from './types';
import { colors } from '../theme/colors';

// Import screens
import { TransportListScreen } from '../screens/transport/TransportListScreen';
import { TransportRequestStep1Screen } from '../screens/transport/TransportRequestStep1Screen';
import { TransportRequestStep2Screen } from '../screens/transport/TransportRequestStep2Screen';
import { TransportRequestStep3Screen } from '../screens/transport/TransportRequestStep3Screen';
import { TransportRequestStep4Screen } from '../screens/transport/TransportRequestStep4Screen';
import { TransportRequestStep5Screen } from '../screens/transport/TransportRequestStep5Screen';
import { TransportTrackingScreen } from '../screens/transport/TransportTrackingScreen';
import { TransportDetailsScreen } from '../screens/transport/TransportDetailsScreen';
import { TransportCompletionScreen } from '../screens/transport/TransportCompletionScreen';
import { CashValidationScreen } from '../screens/transport/CashValidationScreen';
import { StripePaymentScreen } from '../screens/transport/StripePaymentScreen';
import { PaymentHistoryScreen } from '../screens/transport/PaymentHistoryScreen';
import { PaymentDetailsScreen } from '../screens/payment/PaymentDetailsScreen';

const Stack = createStackNavigator<TransportStackParamList>();

export const TransportStack = () => {
  const { t } = useTranslation();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.primary,
        },
        headerTintColor: colors.white,
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <Stack.Screen
        name="TransportList"
        component={TransportListScreen}
        options={{
          title: t('transport.title'),
          headerShown: true,
        }}
      />

      {/* Multi-step flow */}
      <Stack.Screen
        name="TransportRequestStep1"
        component={TransportRequestStep1Screen}
        options={{
          title: t('transport.step1_title'),
          headerShown: true,
        }}
      />

      <Stack.Screen
        name="TransportRequestStep2"
        component={TransportRequestStep2Screen}
        options={{
          title: t('transport.step2_title'),
          headerShown: true,
        }}
      />

      <Stack.Screen
        name="TransportRequestStep3"
        component={TransportRequestStep3Screen}
        options={{
          title: t('transport.step3_title'),
          headerShown: true,
        }}
      />

      <Stack.Screen
        name="TransportRequestStep4"
        component={TransportRequestStep4Screen}
        options={{
          title: t('transport.step4_title'),
          headerShown: true,
        }}
      />

      <Stack.Screen
        name="TransportRequestStep5"
        component={TransportRequestStep5Screen}
        options={{
          title: t('transport.step5_title'),
          headerShown: true,
        }}
      />

      {/* Tracking & Details */}
      <Stack.Screen
        name="TransportTracking"
        component={TransportTrackingScreen}
        options={{
          title: t('transport.tracking_title'),
          headerShown: true,
        }}
      />

      <Stack.Screen
        name="TransportDetails"
        component={TransportDetailsScreen}
        options={{
          title: t('transport.details_title'),
          headerShown: true,
        }}
      />

      <Stack.Screen
        name="TransportCompletion"
        component={TransportCompletionScreen}
        options={{
          title: t('transport.completion_title'),
          headerShown: true,
        }}
      />

      <Stack.Screen
        name="CashValidation"
        component={CashValidationScreen}
        options={{
          title: t('transport.cash_validation_title'),
          headerShown: true,
        }}
      />

      <Stack.Screen
        name="StripePayment"
        component={StripePaymentScreen}
        options={{
          title: t('payment.title'),
          headerShown: true,
        }}
      />

      <Stack.Screen
        name="PaymentHistory"
        component={PaymentHistoryScreen}
        options={{
          title: t('payment.history_title'),
          headerShown: true,
        }}
      />

      <Stack.Screen
        name="PaymentDetails"
        component={PaymentDetailsScreen}
        options={{
          title: t('payment.details_title'),
          headerShown: true,
        }}
      />
    </Stack.Navigator>
  );
};
