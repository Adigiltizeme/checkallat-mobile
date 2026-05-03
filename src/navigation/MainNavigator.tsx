import React from 'react';
import { Alert, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { RootState } from '../store';
import { MainTabParamList } from './types';
import { HomeScreen } from '../screens/home/HomeScreen';
import { HistoryScreen } from '../screens/profile/HistoryScreen';
import { ProfileStack } from './ProfileStack';
import { PaymentStack } from './PaymentStack';
import { TransportStack } from './TransportStack';
import { DriverStack } from './DriverStack';
import { colors } from '../theme/colors';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const Tab = createBottomTabNavigator<MainTabParamList>();

export const MainNavigator = () => {
  const { t } = useTranslation();
  const activeRole = useSelector((state: RootState) => state.auth.activeRole);
  const user = useSelector((state: RootState) => state.auth.user);
  const isDriver = activeRole === 'driver';

  const isActiveDriver = user?.driver?.status === 'active';

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.gray,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.border,
          borderTopWidth: 1,
        },
        headerShown: false,
      }}
    >
      {isDriver ? (
        <>
          <Tab.Screen
            name="Transport"
            component={DriverStack}
            options={{
              title: t('nav.deliveries'),
              tabBarIcon: ({ color, size }) => (
                <Icon name="truck-delivery" size={size} color={color} />
              ),
            }}
          />
          <Tab.Screen
            name="History"
            component={HistoryScreen}
            options={{
              title: t('nav.history'),
              tabBarIcon: ({ color, size }) => (
                <Icon name="history" size={size} color={color} />
              ),
            }}
          />
          <Tab.Screen
            name="Profile"
            component={ProfileStack}
            options={{
              title: t('nav.profile'),
              tabBarIcon: ({ color, size }) => (
                <Icon name="account" size={size} color={color} />
              ),
            }}
          />
        </>
      ) : (
        <>
          <Tab.Screen
            name="Home"
            component={HomeScreen}
            options={{
              title: t('nav.home'),
              tabBarIcon: ({ color, size }) => (
                <Icon name="home" size={size} color={color} />
              ),
            }}
          />
          <Tab.Screen
            name="Transport"
            component={TransportStack}
            options={{
              title: t('nav.transport'),
              tabBarIcon: ({ color, size }) => (
                <Icon name="truck-fast" size={size} color={color} />
              ),
              tabBarButton: isActiveDriver
                ? (props) => (
                    <TouchableOpacity
                      {...props}
                      onPress={() =>
                        Alert.alert(
                          t('common.access_denied'),
                          t('home.driver_cannot_book_transport'),
                        )
                      }
                    />
                  )
                : undefined,
            }}
          />
          <Tab.Screen
            name="History"
            component={PaymentStack}
            options={{
              title: t('nav.payments'),
              tabBarIcon: ({ color, size }) => (
                <Icon name="credit-card-outline" size={size} color={color} />
              ),
            }}
          />
          <Tab.Screen
            name="Profile"
            component={ProfileStack}
            options={{
              title: t('nav.profile'),
              tabBarIcon: ({ color, size }) => (
                <Icon name="account" size={size} color={color} />
              ),
            }}
          />
        </>
      )}
    </Tab.Navigator>
  );
};
