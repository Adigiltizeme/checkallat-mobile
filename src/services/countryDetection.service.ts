import * as Location from 'expo-location';
import { MapboxService } from './mapbox.service';
import { isCountrySupported } from '../config/countries';
import { API_CONFIG } from '../config/api';

export type CountryDetectionResult =
  | { status: 'supported'; countryCode: string; lat: number; lng: number }
  | { status: 'unsupported'; countryCode: string | null; lat: number; lng: number }
  | { status: 'denied' }
  | { status: 'error'; message: string };

/**
 * Détecte le pays de l'utilisateur via GPS + reverse geocoding Mapbox.
 * Fallback IP si GPS refusé (via ipapi.co, gratuit, sans token).
 */
export class CountryDetectionService {
  /**
   * Tentative principale : GPS → reverse geocode pays
   */
  static async detectViaGPS(): Promise<CountryDetectionResult> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        // Fallback sur IP si GPS refusé
        return this.detectViaIP();
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude: lat, longitude: lng } = location.coords;
      const countryCode = await MapboxService.reverseGeocodeCountry(lat, lng);

      if (!countryCode) {
        return { status: 'error', message: 'Could not determine country from coordinates' };
      }

      if (isCountrySupported(countryCode)) {
        return { status: 'supported', countryCode, lat, lng };
      } else {
        return { status: 'unsupported', countryCode, lat, lng };
      }
    } catch (error: any) {
      return { status: 'error', message: error.message };
    }
  }

  /**
   * Fallback : détection pays par IP.
   * Essaie d'abord le backend (qui interroge ipapi.co avec l'IP mobile côté serveur),
   * puis ipapi.co directement si le backend est inaccessible.
   */
  static async detectViaIP(): Promise<CountryDetectionResult> {
    // Primaire : backend (évite les limites de taux côté mobile)
    try {
      const res = await fetch(`${API_CONFIG.BASE_URL}/auth/detect-country`, {
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data = await res.json();
        const countryCode: string | null = data.countryCode?.toLowerCase() || null;
        if (countryCode) {
          if (isCountrySupported(countryCode)) {
            return { status: 'supported', countryCode, lat: 0, lng: 0 };
          } else {
            return { status: 'unsupported', countryCode, lat: 0, lng: 0 };
          }
        }
      }
    } catch {
      // Backend inaccessible → fallback direct
    }

    // Secondaire : ipapi.co en direct
    try {
      const response = await fetch('https://ipapi.co/json/', {
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) throw new Error('IP geolocation unavailable');

      const data = await response.json();
      const countryCode: string | null = data.country_code?.toLowerCase() || null;

      if (!countryCode) return { status: 'denied' };

      if (isCountrySupported(countryCode)) {
        return { status: 'supported', countryCode, lat: data.latitude ?? 0, lng: data.longitude ?? 0 };
      } else {
        return { status: 'unsupported', countryCode, lat: data.latitude ?? 0, lng: data.longitude ?? 0 };
      }
    } catch {
      return { status: 'denied' };
    }
  }

  /**
   * Point d'entrée principal : essaie GPS puis IP
   */
  static async detect(): Promise<CountryDetectionResult> {
    return this.detectViaGPS();
  }
}
