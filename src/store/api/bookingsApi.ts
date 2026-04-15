import { createApi } from '@reduxjs/toolkit/query/react';
import { API_CONFIG, createBaseQuery } from '../../config/api';

export const bookingsApi = createApi({
  reducerPath: 'bookingsApi',
  baseQuery: createBaseQuery(`${API_CONFIG.BASE_URL}/bookings`),
  tagTypes: ['Booking'],
  endpoints: (builder) => ({
    /**
     * Créer une nouvelle réservation
     */
    createBooking: builder.mutation({
      query: (body) => ({
        url: '/',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Booking'],
    }),

    /**
     * Récupérer mes réservations (client)
     */
    getMyBookings: builder.query({
      query: () => '/my-bookings',
      providesTags: ['Booking'],
    }),

    /**
     * Récupérer les réservations pour un pro
     */
    getProBookings: builder.query({
      query: (proId: string) => `/pro/${proId}`,
      providesTags: ['Booking'],
    }),

    /**
     * Récupérer une réservation par ID
     */
    getBookingById: builder.query({
      query: (id: string) => `/${id}`,
      providesTags: ['Booking'],
    }),

    /**
     * Mettre à jour le statut d'une réservation
     */
    updateBookingStatus: builder.mutation({
      query: ({ id, status }: { id: string; status: string }) => ({
        url: `/${id}/status`,
        method: 'PUT',
        body: { status },
      }),
      invalidatesTags: ['Booking'],
    }),

    /**
     * Confirmer la complétion d'une réservation
     */
    confirmBookingCompletion: builder.mutation({
      query: ({ id, role }: { id: string; role: 'client' | 'pro' }) => ({
        url: `/${id}/confirm-completion`,
        method: 'PUT',
        body: { role },
      }),
      invalidatesTags: ['Booking'],
    }),

    /**
     * Annuler une réservation
     */
    cancelBooking: builder.mutation({
      query: ({
        id,
        role,
        reason,
      }: {
        id: string;
        role: 'client' | 'pro';
        reason: string;
      }) => ({
        url: `/${id}/cancel`,
        method: 'PUT',
        body: { role, reason },
      }),
      invalidatesTags: ['Booking'],
    }),

    /**
     * Récupérer les statistiques de réservations
     */
    getBookingStats: builder.query({
      query: (role: 'client' | 'pro') => ({
        url: '/stats/me',
        params: { role },
      }),
    }),
  }),
});

export const {
  useCreateBookingMutation,
  useGetMyBookingsQuery,
  useGetProBookingsQuery,
  useGetBookingByIdQuery,
  useUpdateBookingStatusMutation,
  useConfirmBookingCompletionMutation,
  useCancelBookingMutation,
  useGetBookingStatsQuery,
} = bookingsApi;
