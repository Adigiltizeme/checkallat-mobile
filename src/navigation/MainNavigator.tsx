import React from 'react';
import { Alert, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { RootState } from '../store';
import { MainTabParamList } from './types';
import { HomeStack } from './HomeStack';
import { SearchStack } from './SearchStack';
import { CommandesStack } from './CommandesStack';
import { MessagesStack } from './MessagesStack';
import { ProfileStack } from './ProfileStack';
import { TransportStack } from './TransportStack';
import { DriverStack } from './DriverStack';
import { DriverAvailablesStack } from './DriverAvailablesStack';
import { DriverAgendaStack } from './DriverAgendaStack';
import { ProStack } from './ProStack';
import { ProDemandesStack } from './ProDemandesStack';
import { ProAgendaStack } from './ProAgendaStack';
import { colors } from '../theme/colors';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const Tab = createBottomTabNavigator<MainTabParamList>();

export const MainNavigator = () => {
  const { t } = useTranslation();
  const activeRole = useSelector((state: RootState) => state.auth.activeRole);
  const user = useSelector((state: RootState) => state.auth.user);
  const isDriver = activeRole === 'driver';
  const isPro = activeRole === 'pro';

  const isActiveDriver = user?.driver?.status === 'active';

  const tabScreenOptions = {
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.gray,
    tabBarStyle: {
      backgroundColor: colors.white,
      borderTopColor: colors.border,
      borderTopWidth: 1,
    },
    headerShown: false,
  };

  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      {isDriver ? (
        <>
          <Tab.Screen
            name="Transport"
            component={DriverStack}
            options={{
              title: t('nav.home'),
              tabBarIcon: ({ color, size }) => <Icon name="home" size={size} color={color} />,
            }}
          />
          <Tab.Screen
            name="DriverAvailables"
            component={DriverAvailablesStack}
            options={{
              title: t('nav.disponibles'),
              tabBarIcon: ({ color, size }) => <Icon name="truck-delivery" size={size} color={color} />,
            }}
          />
          <Tab.Screen
            name="DriverAgenda"
            component={DriverAgendaStack}
            options={{
              title: t('nav.agenda'),
              tabBarIcon: ({ color, size }) => <Icon name="calendar-check" size={size} color={color} />,
            }}
          />
          <Tab.Screen
            name="DriverMessages"
            component={MessagesStack}
            options={{
              title: t('nav.messages'),
              tabBarIcon: ({ color, size }) => <Icon name="message-outline" size={size} color={color} />,
            }}
          />
          <Tab.Screen
            name="Profile"
            component={ProfileStack}
            options={{
              title: t('nav.profile'),
              tabBarIcon: ({ color, size }) => <Icon name="account" size={size} color={color} />,
            }}
          />
        </>
      ) : isPro ? (
        <>
          <Tab.Screen
            name="Pro"
            component={ProStack}
            options={{
              title: t('nav.home'),
              tabBarIcon: ({ color, size }) => <Icon name="home" size={size} color={color} />,
            }}
          />
          <Tab.Screen
            name="ProDemandes"
            component={ProDemandesStack}
            options={{
              title: t('nav.demandes'),
              tabBarIcon: ({ color, size }) => <Icon name="clipboard-list" size={size} color={color} />,
            }}
          />
          <Tab.Screen
            name="ProAgenda"
            component={ProAgendaStack}
            options={{
              title: t('nav.agenda'),
              tabBarIcon: ({ color, size }) => <Icon name="calendar-check" size={size} color={color} />,
            }}
          />
          <Tab.Screen
            name="ProMessages"
            component={MessagesStack}
            options={{
              title: t('nav.messages'),
              tabBarIcon: ({ color, size }) => <Icon name="message-outline" size={size} color={color} />,
            }}
          />
          <Tab.Screen
            name="Profile"
            component={ProfileStack}
            options={{
              title: t('nav.profile'),
              tabBarIcon: ({ color, size }) => <Icon name="account" size={size} color={color} />,
            }}
          />
        </>
      ) : (
        <>
          <Tab.Screen
            name="Home"
            component={HomeStack}
            options={{
              title: t('nav.home'),
              tabBarIcon: ({ color, size }) => <Icon name="home" size={size} color={color} />,
            }}
          />
          <Tab.Screen
            name="Search"
            component={SearchStack}
            options={{
              title: t('nav.search'),
              tabBarIcon: ({ color, size }) => <Icon name="magnify" size={size} color={color} />,
              tabBarButton: isActiveDriver
                ? (props) => (
                    <TouchableOpacity
                      {...props}
                      onPress={() =>
                        Alert.alert(t('common.access_denied'), t('home.driver_cannot_book_transport'))
                      }
                    />
                  )
                : undefined,
            }}
          />
          <Tab.Screen
            name="Commandes"
            component={CommandesStack}
            options={{
              title: t('nav.commandes'),
              tabBarIcon: ({ color, size }) => <Icon name="clipboard-list-outline" size={size} color={color} />,
            }}
          />
          <Tab.Screen
            name="Messages"
            component={MessagesStack}
            options={{
              title: t('nav.messages'),
              tabBarIcon: ({ color, size }) => <Icon name="message-outline" size={size} color={color} />,
            }}
          />
          <Tab.Screen
            name="Profile"
            component={ProfileStack}
            options={{
              title: t('nav.profile'),
              tabBarIcon: ({ color, size }) => <Icon name="account" size={size} color={color} />,
            }}
          />
        </>
      )}
    </Tab.Navigator>
  );
};
