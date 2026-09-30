import React, { useMemo, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useGetSellerOrdersQuery } from '../../store/api/marketplaceApi';
import { useRefetchOnFocus } from '../../hooks/useRefetchOnFocus';
import { useCurrencyFormatter } from '../../hooks/useCurrencyFormatter';
import { useAppTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/spacing';
import { OrderStatusChip } from '../../components/marketplace/OrderStatusChip';
import type { MarketplaceOrder, MarketplaceOrderStatus } from '../../types/marketplace';

type Tab = 'pending' | 'active' | 'done' | 'cancelled';
const TAB_STATUSES: Record<Tab, MarketplaceOrderStatus[]> = {
  pending: ['pending'],
  active: ['confirmed', 'preparing', 'ready', 'in_delivery', 'delivered'],
  done: ['completed'],
  cancelled: ['cancelled'],
};
const FULFILLMENT_ICONS: Record<string, string> = {
  checkallpack: 'moped',
  transport: 'truck-fast',
  seller_delivery: 'storefront-outline',
  pickup: 'shopping-outline',
};

export const SellerOrdersScreen = ({ navigation }: any) => {
  const { tokens } = useAppTheme();
  const { t, i18n } = useTranslation();
  const { formatWithCurrency } = useCurrencyFormatter();
  const [tab, setTab] = useState<Tab>('pending');

  const { data: orders = [], isLoading, isFetching, refetch } = useGetSellerOrdersQuery(undefined, {
    pollingInterval: 8000,
    refetchOnMountOrArgChange: true,
  });
  useRefetchOnFocus(refetch);

  const counts = useMemo(() => {
    const c: Record<Tab, number> = { pending: 0, active: 0, done: 0, cancelled: 0 };
    for (const o of orders) {
      (Object.keys(TAB_STATUSES) as Tab[]).forEach((key) => { if (TAB_STATUSES[key].includes(o.status)) c[key] += 1; });
    }
    return c;
  }, [orders]);
  const visible = orders.filter((o) => TAB_STATUSES[tab].includes(o.status));

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: tokens.background },
    tabs: { flexDirection: 'row', backgroundColor: tokens.card, borderBottomWidth: 1, borderBottomColor: tokens.border },
    tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
    tabText: { fontSize: 12, fontWeight: '600', color: tokens.text.secondary },
    list: { padding: spacing.md, paddingBottom: spacing.xxl },
    card: { backgroundColor: tokens.card, borderRadius: 14, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: tokens.border, gap: 6 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    title: { flex: 1, fontSize: 14, fontWeight: '700', color: tokens.text.primary },
    meta: { flex: 1, fontSize: 12, color: tokens.text.secondary },
    amount: { fontSize: 14, fontWeight: '700', color: tokens.primary },
    empty: { alignItems: 'center', marginTop: spacing.xl * 2, gap: spacing.sm },
    emptyText: { color: tokens.text.secondary },
  }), [tokens]);

  const renderItem = ({ item }: { item: MarketplaceOrder }) => {
    const itemsCount = item.items.reduce((sum, i) => sum + i.quantity, 0);
    return (
      <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('SellerOrderDetails', { orderId: item.id })} activeOpacity={0.85}>
        <View style={styles.row}>
          <Text style={styles.title}>#{item.id.slice(0, 8).toUpperCase()} · {item.client.firstName}</Text>
          <OrderStatusChip status={item.status} />
        </View>
        <View style={styles.row}>
          <Icon name={FULFILLMENT_ICONS[item.fulfillmentType]} size={14} color={tokens.text.secondary} />
          <Text style={styles.meta}>
            {t(`marketplace.fulfillment_${item.fulfillmentType}`)} · {t('seller.items_count', { count: itemsCount })}
          </Text>
          <Text style={styles.amount}>{formatWithCurrency(item.sellerNetAmount, item.currency)}</Text>
        </View>
        <Text style={styles.meta}>
          {new Date(item.createdAt).toLocaleString(i18n.language, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        {(Object.keys(TAB_STATUSES) as Tab[]).map((key) => (
          <TouchableOpacity key={key} style={[styles.tab, tab === key && { borderBottomColor: tokens.primary }]} onPress={() => setTab(key)}>
            <Text style={[styles.tabText, tab === key && { color: tokens.primary }]}>
              {t(`seller.orders_tab_${key}`)}{counts[key] > 0 ? ` (${counts[key]})` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {isLoading ? <ActivityIndicator style={{ marginTop: spacing.xl }} color={tokens.primary} /> : (
        <FlatList
          data={visible}
          keyExtractor={(o) => o.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} colors={[tokens.primary]} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Icon name="inbox-outline" size={48} color={tokens.border} />
              <Text style={styles.emptyText}>{t('seller.no_orders')}</Text>
            </View>
          }
        />
      )}
    </View>
  );
};
