import { createApi } from '@reduxjs/toolkit/query/react';
import { API_CONFIG, createBaseQuery } from '../../config/api';

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, any> | null;
  isRead: boolean;
  createdAt: string;
}

/** Notifications de l'application (cloche de l'accueil) */
export const notificationsApi = createApi({
  reducerPath: 'notificationsApi',
  baseQuery: createBaseQuery(`${API_CONFIG.BASE_URL}/notifications`),
  tagTypes: ['Notifications'],
  endpoints: (builder) => ({
    getNotifications: builder.query<{ items: AppNotification[]; total: number; page: number; pages: number }, number | void>({
      query: (page) => ({ url: '', params: { page: page ?? 1 } }),
      providesTags: ['Notifications'],
    }),
    getUnreadNotificationsCount: builder.query<{ count: number }, void>({
      query: () => '/unread-count',
      providesTags: ['Notifications'],
    }),
    markNotificationRead: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({ url: `/${id}/read`, method: 'PATCH' }),
      invalidatesTags: ['Notifications'],
    }),
    markAllNotificationsRead: builder.mutation<{ updated: number }, void>({
      query: () => ({ url: '/read-all', method: 'POST' }),
      invalidatesTags: ['Notifications'],
    }),
  }),
});

export const {
  useGetNotificationsQuery,
  useGetUnreadNotificationsCountQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} = notificationsApi;
