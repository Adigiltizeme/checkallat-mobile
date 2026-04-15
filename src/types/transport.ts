/**
 * Types pour le module Transport
 */

export type TransportObjectType =
  | 'furniture'
  | 'appliances'
  | 'boxes'
  | 'vehicle'
  | 'other';

export type VehicleType = 'van' | 'small_truck' | 'large_truck';

export type TimeSlot = 'morning' | 'afternoon' | 'evening' | 'flexible';

export type TransportStatus =
  | 'pending'
  | 'accepted'
  | 'heading_to_pickup'
  | 'arrived_at_pickup'
  | 'loading'
  | 'in_transit'
  | 'arrived_at_delivery'
  | 'unloading'
  | 'completed'
  | 'cancelled';

export interface Step1Data {
  objectType: TransportObjectType; // Type principal (pour compatibilité backend)
  objectTypes?: TransportObjectType[]; // Types multiples (optionnel, pour affichage)
  description: string;
  photos: string[]; // URIs locales ou URLs
  estimatedVolume: number; // en m³
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
  };
}

export interface AddressData {
  address: string;
  lat: number;
  lng: number;
  floor: number;
  hasElevator: boolean;
  instructions?: string;
}

export interface Step2Data {
  pickup: AddressData;
  delivery: AddressData;
  distance: number; // en km
  estimatedDuration: number; // en minutes
}

export interface Step3Data {
  needHelpers: boolean;
  helpersCount: number;
  needDisassembly: boolean;
  needReassembly: boolean;
  needPacking: boolean;
}

export interface Step4Data {
  scheduledDate: string; // ISO date
  timeSlot: TimeSlot;
  isImmediate: boolean; // true = client veut un chauffeur maintenant
}

export interface PriceBreakdown {
  baseFare: number;
  vehicleType: VehicleType;
  distanceFare: number;
  floorFare: number;
  helpersFare: number;
  servicesFare: number;
  total: number;
}

export interface TransportDriver {
  id: string;
  vehicleType: VehicleType;
  vehiclePlate: string;
  averageRating?: number;
  user: {
    firstName: string;
    lastName: string;
    phone: string;
    photo?: string;
  };
}

export interface TransportRequest {
  id: string;
  clientId: string;
  driverId?: string;
  driver?: TransportDriver;
  status: TransportStatus;
  objectType: TransportObjectType;
  description: string;
  photos: string[];
  estimatedVolume: number;
  pickup: AddressData;
  delivery: AddressData;
  distance: number;
  needHelpers: boolean;
  helpersCount: number;
  needDisassembly: boolean;
  needReassembly: boolean;
  needPacking: boolean;
  scheduledDate: string;
  timeSlot: TimeSlot;
  price: number;
  priceBreakdown: PriceBreakdown;
  paymentMethod: 'stripe' | 'cash';
  createdAt: string;
  updatedAt: string;
  acceptedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
}

export interface DriverLocation {
  lat: number;
  lng: number;
  heading: number;
  timestamp: string;
}

export interface TrackingInfo {
  request: TransportRequest;
  driver?: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    photo?: string;
    rating: number;
    vehicleType: VehicleType;
    vehiclePlate: string;
  };
  currentLocation?: DriverLocation;
  eta?: number; // en minutes
  statusHistory: Array<{
    status: TransportStatus;
    timestamp: string;
  }>;
}

// Helpers pour affichage UI
export const OBJECT_TYPE_LABELS: Record<TransportObjectType, string> = {
  furniture: 'Meubles',
  appliances: 'Électroménager',
  boxes: 'Cartons',
  vehicle: 'Véhicule',
  other: 'Autre',
};

export const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  van: 'Camionnette',
  small_truck: 'Petit camion',
  large_truck: 'Grand camion',
};

export const TIME_SLOT_LABELS: Record<TimeSlot, string> = {
  morning: 'Matin (8h-12h)',
  afternoon: 'Après-midi (12h-17h)',
  evening: 'Soir (17h-20h)',
  flexible: 'Flexible',
};

export const STATUS_LABELS: Record<TransportStatus, string> = {
  pending: 'En attente',
  accepted: 'Acceptée',
  heading_to_pickup: 'En route vers retrait',
  arrived_at_pickup: 'Arrivé au retrait',
  loading: 'Chargement en cours',
  in_transit: 'En transit',
  arrived_at_delivery: 'Arrivé à la livraison',
  unloading: 'Déchargement en cours',
  completed: 'Terminée',
  cancelled: 'Annulée',
};

export const STATUS_COLORS: Record<TransportStatus, string> = {
  pending: '#F39C12',        // Orange
  accepted: '#3498DB',        // Bleu
  heading_to_pickup: '#5B21B6', // Indigo
  arrived_at_pickup: '#9333EA', // Violet
  loading: '#F97316',         // Orange
  in_transit: '#06B6D4',      // Cyan
  arrived_at_delivery: '#8B5CF6', // Violet clair
  unloading: '#EC4899',       // Rose
  completed: '#27AE60',       // Vert
  cancelled: '#E74C3C',       // Rouge
};

// Estimations volume par type d'objet (clés i18n → volume en m³)
export const VOLUME_ESTIMATES: Record<string, number> = {
  sofa_2: 2,
  sofa_3: 3,
  single_bed: 2.5,
  double_bed: 4,
  wardrobe: 3,
  dining_table: 1.5,
  chairs_x4: 0.5,
  fridge: 1,
  washing_machine: 0.8,
  oven: 0.6,
  microwave: 0.2,
  medium_box: 0.1,
};
