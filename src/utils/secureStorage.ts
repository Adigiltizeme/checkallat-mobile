import * as SecureStore from 'expo-secure-store';

export const TOKEN_KEY = 'auth_access_token';
export const REFRESH_TOKEN_KEY = 'auth_refresh_token';

/**
 * SecureStore n'accepte que des chaînes : une valeur vide (undefined, null) efface la clé
 * au lieu de lever « Invalid value provided to SecureStore ».
 */
const setOrDelete = (key: string, value: unknown) =>
  typeof value === 'string' && value.length > 0
    ? SecureStore.setItemAsync(key, value)
    : SecureStore.deleteItemAsync(key);

export const secureStorage = {
  setToken: (value: string | null | undefined) => setOrDelete(TOKEN_KEY, value),
  setRefreshToken: (value: string | null | undefined) => setOrDelete(REFRESH_TOKEN_KEY, value),
  getToken: () => SecureStore.getItemAsync(TOKEN_KEY),
  getRefreshToken: () => SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
  clearTokens: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  },
};
