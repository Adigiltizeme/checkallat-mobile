import { createApi } from '@reduxjs/toolkit/query/react';
import { API_CONFIG, createBaseQuery } from '../../config/api';

export const prosApi = createApi({
  reducerPath: 'prosApi',
  baseQuery: createBaseQuery(`${API_CONFIG.BASE_URL}/pros`),
  tagTypes: ['Pro', 'ProStats'],
  endpoints: (builder) => ({
    searchPros: builder.query({
      query: (params: {
        userLat?: number;
        userLng?: number;
        category?: string;
        minRating?: number;
        maxDistance?: number;
        availableOnly?: boolean;
        segment?: 'standard' | 'premium';
        studyltizemeOnly?: boolean;
        page?: number;
        limit?: number;
      }) => ({
        url: '/search',
        params,
      }),
      providesTags: ['Pro'],
    }),
    getProById: builder.query({
      query: (id: string) => `/${id}`,
      providesTags: ['Pro'],
    }),
    createProProfile: builder.mutation({
      query: (body) => ({
        url: '/',
        method: 'POST',
        body,
      }),
    }),
    updateProProfile: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/${id}`,
        method: 'PUT',
        body,
      }),
    }),

    /**
     * Supprimer un profil pro
     */
    deleteProProfile: builder.mutation({
      query: (id: string) => ({
        url: `/${id}`,
        method: 'DELETE',
      }),
    }),

    /**
     * Valider ou rejeter un profil pro (Admin)
     */
    validateProProfile: builder.mutation({
      query: ({
        id,
        validated,
        reason,
      }: {
        id: string;
        validated: boolean;
        reason?: string;
      }) => ({
        url: `/${id}/validate`,
        method: 'PUT',
        body: { validated, reason },
      }),
    }),

    /**
     * Récupérer les statistiques d'un pro
     */
    getProStats: builder.query({
      query: (id: string) => `/${id}/stats`,
      providesTags: ['ProStats'],
    }),

    /**
     * Pro paye sa commission cash en attente via Stripe in-app
     */
    payProCommission: builder.mutation<
      { clientSecret: string; paymentIntentId: string; amount: number },
      void
    >({
      query: () => ({
        url: '/pay-commission',
        method: 'POST',
      }),
      invalidatesTags: ['ProStats'],
    }),

    /**
     * Mettre à jour la disponibilité d'un pro
     */
    updateProAvailability: builder.mutation({
      query: ({ id, isAvailable }: { id: string; isAvailable: boolean }) => ({
        url: `/${id}/availability`,
        method: 'PUT',
        body: { isAvailable },
      }),
    }),
  }),
});

export const {
  useSearchProsQuery,
  useGetProByIdQuery,
  useCreateProProfileMutation,
  useUpdateProProfileMutation,
  useDeleteProProfileMutation,
  useValidateProProfileMutation,
  useGetProStatsQuery,
  useUpdateProAvailabilityMutation,
  usePayProCommissionMutation,
} = prosApi;
