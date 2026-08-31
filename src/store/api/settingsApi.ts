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
}

export interface PublicSettings {
  currency: string;
  serviceZones: ServiceZone[];
  serviceCategories: any[];
  exchangeRates: Record<string, number>;
  supportEmail: string;
  supportPhone: string;
}

export const settingsApi = createApi({
  reducerPath: 'settingsApi',
  baseQuery: createBaseQuery(`${API_CONFIG.BASE_URL}/admin`),
  tagTypes: ['PublicSettings'],
  endpoints: (builder) => ({
    getPublicSettings: builder.query<PublicSettings, void>({
      query: () => '/settings/public',
      providesTags: ['PublicSettings'],
    }),
  }),
});

export const { useGetPublicSettingsQuery } = settingsApi;
