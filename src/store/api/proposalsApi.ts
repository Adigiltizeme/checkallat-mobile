import { createApi } from '@reduxjs/toolkit/query/react';
import { API_CONFIG, createBaseQuery } from '../../config/api';

export const proposalsApi = createApi({
  reducerPath: 'proposalsApi',
  baseQuery: createBaseQuery(`${API_CONFIG.BASE_URL}/service-proposals`),
  tagTypes: ['Proposal'],
  endpoints: (builder) => ({
    submitProposal: builder.mutation<any, {
      serviceNameFr: string;
      serviceNameEn: string;
      serviceNameAr?: string;
      description: string;
      targetAudience?: string;
      pricingHint?: string;
      credentials?: string;
    }>({
      query: (body) => ({ url: '/', method: 'POST', body }),
      invalidatesTags: ['Proposal'],
    }),

    getMyProposals: builder.query<any[], void>({
      query: () => ({ url: '/' }),
      providesTags: ['Proposal'],
    }),

    getProposalById: builder.query<any, string>({
      query: (id) => ({ url: `/${id}` }),
      providesTags: (_r, _e, id) => [{ type: 'Proposal', id }],
    }),

    replyToProposal: builder.mutation<any, { id: string; message: string }>({
      query: ({ id, message }) => ({ url: `/${id}/reply`, method: 'POST', body: { message } }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Proposal', id }, 'Proposal'],
    }),

    markProposalRead: builder.mutation<any, string>({
      query: (id) => ({ url: `/${id}/mark-read`, method: 'PATCH' }),
      invalidatesTags: (_r, _e, id) => [{ type: 'Proposal', id }, 'Proposal'],
    }),
  }),
});

export const {
  useSubmitProposalMutation,
  useGetMyProposalsQuery,
  useGetProposalByIdQuery,
  useReplyToProposalMutation,
  useMarkProposalReadMutation,
} = proposalsApi;
