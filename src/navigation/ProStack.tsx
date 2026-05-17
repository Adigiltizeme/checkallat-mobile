import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { ProStackParamList } from './types';
import { colors } from '../theme/colors';

import { ProHomeScreen } from '../screens/pro/ProHomeScreen';
import { ProBookingDetailsScreen } from '../screens/pro/ProBookingDetailsScreen';
import { ProOfferingsScreen } from '../screens/pro/ProOfferingsScreen';
import { ProEarningsScreen } from '../screens/pro/ProEarningsScreen';
import { ProReviewsScreen } from '../screens/pro/ProReviewsScreen';
import { SupportScreen } from '../screens/profile/SupportScreen';
import { BookingTrackingScreen } from '../screens/services/BookingTrackingScreen';
import { ProNavigationScreen } from '../screens/pro/ProNavigationScreen';
import { ProProofPhotosScreen } from '../screens/pro/ProProofPhotosScreen';

const Stack = createStackNavigator<ProStackParamList>();

const PRO_COLOR = '#10B981';

export const ProStack = () => {
  const { t } = useTranslation();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: PRO_COLOR },
        headerTintColor: colors.white,
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Stack.Screen
        name="ProHome"
        component={ProHomeScreen}
        options={{ title: t('pro_space.title') }}
      />
      <Stack.Screen
        name="ProBookingDetails"
        component={ProBookingDetailsScreen}
        options={{ title: t('pro_space.booking_details_title') }}
      />
      <Stack.Screen
        name="ProOfferings"
        component={ProOfferingsScreen}
        options={{ title: t('pro_space.offerings_title') }}
      />
      <Stack.Screen
        name="ProEarnings"
        component={ProEarningsScreen}
        options={{ title: t('pro_space.earnings_title') }}
      />
      <Stack.Screen
        name="ProReviews"
        component={ProReviewsScreen}
        options={{ title: t('driver.reviews_title') }}
      />
      <Stack.Screen
        name="Support"
        component={SupportScreen}
        options={{ title: t('support.title') }}
      />
      <Stack.Screen
        name="ProNavigation"
        component={ProNavigationScreen}
        options={{ headerShown: false }}
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
