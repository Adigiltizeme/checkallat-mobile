import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '../theme/ThemeProvider';
import { proStackScreenOptions } from './stackOptions';

import { ProAgendaScreen } from '../screens/pro/ProAgendaScreen';
import { ProBookingDetailsScreen } from '../screens/pro/ProBookingDetailsScreen';
import { ProNavigationScreen } from '../screens/pro/ProNavigationScreen';
import { ProProofPhotosScreen } from '../screens/pro/ProProofPhotosScreen';
import { BookingTrackingScreen } from '../screens/services/BookingTrackingScreen';
import { BookingChatScreen } from '../screens/services/BookingChatScreen';
import { BookingDisputeScreen } from '../screens/services/BookingDisputeScreen';

export type ProAgendaStackParamList = {
  ProAgendaHome: undefined;
  ProBookingDetails: { bookingId: string };
  ProNavigation: { bookingId: string };
  ProProofPhotos: { bookingId: string; type: 'before' | 'after'; nextAction: 'start' | 'complete'; isCash?: boolean };
  BookingTracking: { bookingId: string; role: 'client' | 'pro' };
  BookingChat: { entityType: 'booking' | 'transport' | 'order'; entityId: string; otherPartyName: string };
  BookingDispute: { bookingId: string };
};

const Stack = createStackNavigator<ProAgendaStackParamList>();


export const ProAgendaStack = () => {
  const { t } = useTranslation();
  const { tokens } = useAppTheme();
  return (
    <Stack.Navigator
      screenOptions={proStackScreenOptions(tokens)}
    >
      <Stack.Screen
        name="ProAgendaHome"
        component={ProAgendaScreen}
        options={{ title: t('pro_space.agenda_title') }}
      />
      <Stack.Screen
        name="ProBookingDetails"
        component={ProBookingDetailsScreen}
        options={{ title: t('pro_space.booking_details_title') }}
      />
      <Stack.Screen
        name="ProNavigation"
        component={ProNavigationScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ProProofPhotos"
        component={ProProofPhotosScreen}
        options={{ title: t('pro_space.proof_photos_title') }}
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
    </Stack.Navigator>
  );
};
