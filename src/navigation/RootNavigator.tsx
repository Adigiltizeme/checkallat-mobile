import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { RoleSelectorScreen } from '../screens/auth/RoleSelectorScreen';

export const RootNavigator = () => {
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const needsRoleSelection = useSelector((state: RootState) => state.auth.needsRoleSelection);

  return (
    <NavigationContainer>
      {!isAuthenticated ? (
        <AuthNavigator />
      ) : needsRoleSelection ? (
        <RoleSelectorScreen />
      ) : (
        <MainNavigator />
      )}
    </NavigationContainer>
  );
};
