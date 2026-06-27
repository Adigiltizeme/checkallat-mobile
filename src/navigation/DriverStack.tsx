import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { DriverStackParamList } from './types';
import { useAppTheme } from '../theme/ThemeProvider';
import { defaultStackScreenOptions } from './stackOptions';

// Import screens
import { DriverHomeScreen } from '../screens/driver/DriverHomeScreen';
import { DriverAvailableRequestsScreen } from '../screens/driver/DriverAvailableRequestsScreen';
import { DriverTransportDetailsScreen } from '../screens/driver/DriverTransportDetailsScreen';
import { DriverDeliveryDetailsScreen } from '../screens/driver/DriverDeliveryDetailsScreen';
import { DriverNavigationScreen } from '../screens/driver/DriverNavigationScreen';
import { DriverProofPhotosScreen } from '../screens/driver/DriverProofPhotosScreen';
import { DriverEarningsScreen } from '../screens/driver/DriverEarningsScreen';
import { DriverReviewsScreen } from '../screens/driver/DriverReviewsScreen';
import { TransportCompletionScreen } from '../screens/transport/TransportCompletionScreen';
import { CashValidationScreen } from '../screens/transport/CashValidationScreen';
import { PaymentDetailsScreen } from '../screens/payment/PaymentDetailsScreen';
import { SupportScreen } from '../screens/profile/SupportScreen';
import { BookingChatScreen } from '../screens/services/BookingChatScreen';

const Stack = createStackNavigator<DriverStackParamList>();

export const DriverStack = () => {
  const { t } = useTranslation();
  const { tokens } = useAppTheme();
  return (
    <Stack.Navigator
      screenOptions={defaultStackScreenOptions(tokens)}
    >
      <Stack.Screen
        name="DriverHome"
        component={DriverHomeScreen}
        options={{ title: t('driver.home_title') }}
      />
      <Stack.Screen
        name="DriverAvailableRequests"
        component={DriverAvailableRequestsScreen}
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
        name="DriverEarnings"
        component={DriverEarningsScreen}
        options={{ title: t('driver.earnings_title') }}
      />
      <Stack.Screen
        name="DriverReviews"
        component={DriverReviewsScreen}
        options={{ title: t('driver.reviews_title') }}
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
        name="PaymentDetails"
        component={PaymentDetailsScreen}
        options={{ title: t('payment.details_title') }}
      />
      <Stack.Screen
        name="Support"
        component={SupportScreen}
        options={{ title: t('support.title') }}
      />
      <Stack.Screen
        name="BookingChat"
        component={BookingChatScreen}
        options={({ route }) => ({ title: route.params.otherPartyName })}
      />
    </Stack.Navigator>
  );
};
