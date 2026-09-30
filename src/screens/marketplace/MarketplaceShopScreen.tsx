import React, { useMemo, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Image, ScrollView, RefreshControl, Dimensions } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useGetShopQuery } from '../../store/api/marketplaceApi';
import { useRefetchOnFocus } from '../../hooks/useRefetchOnFocus';
import { useCurrencyFormatter } from '../../hooks/useCurrencyFormatter';
import { useAddToCart } from '../../hooks/useAddToCart';
import { useAppTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/spacing';
import { CartBar } from '../../components/marketplace/CartBar';
import { localizedName, type MarketplaceProduct } from '../../types/marketplace';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - spacing.md * 3) / 2;
const ALL = '__all__';
const OTHERS = '__others__';

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export const MarketplaceShopScreen = ({ route, navigation }: any) => {
  const { sellerId } = route.params as { sellerId: string };
  const { tokens } = useAppTheme();
  const { t, i18n } = useTranslation();
  const { formatWithCurrency } = useCurrencyFormatter();
  const addToCart = useAddToCart();
  const [activeSection, setActiveSection] = useState<string>(ALL);
  const [showInfo, setShowInfo] = useState(false);

  const { data: shop, isLoading, isFetching, refetch } = useGetShopQuery(sellerId, {
    pollingInterval: 30_000,
    refetchOnMountOrArgChange: true,
  });
  useRefetchOnFocus(refetch);

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: tokens.background },
    banner: { height: 150, backgroundColor: tokens.primary + '22' },
    head: { paddingHorizontal: spacing.md, paddingBottom: spacing.md, backgroundColor: tokens.card },
    logo: { width: 72, height: 72, borderRadius: 16, marginTop: -36, borderWidth: 3, borderColor: tokens.card, backgroundColor: tokens.backgroundAlt },
    name: { fontSize: 20, fontWeight: '800', color: tokens.text.primary, marginTop: spacing.sm },
    meta: { fontSize: 13, color: tokens.text.secondary, marginTop: 4 },
    badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.sm },
    badge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: tokens.backgroundAlt },
    badgeText: { fontSize: 11, color: tokens.text.primary, fontWeight: '600' },
    closedBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: '#FEE2E2', padding: spacing.md, margin: spacing.md, borderRadius: 12 },
    closedText: { flex: 1, color: '#991B1B', fontWeight: '600' },
    info: { marginTop: spacing.sm, color: tokens.text.secondary, lineHeight: 19 },
    infoToggle: { color: tokens.primary, fontWeight: '600', marginTop: 4 },
    tabs: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.xs },
    tab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: tokens.card, borderWidth: 1, borderColor: tokens.border, marginRight: spacing.xs },
    tabActive: { backgroundColor: tokens.primary, borderColor: tokens.primary },
    tabText: { fontSize: 13, fontWeight: '600', color: tokens.text.primary },
    grid: { paddingHorizontal: spacing.md, paddingBottom: 110 },
    card: { width: CARD_WIDTH, backgroundColor: tokens.card, borderRadius: 12, marginBottom: spacing.md, overflow: 'hidden', borderWidth: 1, borderColor: tokens.border },
    image: { width: CARD_WIDTH, height: CARD_WIDTH * 0.8, backgroundColor: tokens.backgroundAlt },
    productName: { fontSize: 13, fontWeight: '600', color: tokens.text.primary, paddingHorizontal: 8, marginTop: 6, minHeight: 34 },
    priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingBottom: 8 },
    price: { fontSize: 14, fontWeight: '800', color: tokens.primary },
    oldPrice: { fontSize: 11, color: tokens.text.secondary, textDecorationLine: 'line-through' },
    addBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: tokens.primary, alignItems: 'center', justifyContent: 'center' },
    soldOut: { position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
    soldOutText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
    empty: { alignItems: 'center', padding: spacing.xl, gap: spacing.sm },
    emptyText: { color: tokens.text.secondary },
  }), [tokens]);

  const products = shop?.products ?? [];
  const sections = (shop?.sections ?? []).filter((s) => products.some((p) => p.sectionId === s.id));
  const hasUnsectioned = products.some((p) => !p.sectionId || !sections.find((s) => s.id === p.sectionId));
  const visibleProducts = products.filter((p) => {
    if (activeSection === ALL) return true;
    if (activeSection === OTHERS) return !p.sectionId || !sections.find((s) => s.id === p.sectionId);
    return p.sectionId === activeSection;
  });

  const todayHours = shop?.openingHours?.[DAY_KEYS[new Date().getDay()]];

  const handleAdd = (product: MarketplaceProduct) => {
    if (!shop) return;
    addToCart(shop.id, shop.businessName, {
      productId: product.id,
      name: localizedName(product, i18n.language),
      price: product.price,
      currency: product.currency,
      quantity: 1,
      image: product.images[0],
      maxQuantity: product.hasStock ? product.stockQuantity : null,
    });
  };

  if (isLoading || !shop) {
    return <View style={[styles.container, { justifyContent: 'center' }]}><ActivityIndicator color={tokens.primary} /></View>;
  }

  const header = (
    <>
      {shop.bannerUrl ? <Image source={{ uri: shop.bannerUrl }} style={styles.banner} /> : <View style={styles.banner} />}
      <View style={styles.head}>
        {shop.logo
          ? <Image source={{ uri: shop.logo }} style={styles.logo} />
          : <View style={[styles.logo, { alignItems: 'center', justifyContent: 'center' }]}><Icon name="storefront-outline" size={32} color={tokens.primary} /></View>}
        <Text style={styles.name}>{shop.businessName}</Text>
        <Text style={styles.meta}>
          {shop.averageRating > 0 ? `⭐ ${shop.averageRating.toFixed(1)}  ·  ` : ''}
          {t('marketplace.sales_count', { count: shop.totalSales })}
        </Text>
        <View style={styles.badges}>
          <View style={styles.badge}><Icon name="clock-outline" size={13} color={tokens.primary} /><Text style={styles.badgeText}>{t('marketplace.prep_time_short', { minutes: shop.preparationTimeMin })}</Text></View>
          <View style={styles.badge}><Icon name="moped" size={13} color={tokens.primary} /><Text style={styles.badgeText}>{t('marketplace.delivery_checkallat')}</Text></View>
          {shop.offersPickup && <View style={styles.badge}><Icon name="shopping-outline" size={13} color={tokens.primary} /><Text style={styles.badgeText}>{t('marketplace.fulfillment_pickup')}</Text></View>}
          {shop.offersDelivery && <View style={styles.badge}><Icon name="truck-outline" size={13} color={tokens.primary} /><Text style={styles.badgeText}>{t('marketplace.fulfillment_seller_delivery')}</Text></View>}
        </View>
        {(shop.description || todayHours) && (
          <>
            {showInfo && !!shop.description && <Text style={styles.info}>{shop.description}</Text>}
            {showInfo && (
              <Text style={styles.info}>
                📍 {shop.address}
                {todayHours ? `\n🕒 ${t('marketplace.today_hours')} : ${todayHours.length ? todayHours.map((h) => `${h.open}–${h.close}`).join(', ') : t('marketplace.closed_today')}` : ''}
              </Text>
            )}
            <Text style={styles.infoToggle} onPress={() => setShowInfo((v) => !v)}>
              {showInfo ? t('marketplace.hide_info') : t('marketplace.show_info')}
            </Text>
          </>
        )}
      </View>

      {shop.isTemporarilyClosed && (
        <View style={styles.closedBanner}>
          <Icon name="store-off-outline" size={22} color="#991B1B" />
          <Text style={styles.closedText}>{t('marketplace.shop_closed_banner')}</Text>
        </View>
      )}

      {(sections.length > 0) && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {[{ id: ALL, label: t('marketplace.all_products') }, ...sections.map((s) => ({ id: s.id, label: localizedName(s, i18n.language) })), ...(hasUnsectioned ? [{ id: OTHERS, label: t('marketplace.other_products') }] : [])].map((tab) => (
            <TouchableOpacity key={tab.id} style={[styles.tab, activeSection === tab.id && styles.tabActive]} onPress={() => setActiveSection(tab.id)}>
              <Text style={[styles.tabText, activeSection === tab.id && { color: '#FFFFFF' }]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </>
  );

  const renderProduct = ({ item }: { item: MarketplaceProduct }) => {
    const soldOut = item.hasStock && (item.stockQuantity ?? 0) <= 0;
    return (
      <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}>
        {item.images[0] ? <Image source={{ uri: item.images[0] }} style={styles.image} /> : <View style={styles.image} />}
        {soldOut && <View style={styles.soldOut}><Text style={styles.soldOutText}>{t('marketplace.sold_out')}</Text></View>}
        <Text style={styles.productName} numberOfLines={2}>{localizedName(item, i18n.language)}</Text>
        <View style={styles.priceRow}>
          <View>
            <Text style={styles.price}>{formatWithCurrency(item.price, item.currency)}</Text>
            {item.compareAtPrice != null && item.compareAtPrice > item.price && (
              <Text style={styles.oldPrice}>{formatWithCurrency(item.compareAtPrice, item.currency)}</Text>
            )}
          </View>
          {!soldOut && !shop.isTemporarilyClosed && (
            <TouchableOpacity style={styles.addBtn} onPress={() => handleAdd(item)} accessibilityLabel={t('marketplace.add_to_cart')}>
              <Icon name="plus" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={visibleProducts}
        keyExtractor={(item) => item.id}
        renderItem={renderProduct}
        numColumns={2}
        columnWrapperStyle={{ justifyContent: 'space-between' }}
        ListHeaderComponent={header}
        ListHeaderComponentStyle={{ marginHorizontal: -spacing.md, marginBottom: spacing.sm }}
        contentContainerStyle={styles.grid}
        refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} colors={[tokens.primary]} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="package-variant" size={48} color={tokens.border} />
            <Text style={styles.emptyText}>{t('marketplace.no_products')}</Text>
          </View>
        }
      />
      <CartBar onPress={() => navigation.navigate('Cart')} />
    </View>
  );
};
