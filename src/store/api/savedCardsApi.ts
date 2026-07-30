import { createApi } from '@reduxjs/toolkit/query/react';
import { API_CONFIG, createBaseQuery } from '../../config/api';

export interface SavedCard {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

export interface ListCardsResponse {
  cards: SavedCard[];
  defaultPaymentMethodId: string | null;
}

export const savedCardsApi = createApi({
  reducerPath: 'savedCardsApi',
  baseQuery: createBaseQuery(`${API_CONFIG.BASE_URL}/saved-cards`),
  tagTypes: ['SavedCard'],
  endpoints: (builder) => ({
    createSetupIntent: builder.mutation<{ clientSecret: string }, void>({
      query: () => ({ url: '/setup-intent', method: 'POST' }),
    }),
    getSavedCards: builder.query<ListCardsResponse, void>({
      query: () => '/',
      providesTags: ['SavedCard'],
    }),
    setDefaultCard: builder.mutation<{ success: boolean }, string>({
      query: (pmId) => ({ url: `/${pmId}/set-default`, method: 'POST' }),
      invalidatesTags: ['SavedCard'],
    }),
    deleteCard: builder.mutation<{ success: boolean }, string>({
      query: (pmId) => ({ url: `/${pmId}`, method: 'DELETE' }),
      invalidatesTags: ['SavedCard'],
    }),
  }),
});

export const {
  useCreateSetupIntentMutation,
  useGetSavedCardsQuery,
  useSetDefaultCardMutation,
  useDeleteCardMutation,
} = savedCardsApi;
