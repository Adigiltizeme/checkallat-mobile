import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { colors } from '../theme/colors';

import { DriverAgendaScreen } from '../screens/driver/DriverAgendaScreen';
import { DriverDeliveryDetailsScreen } from '../screens/driver/DriverDeliveryDetailsScreen';
import { DriverNavigationScreen } from '../screens/driver/DriverNavigationScreen';
import { DriverProofPhotosScreen } from '../screens/driver/DriverProofPhotosScreen';
import { DriverSignatureScreen } from '../screens/driver/DriverSignatureScreen';
import { TransportCompletionScreen } from '../screens/transport/TransportCompletionScreen';
import { CashValidationScreen } from '../screens/transport/CashValidationScreen';
import { BookingChatScreen } from '../screens/services/BookingChatScreen';

export type DriverAgendaStackParamList = {
  DriverAgendaHome: undefined;
  DriverDeliveryDetails: { requestId: string };
  DriverNavigation: { requestId: string };
  DriverProofPhotos: { requestId: string; type: 'before' | 'after'; nextStatus: string };
  DriverSignature: { requestId: string };
  TransportCompletion: { requestId: string };
  CashValidation: { requestId: string; totalPrice: number };
  BookingChat: { entityType: 'booking' | 'transport' | 'order'; entityId: string; otherPartyName: string };
};

const Stack = createStackNavigator<DriverAgendaStackParamList>();

export const DriverAgendaStack = () => {
  const { t } = useTranslation();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.white,
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen
        name="DriverAgendaHome"
        component={DriverAgendaScreen}
        options={{ title: t('nav.agenda') }}
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
        name="DriverSignature"
        component={DriverSignatureScreen}
        options={{ title: t('driver.signature_title') }}
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
