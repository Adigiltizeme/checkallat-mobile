import { createApi } from '@reduxjs/toolkit/query/react';
import { API_CONFIG, createBaseQuery } from '../../config/api';

export const marketplaceApi = createApi({
  reducerPath: 'marketplaceApi',
  baseQuery: createBaseQuery(`${API_CONFIG.BASE_URL}/marketplace`),
  tagTypes: ['Product', 'Order', 'Seller'],
  endpoints: (builder) => ({
    // ==================== SELLERS ====================

    /**
     * Créer un profil vendeur
     */
    createSeller: builder.mutation({
      query: (body: {
        businessName: string;
        description?: string;
        address: string;
        phone: string;
      }) => ({
        url: '/sellers',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Seller'],
    }),

    /**
     * Récupérer un vendeur par ID
     */
    getSeller: builder.query({
      query: (id: string) => `/sellers/${id}`,
      providesTags: ['Seller'],
    }),

    /**
     * Valider un vendeur (admin seulement)
     */
    validateSeller: builder.mutation({
      query: ({ id, validated }: { id: string; validated: boolean }) => ({
        url: `/sellers/${id}/validate`,
        method: 'PUT',
        body: { validated },
      }),
      invalidatesTags: ['Seller'],
    }),

    // ==================== PRODUCTS ====================

    /**
     * Rechercher des produits avec filtres
     */
    getProducts: builder.query({
      query: (params?: {
        search?: string;
        category?: string;
        minPrice?: number;
        maxPrice?: number;
        sellerId?: string;
      }) => ({
        url: '/products',
        params,
      }),
      providesTags: ['Product'],
    }),

    /**
     * Récupérer un produit par ID
     */
    getProductById: builder.query({
      query: (id: string) => `/products/${id}`,
      providesTags: ['Product'],
    }),

    /**
     * Créer un produit (vendeurs seulement)
     */
    createProduct: builder.mutation({
      query: (body: {
        name: string;
        description: string;
        price: number;
        category: string;
        stock: number;
        images?: string[];
      }) => ({
        url: '/products',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Product'],
    }),

    /**
     * Mettre à jour le stock d'un produit
     */
    updateProductStock: builder.mutation({
      query: ({ id, quantity }: { id: string; quantity: number }) => ({
        url: `/products/${id}/stock`,
        method: 'PUT',
        body: { quantity },
      }),
      invalidatesTags: ['Product'],
    }),

    // ==================== ORDERS ====================

    /**
     * Créer une commande
     */
    createOrder: builder.mutation({
      query: (body: {
        items: Array<{ productId: string; quantity: number }>;
        shippingAddress: string;
        paymentMethod: string;
      }) => ({
        url: '/orders',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Order', 'Product'],
    }),

    /**
     * Récupérer une commande par ID
     */
    getOrder: builder.query({
      query: (id: string) => `/orders/${id}`,
      providesTags: ['Order'],
    }),

    /**
     * Récupérer mes commandes (client)
     */
    getMyOrders: builder.query({
      query: () => '/orders/my-orders/client',
      providesTags: ['Order'],
    }),

    /**
     * Récupérer les commandes de mon shop (vendeur)
     */
    getMySellerOrders: builder.query({
      query: () => '/orders/my-orders/seller',
      providesTags: ['Order'],
    }),

    /**
     * Mettre à jour le statut d'une commande (vendeur seulement)
     */
    updateOrderStatus: builder.mutation({
      query: ({ id, status }: { id: string; status: string }) => ({
        url: `/orders/${id}/status`,
        method: 'PUT',
        body: { status },
      }),
      invalidatesTags: ['Order'],
    }),
  }),
});

export const {
  // Sellers
  useCreateSellerMutation,
  useGetSellerQuery,
  useValidateSellerMutation,
  // Products
  useGetProductsQuery,
  useGetProductByIdQuery,
  useCreateProductMutation,
  useUpdateProductStockMutation,
  // Orders
  useCreateOrderMutation,
  useGetOrderQuery,
  useGetMyOrdersQuery,
  useGetMySellerOrdersQuery,
  useUpdateOrderStatusMutation,
} = marketplaceApi;
