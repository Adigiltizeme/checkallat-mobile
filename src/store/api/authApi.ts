import { createApi } from '@reduxjs/toolkit/query/react';
import { createBaseQuery } from '../../config/api';

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: createBaseQuery(),
  tagTypes: ['Profile', 'Addresses'],
  endpoints: (builder) => ({
    register: builder.mutation({
      query: (credentials) => ({
        url: '/auth/register',
        method: 'POST',
        body: credentials,
      }),
    }),
    login: builder.mutation({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
    }),
    sendOTP: builder.mutation({
      query: ({ phone }: { phone: string }) => ({
        url: '/auth/send-otp',
        method: 'POST',
        body: { phone },
      }),
    }),
    /** Mot de passe oublié : envoie un code par SMS (réponse identique que le compte existe ou non) */
    forgotPassword: builder.mutation<{ message: string; expiresIn: number }, { phone: string }>({
      query: (body) => ({
        url: '/auth/forgot-password',
        method: 'POST',
        body,
      }),
    }),
    /** Nouveau mot de passe avec le code SMS — toutes les sessions ouvertes sont déconnectées */
    resetPassword: builder.mutation<{ message: string }, { phone: string; code: string; newPassword: string }>({
      query: (body) => ({
        url: '/auth/reset-password',
        method: 'POST',
        body,
      }),
    }),
    refreshToken: builder.mutation({
      query: ({ refreshToken }: { refreshToken: string }) => ({
        url: '/auth/refresh-token',
        method: 'POST',
        body: { refreshToken },
      }),
    }),
    verifyOTP: builder.mutation({
      query: (body) => ({
        url: '/auth/verify-otp',
        method: 'POST',
        body,
      }),
    }),
    getProfile: builder.query({
      query: () => '/auth/me',
      providesTags: ['Profile'],
    }),
    updateProfile: builder.mutation({
      query: (data: {
        firstName?: string;
        lastName?: string;
        email?: string;
        profilePicture?: string;
        preferredLanguage?: string;
        activeCountryId?: string | null;
      }) => ({
        url: '/auth/me',
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Profile'],
    }),
    getAddresses: builder.query({
      query: () => '/auth/addresses',
      providesTags: ['Addresses'],
    }),
    createAddress: builder.mutation({
      query: (data: {
        label: string;
        address: string;
        lat: number;
        lng: number;
        floor?: number;
        hasElevator?: boolean;
        instructions?: string;
        isDefault?: boolean;
      }) => ({
        url: '/auth/addresses',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Addresses'],
    }),
    updateAddress: builder.mutation({
      query: ({ id, ...data }: { id: string; [key: string]: any }) => ({
        url: `/auth/addresses/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Addresses'],
    }),
    deleteAddress: builder.mutation({
      query: (id: string) => ({
        url: `/auth/addresses/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Addresses'],
    }),
    sendSupportContact: builder.mutation<void, { category: string; message: string }>({
      query: (body) => ({
        url: '/admin/settings/support/contact',
        method: 'POST',
        body,
      }),
    }),
    sendOtpMe: builder.mutation<{ message: string; expiresIn: number }, { phone: string }>({
      query: (body) => ({
        url: '/auth/send-otp-me',
        method: 'POST',
        body,
      }),
    }),
    changePassword: builder.mutation<{ message: string }, { otpCode: string; newPassword: string }>({
      query: (body) => ({
        url: '/auth/change-password',
        method: 'PATCH',
        body,
      }),
    }),
    changePhone: builder.mutation<{ message: string }, { newPhone: string; otpCode: string }>({
      query: (body) => ({
        url: '/auth/change-phone',
        method: 'PATCH',
        body,
      }),
    }),
    /** Code de vérification envoyé à l'adresse e-mail du compte */
    sendEmailCode: builder.mutation<{ alreadyVerified: boolean; expiresIn: number }, void>({
      query: () => ({
        url: '/auth/email/send-code',
        method: 'POST',
      }),
    }),
    /** Confirmation de l'adresse e-mail avec le code reçu */
    verifyEmail: builder.mutation<{ emailVerified: boolean }, { code: string }>({
      query: (body) => ({
        url: '/auth/email/verify',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Profile'],
    }),
    logoutApi: builder.mutation<{ success: boolean }, void>({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
    }),
    /** Acceptation de la version en vigueur des CGU (après une mise à jour des conditions) */
    acceptTerms: builder.mutation<{ termsAcceptedAt: string; termsVersion: string }, void>({
      query: () => ({
        url: '/auth/accept-terms',
        method: 'POST',
      }),
    }),
    deleteAccount: builder.mutation<{ success: boolean }, void>({
      query: () => ({
        url: '/auth/me',
        method: 'DELETE',
      }),
    }),
  }),
});

export const {
  useRegisterMutation,
  useLoginMutation,
  useSendOTPMutation,
  useVerifyOTPMutation,
  useRefreshTokenMutation,
  useGetProfileQuery,
  useUpdateProfileMutation,
  useGetAddressesQuery,
  useCreateAddressMutation,
  useUpdateAddressMutation,
  useDeleteAddressMutation,
  useSendSupportContactMutation,
  useSendOtpMeMutation,
  useChangePasswordMutation,
  useChangePhoneMutation,
  useLogoutApiMutation,
  useSendEmailCodeMutation,
  useVerifyEmailMutation,
  useDeleteAccountMutation,
  useAcceptTermsMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
} = authApi;
