import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '../theme/ThemeProvider';
import { defaultStackScreenOptions } from './stackOptions';

import { MyOrdersScreen } from '../screens/client/MyOrdersScreen';
import { BookingDetailsScreen } from '../screens/services/BookingDetailsScreen';
import { BookingTrackingScreen } from '../screens/services/BookingTrackingScreen';
import { BookingChatScreen } from '../screens/services/BookingChatScreen';
import { BookingDisputeScreen } from '../screens/services/BookingDisputeScreen';
import { TransportDetailsScreen } from '../screens/transport/TransportDetailsScreen';
import { TransportTrackingScreen } from '../screens/transport/TransportTrackingScreen';

import { BookingStep1Data, BookingStep2Data, BookingStep3Data, BookingStep4Data } from '../types/booking';

export type CommandesStackParamList = {
  MyOrders: undefined;
  BookingDetails: { bookingId: string };
  BookingTracking: { bookingId: string; role: 'client' | 'pro' };
  BookingChat: { entityType: 'booking' | 'transport' | 'order'; entityId: string; otherPartyName: string };
  BookingDispute: { bookingId: string };
  TransportDetails: { requestId: string };
  TransportTracking: { requestId: string };
};

const Stack = createStackNavigator<CommandesStackParamList>();

export const CommandesStack = () => {
  const { t } = useTranslation();
  const { tokens } = useAppTheme();
  return (
    <Stack.Navigator
      screenOptions={defaultStackScreenOptions(tokens)}
    >
      <Stack.Screen
        name="MyOrders"
        component={MyOrdersScreen}
        options={{ title: t('commandes.title') }}
      />
      <Stack.Screen
        name="BookingDetails"
        component={BookingDetailsScreen}
        options={{ title: t('booking.title') }}
      />
      <Stack.Screen
        name="BookingTracking"
        component={BookingTrackingScreen}
        options={{ title: t('booking_tracking.title') }}
      />
      <Stack.Screen
        name="BookingChat"
        component={BookingChatScreen}
        options={({ route }) => ({ title: route.params.otherPartyName })}
      />
      <Stack.Screen
        name="BookingDispute"
        component={BookingDisputeScreen}
        options={{ title: t('dispute.title') }}
      />
      <Stack.Screen
        name="TransportDetails"
        component={TransportDetailsScreen}
        options={{ title: t('transport.request_details') }}
      />
      <Stack.Screen
        name="TransportTracking"
        component={TransportTrackingScreen}
        options={{ title: t('transport.tracking_title'), headerShown: false }}
      />
    </Stack.Navigator>
  );
};
