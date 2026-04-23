import { createApi } from '@reduxjs/toolkit/query/react';
import { API_CONFIG, createBaseQuery } from '../../config/api';

export const paymentsApi = createApi({
  reducerPath: 'paymentsApi',
  baseQuery: createBaseQuery(`${API_CONFIG.BASE_URL}/payments`),
  tagTypes: ['Payment'],
  endpoints: (builder) => ({
    /**
     * Créer un Payment Intent
     * Backend: POST /payments/create-intent
     */
    createPaymentIntent: builder.mutation({
      query: (body: {
        amount: number;
        currency: string;
        type?: 'transport' | 'booking' | 'marketplace';
        bookingId?: string;
        transportId?: string;
        orderId?: string;
        metadata?: any;
      }) => ({
        url: '/create-intent',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Payment'],
    }),

    /**
     * Récupérer un paiement par ID
     * Backend: GET /payments/:id
     */
    getPayment: builder.query({
      query: (id: string) => `/${id}`,
      providesTags: ['Payment'],
    }),

    /**
     * Capturer un paiement escrow (admin)
     * Backend: POST /payments/:id/capture
     */
    captureEscrow: builder.mutation({
      query: (id: string) => ({
        url: `/${id}/capture`,
        method: 'POST',
      }),
      invalidatesTags: ['Payment'],
    }),

    /**
     * Libérer les fonds escrow au pro (admin)
     * Backend: POST /payments/:id/release
     */
    releaseEscrow: builder.mutation({
      query: (id: string) => ({
        url: `/${id}/release`,
        method: 'POST',
      }),
      invalidatesTags: ['Payment'],
    }),

    /**
     * Rembourser un paiement (admin)
     * Backend: POST /payments/:id/refund
     */
    refundPayment: builder.mutation({
      query: ({ id, amount }: { id: string; amount?: number }) => ({
        url: `/${id}/refund`,
        method: 'POST',
        body: { amount },
      }),
      invalidatesTags: ['Payment'],
    }),

    /**
     * Calculer la commission pour une transaction
     * Backend: POST /payments/calculate-commission
     */
    calculateCommission: builder.mutation({
      query: (body: {
        amount: number;
        type: 'booking' | 'transport' | 'marketplace';
      }) => ({
        url: '/calculate-commission',
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const {
  useCreatePaymentIntentMutation,
  useGetPaymentQuery,
  useCaptureEscrowMutation,
  useReleaseEscrowMutation,
  useRefundPaymentMutation,
  useCalculateCommissionMutation,
} = paymentsApi;
