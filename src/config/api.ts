import { fetchBaseQuery } from '@reduxjs/toolkit/query/react';
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

/**
 * Configuration réutilisable pour tous les APIs RTK Query
 * Ajoute automatiquement le token JWT et l'en-tête ngrok
 */
export const createBaseQuery = (baseUrl?: string) =>
  fetchBaseQuery({
    baseUrl: baseUrl || API_CONFIG.BASE_URL,
    prepareHeaders: (headers, { getState }) => {
      // Ajouter le token JWT si disponible
      const token = (getState() as RootState).auth?.token;
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }

      // Bypasser l'avertissement ngrok (nécessaire en mode tunnel)
      headers.set('ngrok-skip-browser-warning', 'true');

      return headers;
    },
  });
