import { createApi } from '@reduxjs/toolkit/query/react';
import { API_CONFIG, createBaseQuery } from '../../config/api';

export const paymentApi = createApi({
  reducerPath: 'paymentApi',
  baseQuery: createBaseQuery(`${API_CONFIG.BASE_URL}/payments`),
  tagTypes: ['Payment'],
  endpoints: (builder) => ({
    getMyPaymentsAsClient: builder.query({
      query: () => '/my/client',
      providesTags: ['Payment'],
    }),
    getMyPaymentsAsDriver: builder.query({
      query: () => '/my/driver',
      providesTags: ['Payment'],
    }),
    getPaymentById: builder.query({
      query: (id: string) => `/${id}`,
      providesTags: ['Payment'],
    }),
  }),
});

export const {
  useGetMyPaymentsAsClientQuery,
  useGetMyPaymentsAsDriverQuery,
  useGetPaymentByIdQuery,
} = paymentApi;
