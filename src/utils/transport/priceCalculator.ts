import { VehicleType, PriceBreakdown, Step1Data, Step2Data, Step3Data } from '../../types/transport';

/**
 * Détermine le type de véhicule nécessaire selon le volume
 */
export function determineVehicleType(volume: number): VehicleType {
  if (volume <= 15) return 'van';
  if (volume <= 30) return 'small_truck';
  return 'large_truck';
}

/**
 * Tarifs de base par type de véhicule (en EGP)
 */
const BASE_FARES: Record<VehicleType, number> = {
  van: 200,
  small_truck: 350,
  large_truck: 500,
};

/**
 * Calcule le tarif distance avec tarification dégressive
 */
function calculateDistanceFare(distance: number): number {
  if (distance <= 5) {
    return distance * 10; // 10 EGP/km
  } else if (distance <= 15) {
    return 50 + (distance - 5) * 7; // 7 EGP/km
  } else {
    return 120 + (distance - 15) * 5; // 5 EGP/km
  }
}

/**
 * Calcule le tarif étages (sans ascenseur uniquement)
 */
function calculateFloorFare(
  pickupFloor: number,
  pickupHasElevator: boolean,
  deliveryFloor: number,
  deliveryHasElevator: boolean
): number {
  let total = 0;

  if (!pickupHasElevator) {
    total += pickupFloor * 15; // 15 EGP/étage
  }

  if (!deliveryHasElevator) {
    total += deliveryFloor * 15;
  }

  return total;
}

/**
 * Calcule le tarif helpers
 */
function calculateHelpersFare(needHelpers: boolean, helpersCount: number): number {
  if (!needHelpers) return 0;
  return helpersCount * 50; // 50 EGP/personne
}

/**
 * Calcule le tarif services additionnels
 */
function calculateServicesFare(
  needDisassembly: boolean,
  needReassembly: boolean,
  needPacking: boolean
): number {
  let total = 0;

  if (needDisassembly) total += 40;
  if (needReassembly) total += 40;
  if (needPacking) total += 30;

  return total;
}

/**
 * Calcule le prix total du transport avec breakdown détaillé
 */
export function calculateTransportPrice(
  step1: Step1Data,
  step2: Step2Data,
  step3: Step3Data
): PriceBreakdown {
  // 1. Base fare (selon véhicule)
  const vehicleType = determineVehicleType(step1.estimatedVolume);
  const baseFare = BASE_FARES[vehicleType];

  // 2. Distance fare
  const distanceFare = calculateDistanceFare(step2.distance);

  // 3. Floor fare
  const floorFare = calculateFloorFare(
    step2.pickup.floor,
    step2.pickup.hasElevator,
    step2.delivery.floor,
    step2.delivery.hasElevator
  );

  // 4. Helpers fare
  const helpersFare = calculateHelpersFare(step3.needHelpers, step3.helpersCount);

  // 5. Services fare
  const servicesFare = calculateServicesFare(
    step3.needDisassembly,
    step3.needReassembly,
    step3.needPacking
  );

  // Total
  const total = Math.round(baseFare + distanceFare + floorFare + helpersFare + servicesFare);

  return {
    baseFare,
    vehicleType,
    distanceFare,
    floorFare,
    helpersFare,
    servicesFare,
    total,
  };
}

/**
 * Formate un prix en EGP
 */
export function formatPrice(price: number | undefined): string {
  return `${(price || 0).toLocaleString('fr-FR')} EGP`;
}

/**
 * Convertit EGP en XOF (pour Sénégal si besoin)
 */
export function convertEGPtoXOF(egp: number): number {
  const RATE = 3.5; // Taux approximatif EGP → XOF
  return Math.round(egp * RATE);
}
