import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { HomeStackParamList } from './types';
import { useAppTheme } from '../theme/ThemeProvider';
import { defaultStackScreenOptions } from './stackOptions';

import { HomeScreen } from '../screens/home/HomeScreen';
import { SearchProsScreen } from '../screens/services/SearchProsScreen';
import { ProDetailScreen } from '../screens/services/ProDetailScreen';
import { CreateBookingScreen } from '../screens/services/CreateBookingScreen';
import { BookingDetailsScreen } from '../screens/services/BookingDetailsScreen';
import { MyBookingsScreen } from '../screens/services/MyBookingsScreen';
import { BookingRequestStep1Screen } from '../screens/services/BookingRequestStep1Screen';
import { BookingRequestStep2Screen } from '../screens/services/BookingRequestStep2Screen';
import { BookingRequestStep3Screen } from '../screens/services/BookingRequestStep3Screen';
import { BookingRequestStep4Screen } from '../screens/services/BookingRequestStep4Screen';
import { BookingRequestStep5Screen } from '../screens/services/BookingRequestStep5Screen';
import { BookingTrackingScreen } from '../screens/services/BookingTrackingScreen';
import { BookingChatScreen } from '../screens/services/BookingChatScreen';
import { BookingDisputeScreen } from '../screens/services/BookingDisputeScreen';
import { ProProofPhotosScreen } from '../screens/pro/ProProofPhotosScreen';
import { TransportRequestStep1Screen } from '../screens/transport/TransportRequestStep1Screen';
import { TransportRequestStep2Screen } from '../screens/transport/TransportRequestStep2Screen';
import { TransportRequestStep3Screen } from '../screens/transport/TransportRequestStep3Screen';
import { TransportRequestStep4Screen } from '../screens/transport/TransportRequestStep4Screen';
import { TransportRequestStep5Screen } from '../screens/transport/TransportRequestStep5Screen';
import { TransportTrackingScreen } from '../screens/transport/TransportTrackingScreen';
import { TransportDetailsScreen } from '../screens/transport/TransportDetailsScreen';
import { StripePaymentScreen } from '../screens/transport/StripePaymentScreen';
import { DisputeScreen } from '../screens/transport/DisputeScreen';

const Stack = createStackNavigator<HomeStackParamList>();

export const HomeStack = () => {
  const { t } = useTranslation();
  const { tokens } = useAppTheme();
  return (
    <Stack.Navigator
      screenOptions={defaultStackScreenOptions(tokens)}
    >
      <Stack.Screen
        name="HomeScreen"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SearchPros"
        component={SearchProsScreen}
        options={({ route }) => ({
          title: t(`home.service_${route.params.category}`, { defaultValue: t('services.search_title') }),
        })}
      />
      <Stack.Screen
        name="ProDetail"
        component={ProDetailScreen}
        options={{ title: t('pros.title') }}
      />
      <Stack.Screen
        name="CreateBooking"
        component={CreateBookingScreen}
        options={{ title: t('booking.new_booking') }}
      />
      <Stack.Screen
        name="BookingDetails"
        component={BookingDetailsScreen}
        options={{ title: t('booking.title') }}
      />
      <Stack.Screen
        name="MyBookings"
        component={MyBookingsScreen}
        options={{ title: t('booking.my_bookings') }}
      />
      <Stack.Screen
        name="BookingRequestStep1"
        component={BookingRequestStep1Screen}
        options={{ title: t('booking_request.step1_title') }}
      />
      <Stack.Screen
        name="BookingRequestStep2"
        component={BookingRequestStep2Screen}
        options={{ title: t('booking_request.step2_title') }}
      />
      <Stack.Screen
        name="BookingRequestStep3"
        component={BookingRequestStep3Screen}
        options={{ title: t('booking_request.step3_title') }}
      />
      <Stack.Screen
        name="BookingRequestStep4"
        component={BookingRequestStep4Screen}
        options={{ title: t('booking_request.step4_title') }}
      />
      <Stack.Screen
        name="BookingRequestStep5"
        component={BookingRequestStep5Screen}
        options={{ title: t('booking_request.step5_title') }}
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
        name="ProProofPhotos"
        component={ProProofPhotosScreen}
        options={{ title: t('pro_space.proof_photos_title') }}
      />
      <Stack.Screen
        name="BookingDispute"
        component={BookingDisputeScreen}
        options={{ title: t('dispute.title') }}
      />
      <Stack.Screen
        name="TransportRequestStep1"
        component={TransportRequestStep1Screen}
        options={{ title: t('transport.step1_title') }}
      />
      <Stack.Screen
        name="TransportRequestStep2"
        component={TransportRequestStep2Screen}
        options={{ title: t('transport.step2_title') }}
      />
      <Stack.Screen
        name="TransportRequestStep3"
        component={TransportRequestStep3Screen}
        options={{ title: t('transport.step3_title') }}
      />
      <Stack.Screen
        name="TransportRequestStep4"
        component={TransportRequestStep4Screen}
        options={{ title: t('transport.step4_title') }}
      />
      <Stack.Screen
        name="TransportRequestStep5"
        component={TransportRequestStep5Screen}
        options={{ title: t('transport.step5_title') }}
      />
      <Stack.Screen
        name="TransportTracking"
        component={TransportTrackingScreen}
        options={{ title: t('transport.tracking_title'), headerShown: false }}
      />
      <Stack.Screen
        name="TransportDetails"
        component={TransportDetailsScreen}
        options={{ title: t('transport.details_title') }}
      />
      <Stack.Screen
        name="StripePayment"
        component={StripePaymentScreen}
        options={{ title: t('payment.title') }}
      />
      <Stack.Screen
        name="Dispute"
        component={DisputeScreen}
        options={{ title: t('dispute.title') }}
      />
    </Stack.Navigator>
  );
};
