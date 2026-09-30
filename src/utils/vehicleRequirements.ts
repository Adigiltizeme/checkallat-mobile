import type { CourierSettings } from '../store/api/settingsApi';

export const DRIVER_VEHICLE_TYPES = ['van', 'small_truck', 'large_truck', 'motorbike', 'bicycle'] as const;
export type DriverVehicleType = typeof DRIVER_VEHICLE_TYPES[number];

export const MOTORBIKE_CLASSES = ['moped', 'motorcycle'] as const;
export type MotorbikeClass = typeof MOTORBIKE_CLASSES[number];

/** Capacité imposée pour les 2 roues (m³) — même valeur que le backend */
export const COURIER_FIXED_CAPACITY: Record<string, number> = { bicycle: 0.04, motorbike: 0.08 };

export interface VehicleRequirements {
  plate: boolean;
  license: 'required' | 'optional' | 'none';
  /** registration = carte grise ; bike_proof = facture / assurance du vélo */
  vehicleDocument: 'registration' | 'bike_proof';
  fixedCapacity: number | null;
}

/**
 * Pièces exigées selon le véhicule — miroir de `vehicleRequirements` côté backend
 * (backend_checkallat/src/modules/transport/courier-settings.ts), qui reste la référence.
 */
export function vehicleRequirements(
  settings: CourierSettings,
  vehicleType: string,
  motorbikeClass?: string | null,
  countryCode?: string | null,
): VehicleRequirements {
  if (vehicleType === 'bicycle') {
    return { plate: false, license: 'none', vehicleDocument: 'bike_proof', fixedCapacity: COURIER_FIXED_CAPACITY.bicycle };
  }
  if (vehicleType === 'motorbike') {
    const mopedNeedsLicense = settings.mopedLicenseRequiredCountries.includes((countryCode ?? '').toUpperCase());
    return {
      plate: true,
      license: motorbikeClass === 'moped' && !mopedNeedsLicense ? 'optional' : 'required',
      vehicleDocument: 'registration',
      fixedCapacity: COURIER_FIXED_CAPACITY.motorbike,
    };
  }
  return { plate: true, license: 'required', vehicleDocument: 'registration', fixedCapacity: null };
}

/** Codes d'erreur backend (candidature / changement de véhicule) → clé i18n */
export const VEHICLE_ERROR_KEYS: Record<string, string> = {
  VEHICLE_DECLARATION_REQUIRED: 'driver_apply.declaration_required',
  MOTORBIKE_CLASS_REQUIRED: 'driver_apply.motorbike_class_required',
  VEHICLE_PLATE_REQUIRED: 'driver_apply.plate_required',
  DRIVING_LICENSE_REQUIRED: 'driver_apply.license_required',
  VEHICLE_DOCUMENT_REQUIRED: 'driver_apply.insurance_required',
  VEHICLE_PHOTOS_REQUIRED: 'driver_apply.vehicle_photos_min',
  VEHICLE_CAPACITY_REQUIRED: 'driver_apply.capacity_required',
  VEHICLE_CHANGE_ACTIVE_DELIVERY: 'driver_docs.vehicle_change_active_delivery',
};
