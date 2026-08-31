import { useMemo } from 'react';
import { useGetPublicSettingsQuery } from '../store/api/settingsApi';
import { SUPPORTED_COUNTRIES, SupportedCountry } from '../config/countries';

export function useCountries(): SupportedCountry[] {
  const { data } = useGetPublicSettingsQuery();

  return useMemo(() => {
    const zones = data?.serviceZones;
    if (!zones || zones.length === 0) return SUPPORTED_COUNTRIES;

    return zones
      .filter((z) => z.enabled)
      .map((z) => ({
        code: z.countryCode.toLowerCase(),
        nameKey: `country_${z.countryCode.toLowerCase()}`,
        currency: z.currency,
        mapboxLanguage: z.mapboxLanguage ?? 'ar',
        flag: z.flag ?? '🌍',
        // Champs étendus disponibles pour les composants qui en ont besoin
        zoneName: z.name,
        zoneNameAr: z.nameAr,
        countryFr: z.country,
      })) as SupportedCountry[];
  }, [data]);
}
