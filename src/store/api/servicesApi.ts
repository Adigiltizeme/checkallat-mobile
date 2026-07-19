import { createApi } from '@reduxjs/toolkit/query/react';
import { API_CONFIG, createBaseQuery } from '../../config/api';

export const servicesApi = createApi({
  reducerPath: 'servicesApi',
  baseQuery: createBaseQuery(`${API_CONFIG.BASE_URL}/services`),
  tagTypes: ['Category', 'Offering'],
  endpoints: (builder) => ({
    // ========== CATEGORIES ==========

    /**
     * Récupérer toutes les catégories de services
     */
    getCategories: builder.query<any[], { activeOnly?: boolean; countryCode?: string }>({
      query: ({ activeOnly = true, countryCode }) => ({
        url: '/categories',
        params: {
          activeOnly: activeOnly ? 'true' : 'false',
          ...(countryCode ? { countryCode } : {}),
        },
      }),
      providesTags: ['Category'],
    }),

    /**
     * Récupérer une catégorie par slug
     */
    getCategoryBySlug: builder.query<any, string>({
      query: (slug) => `/categories/${slug}`,
      providesTags: ['Category'],
    }),

    /**
     * Créer une catégorie (Admin seulement)
     */
    createCategory: builder.mutation({
      query: (body: {
        name: string;
        slug: string;
        description?: string;
        icon?: string;
      }) => ({
        url: '/categories',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Category'],
    }),

    // ========== OFFERINGS ==========

    /**
     * Récupérer les offres d'un professionnel
     */
    getProOfferings: builder.query<any[], string>({
      query: (proId) => `/offerings/pro/${proId}`,
      providesTags: ['Offering'],
    }),

    /**
     * Créer une offre de service
     */
    createOffering: builder.mutation({
      query: ({
        proId,
        ...body
      }: {
        proId: string;
        categoryId: string;
        priceMin: number;
        priceMax?: number;
        description?: string;
      }) => ({
        url: `/offerings/${proId}`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Offering'],
    }),

    /**
     * Mettre à jour une offre
     */
    updateOffering: builder.mutation({
      query: ({
        id,
        ...body
      }: {
        id: string;
        priceMin?: number;
        priceMax?: number;
        description?: string;
        isAvailable?: boolean;
      }) => ({
        url: `/offerings/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Offering'],
    }),

    /**
     * Supprimer une offre
     */
    deleteOffering: builder.mutation({
      query: (id: string) => ({
        url: `/offerings/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Offering'],
    }),

    /**
     * Créer ou récupérer l'offre d'un pro pour une catégorie (par slug)
     */
    ensureOffering: builder.mutation<any, { proId: string; categorySlug: string }>({
      query: (body) => ({
        url: '/offerings/ensure',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Offering'],
    }),

    /**
     * Ajouter un extra à une offre
     */
    addOfferingExtra: builder.mutation<any, { offeringId: string; label: string; price: number; isOptional?: boolean }>({
      query: ({ offeringId, ...body }) => ({
        url: `/offerings/${offeringId}/extras`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Offering'],
    }),

    /**
     * Supprimer un extra
     */
    deleteOfferingExtra: builder.mutation<any, string>({
      query: (extraId) => ({
        url: `/offerings/extras/${extraId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Offering'],
    }),
  }),
});

export const {
  useGetCategoriesQuery,
  useGetCategoryBySlugQuery,
  useCreateCategoryMutation,
  useGetProOfferingsQuery,
  useCreateOfferingMutation,
  useUpdateOfferingMutation,
  useDeleteOfferingMutation,
  useEnsureOfferingMutation,
  useAddOfferingExtraMutation,
  useDeleteOfferingExtraMutation,
} = servicesApi;
