import { createApi } from '@reduxjs/toolkit/query/react';
import { API_CONFIG, createBaseQuery } from '../../config/api';

export interface CreateReviewDto {
  transportRequestId?: string;
  bookingId?: string;
  rating: number;
  punctualityRating?: number;
  qualityRating?: number;
  cleanlinessRating?: number;
  courtesyRating?: number;
  comment?: string;
  photos?: string[];
}

export interface Review {
  id: string;
  transportRequestId?: string;
  bookingId?: string;
  clientId: string;
  driverId?: string;
  proId?: string;
  rating: number;
  punctualityRating?: number;
  qualityRating?: number;
  cleanlinessRating?: number;
  courtesyRating?: number;
  comment?: string;
  photos: string[];
  proResponse?: string;
  proRespondedAt?: string;
  isVisible: boolean;
  createdAt: string;
  client?: {
    id: string;
    firstName: string;
    lastName: string;
    profilePicture?: string;
  };
}

export const reviewsApi = createApi({
  reducerPath: 'reviewsApi',
  baseQuery: createBaseQuery(`${API_CONFIG.BASE_URL}/reviews`),
  tagTypes: ['Review'],
  endpoints: (builder) => ({
    /**
     * Créer un avis pour un transport
     */
    createTransportReview: builder.mutation<Review, { transportRequestId: string; data: CreateReviewDto }>({
      query: ({ transportRequestId, data }) => ({
        url: `/transport/${transportRequestId}`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Review'],
    }),

    /**
     * Créer un avis pour une réservation de service
     */
    createBookingReview: builder.mutation<Review, { bookingId: string; data: CreateReviewDto }>({
      query: ({ bookingId, data }) => ({
        url: `/booking/${bookingId}`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Review'],
    }),

    /**
     * Récupérer les avis d'un chauffeur
     */
    getDriverReviews: builder.query<{ reviews: Review[]; pagination: any }, { driverId: string; page?: number; limit?: number }>({
      query: ({ driverId, page = 1, limit = 10 }) => `/driver/${driverId}?page=${page}&limit=${limit}`,
      providesTags: ['Review'],
    }),

    /**
     * Récupérer les avis d'un pro
     */
    getProReviews: builder.query<{ reviews: Review[]; pagination: any }, { proId: string; page?: number; limit?: number }>({
      query: ({ proId, page = 1, limit = 10 }) => `/pro/${proId}?page=${page}&limit=${limit}`,
      providesTags: ['Review'],
    }),

    /**
     * Répondre à un avis (driver)
     */
    respondToReview: builder.mutation<Review, { reviewId: string; response: string }>({
      query: ({ reviewId, response }) => ({
        url: `/${reviewId}/respond`,
        method: 'POST',
        body: { response },
      }),
      invalidatesTags: ['Review'],
    }),
  }),
});

export const {
  useCreateTransportReviewMutation,
  useCreateBookingReviewMutation,
  useGetDriverReviewsQuery,
  useGetProReviewsQuery,
  useRespondToReviewMutation,
} = reviewsApi;
