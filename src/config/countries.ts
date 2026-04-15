/**
 * Pays supportés par CheckAll@t
 * ISO 3166-1 alpha-2 codes, devises, et paramètres Mapbox associés
 */

export interface SupportedCountry {
  code: string;          // ISO 3166-1 alpha-2 (eg, fr, ma, tn, dz)
  nameKey: string;       // Clé i18n dans la section "country"
  currency: string;      // Code devise ISO 4217
  mapboxLanguage: string; // Langue préférée pour Mapbox geocoding
  flag: string;          // Emoji drapeau
}

export const SUPPORTED_COUNTRIES: SupportedCountry[] = [
  // MVP actif
  { code: 'eg', nameKey: 'country_eg', currency: 'EGP', mapboxLanguage: 'ar', flag: '🇪🇬' },
  // Phase 2
  { code: 'fr', nameKey: 'country_fr', currency: 'EUR', mapboxLanguage: 'fr', flag: '🇫🇷' },
  // Phase 3
  { code: 'sn', nameKey: 'country_sn', currency: 'XOF', mapboxLanguage: 'fr', flag: '🇸🇳' },
  { code: 'ml', nameKey: 'country_ml', currency: 'XOF', mapboxLanguage: 'fr', flag: '🇲🇱' },
];

/**
 * Vérifie si un pays (code ISO) est supporté
 */
export function isCountrySupported(isoCode: string): boolean {
  return SUPPORTED_COUNTRIES.some(
    (c) => c.code.toLowerCase() === isoCode.toLowerCase()
  );
}

/**
 * Récupère les infos d'un pays supporté
 */
export function getCountryInfo(isoCode: string): SupportedCountry | undefined {
  return SUPPORTED_COUNTRIES.find(
    (c) => c.code.toLowerCase() === isoCode.toLowerCase()
  );
}
