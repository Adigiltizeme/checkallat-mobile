import { useGetPublicSettingsQuery, CourierSettings } from '../store/api/settingsApi';

// Valeurs de secours tant que les paramètres plateforme ne sont pas chargés (mêmes défauts que le backend)
export const COURIER_SETTINGS_FALLBACK: CourierSettings = {
  motorbikeMaxWeightKg: 30,
  motorbikeMaxDistanceKm: 50,
  bicycleMaxWeightKg: 15,
  bicycleMaxDistanceKm: 15,
  baseFareMultiplier: 0.6,
  expressSurchargePct: 25,
  bicycleMaxSpeedKmh: 35,
  mopedLicenseRequiredCountries: ['FR'],
};

export const useCourierSettings = (): CourierSettings => {
  const { data } = useGetPublicSettingsQuery();
  return { ...COURIER_SETTINGS_FALLBACK, ...(data?.courierSettings ?? {}) };
};

/** Limites CheckAllPack côté client : la plus permissive des deux véhicules (moto / vélo). */
export const useCourierLimits = () => {
  const settings = useCourierSettings();
  return {
    maxWeightKg: Math.max(settings.motorbikeMaxWeightKg, settings.bicycleMaxWeightKg),
    maxDistanceKm: Math.max(settings.motorbikeMaxDistanceKm, settings.bicycleMaxDistanceKm),
    expressSurchargePct: settings.expressSurchargePct,
    bicycle: { maxWeightKg: settings.bicycleMaxWeightKg, maxDistanceKm: settings.bicycleMaxDistanceKm },
    motorbike: { maxWeightKg: settings.motorbikeMaxWeightKg, maxDistanceKm: settings.motorbikeMaxDistanceKm },
  };
};
