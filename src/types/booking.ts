export type BookingTimeSlot = 'morning' | 'afternoon' | 'evening';
export type BookingType = 'immediate' | 'scheduled';
export type RecurringFrequency = 'weekly' | 'biweekly' | 'monthly';
export type PaymentMethod = 'cash' | 'in_app';
export type AssignmentType = 'manual' | 'auto';

export interface BookingAddressData {
  address: string;
  lat: number;
  lng: number;
  floor: number;
  hasElevator: boolean;
  instructions?: string;
}

/** Step 1 — description + champs dynamiques par catégorie */
export interface BookingStep1Data {
  categorySlug: string;
  categoryNameFr?: string;
  categoryNameEn?: string;
  categoryNameAr?: string;
  clientDescription: string;
  clientPhotos: string[];
  categoryData: Record<string, any>;
}

/** Step 2 — adresse d'intervention */
export interface BookingStep2Data {
  address: BookingAddressData;
}

/** Step 3 — planification */
export interface BookingStep3Data {
  bookingType: BookingType;
  scheduledAt?: string;
  timeSlot?: BookingTimeSlot;
  isRecurring: boolean;
  recurringFrequency?: RecurringFrequency;
  recurringEndDate?: string;
}

/** Step 4 — sélection du prestataire */
export interface BookingStep4Data {
  assignmentType: AssignmentType;
  proId?: string;
  proName?: string;
  serviceOfferingId?: string;
  estimatedPrice?: number;
}

/** Payload final envoyé à l'API */
export interface CreateBookingPayload {
  categorySlug: string;
  assignmentType: AssignmentType;
  proId?: string;
  serviceOfferingId?: string;
  bookingType: BookingType;
  scheduledAt?: string;
  timeSlot?: BookingTimeSlot;
  isRecurring: boolean;
  recurringFrequency?: RecurringFrequency;
  recurringEndDate?: string;
  address: string;
  addressLat: number;
  addressLng: number;
  clientDescription: string;
  clientPhotos?: string[];
  categoryData?: Record<string, any>;
  estimatedPrice?: number;
  paymentMethod: PaymentMethod;
}
