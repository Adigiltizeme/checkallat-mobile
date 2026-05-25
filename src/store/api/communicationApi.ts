import { createApi } from '@reduxjs/toolkit/query/react';
import { API_CONFIG, createBaseQuery } from '../../config/api';

export type EntityType = 'booking' | 'transport' | 'order';

export interface ConversationMessage {
  id: string;
  senderRole: string; // "client" | "pro" | "driver" | "seller" | "buyer"
  content: string;
  createdAt: string;
  readAt: string | null;
  sender: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface CallRelayInfo {
  relayNumber: string;
  note: string;
}

export interface ConversationSummary {
  entityType: EntityType;
  entityId: string;
  otherPartyName: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
}

export const communicationApi = createApi({
  reducerPath: 'communicationApi',
  baseQuery: createBaseQuery(`${API_CONFIG.BASE_URL}/conversations`),
  tagTypes: ['Messages'],
  endpoints: (builder) => ({

    /**
     * Récupère les messages d'une conversation (booking, transport, order).
     * Marque automatiquement les messages de l'autre partie comme lus.
     */
    getMessages: builder.query<
      ConversationMessage[],
      { entityType: EntityType; entityId: string }
    >({
      query: ({ entityType, entityId }) =>
        `/messages?entityType=${entityType}&entityId=${entityId}`,
      providesTags: (_result, _error, { entityType, entityId }) => [
        { type: 'Messages', id: `${entityType}-${entityId}` },
      ],
    }),

    /**
     * Envoie un message dans une conversation.
     */
    sendMessage: builder.mutation<
      ConversationMessage,
      { entityType: EntityType; entityId: string; content: string }
    >({
      query: ({ entityType, entityId, content }) => ({
        url: '/messages',
        method: 'POST',
        body: { entityType, entityId, content },
      }),
      invalidatesTags: (_result, _error, { entityType, entityId }) => [
        { type: 'Messages', id: `${entityType}-${entityId}` },
      ],
    }),

    /**
     * Nombre de messages non lus pour une entité.
     */
    getUnreadCount: builder.query<
      { count: number },
      { entityType: EntityType; entityId: string }
    >({
      query: ({ entityType, entityId }) =>
        `/unread-count?entityType=${entityType}&entityId=${entityId}`,
    }),

    /**
     * Liste toutes les conversations actives de l'utilisateur courant.
     */
    getMyConversationsList: builder.query<ConversationSummary[], void>({
      query: () => '/my-list',
    }),

    /**
     * Obtient le numéro de relai Twilio pour un appel masqué.
     * Valable pour booking, transport ET order.
     */
    getCallRelayNumber: builder.query<
      CallRelayInfo,
      { entityType: EntityType; entityId: string }
    >({
      query: ({ entityType, entityId }) =>
        `/call-relay?entityType=${entityType}&entityId=${entityId}`,
    }),
  }),
});

export const {
  useGetMessagesQuery,
  useSendMessageMutation,
  useGetUnreadCountQuery,
  useGetCallRelayNumberQuery,
  useGetMyConversationsListQuery,
} = communicationApi;
