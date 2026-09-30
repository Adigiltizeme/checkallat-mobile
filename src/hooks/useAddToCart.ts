import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { RootState } from '../store';
import { addToCart, CartItem } from '../store/slices/cartSlice';

/**
 * Ajout au panier avec la règle "une boutique par commande" :
 * si le panier contient les articles d'une autre boutique, le client choisit de le vider ou d'annuler.
 */
export const useAddToCart = () => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const cartSellerId = useSelector((s: RootState) => s.cart.sellerId);
  const cartSellerName = useSelector((s: RootState) => s.cart.sellerName);

  return useCallback(
    (sellerId: string, sellerName: string, item: CartItem, onAdded?: () => void) => {
      const add = () => {
        dispatch(addToCart({ sellerId, sellerName, item }));
        onAdded?.();
      };
      if (cartSellerId && cartSellerId !== sellerId) {
        Alert.alert(
          t('marketplace.cart_other_shop_title'),
          t('marketplace.cart_other_shop_msg', { shop: cartSellerName ?? '' }),
          [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('marketplace.cart_replace'), style: 'destructive', onPress: add },
          ],
        );
        return;
      }
      add();
    },
    [cartSellerId, cartSellerName, dispatch, t],
  );
};
