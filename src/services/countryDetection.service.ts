import * as Location from 'expo-location';
import { MapboxService } from './mapbox.service';
import { isCountrySupported } from '../config/countries';

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
   * Fallback : IP géolocalisation via ipapi.co (gratuit, pas de token)
   * Utilisé quand le GPS est refusé ou indisponible.
   */
  static async detectViaIP(): Promise<CountryDetectionResult> {
    try {
      const response = await fetch('https://ipapi.co/json/');
      if (!response.ok) throw new Error('IP geolocation unavailable');

      const data = await response.json();
      const countryCode: string | null = data.country_code?.toLowerCase() || null;
      const lat: number = data.latitude ?? 0;
      const lng: number = data.longitude ?? 0;

      if (!countryCode) {
        return { status: 'denied' };
      }

      if (isCountrySupported(countryCode)) {
        return { status: 'supported', countryCode, lat, lng };
      } else {
        return { status: 'unsupported', countryCode, lat, lng };
      }
    } catch {
      // Si IP aussi échoue, on retourne 'denied' — l'utilisateur devra choisir manuellement
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
