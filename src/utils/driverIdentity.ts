/**
 * Chauffeur (camionnette, camion : transport et déménagement) ou livreur CheckAllPack (moto, vélo).
 * Même liste que le backend (backend_checkallat/src/modules/transport/courier-settings.ts).
 */
export const COURIER_VEHICLE_TYPES = ['motorbike', 'bicycle'] as const;

export const isCourierVehicle = (vehicleType?: string | null): boolean =>
  !!vehicleType && (COURIER_VEHICLE_TYPES as readonly string[]).includes(vehicleType);

/** Icône MaterialCommunityIcons du véhicule */
export const vehicleIcon = (vehicleType?: string | null): string =>
  vehicleType === 'bicycle' ? 'bicycle' : vehicleType === 'motorbike' ? 'moped' : 'truck-delivery';

export const vehicleEmoji = (vehicleType?: string | null): string =>
  vehicleType === 'bicycle' ? '🚲' : vehicleType === 'motorbike' ? '🛵' : '🚚';
