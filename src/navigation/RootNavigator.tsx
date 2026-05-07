import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { RoleSelectorScreen } from '../screens/auth/RoleSelectorScreen';
import { useDriverApprovalPolling } from '../hooks/useDriverApprovalPolling';

const AuthenticatedRoot = () => {
  useDriverApprovalPolling();
  const needsRoleSelection = useSelector((state: RootState) => state.auth.needsRoleSelection);

  return needsRoleSelection ? <RoleSelectorScreen /> : <MainNavigator />;
};

export const RootNavigator = () => {
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);

  return (
    <NavigationContainer>
      {isAuthenticated ? <AuthenticatedRoot /> : <AuthNavigator />}
    </NavigationContainer>
  );
};
