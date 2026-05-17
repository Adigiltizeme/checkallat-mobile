import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import authReducer from './slices/authSlice';
import cartReducer from './slices/cartSlice';
import locationReducer from './slices/locationSlice';
import { authApi } from './api/authApi';
import { prosApi } from './api/prosApi';
import { servicesApi } from './api/servicesApi';
import { bookingsApi } from './api/bookingsApi';
import { transportApi } from './api/transportApi';
import { marketplaceApi } from './api/marketplaceApi';
import { paymentsApi } from './api/paymentsApi';
import { paymentApi } from './api/paymentApi';
import { reviewsApi } from './api/reviewsApi';
import { proposalsApi } from './api/proposalsApi';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    cart: cartReducer,
    location: locationReducer,
    [authApi.reducerPath]: authApi.reducer,
    [prosApi.reducerPath]: prosApi.reducer,
    [servicesApi.reducerPath]: servicesApi.reducer,
    [bookingsApi.reducerPath]: bookingsApi.reducer,
    [transportApi.reducerPath]: transportApi.reducer,
    [marketplaceApi.reducerPath]: marketplaceApi.reducer,
    [paymentsApi.reducerPath]: paymentsApi.reducer,
    [paymentApi.reducerPath]: paymentApi.reducer,
    [reviewsApi.reducerPath]: reviewsApi.reducer,
    [proposalsApi.reducerPath]: proposalsApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      authApi.middleware,
      prosApi.middleware,
      servicesApi.middleware,
      bookingsApi.middleware,
      transportApi.middleware,
      marketplaceApi.middleware,
      paymentsApi.middleware,
      paymentApi.middleware,
      reviewsApi.middleware,
      proposalsApi.middleware,
    ),
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
