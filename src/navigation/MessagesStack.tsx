import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '../theme/ThemeProvider';
import { defaultStackScreenOptions } from './stackOptions';
import { MessagesScreen } from '../screens/messages/MessagesScreen';
import { BookingChatScreen } from '../screens/services/BookingChatScreen';

export type MessagesStackParamList = {
  MessagesHome: undefined;
  BookingChat: { entityType: 'booking' | 'transport' | 'order'; entityId: string; otherPartyName: string };
};

const Stack = createStackNavigator<MessagesStackParamList>();

export const MessagesStack = () => {
  const { t } = useTranslation();
  const { tokens } = useAppTheme();
  return (
    <Stack.Navigator
      screenOptions={defaultStackScreenOptions(tokens)}
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
