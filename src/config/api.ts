import { fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../store';

// API Configuration
// Configuration dynamique depuis .env pour gérer plusieurs réseaux
// Utilisez les scripts switch-network1.bat ou switch-network2.bat pour basculer entre réseaux
// Ou utilisez npx expo start --tunnel pour contourner les problèmes de réseau local

export const API_CONFIG = {
  // Lit depuis .env (EXPO_PUBLIC_API_URL)
  // Fallback sur l'ancienne IP si non défini (ne devrait pas arriver)
  BASE_URL: process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.55:4000/api/v1',

  // Timeout for API requests (in milliseconds)
  TIMEOUT: 30000,
};

// URL publique de l'app web (pages de suivi partagées avec les clients)
export const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL || 'https://checkallat-web-admin.vercel.app';

// Documents légaux (mêmes URLs que celles déclarées sur l'App Store et Google Play)
export const LEGAL_URLS = {
  terms: `${WEB_URL}/terms`,
  privacy: `${WEB_URL}/privacy`,
};

/** Renouvellement en cours : partagé par toutes les requêtes refusées en même temps */
let refreshInFlight: Promise<string | null> | null = null;

/** Nouveau jeton d'accès à partir du jeton de renouvellement (null si la session est terminée) */
export async function requestAccessTokenRefresh(refreshToken: string | null | undefined): Promise<string | null> {
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${API_CONFIG.BASE_URL}/auth/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    return typeof data?.accessToken === 'string' ? data.accessToken : null;
  } catch {
    // Hors ligne : on ne déconnecte pas pour autant
    throw new Error('network');
  }
}

/**
 * Configuration réutilisable pour tous les APIs RTK Query : jeton JWT ajouté automatiquement,
 * et session renouvelée sans que l'utilisateur ne s'en aperçoive quand le jeton d'accès expire (401) :
 * la requête est rejouée avec le nouveau jeton ; si la session est terminée, déconnexion propre.
 */
export const createBaseQuery = (baseUrl?: string): BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> => {
  const rawBaseQuery = fetchBaseQuery({
    baseUrl: baseUrl || API_CONFIG.BASE_URL,
    prepareHeaders: (headers, { getState }) => {
      // Ajouter le token JWT si disponible
      const token = (getState() as RootState).auth?.token;
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }

      return headers;
    },
  });

  return async (args, api, extraOptions) => {
    let result = await rawBaseQuery(args, api, extraOptions);
    if (result.error?.status !== 401) return result;

    const state = api.getState() as RootState;
    const url = typeof args === 'string' ? args : args.url;
    // Pas de session, ou appel d'authentification : le 401 est la vraie réponse
    if (!state.auth?.token || /\/auth\/(login|register|refresh-token|verify-otp)/.test(url)) return result;

    let newToken: string | null = null;
    try {
      refreshInFlight ??= requestAccessTokenRefresh(state.auth.refreshToken).finally(() => {
        refreshInFlight = null;
      });
      newToken = await refreshInFlight;
    } catch {
      return result; // hors ligne : la requête échoue, la session est conservée
    }

    if (!newToken) {
      // Session terminée (jeton expiré, révoqué ou compte suspendu) : reconnexion nécessaire
      api.dispatch({ type: 'auth/logout' });
      return result;
    }
    api.dispatch({ type: 'auth/accessTokenRefreshed', payload: newToken });
    result = await rawBaseQuery(args, api, extraOptions);
    return result;
  };
};
