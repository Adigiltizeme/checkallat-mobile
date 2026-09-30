import { createApi } from '@reduxjs/toolkit/query/react';
import { API_CONFIG, createBaseQuery } from '../../config/api';

export type EarningStatus = 'on_hold' | 'blocked' | 'pending' | 'processing' | 'paid' | 'failed' | 'cancelled';

export interface EarningLine {
  id: string;
  netAmount: number;
  grossAmount: number;
  commissionAmount: number;
  commissionRate: number;
  currency: string | null;
  status: EarningStatus;
  availableAt: string | null;
  processedAt: string | null;
  createdAt: string;
}

/** Solde du chauffeur / prestataire : gains gardés de côté par la plateforme jusqu'au versement */
export interface MyEarnings {
  pendingPayoutAmount: number;
  totalPayoutReceived: number;
  pendingCashCommission: number;
  onHold: number;
  blocked: number;
  available: number;
  processing: number;
  nextReleaseAt: string | null;
  payoutMode: 'manual' | 'automatic';
  payoutFrequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  holdDays: number;
  netCashCommissions: boolean;
  nextPayoutAt: string | null;
  payouts: EarningLine[];
}

export const payoutsApi = createApi({
  reducerPath: 'payoutsApi',
  baseQuery: createBaseQuery(`${API_CONFIG.BASE_URL}/payouts`),
  tagTypes: ['Earnings'],
  endpoints: (builder) => ({
    getMyEarnings: builder.query<MyEarnings, 'driver' | 'pro'>({
      query: (role) => `/${role}/my-earnings`,
      providesTags: ['Earnings'],
    }),
  }),
});

export const { useGetMyEarningsQuery } = payoutsApi;
