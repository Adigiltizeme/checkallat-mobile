import React, { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, Image, FlatList, Dimensions, TouchableOpacity } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useGetProductByIdQuery } from '../../store/api/marketplaceApi';
import { useRefetchOnFocus } from '../../hooks/useRefetchOnFocus';
import { useCurrencyFormatter } from '../../hooks/useCurrencyFormatter';
import { useAddToCart } from '../../hooks/useAddToCart';
import { useAppTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/spacing';
import { ChocolateButton } from '../../components/shared/ChocolateButton';
import { QuantityStepper } from '../../components/marketplace/QuantityStepper';
import { CartBar } from '../../components/marketplace/CartBar';
import { localizedDescription, localizedName } from '../../types/marketplace';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const ProductDetailScreen = ({ route, navigation }: any) => {
  const { productId } = route.params as { productId: string };
  const { tokens } = useAppTheme();
  const { t, i18n } = useTranslation();
  const { formatWithCurrency } = useCurrencyFormatter();
  const addToCart = useAddToCart();
  const [quantity, setQuantity] = useState(1);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [added, setAdded] = useState(false);

  const { data: product, isLoading, refetch } = useGetProductByIdQuery(productId, {
    pollingInterval: 30_000,
    refetchOnMountOrArgChange: true,
  });
  useRefetchOnFocus(refetch);

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: tokens.background },
    image: { width: SCREEN_WIDTH, height: SCREEN_WIDTH * 0.8, backgroundColor: tokens.backgroundAlt },
    dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: spacing.sm },
    dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: tokens.border },
    body: { padding: spacing.md, gap: spacing.sm, paddingBottom: 140 },
    name: { fontSize: 20, fontWeight: '800', color: tokens.text.primary },
    priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
    price: { fontSize: 22, fontWeight: '800', color: tokens.primary },
    oldPrice: { fontSize: 14, color: tokens.text.secondary, textDecorationLine: 'line-through' },
    shopLink: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: spacing.sm, borderTopWidth: 1, borderBottomWidth: 1, borderColor: tokens.border },
    shopName: { flex: 1, color: tokens.text.primary, fontWeight: '600' },
    label: { fontSize: 14, fontWeight: '700', color: tokens.text.primary, marginTop: spacing.sm },
    text: { fontSize: 14, color: tokens.text.secondary, lineHeight: 21 },
    tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    tag: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: tokens.backgroundAlt },
    tagText: { fontSize: 12, color: tokens.text.primary },
    stock: { fontSize: 13, fontWeight: '600' },
    review: { backgroundColor: tokens.card, borderRadius: 10, padding: spacing.sm, borderWidth: 1, borderColor: tokens.border },
    footer: {
      position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', gap: spacing.md,
      padding: spacing.md, backgroundColor: tokens.card, borderTopWidth: 1, borderTopColor: tokens.border,
    },
  }), [tokens]);

  if (isLoading || !product) {
    return <View style={[styles.container, { justifyContent: 'center' }]}><ActivityIndicator color={tokens.primary} /></View>;
  }

  const seller = product.seller;
  const soldOut = product.hasStock && (product.stockQuantity ?? 0) <= 0;
  const shopClosed = !!seller?.isTemporarilyClosed;
  const maxQuantity = product.hasStock ? product.stockQuantity : null;
  const lowStock = product.hasStock && !soldOut && product.lowStockThreshold != null && (product.stockQuantity ?? 0) <= product.lowStockThreshold;
  const dietary = [
    product.isHalal && t('marketplace.tag_halal'),
    product.isVegetarian && t('marketplace.tag_vegetarian'),
    product.isVegan && t('marketplace.tag_vegan'),
  ].filter(Boolean) as string[];

  const handleAdd = () => {
    if (!seller?.id || !seller.businessName) return;
    addToCart(seller.id, seller.businessName, {
      productId: product.id,
      name: localizedName(product, i18n.language),
      price: product.price,
      currency: product.currency,
      quantity,
      image: product.images[0],
      maxQuantity,
    }, () => setAdded(true));
  };

  return (
    <View style={styles.container}>
      <ScrollView>
        {product.images.length > 0 ? (
          <>
            <FlatList
              data={product.images}
              keyExtractor={(uri, i) => `${uri}-${i}`}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => setPhotoIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH))}
              renderItem={({ item }) => <Image source={{ uri: item }} style={styles.image} resizeMode="cover" />}
            />
            {product.images.length > 1 && (
              <View style={styles.dots}>
                {product.images.map((_, i) => (
                  <View key={i} style={[styles.dot, i === photoIndex && { backgroundColor: tokens.primary, width: 18 }]} />
                ))}
              </View>
            )}
          </>
        ) : (
          <View style={[styles.image, { alignItems: 'center', justifyContent: 'center' }]}>
            <Icon name="image-off-outline" size={48} color={tokens.border} />
          </View>
        )}

        <View style={styles.body}>
          <Text style={styles.name}>{localizedName(product, i18n.language)}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatWithCurrency(product.price, product.currency)}</Text>
            {product.compareAtPrice != null && product.compareAtPrice > product.price && (
              <Text style={styles.oldPrice}>{formatWithCurrency(product.compareAtPrice, product.currency)}</Text>
            )}
          </View>
          {product.averageRating > 0 && (
            <Text style={styles.text}>⭐ {product.averageRating.toFixed(1)} · {t('marketplace.sold_count', { count: product.orderCount })}</Text>
          )}
          {soldOut ? (
            <Text style={[styles.stock, { color: '#B91C1C' }]}>{t('marketplace.sold_out')}</Text>
          ) : lowStock ? (
            <Text style={[styles.stock, { color: '#B45309' }]}>{t('marketplace.low_stock', { count: product.stockQuantity })}</Text>
          ) : null}

          {seller?.id && (
            <TouchableOpacity style={styles.shopLink} onPress={() => navigation.navigate('MarketplaceShop', { sellerId: seller.id })}>
              <Icon name="storefront-outline" size={20} color={tokens.primary} />
              <Text style={styles.shopName}>{seller.businessName}</Text>
              <Icon name="chevron-right" size={20} color={tokens.text.secondary} />
            </TouchableOpacity>
          )}

          <Text style={styles.label}>{t('marketplace.description')}</Text>
          <Text style={styles.text}>{localizedDescription(product, i18n.language)}</Text>

          {(dietary.length > 0 || product.allergens.length > 0) && (
            <>
              <Text style={styles.label}>{t('marketplace.product_info')}</Text>
              <View style={styles.tags}>
                {dietary.map((d) => <View key={d} style={styles.tag}><Text style={styles.tagText}>{d}</Text></View>)}
              </View>
              {product.allergens.length > 0 && (
                <Text style={styles.text}>{t('marketplace.allergens')} : {product.allergens.join(', ')}</Text>
              )}
            </>
          )}
          {product.domain?.requiresColdChain && (
            <Text style={styles.text}>🧊 {t('marketplace.cold_chain_note')}</Text>
          )}

          {(product.reviews?.length ?? 0) > 0 && (
            <>
              <Text style={styles.label}>{t('marketplace.reviews')}</Text>
              {product.reviews!.map((r) => (
                <View key={r.id} style={styles.review}>
                  <Text style={styles.text}>{'⭐'.repeat(r.rating)}</Text>
                  {!!r.comment && <Text style={styles.text}>{r.comment}</Text>}
                  {!!r.sellerResponse && <Text style={[styles.text, { fontStyle: 'italic' }]}>↳ {r.sellerResponse}</Text>}
                </View>
              ))}
            </>
          )}
        </View>
      </ScrollView>

      {added ? (
        <CartBar onPress={() => navigation.navigate('Cart')} />
      ) : (
        <View style={styles.footer}>
          <QuantityStepper value={quantity} onChange={setQuantity} max={maxQuantity} />
          <ChocolateButton style={{ flex: 1 }} onPress={handleAdd} disabled={soldOut || shopClosed}>
            {shopClosed ? t('marketplace.shop_closed') : soldOut ? t('marketplace.sold_out') : t('marketplace.add_to_cart')}
          </ChocolateButton>
        </View>
      )}
    </View>
  );
};
