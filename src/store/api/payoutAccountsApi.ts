import { createApi } from '@reduxjs/toolkit/query/react';
import { API_CONFIG, createBaseQuery } from '../../config/api';

export interface PayoutFieldDef {
  key: string;
  label: string;
  labelAr?: string;
  type: 'text' | 'phone' | 'email' | 'select';
  required: boolean;
  placeholder?: string;
  options?: string[];
}

export interface PayoutMethodDef {
  type: string;
  label: string;
  labelAr?: string;
  fields: PayoutFieldDef[];
}

export interface PayoutAccount {
  id: string;
  accountType: string;
  country: string;
  accountHolderName: string;
  accountDetails: Record<string, string>;
  isDefault: boolean;
  isVerified: boolean;
  createdAt: string;
}

export type BeneficiaryRole = 'driver' | 'pro' | 'seller';

export const payoutAccountsApi = createApi({
  reducerPath: 'payoutAccountsApi',
  baseQuery: createBaseQuery(`${API_CONFIG.BASE_URL}/payout-accounts`),
  tagTypes: ['PayoutAccount', 'PayoutMethods'],
  endpoints: (builder) => ({

    /** Méthodes disponibles pour un pays */
    getPayoutMethods: builder.query<PayoutMethodDef[], string>({
      query: (country) => `/methods?country=${country}`,
      providesTags: ['PayoutMethods'],
    }),

    /** Mes comptes (chauffeur) */
    getDriverAccounts: builder.query<PayoutAccount[], void>({
      query: () => '/driver/me',
      providesTags: ['PayoutAccount'],
    }),

    /** Mes comptes (pro) */
    getProAccounts: builder.query<PayoutAccount[], void>({
      query: () => '/pro/me',
      providesTags: ['PayoutAccount'],
    }),

    /** Mes comptes (vendeur) */
    getSellerAccounts: builder.query<PayoutAccount[], void>({
      query: () => '/seller/me',
      providesTags: ['PayoutAccount'],
    }),

    /** Créer un compte (chauffeur) */
    createDriverAccount: builder.mutation<PayoutAccount, {
      accountType: string;
      country: string;
      accountHolderName: string;
      accountDetails: Record<string, string>;
      isDefault?: boolean;
    }>({
      query: (body) => ({ url: '/driver', method: 'POST', body }),
      invalidatesTags: ['PayoutAccount'],
    }),

    /** Créer un compte (pro) */
    createProAccount: builder.mutation<PayoutAccount, {
      accountType: string;
      country: string;
      accountHolderName: string;
      accountDetails: Record<string, string>;
      isDefault?: boolean;
    }>({
      query: (body) => ({ url: '/pro', method: 'POST', body }),
      invalidatesTags: ['PayoutAccount'],
    }),

    /** Créer un compte (vendeur) */
    createSellerAccount: builder.mutation<PayoutAccount, {
      accountType: string;
      country: string;
      accountHolderName: string;
      accountDetails: Record<string, string>;
      isDefault?: boolean;
    }>({
      query: (body) => ({ url: '/seller', method: 'POST', body }),
      invalidatesTags: ['PayoutAccount'],
    }),

    /** Définir par défaut (chauffeur) */
    setDefaultDriverAccount: builder.mutation<PayoutAccount, string>({
      query: (id) => ({ url: `/driver/${id}/set-default`, method: 'POST' }),
      invalidatesTags: ['PayoutAccount'],
    }),

    /** Définir par défaut (pro) */
    setDefaultProAccount: builder.mutation<PayoutAccount, string>({
      query: (id) => ({ url: `/pro/${id}/set-default`, method: 'POST' }),
      invalidatesTags: ['PayoutAccount'],
    }),

    /** Supprimer (chauffeur) */
    deleteDriverAccount: builder.mutation<void, string>({
      query: (id) => ({ url: `/driver/${id}`, method: 'DELETE' }),
      invalidatesTags: ['PayoutAccount'],
    }),

    /** Supprimer (pro) */
    deleteProAccount: builder.mutation<void, string>({
      query: (id) => ({ url: `/pro/${id}`, method: 'DELETE' }),
      invalidatesTags: ['PayoutAccount'],
    }),
  }),
});

export const {
  useGetPayoutMethodsQuery,
  useGetDriverAccountsQuery,
  useGetProAccountsQuery,
  useGetSellerAccountsQuery,
  useCreateDriverAccountMutation,
  useCreateProAccountMutation,
  useCreateSellerAccountMutation,
  useSetDefaultDriverAccountMutation,
  useSetDefaultProAccountMutation,
  useDeleteDriverAccountMutation,
  useDeleteProAccountMutation,
} = payoutAccountsApi;
