import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { colors } from '../theme/colors';

import { SearchHomeScreen } from '../screens/client/SearchHomeScreen';
import { SearchProsScreen } from '../screens/services/SearchProsScreen';
import { ProDetailScreen } from '../screens/services/ProDetailScreen';
import { CreateBookingScreen } from '../screens/services/CreateBookingScreen';
import { BookingDetailsScreen } from '../screens/services/BookingDetailsScreen';
import { BookingRequestStep1Screen } from '../screens/services/BookingRequestStep1Screen';
import { BookingRequestStep2Screen } from '../screens/services/BookingRequestStep2Screen';
import { BookingRequestStep3Screen } from '../screens/services/BookingRequestStep3Screen';
import { BookingRequestStep4Screen } from '../screens/services/BookingRequestStep4Screen';
import { BookingRequestStep5Screen } from '../screens/services/BookingRequestStep5Screen';
import { BookingTrackingScreen } from '../screens/services/BookingTrackingScreen';
import { BookingChatScreen } from '../screens/services/BookingChatScreen';
import { BookingDisputeScreen } from '../screens/services/BookingDisputeScreen';
import { ProProofPhotosScreen } from '../screens/pro/ProProofPhotosScreen';

import { Step1Data, Step2Data, Step3Data, Step4Data } from '../types/transport';
import { BookingStep1Data, BookingStep2Data, BookingStep3Data, BookingStep4Data } from '../types/booking';

export type SearchStackParamList = {
  SearchHome: undefined;
  SearchPros: { category: string };
  ProDetail: { proId: string };
  CreateBooking: { proId: string; offeringId?: string };
  BookingDetails: { bookingId: string };
  BookingRequestStep1: { categorySlug: string; categoryNameFr: string; categoryNameEn: string; categoryNameAr: string };
  BookingRequestStep2: { categorySlug: string; step1Data: BookingStep1Data };
  BookingRequestStep3: { categorySlug: string; step1Data: BookingStep1Data; step2Data: BookingStep2Data };
  BookingRequestStep4: { categorySlug: string; step1Data: BookingStep1Data; step2Data: BookingStep2Data; step3Data: BookingStep3Data };
  BookingRequestStep5: { categorySlug: string; step1Data: BookingStep1Data; step2Data: BookingStep2Data; step3Data: BookingStep3Data; step4Data: BookingStep4Data };
  BookingTracking: { bookingId: string; role: 'client' | 'pro' };
  BookingChat: { entityType: 'booking' | 'transport' | 'order'; entityId: string; otherPartyName: string };
  BookingDispute: { bookingId: string };
  ProProofPhotos: { bookingId: string; type: 'before' | 'after'; nextAction: 'start' | 'complete'; isCash?: boolean };
};

const Stack = createStackNavigator<SearchStackParamList>();

export const SearchStack = () => {
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
        name="SearchHome"
        component={SearchHomeScreen}
        options={{ title: t('search.title') }}
      />
      <Stack.Screen
        name="SearchPros"
        component={SearchProsScreen}
        options={({ route }) => ({
          title: t(`home.service_${route.params.category}`, { defaultValue: t('services.search_title') }),
        })}
      />
      <Stack.Screen name="ProDetail" component={ProDetailScreen} options={{ title: t('pros.title') }} />
      <Stack.Screen name="CreateBooking" component={CreateBookingScreen} options={{ title: t('booking.new_booking') }} />
      <Stack.Screen name="BookingDetails" component={BookingDetailsScreen} options={{ title: t('booking.title') }} />
      <Stack.Screen name="BookingRequestStep1" component={BookingRequestStep1Screen} options={{ title: t('booking_request.step1_title') }} />
      <Stack.Screen name="BookingRequestStep2" component={BookingRequestStep2Screen} options={{ title: t('booking_request.step2_title') }} />
      <Stack.Screen name="BookingRequestStep3" component={BookingRequestStep3Screen} options={{ title: t('booking_request.step3_title') }} />
      <Stack.Screen name="BookingRequestStep4" component={BookingRequestStep4Screen} options={{ title: t('booking_request.step4_title') }} />
      <Stack.Screen name="BookingRequestStep5" component={BookingRequestStep5Screen} options={{ title: t('booking_request.step5_title') }} />
      <Stack.Screen name="BookingTracking" component={BookingTrackingScreen} options={{ title: t('booking_tracking.title') }} />
      <Stack.Screen
        name="BookingChat"
        component={BookingChatScreen}
        options={({ route }) => ({ title: route.params.otherPartyName })}
      />
      <Stack.Screen name="BookingDispute" component={BookingDisputeScreen} options={{ title: t('dispute.title') }} />
      <Stack.Screen name="ProProofPhotos" component={ProProofPhotosScreen} options={{ title: t('pro_space.proof_photos_title') }} />
    </Stack.Navigator>
  );
};
