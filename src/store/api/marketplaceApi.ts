import { createApi } from '@reduxjs/toolkit/query/react';
import { API_CONFIG, createBaseQuery } from '../../config/api';
import type {
  CheckoutPayload,
  MarketplaceDomain,
  MarketplaceOrder,
  MarketplaceProduct,
  MarketplaceQuote,
  MarketplaceSection,
  MarketplaceShop,
  ProductPayload,
  SellerApplicationPayload,
  SellerShop,
  SellerStats,
  ShopSettingsPayload,
} from '../../types/marketplace';

export const marketplaceApi = createApi({
  reducerPath: 'marketplaceApi',
  baseQuery: createBaseQuery(`${API_CONFIG.BASE_URL}/marketplace`),
  tagTypes: ['Domain', 'Shop', 'Product', 'Order', 'SellerShop', 'SellerSection', 'SellerProduct', 'SellerOrder', 'SellerStats'],
  endpoints: (builder) => ({
    // ─── Catalogue ──────────────────────────────────────────────────────
    getDomains: builder.query<MarketplaceDomain[], void>({
      query: () => '/domains',
      providesTags: ['Domain'],
    }),
    getShops: builder.query<MarketplaceShop[], { domainId?: string; search?: string; countryCode?: string }>({
      query: (params) => ({ url: '/shops', params }),
      providesTags: ['Shop'],
    }),
    getShop: builder.query<MarketplaceShop, string>({
      query: (id) => `/shops/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Shop', id }],
    }),
    getProducts: builder.query<
      { products: MarketplaceProduct[]; total: number; page: number; totalPages: number },
      { search?: string; domainId?: string; sellerId?: string; sectionId?: string; countryCode?: string; page?: number }
    >({
      query: (params) => ({ url: '/products', params }),
      providesTags: ['Product'],
    }),
    getProductById: builder.query<MarketplaceProduct, string>({
      query: (id) => `/products/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Product', id }],
    }),

    // ─── Commande client ────────────────────────────────────────────────
    quoteOrder: builder.mutation<MarketplaceQuote, CheckoutPayload>({
      query: (body) => ({ url: '/orders/quote', method: 'POST', body }),
    }),
    checkoutOrder: builder.mutation<{ clientSecret: string; totalAmount: number; currency: string }, CheckoutPayload>({
      query: (body) => ({ url: '/orders/checkout', method: 'POST', body }),
    }),
    getMyOrders: builder.query<MarketplaceOrder[], void>({
      query: () => '/orders/mine',
      providesTags: ['Order'],
    }),
    getOrder: builder.query<MarketplaceOrder, string>({
      query: (id) => `/orders/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Order', id }],
    }),
    cancelOrder: builder.mutation<MarketplaceOrder, string>({
      query: (id) => ({ url: `/orders/${id}/cancel`, method: 'POST' }),
      invalidatesTags: ['Order', 'Product', 'Shop'],
    }),
    confirmOrderReceived: builder.mutation<MarketplaceOrder, string>({
      query: (id) => ({ url: `/orders/${id}/confirm-received`, method: 'POST' }),
      invalidatesTags: ['Order'],
    }),
    openOrderClaim: builder.mutation<void, { id: string; category: string; description: string }>({
      query: ({ id, ...body }) => ({ url: `/orders/${id}/claim`, method: 'POST', body }),
      invalidatesTags: ['Order'],
    }),
    reviewOrder: builder.mutation<
      { success: boolean },
      { orderId: string; products: Array<{ productId: string; rating: number; comment?: string }> }
    >({
      query: ({ orderId, products }) => ({ url: `/orders/${orderId}/review`, method: 'POST', body: { products } }),
      invalidatesTags: ['Order', 'Product', 'Shop'],
    }),

    // ─── Vendeur : candidature & boutique ───────────────────────────────
    applySeller: builder.mutation<SellerShop, SellerApplicationPayload>({
      query: (body) => ({ url: '/seller/apply', method: 'POST', body }),
      invalidatesTags: ['SellerShop'],
    }),
    cancelSellerApplication: builder.mutation<{ success: boolean }, void>({
      query: () => ({ url: '/seller/apply', method: 'DELETE' }),
      invalidatesTags: ['SellerShop'],
    }),
    getMySellerShop: builder.query<SellerShop, void>({
      query: () => '/seller/shop',
      providesTags: ['SellerShop'],
    }),
    updateMySellerShop: builder.mutation<SellerShop, ShopSettingsPayload>({
      query: (body) => ({ url: '/seller/shop', method: 'PATCH', body }),
      invalidatesTags: ['SellerShop', 'Shop'],
    }),
    getSellerStats: builder.query<SellerStats, void>({
      query: () => '/seller/stats',
      providesTags: ['SellerStats'],
    }),

    // ─── Vendeur : sections ─────────────────────────────────────────────
    getSellerSections: builder.query<MarketplaceSection[], void>({
      query: () => '/seller/sections',
      providesTags: ['SellerSection'],
    }),
    createSellerSection: builder.mutation<MarketplaceSection, { name: string; nameEn?: string; nameAr?: string }>({
      query: (body) => ({ url: '/seller/sections', method: 'POST', body }),
      invalidatesTags: ['SellerSection', 'Shop'],
    }),
    updateSellerSection: builder.mutation<
      MarketplaceSection,
      { id: string; name?: string; nameEn?: string; nameAr?: string; isActive?: boolean }
    >({
      query: ({ id, ...body }) => ({ url: `/seller/sections/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['SellerSection', 'Shop'],
    }),
    deleteSellerSection: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({ url: `/seller/sections/${id}`, method: 'DELETE' }),
      invalidatesTags: ['SellerSection', 'SellerProduct', 'Shop'],
    }),
    reorderSellerSections: builder.mutation<MarketplaceSection[], string[]>({
      query: (ids) => ({ url: '/seller/sections/reorder', method: 'PUT', body: { ids } }),
      invalidatesTags: ['SellerSection', 'Shop'],
    }),

    // ─── Vendeur : produits ─────────────────────────────────────────────
    getSellerProducts: builder.query<MarketplaceProduct[], { sectionId?: string } | void>({
      query: (params) => ({ url: '/seller/products', params: params ?? undefined }),
      providesTags: ['SellerProduct'],
    }),
    getSellerProduct: builder.query<MarketplaceProduct, string>({
      query: (id) => `/seller/products/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'SellerProduct', id }],
    }),
    createSellerProduct: builder.mutation<MarketplaceProduct, ProductPayload>({
      query: (body) => ({ url: '/seller/products', method: 'POST', body }),
      invalidatesTags: ['SellerProduct', 'SellerSection', 'Product', 'Shop'],
    }),
    updateSellerProduct: builder.mutation<MarketplaceProduct, { id: string } & Partial<ProductPayload>>({
      query: ({ id, ...body }) => ({ url: `/seller/products/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['SellerProduct', 'SellerSection', 'Product', 'Shop'],
    }),
    updateSellerProductStock: builder.mutation<MarketplaceProduct, { id: string; quantity: number }>({
      query: ({ id, quantity }) => ({ url: `/seller/products/${id}/stock`, method: 'PUT', body: { quantity } }),
      invalidatesTags: ['SellerProduct', 'Product', 'Shop'],
    }),
    deleteSellerProduct: builder.mutation<{ success: boolean; archived: boolean }, string>({
      query: (id) => ({ url: `/seller/products/${id}`, method: 'DELETE' }),
      invalidatesTags: ['SellerProduct', 'SellerSection', 'Product', 'Shop'],
    }),

    // ─── Vendeur : commandes ────────────────────────────────────────────
    getSellerOrders: builder.query<MarketplaceOrder[], { status?: string } | void>({
      query: (params) => ({ url: '/seller/orders', params: params ?? undefined }),
      providesTags: ['SellerOrder'],
    }),
    sellerOrderAction: builder.mutation<
      MarketplaceOrder,
      { id: string; action: 'accept' | 'preparing' | 'ready' | 'out-for-delivery' | 'relaunch-delivery' }
    >({
      query: ({ id, action }) => ({ url: `/seller/orders/${id}/${action}`, method: 'POST' }),
      invalidatesTags: ['SellerOrder', 'SellerStats', 'Order'],
    }),
    rejectSellerOrder: builder.mutation<MarketplaceOrder, { id: string; reason: string }>({
      query: ({ id, reason }) => ({ url: `/seller/orders/${id}/reject`, method: 'POST', body: { reason } }),
      invalidatesTags: ['SellerOrder', 'SellerStats', 'Order', 'SellerProduct'],
    }),
    confirmHandover: builder.mutation<MarketplaceOrder, { id: string; code: string }>({
      query: ({ id, code }) => ({ url: `/seller/orders/${id}/handover`, method: 'POST', body: { code } }),
      invalidatesTags: ['SellerOrder', 'SellerStats', 'Order'],
    }),
  }),
});

export const {
  useGetDomainsQuery,
  useGetShopsQuery,
  useGetShopQuery,
  useGetProductsQuery,
  useGetProductByIdQuery,
  useQuoteOrderMutation,
  useCheckoutOrderMutation,
  useGetMyOrdersQuery,
  useGetOrderQuery,
  useCancelOrderMutation,
  useConfirmOrderReceivedMutation,
  useOpenOrderClaimMutation,
  useReviewOrderMutation,
  useApplySellerMutation,
  useCancelSellerApplicationMutation,
  useGetMySellerShopQuery,
  useUpdateMySellerShopMutation,
  useGetSellerStatsQuery,
  useGetSellerSectionsQuery,
  useCreateSellerSectionMutation,
  useUpdateSellerSectionMutation,
  useDeleteSellerSectionMutation,
  useReorderSellerSectionsMutation,
  useGetSellerProductsQuery,
  useGetSellerProductQuery,
  useCreateSellerProductMutation,
  useUpdateSellerProductMutation,
  useUpdateSellerProductStockMutation,
  useDeleteSellerProductMutation,
  useGetSellerOrdersQuery,
  useSellerOrderActionMutation,
  useRejectSellerOrderMutation,
  useConfirmHandoverMutation,
} = marketplaceApi;
