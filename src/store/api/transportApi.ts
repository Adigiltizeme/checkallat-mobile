import { createApi } from '@reduxjs/toolkit/query/react';
import { API_CONFIG, createBaseQuery } from '../../config/api';

/**
 * Détermine le type de véhicule selon le volume (même logique que le backend)
 */
const determineVehicleType = (volume: number): 'van' | 'small_truck' | 'large_truck' => {
  if (volume <= 15) return 'van';
  if (volume <= 30) return 'small_truck';
  return 'large_truck';
};

/**
 * Transformer les données backend (format plat) vers format frontend (imbriqué)
 */
const transformTransportRequest = (item: any) => {
  const vehicleType = determineVehicleType(item.estimatedVolume || 0);

  return {
    ...item,
    objectType: item.transportType || item.objectType,
    objectTypes: item.transportTypes || (item.transportType ? [item.transportType] : [item.objectType]), // Mapper le tableau depuis le backend
    description: item.itemDescription || item.description,
    photos: item.itemPhotos || item.photos || [],
    pickup: {
      address: item.pickupAddress,
      lat: item.pickupLat,
      lng: item.pickupLng,
      floor: item.pickupFloor,
      hasElevator: item.hasElevator,
      instructions: item.pickupInstructions || '',
    },
    delivery: {
      address: item.deliveryAddress,
      lat: item.deliveryLat,
      lng: item.deliveryLng,
      floor: item.deliveryFloor,
      hasElevator: item.hasElevatorDelivery,
      instructions: item.deliveryInstructions || '',
    },
    timeSlot: item.timeWindow || item.timeSlot,
    price: item.totalPrice || item.price || 0,
    priceBreakdown: {
      baseFare: item.baseFare || 0,
      vehicleType: vehicleType,
      distanceFare: item.distanceFare || 0,
      floorFare: item.floorFare || 0,
      helpersFare: item.helpersFare || 0,
      servicesFare: item.servicesFare || 0,
      total: item.totalPrice || 0,
    },
  };
};

