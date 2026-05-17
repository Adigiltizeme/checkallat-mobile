import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { HomeStackParamList } from './types';
import { colors } from '../theme/colors';

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
import { ProProofPhotosScreen } from '../screens/pro/ProProofPhotosScreen';

const Stack = createStackNavigator<HomeStackParamList>();

export const HomeStack = () => {
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
        name="ProProofPhotos"
        component={ProProofPhotosScreen}
        options={{ title: t('pro_space.proof_photos_title') }}
      />
    </Stack.Navigator>
  );
};
