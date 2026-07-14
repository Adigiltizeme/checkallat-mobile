import * as SecureStore from 'expo-secure-store';

export const TOKEN_KEY = 'auth_access_token';
export const REFRESH_TOKEN_KEY = 'auth_refresh_token';

export const secureStorage = {
  setToken: (value: string) => SecureStore.setItemAsync(TOKEN_KEY, value),
  setRefreshToken: (value: string) => SecureStore.setItemAsync(REFRESH_TOKEN_KEY, value),
  getToken: () => SecureStore.getItemAsync(TOKEN_KEY),
  getRefreshToken: () => SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
  clearTokens: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  },
};
