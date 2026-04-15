import { createApi } from '@reduxjs/toolkit/query/react';
import { API_CONFIG, createBaseQuery } from '../../config/api';

export const prosApi = createApi({
  reducerPath: 'prosApi',
  baseQuery: createBaseQuery(`${API_CONFIG.BASE_URL}/pros`),
  endpoints: (builder) => ({
    searchPros: builder.query({
      query: (params: {
        userLat: number;
        userLng: number;
        category?: string;
        minRating?: number;
        maxDistance?: number;
      }) => ({
        url: '/search',
        params,
      }),
    }),
    getProById: builder.query({
      query: (id: string) => `/${id}`,
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
} = prosApi;