export const transportApi = createApi({
  reducerPath: 'transportApi',
  baseQuery: createBaseQuery(`${API_CONFIG.BASE_URL}/transport`),
  tagTypes: ['TransportRequest', 'DriverStats'],
  endpoints: (builder) => ({
    /**
     * Créer une demande de transport
     */
    createTransportRequest: builder.mutation({
      query: (body) => ({
        url: '/request',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['TransportRequest'],
    }),

    /**
     * Calculer le prix estimé d'un transport
     */
    calculatePrice: builder.mutation({
      query: (body) => ({
        url: '/calculate-price',
        method: 'POST',
        body,
      }),
    }),

    /**
     * Récupérer une demande par ID
     */
    getTransportRequest: builder.query({
      query: (id: string) => `/${id}`,
      providesTags: ['TransportRequest'],
      transformResponse: transformTransportRequest,
    }),

    /**
     * Récupérer mes demandes de transport (client)
     */
    getMyTransportRequests: builder.query({
      query: () => '/my-requests/client',
      providesTags: ['TransportRequest'],
      transformResponse: (response: any[]) => response.map(transformTransportRequest),
    }),

    /**
     * Récupérer mes livraisons (driver)
     */
    getMyDeliveries: builder.query({
      query: () => '/my-deliveries/driver',
      providesTags: ['TransportRequest'],
      transformResponse: (response: any[]) => response.map(transformTransportRequest),
    }),

    /**
     * Récupérer les informations de tracking en temps réel
     */
    getTrackingInfo: builder.query({
      query: (id: string) => `/${id}/tracking`,
    }),

    /**
     * Mettre à jour le statut d'un transport
     */
    updateTransportStatus: builder.mutation({
      query: ({
        requestId,
        status,
        metadata,
      }: {
        requestId: string;
        status: string;
        metadata?: any;
      }) => ({
        url: `/${requestId}/status`,
        method: 'PUT',
        body: { status, metadata },
      }),
      invalidatesTags: ['TransportRequest'],
    }),

    /**
     * Mettre à jour la position du driver
     */
    updateDriverLocation: builder.mutation({
      query: ({ id, lat, lng }: { id: string; lat: number; lng: number }) => ({
        url: `/${id}/driver-location`,
        method: 'PUT',
        body: { lat, lng },
      }),
    }),

    /**
     * Assigner un driver automatiquement
     */
    assignDriver: builder.mutation({
      query: (id: string) => ({
        url: `/${id}/assign-driver`,
        method: 'POST',
        body: {},
      }),
      invalidatesTags: ['TransportRequest'],
    }),

    /**
     * Uploader photos de preuve (avant/après)
     */
    uploadProofPhotos: builder.mutation({
      query: ({ requestId, type, photos }: { requestId: string; type: 'before' | 'after'; photos: string[] }) => ({
        url: `/${requestId}/photos/${type}`,
        method: 'POST',
        body: { photos },
      }),
      invalidatesTags: ['TransportRequest'],
    }),

    /**
     * Uploader photos de preuve (avant chargement)
     */
    uploadPhotosBefore: builder.mutation({
      query: ({ id, photos }: { id: string; photos: string[] }) => ({
        url: `/${id}/photos/before`,
        method: 'POST',
        body: { photos },
      }),
      invalidatesTags: ['TransportRequest'],
    }),

    /**
     * Uploader photos de preuve (après livraison)
     */
    uploadPhotosAfter: builder.mutation({
      query: ({ id, photos }: { id: string; photos: string[] }) => ({
        url: `/${id}/photos/after`,
        method: 'POST',
        body: { photos },
      }),
      invalidatesTags: ['TransportRequest'],
    }),

    /**
     * Sauvegarder la signature du client
     */
    saveSignature: builder.mutation({
      query: ({ requestId, signature }: { requestId: string; signature: string }) => ({
        url: `/${requestId}/signature`,
        method: 'POST',
        body: { signature },
      }),
      invalidatesTags: ['TransportRequest'],
    }),

    /**
     * Sauvegarder la signature du client (alias)
     */
    saveClientSignature: builder.mutation({
      query: ({ id, signature }: { id: string; signature: string }) => ({
        url: `/${id}/signature`,
        method: 'POST',
        body: { signature },
      }),
      invalidatesTags: ['TransportRequest'],
    }),

    /**
     * Annuler un transport
     */
    cancelTransport: builder.mutation({
      query: ({ id, reason }: { id: string; reason: string }) => ({
        url: `/${id}`,
        method: 'DELETE',
        body: { reason },
      }),
      invalidatesTags: ['TransportRequest'],
    }),

    /**
     * Récupérer les statistiques d'un driver (me)
     */
    getDriverStats: builder.query({
      query: () => '/driver/me/stats',
      providesTags: ['DriverStats'],
    }),

    /**
     * Mettre à jour la disponibilité du driver
     */
    updateDriverAvailability: builder.mutation({
      query: (body: { isAvailable: boolean }) => ({
        url: '/driver/availability',
        method: 'PUT',
        body,
      }),
    }),

    /**
     * Confirmation de fin de service par le client
     */
    clientConfirmCompletion: builder.mutation({
      query: ({ requestId, completed, notes }: { requestId: string; completed: boolean; notes?: string }) => ({
        url: `/${requestId}/confirm-completion/client`,
        method: 'PUT',
        body: { completed, notes },
      }),
      invalidatesTags: ['TransportRequest'],
    }),

    /**
     * Confirmation de fin de service par le chauffeur
     */
    driverConfirmCompletion: builder.mutation({
      query: ({ requestId, completed, notes }: { requestId: string; completed: boolean; notes?: string }) => ({
        url: `/${requestId}/confirm-completion/driver`,
        method: 'PUT',
        body: { completed, notes },
      }),
      invalidatesTags: ['TransportRequest'],
    }),

    /**
     * Validation du paiement cash (client ou driver)
     */
    validateCashPayment: builder.mutation({
      query: ({ requestId, role, data }: { requestId: string; role: 'client' | 'driver'; data: { amount: number; notes?: string } }) => ({
        url: `/${requestId}/validate-cash/${role}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['TransportRequest'],
    }),
    updateDriverProfile: builder.mutation({
      query: (data: { vehicleType?: string; vehiclePlate?: string; vehicleCapacity?: number }) => ({
        url: '/driver/profile',
        method: 'PATCH',
        body: data,
      }),
    }),

    /**
     * Créer un PaymentIntent pour payer la commission cash en attente
     */
    payCommission: builder.mutation<
      { clientSecret: string; paymentIntentId: string; amount: number },
      void
    >({
      query: () => ({
        url: '/driver/pay-commission',
        method: 'POST',
      }),
      invalidatesTags: ['DriverStats'],
    }),

    /**
     * Récupérer les demandes de transport disponibles pour le chauffeur
     */
    getAvailableRequests: builder.query({
      query: () => '/driver/available-requests',
      providesTags: ['TransportRequest'],
      transformResponse: (response: any[]) => response.map(transformTransportRequest),
    }),

    /**
     * Chauffeur accepte une demande de transport
     */
    acceptRequest: builder.mutation({
      query: (requestId: string) => ({
        url: `/${requestId}/driver/accept`,
        method: 'POST',
      }),
      invalidatesTags: ['TransportRequest'],
    }),

    /**
     * Chauffeur refuse une demande de transport
     */
    rejectRequest: builder.mutation({
      query: (requestId: string) => ({
        url: `/${requestId}/driver/reject`,
        method: 'POST',
      }),
      invalidatesTags: ['TransportRequest'],
    }),

    /**
     * Enregistrer le push token Expo du chauffeur
     */
    registerPushToken: builder.mutation({
      query: (pushToken: string) => ({
        url: '/driver/push-token',
        method: 'PUT',
        body: { pushToken },
      }),
    }),

    /**
     * Tarifs de la zone active (affichage des prix indicatifs dans Step 3)
     */
    getActivePricing: builder.query<{
      currency: string;
      helperRatePerPerson: number;
      floorRatePerLevel: number;
      disassemblyRate: number;
      reassemblyRate: number;
      packingRate: number;
    }, void>({
      query: () => '/pricing/active',
    }),
  }),
});

export const {
  useCreateTransportRequestMutation,
  useCalculatePriceMutation,
  useGetTransportRequestQuery,
  useGetMyTransportRequestsQuery,
  useGetMyDeliveriesQuery,
  useGetTrackingInfoQuery,
  useUpdateTransportStatusMutation,
  useUpdateDriverLocationMutation,
  useAssignDriverMutation,
  useUploadProofPhotosMutation,
  useUploadPhotosBeforeMutation,
  useUploadPhotosAfterMutation,
  useSaveSignatureMutation,
  useSaveClientSignatureMutation,
  useCancelTransportMutation,
  useGetDriverStatsQuery,
  useUpdateDriverAvailabilityMutation,
  useClientConfirmCompletionMutation,
  useDriverConfirmCompletionMutation,
  useValidateCashPaymentMutation,
  useUpdateDriverProfileMutation,
  usePayCommissionMutation,
  useGetAvailableRequestsQuery,
  useAcceptRequestMutation,
  useRejectRequestMutation,
  useRegisterPushTokenMutation,
  useGetActivePricingQuery,
} = transportApi;
