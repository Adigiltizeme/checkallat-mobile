import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Image, RefreshControl, Switch, Alert } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import {
  useGetMySellerShopQuery,
  useGetSellerOrdersQuery,
  useGetSellerStatsQuery,
  useUpdateMySellerShopMutation,
} from '../../store/api/marketplaceApi';
import { useRefetchOnFocus } from '../../hooks/useRefetchOnFocus';
import { useBeatSound } from '../../hooks/useBeatSound';
import { useCurrencyFormatter } from '../../hooks/useCurrencyFormatter';
import { AvailableGlowCard } from '../../components/shared/AvailableGlowCard';
import { useAppTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/spacing';
import { colors } from '../../theme/colors';

export const SellerDashboardScreen = ({ navigation }: any) => {
  const { tokens } = useAppTheme();
  const { t } = useTranslation();
  const { format, formatWithCurrency } = useCurrencyFormatter();

  const { data: shop, isLoading, refetch: refetchShop } = useGetMySellerShopQuery(undefined, { refetchOnMountOrArgChange: true });
  const { data: stats, refetch: refetchStats } = useGetSellerStatsQuery(undefined, { pollingInterval: 30_000, refetchOnMountOrArgChange: true });
  const { data: pendingOrders = [], refetch: refetchPending } = useGetSellerOrdersQuery(
    { status: 'pending' },
    { pollingInterval: 8000, refetchOnMountOrArgChange: true },
  );
  const [updateShop, { isLoading: updatingShop }] = useUpdateMySellerShopMutation();
  const [refreshing, setRefreshing] = useState(false);

  useRefetchOnFocus(() => { refetchShop(); refetchStats(); refetchPending(); });

  // Même alerte que les pros et chauffeurs : son + bannière pulsée tant qu'une commande attend
  useBeatSound(pendingOrders.length > 0);
  const bannerScale = useSharedValue(1);
  useEffect(() => {
    if (pendingOrders.length > 0) {
      bannerScale.value = withRepeat(
        withSequence(
          withTiming(1.03, { duration: 60, easing: Easing.out(Easing.quad) }),
          withTiming(1, { duration: 540, easing: Easing.in(Easing.quad) }),
        ),
        -1,
        false,
      );
    } else {
      bannerScale.value = 1;
    }
  }, [pendingOrders.length, bannerScale]);
  const bannerAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: bannerScale.value }] }));

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: tokens.background },
    header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, backgroundColor: tokens.card },
    logo: { width: 56, height: 56, borderRadius: 14, backgroundColor: tokens.backgroundAlt },
    shopName: { fontSize: 18, fontWeight: '800', color: tokens.text.primary },
    sub: { fontSize: 12, color: tokens.text.secondary, marginTop: 2 },
    openCard: { backgroundColor: tokens.card, padding: spacing.md, margin: spacing.md, borderRadius: 12, elevation: 2 },
    openRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    openTitle: { fontWeight: '700', color: tokens.text.primary, fontSize: 15 },
    banner: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: tokens.primary,
      marginHorizontal: spacing.md, marginBottom: spacing.md, borderRadius: 12, padding: spacing.md, elevation: 4,
    },
    bannerTitle: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
    bannerSub: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2 },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingHorizontal: spacing.md },
    stat: { flexBasis: '47%', flexGrow: 1, backgroundColor: tokens.card, borderRadius: 12, padding: spacing.md, elevation: 1 },
    statValue: { fontSize: 20, fontWeight: '800', color: tokens.primary, fontVariant: ['tabular-nums'] },
    statLabel: { fontSize: 12, color: tokens.text.secondary, marginTop: 4 },
    menu: { backgroundColor: tokens.card, borderRadius: 12, margin: spacing.md, overflow: 'hidden' },
    menuItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: tokens.border },
    menuText: { flex: 1, color: tokens.text.primary, fontSize: 15 },
  }), [tokens]);

  if (isLoading || !shop) {
    return <View style={[styles.container, { justifyContent: 'center' }]}><ActivityIndicator color={tokens.primary} /></View>;
  }

  const isOpen = !shop.isTemporarilyClosed;
  const toggleOpen = async (open: boolean) => {
    try {
      await updateShop({ isTemporarilyClosed: !open }).unwrap();
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.data?.message || t('common.error'));
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchShop(), refetchStats(), refetchPending()]);
    setRefreshing(false);
  };

  const currency = pendingOrders[0]?.currency;
  const money = (value: number) => (currency ? formatWithCurrency(value, currency) : format(value));

  const menu = [
    { icon: 'package-variant-closed', label: t('seller.menu_products'), onPress: () => navigation.navigate('SellerCatalog', { screen: 'SellerProducts' }) },
    { icon: 'format-list-bulleted-square', label: t('seller.menu_sections'), onPress: () => navigation.navigate('SellerCatalog', { screen: 'SellerSections' }) },
    { icon: 'storefront-edit-outline', label: t('seller.menu_shop_settings'), onPress: () => navigation.navigate('SellerShopSettings') },
    { icon: 'eye-outline', label: t('seller.menu_preview'), onPress: () => navigation.navigate('MarketplaceShop', { sellerId: shop.id }) },
    { icon: 'bank-outline', label: t('seller.menu_payout_accounts'), onPress: () => navigation.navigate('Profile', { screen: 'PayoutAccounts' }) },
  ];

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[tokens.primary]} />}>
      <View style={styles.header}>
        {shop.logo ? <Image source={{ uri: shop.logo }} style={styles.logo} /> : <View style={[styles.logo, { alignItems: 'center', justifyContent: 'center' }]}><Icon name="storefront-outline" size={28} color={tokens.primary} /></View>}
        <View style={{ flex: 1 }}>
          <Text style={styles.shopName}>{shop.businessName}</Text>
          <Text style={styles.sub}>{shop.averageRating > 0 ? `⭐ ${shop.averageRating.toFixed(1)} · ` : ''}{t('marketplace.sales_count', { count: shop.totalSales })}</Text>
        </View>
      </View>

      <AvailableGlowCard isAvailable={isOpen} color={tokens.primary} style={styles.openCard}>
        <View style={styles.openRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.openTitle}>{isOpen ? `✅ ${t('seller.shop_open')}` : `⏸️ ${t('seller.shop_closed')}`}</Text>
            <Text style={styles.sub}>{isOpen ? t('seller.shop_open_desc') : t('seller.shop_closed_desc')}</Text>
          </View>
          <Switch value={isOpen} onValueChange={toggleOpen} disabled={updatingShop} trackColor={{ false: tokens.border, true: tokens.primary }} thumbColor={colors.white} />
        </View>
      </AvailableGlowCard>

      {pendingOrders.length > 0 && (
        <Animated.View style={bannerAnimStyle}>
          <TouchableOpacity style={styles.banner} onPress={() => navigation.navigate('SellerOrderDetails', { orderId: pendingOrders[0].id })} activeOpacity={0.85}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 }}>
              <Icon name="bell-ring" size={22} color="#FFFFFF" />
              <View style={{ flex: 1 }}>
                <Text style={styles.bannerTitle}>{t('seller.new_orders_count', { count: pendingOrders.length })}</Text>
                <Text style={styles.bannerSub} numberOfLines={1}>
                  {pendingOrders[0].client.firstName} · {formatWithCurrency(pendingOrders[0].totalAmount, pendingOrders[0].currency)}
                </Text>
              </View>
            </View>
            <Icon name="chevron-right" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </Animated.View>
      )}

      <View style={styles.statsGrid}>
        <View style={styles.stat}><Text style={styles.statValue}>{stats?.pendingOrders ?? 0}</Text><Text style={styles.statLabel}>{t('seller.stat_pending')}</Text></View>
        <View style={styles.stat}><Text style={styles.statValue}>{stats?.activeOrders ?? 0}</Text><Text style={styles.statLabel}>{t('seller.stat_active')}</Text></View>
        <View style={styles.stat}><Text style={styles.statValue}>{stats?.completedLast30Days ?? 0}</Text><Text style={styles.statLabel}>{t('seller.stat_completed_30d')}</Text></View>
        <View style={styles.stat}><Text style={styles.statValue}>{money(stats?.netRevenueLast30Days ?? 0)}</Text><Text style={styles.statLabel}>{t('seller.stat_revenue_30d')}</Text></View>
        <View style={styles.stat}><Text style={styles.statValue}>{money(stats?.pendingPayoutAmount ?? 0)}</Text><Text style={styles.statLabel}>{t('seller.stat_pending_payout')}</Text></View>
        <View style={styles.stat}><Text style={styles.statValue}>{money(stats?.totalPayoutReceived ?? 0)}</Text><Text style={styles.statLabel}>{t('seller.stat_total_paid')}</Text></View>
      </View>

      <View style={styles.menu}>
        {menu.map((item) => (
          <TouchableOpacity key={item.icon} style={styles.menuItem} onPress={item.onPress}>
            <Icon name={item.icon} size={22} color={tokens.primary} />
            <Text style={styles.menuText}>{item.label}</Text>
            <Icon name="chevron-right" size={20} color={tokens.text.secondary} />
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
};
