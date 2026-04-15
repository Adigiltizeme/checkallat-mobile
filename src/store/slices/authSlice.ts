import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const LANGUAGE_STORAGE_KEY = 'preferredLanguage';

interface AuthState {
  user: any | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isDriver: boolean;
  driverId: string | null;
  language: string;
}

const initialState: AuthState = {
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  isDriver: false,
  driverId: null,
  language: 'fr',
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ user: any; accessToken: string; refreshToken: string }>,
    ) => {
      state.user = action.payload.user;
      state.token = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.isAuthenticated = true;

      // Check if user is a driver
      state.isDriver = !!action.payload.user?.driver;
      state.driverId = action.payload.user?.driver?.id || null;

      // Sync language from user profile
      if (action.payload.user?.preferredLanguage) {
        state.language = action.payload.user.preferredLanguage;
      }

      // Persist asynchronously
      AsyncStorage.setItem('accessToken', action.payload.accessToken);
      AsyncStorage.setItem('refreshToken', action.payload.refreshToken);
    },
    updateUser: (state, action: PayloadAction<any>) => {
      state.user = { ...state.user, ...action.payload };
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
      // Keep language on logout

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
  },
});

export const {
  setCredentials,
  updateUser,
  setLanguage,
  logout,
  restoreAuth,
  restoreLanguage,
} = authSlice.actions;
export default authSlice.reducer;
