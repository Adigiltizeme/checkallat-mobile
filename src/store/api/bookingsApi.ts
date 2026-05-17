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
      query: ({ id, status, role }: { id: string; status: string; role: 'client' | 'pro' }) => ({
        url: `/${id}/status`,
        method: 'PUT',
        body: { status, role },
      }),
      invalidatesTags: ['Booking'],
    }),

    /**
     * Confirmer la complétion d'une réservation
     */
    confirmBookingCompletion: builder.mutation({
      query: ({ id, role, cashAmount }: { id: string; role: 'client' | 'pro'; cashAmount?: number }) => ({
        url: `/${id}/confirm-completion`,
        method: 'PUT',
        body: { role, ...(cashAmount !== undefined ? { cashAmount } : {}) },
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

    /**
     * Pro marque son arrivée chez le client
     */
    markArrived: builder.mutation({
      query: (id: string) => ({
        url: `/${id}/arrived`,
        method: 'PUT',
      }),
      invalidatesTags: ['Booking'],
    }),

    /**
     * Pro démarre le travail (pending → in_progress)
     */
    markStarted: builder.mutation({
      query: (id: string) => ({
        url: `/${id}/start-work`,
        method: 'PUT',
      }),
      invalidatesTags: ['Booking'],
    }),

    /**
     * Pro se met en route vers le client
     */
    markEnRoute: builder.mutation({
      query: (id: string) => ({
        url: `/${id}/en-route`,
        method: 'PUT',
      }),
      invalidatesTags: ['Booking'],
    }),

    /**
     * Pro met à jour sa position GPS pendant la prestation
     */
    updateProLocation: builder.mutation({
      query: ({ id, lat, lng }: { id: string; lat: number; lng: number }) => ({
        url: `/${id}/location`,
        method: 'PUT',
        body: { lat, lng },
      }),
    }),

    /**
     * Suivi en temps réel d'une réservation (position du pro + jalons)
     */
    getBookingTracking: builder.query({
      query: (id: string) => `/${id}/tracking`,
      providesTags: (_result, _error, id) => [{ type: 'Booking', id: `tracking-${id}` }],
    }),

    /**
     * Upload photos avant le travail (type='before') ou après (type='after')
     */
    uploadBookingPhotos: builder.mutation({
      query: ({ id, type, photos }: { id: string; type: 'before' | 'after'; photos: string[] }) => ({
        url: `/${id}/photos/${type}`,
        method: 'POST',
        body: { photos },
      }),
      invalidatesTags: ['Booking'],
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
  useMarkArrivedMutation,
  useMarkStartedMutation,
  useMarkEnRouteMutation,
  useUpdateProLocationMutation,
  useGetBookingTrackingQuery,
  useUploadBookingPhotosMutation,
} = bookingsApi;
