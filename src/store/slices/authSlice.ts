import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const LANGUAGE_STORAGE_KEY = 'preferredLanguage';
export const DEFAULT_ROLE_KEY = 'defaultRole';

export type UserRole = 'client' | 'driver' | 'pro' | 'seller';

interface AuthState {
  user: any | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isDriver: boolean;
  driverId: string | null;
  language: string;
  activeRole: UserRole | null;
  defaultRole: UserRole | null;
  availableRoles: UserRole[];
  needsRoleSelection: boolean;
}

const initialState: AuthState = {
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  isDriver: false,
  driverId: null,
  language: 'fr',
  activeRole: null,
  defaultRole: null,
  availableRoles: [],
  needsRoleSelection: false,
};

function computeAvailableRoles(user: any): UserRole[] {
  const roles: UserRole[] = ['client'];
  if (user?.driver) roles.push('driver');
  if (user?.pro) roles.push('pro');
  if (user?.marketplaceSeller) roles.push('seller');
  return roles;
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{
        user: any;
        accessToken: string;
        refreshToken: string;
        defaultRole?: UserRole | null;
      }>,
    ) => {
      const { user, accessToken, refreshToken, defaultRole } = action.payload;
      state.user = user;
      state.token = accessToken;
      state.refreshToken = refreshToken;
      state.isAuthenticated = true;

      const roles = computeAvailableRoles(user);
      state.availableRoles = roles;
      state.isDriver = !!user?.driver;
      state.driverId = user?.driver?.id || null;

      if (user?.preferredLanguage) {
        state.language = user.preferredLanguage;
      }

      // Appliquer le rôle par défaut s'il est disponible
      const savedDefault = defaultRole ?? null;
      state.defaultRole = savedDefault;

      if (savedDefault && roles.includes(savedDefault)) {
        state.activeRole = savedDefault;
        state.needsRoleSelection = false;
      } else if (roles.length === 1) {
        state.activeRole = 'client';
        state.needsRoleSelection = false;
      } else {
        state.activeRole = null;
        state.needsRoleSelection = true;
      }

      AsyncStorage.setItem('accessToken', accessToken);
      AsyncStorage.setItem('refreshToken', refreshToken);
    },

    setActiveRole: (
      state,
      action: PayloadAction<{ role: UserRole; setAsDefault?: boolean }>,
    ) => {
      const { role, setAsDefault } = action.payload;
      state.activeRole = role;
      state.isDriver = role === 'driver';
      state.needsRoleSelection = false;

      if (setAsDefault) {
        state.defaultRole = role;
        AsyncStorage.setItem(DEFAULT_ROLE_KEY, role);
      }
    },

    clearDefaultRole: (state) => {
      state.defaultRole = null;
      AsyncStorage.removeItem(DEFAULT_ROLE_KEY);
    },

    updateUser: (state, action: PayloadAction<any>) => {
      state.user = { ...state.user, ...action.payload };
    },

    refreshProfile: (state, action: PayloadAction<any>) => {
      const user = action.payload;
      state.user = user;
      state.isDriver = !!user?.driver;
      state.driverId = user?.driver?.id || null;

      const roles = computeAvailableRoles(user);
      state.availableRoles = roles;

      // Si le rôle driver vient d'être débloqué et qu'on est encore en 'client'
      if (roles.includes('driver') && state.activeRole === 'client') {
        state.needsRoleSelection = true;
      }
    },

    setLanguage: (state, action: PayloadAction<string>) => {
      state.language = action.payload;
      AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, action.payload);
    },

    logout: (state) => {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.isDriver = false;
      state.driverId = null;
      state.activeRole = null;
      state.availableRoles = [];
      state.needsRoleSelection = false;
      // On garde defaultRole et language au logout

      AsyncStorage.removeItem('accessToken');
      AsyncStorage.removeItem('refreshToken');
    },

    restoreAuth: (
      state,
      action: PayloadAction<{ accessToken: string; refreshToken: string }>,
    ) => {
      state.token = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.isAuthenticated = true;
    },

    restoreLanguage: (state, action: PayloadAction<string>) => {
      state.language = action.payload;
    },

    restoreDefaultRole: (state, action: PayloadAction<UserRole>) => {
      state.defaultRole = action.payload;
    },
  },
});

export const {
  setCredentials,
  setActiveRole,
  clearDefaultRole,
  updateUser,
  refreshProfile,
  setLanguage,
  logout,
  restoreAuth,
  restoreLanguage,
  restoreDefaultRole,
} = authSlice.actions;
export default authSlice.reducer;
