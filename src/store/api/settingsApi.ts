import { createApi } from '@reduxjs/toolkit/query/react';
import { API_CONFIG, createBaseQuery } from '../../config/api';

export interface ServiceZone {
  id: string;
  name: string;
  nameAr: string;
  country: string;
  countryCode: string;
  currency: string;
  flag: string;
  mapboxLanguage: string;
  enabled: boolean;
  requireHealthCertificate?: boolean;
  /** Candidatures : e-mail vérifié obligatoire dans ce pays */
  requireVerifiedEmail?: boolean;
}

export interface PublicSector {
  slug: string;
  nameEn: string;
  nameFr: string;
  nameAr: string;
  /** Sous-titres de la carte d'accueil (vides = texte par défaut de l'app) */
  descriptionFr?: string;
  descriptionEn?: string;
  descriptionAr?: string;
  icon: string;
  enabled: boolean;
  order: number;
  backgroundImage?: string | null;
  gradientFrom?: string | null;
  gradientTo?: string | null;
  /** Pays (ISO) où le secteur est proposé ; vide = tous */
  countries?: string[];
  /** Parcours disponible dans l'app ; sinon carte « Bientôt disponible » */
  builtIn?: boolean;
}

export interface CourierSettings {
  motorbikeMaxWeightKg: number;
  motorbikeMaxDistanceKm: number;
  bicycleMaxWeightKg: number;
  bicycleMaxDistanceKm: number;
  baseFareMultiplier: number;
  expressSurchargePct: number;
  bicycleMaxSpeedKmh: number;
  /** Pays (ISO) où un cyclomoteur <= 50 cm³ exige un permis */
  mopedLicenseRequiredCountries: string[];
}

export interface CancellationPolicy {
  feeEnabled: boolean;
  feeRatePct: number;
  transport: { freeCancelHoursBeforeSlot: number; headingFreeCancelMin: number; autoConfirmCompletionHours: number };
  booking: { freeCancelHoursBeforeSlot: number; enRouteFreeCancelMin: number; autoCompleteHours: number };
}

export interface PublicStats {
  activeProviders: number;
  completedJobs: number;
  averageRating: number | null;
  reviewCount: number;
  countries: number;
}

export interface PublicSettings {
  currency: string;
  serviceZones: ServiceZone[];
  serviceCategories: any[];
  exchangeRates: Record<string, number>;
  supportEmail: string;
  supportPhone: string;
  sectors?: PublicSector[];
  courierSettings?: CourierSettings;
  marketplaceMinOrderAmount?: number;
  /** Version en vigueur des CGU / politique de confidentialité (ré-acceptation si différente de celle de l'utilisateur) */
  legalTermsVersion?: string | null;
  /** Ce qui change dans la nouvelle version des CGU, par langue */
  legalTermsChangeSummary?: { fr?: string; en?: string; ar?: string } | null;
  /** Règles d'annulation réglées dans le web-admin */
  cancellationPolicy?: CancellationPolicy;
}

export const settingsApi = createApi({
  reducerPath: 'settingsApi',
  baseQuery: createBaseQuery(`${API_CONFIG.BASE_URL}/admin`),
  tagTypes: ['PublicSettings'],
  endpoints: (builder) => ({
    getPublicSettings: builder.query<PublicSettings, void>({
      query: () => '/settings/public',
      providesTags: ['PublicSettings'],
      keepUnusedDataFor: 120,
    }),
    /** Chiffres réels de la plateforme (accueil), par pays */
    getPublicStats: builder.query<PublicStats, string | undefined>({
      query: (countryCode) => ({ url: '/stats/public', params: countryCode ? { countryCode } : {} }),
    }),
  }),
});

export const { useGetPublicSettingsQuery, useGetPublicStatsQuery } = settingsApi;
