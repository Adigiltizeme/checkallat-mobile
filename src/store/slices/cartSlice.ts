import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  currency: string;
  quantity: number;
  image?: string;
  /** Stock disponible au moment de l'ajout (null = illimité) */
  maxQuantity: number | null;
  notes?: string;
}

interface CartState {
  /** Une commande = une boutique : le panier est lié à un seul vendeur */
  sellerId: string | null;
  sellerName: string | null;
  items: CartItem[];
}

const initialState: CartState = {
  sellerId: null,
  sellerName: null,
  items: [],
};

const clamp = (quantity: number, max: number | null) => Math.max(1, max != null ? Math.min(quantity, max) : quantity);

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    /** L'écran appelant vérifie d'abord `sellerId` et propose de vider le panier s'il s'agit d'une autre boutique */
    addToCart: (state, action: PayloadAction<{ sellerId: string; sellerName: string; item: CartItem }>) => {
      const { sellerId, sellerName, item } = action.payload;
      if (state.sellerId && state.sellerId !== sellerId) {
        state.items = [];
      }
      state.sellerId = sellerId;
      state.sellerName = sellerName;
      const existing = state.items.find((i) => i.productId === item.productId);
      if (existing) {
        existing.maxQuantity = item.maxQuantity;
        existing.quantity = clamp(existing.quantity + item.quantity, item.maxQuantity);
      } else {
        state.items.push({ ...item, quantity: clamp(item.quantity, item.maxQuantity) });
      }
    },
    updateQuantity: (state, action: PayloadAction<{ productId: string; quantity: number }>) => {
      const item = state.items.find((i) => i.productId === action.payload.productId);
      if (item) item.quantity = clamp(action.payload.quantity, item.maxQuantity);
    },
    updateNotes: (state, action: PayloadAction<{ productId: string; notes: string }>) => {
      const item = state.items.find((i) => i.productId === action.payload.productId);
      if (item) item.notes = action.payload.notes;
    },
    removeFromCart: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((i) => i.productId !== action.payload);
      if (state.items.length === 0) {
        state.sellerId = null;
        state.sellerName = null;
      }
    },
    clearCart: () => initialState,
  },
});

export const selectCartCount = (state: { cart: CartState }) =>
  state.cart.items.reduce((sum, item) => sum + item.quantity, 0);

export const selectCartSubtotal = (state: { cart: CartState }) =>
  Math.round(state.cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0) * 100) / 100;

export const { addToCart, updateQuantity, updateNotes, removeFromCart, clearCart } = cartSlice.actions;
export default cartSlice.reducer;
