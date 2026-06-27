import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '../theme/ThemeProvider';
import { defaultStackScreenOptions } from './stackOptions';

import { DriverAvailableRequestsScreen } from '../screens/driver/DriverAvailableRequestsScreen';
import { DriverTransportDetailsScreen } from '../screens/driver/DriverTransportDetailsScreen';
import { DriverDeliveryDetailsScreen } from '../screens/driver/DriverDeliveryDetailsScreen';
import { DriverNavigationScreen } from '../screens/driver/DriverNavigationScreen';
import { DriverProofPhotosScreen } from '../screens/driver/DriverProofPhotosScreen';
import { TransportCompletionScreen } from '../screens/transport/TransportCompletionScreen';
import { CashValidationScreen } from '../screens/transport/CashValidationScreen';
import { BookingChatScreen } from '../screens/services/BookingChatScreen';

export type DriverAvailablesStackParamList = {
  DriverAvailablesHome: undefined;
  DriverTransportDetails: { requestId: string };
  DriverDeliveryDetails: { requestId: string };
  DriverNavigation: { requestId: string };
  DriverProofPhotos: { requestId: string; type: 'before' | 'after'; nextStatus: string };
  TransportCompletion: { requestId: string };
  CashValidation: { requestId: string; totalPrice: number };
  BookingChat: { entityType: 'booking' | 'transport' | 'order'; entityId: string; otherPartyName: string };
};

const Stack = createStackNavigator<DriverAvailablesStackParamList>();

export const DriverAvailablesStack = () => {
  const { t } = useTranslation();
  const { tokens } = useAppTheme();
  return (
    <Stack.Navigator
      screenOptions={defaultStackScreenOptions(tokens)}
    >
      <Stack.Screen
        name="DriverAvailablesHome"
        component={DriverAvailableRequestsScreen as React.ComponentType<any>}
        options={{ title: t('driver.available_requests_title') }}
      />
      <Stack.Screen
        name="DriverTransportDetails"
        component={DriverTransportDetailsScreen}
        options={{ title: t('driver.transport_details_title') }}
      />
      <Stack.Screen
        name="DriverDeliveryDetails"
        component={DriverDeliveryDetailsScreen}
        options={{ title: t('driver.delivery_details_title') }}
      />
      <Stack.Screen
        name="DriverNavigation"
        component={DriverNavigationScreen}
        options={{ title: t('driver.navigate'), headerShown: false }}
      />
      <Stack.Screen
        name="DriverProofPhotos"
        component={DriverProofPhotosScreen}
        options={{ title: t('driver.proof_photos_title') }}
      />
      <Stack.Screen
        name="TransportCompletion"
        component={TransportCompletionScreen}
        options={{ title: t('driver.confirmation_title') }}
      />
      <Stack.Screen
        name="CashValidation"
        component={CashValidationScreen}
        options={{ title: t('driver.cash_validation_title') }}
      />
      <Stack.Screen
        name="BookingChat"
        component={BookingChatScreen}
        options={({ route }) => ({ title: route.params.otherPartyName })}
      />
    </Stack.Navigator>
  );
};
