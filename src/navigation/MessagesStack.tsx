import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { colors } from '../theme/colors';
import { MessagesScreen } from '../screens/messages/MessagesScreen';
import { BookingChatScreen } from '../screens/services/BookingChatScreen';

export type MessagesStackParamList = {
  MessagesHome: undefined;
  BookingChat: { entityType: 'booking' | 'transport' | 'order'; entityId: string; otherPartyName: string };
};

const Stack = createStackNavigator<MessagesStackParamList>();

export const MessagesStack = () => {
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
        name="MessagesHome"
        component={MessagesScreen}
        options={{ title: t('messages.title') }}
      />
      <Stack.Screen
        name="BookingChat"
        component={BookingChatScreen}
        options={({ route }) => ({ title: route.params.otherPartyName })}
      />
    </Stack.Navigator>
  );
};
