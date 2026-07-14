import React, { useState, useMemo } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useGetMyTransportRequestsQuery } from '../../store/api/transportApi';
import { useGetMyBookingsQuery } from '../../store/api/bookingsApi';
import { useGetMyOrdersQuery } from '../../store/api/marketplaceApi';
import { useRefetchOnFocus } from '../../hooks/useRefetchOnFocus';
import { formatCurrency } from '../../config/currency';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { useAppTheme } from '../../theme/ThemeProvider';

type Tab = 'transport' | 'services' | 'marketplace';

const TRANSPORT_STATUS_COLOR: Record<string, { color: string; bg: string }> = {
  pending:            { color: '#92400E', bg: '#FEF3C7' },
  accepted:           { color: '#1E40AF', bg: '#DBEAFE' },
  heading_to_pickup:  { color: '#3730A3', bg: '#E0E7FF' },
  arrived_at_pickup:  { color: '#6B21A8', bg: '#F3E8FF' },
  in_transit:         { color: '#065F46', bg: '#D1FAE5' },
  delivered:          { color: '#166534', bg: '#DCFCE7' },
  completed:          { color: '#166534', bg: '#DCFCE7' },
  cancelled:          { color: '#991B1B', bg: '#FEE2E2' },
};

const BOOKING_STATUS_COLOR: Record<string, { color: string; bg: string }> = {
  pending:     { color: '#92400E', bg: '#FEF3C7' },
  accepted:    { color: '#1E40AF', bg: '#DBEAFE' },
  en_route:    { color: '#3730A3', bg: '#E0E7FF' },
  arrived:     { color: '#6B21A8', bg: '#F3E8FF' },
  in_progress: { color: '#C2410C', bg: '#FFEDD5' },
  completed:   { color: '#166534', bg: '#DCFCE7' },
  cancelled:   { color: '#991B1B', bg: '#FEE2E2' },
  rejected:    { color: '#374151', bg: '#F3F4F6' },
};

export const MyOrdersScreen = () => {
  const { t, i18n } = useTranslation();
  const { tokens } = useAppTheme();
  const navigation = useNavigation<any>();
  const [activeTab, setActiveTab] = useState<Tab>('transport');
  const [refreshing, setRefreshing] = useState(false);

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: tokens.background },
    centered:  { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
    emptyText: { color: tokens.text.secondary, fontSize: 14, textAlign: 'center' },
    tabBar: {
      flexDirection: 'row',
      backgroundColor: tokens.card,
      borderBottomWidth: 1,
      borderBottomColor: tokens.border,
    },
    tab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      paddingVertical: 12,
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    tabText: { fontSize: 12, color: tokens.text.secondary, fontWeight: '600' },
    list: { padding: spacing.md, paddingBottom: spacing.xxl },
    card: {
      backgroundColor: tokens.card,
      borderRadius: 14,
      padding: spacing.md,
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: tokens.border,
      gap: 6,
    },
    cardRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    cardTitle: { fontSize: 14, fontWeight: '700', color: tokens.text.primary, flex: 1 },
    cardMeta: { fontSize: 12, color: tokens.text.secondary, flex: 1 },
    badge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
    badgeText: { fontSize: 10, fontWeight: '700' },
  }), [tokens]);

  const {
    data: transports = [],
    isLoading: loadingT,
    refetch: refetchT,
  } = useGetMyTransportRequestsQuery(undefined, {
    pollingInterval: 8000,
    refetchOnMountOrArgChange: true,
  });

  const {
    data: bookingsRaw,
    isLoading: loadingB,
    refetch: refetchB,
  } = useGetMyBookingsQuery(undefined, {
    pollingInterval: 8000,
    refetchOnMountOrArgChange: true,
  });

  const {
    data: orders = [],
    isLoading: loadingM,
    refetch: refetchM,
  } = useGetMyOrdersQuery(undefined, {
    pollingInterval: 8000,
    refetchOnMountOrArgChange: true,
  });

  useRefetchOnFocus(() => { refetchT(); refetchB(); refetchM(); });

  const bookings: any[] = Array.isArray(bookingsRaw)
    ? bookingsRaw
    : (bookingsRaw as any)?.bookings ?? [];
  const transportList: any[] = Array.isArray(transports) ? transports : [];
  const orderList: any[] = Array.isArray(orders) ? orders : [];

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchT(), refetchB(), refetchM()]);
    setRefreshing(false);
  };

  const isLoading =
    (activeTab === 'transport' && loadingT) ||
    (activeTab === 'services' && loadingB) ||
    (activeTab === 'marketplace' && loadingM);

  const tabs: { key: Tab; labelKey: string; icon: string }[] = [
    { key: 'transport',   labelKey: 'commandes.tab_transport',   icon: 'truck-fast' },
    { key: 'services',    labelKey: 'commandes.tab_services',    icon: 'briefcase-check' },
    { key: 'marketplace', labelKey: 'commandes.tab_marketplace', icon: 'store' },
  ];

  const renderTransportItem = ({ item }: { item: any }) => {
    const badge = TRANSPORT_STATUS_COLOR[item.status] ?? TRANSPORT_STATUS_COLOR.pending;
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('TransportDetails', { requestId: item.id })}
      >
        <View style={styles.cardRow}>
          <Icon name="map-marker" size={14} color={tokens.text.secondary} />
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.pickupAddress?.split(',')[0] ?? '—'}
          </Text>
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.badgeText, { color: badge.color }]}>
              {t(`status.${item.status}`, { defaultValue: item.status })}
            </Text>
          </View>
        </View>
        {item.deliveryAddress && (
          <View style={styles.cardRow}>
            <Icon name="flag-checkered" size={14} color={tokens.text.secondary} />
            <Text style={styles.cardMeta} numberOfLines={1}>
              {item.deliveryAddress.split(',')[0]}
            </Text>
          </View>
        )}
        {item.totalPrice != null && (
          <View style={styles.cardRow}>
            <Icon name="cash" size={14} color={colors.primary} />
            <Text style={[styles.cardMeta, { color: colors.primary, fontWeight: '700' }]}>
              {formatCurrency(item.totalPrice)}
            </Text>
          </View>
        )}
        {item.scheduledDate && (
          <View style={styles.cardRow}>
            <Icon name="calendar" size={14} color={tokens.text.secondary} />
            <Text style={styles.cardMeta}>
              {new Date(item.scheduledDate).toLocaleDateString(i18n.language, {
                day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
              })}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderBookingItem = ({ item }: { item: any }) => {
    const badge = BOOKING_STATUS_COLOR[item.status] ?? BOOKING_STATUS_COLOR.pending;
    const categoryName = item.category?.nameFr ?? item.category?.slug ?? '—';
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('BookingDetails', { bookingId: item.id })}
      >
        <View style={styles.cardRow}>
          <Icon name="briefcase" size={14} color={tokens.text.secondary} />
          <Text style={styles.cardTitle} numberOfLines={1}>{categoryName}</Text>
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.badgeText, { color: badge.color }]}>
              {t(`status.${item.status}`, { defaultValue: item.status })}
            </Text>
          </View>
        </View>
        {item.address && (
          <View style={styles.cardRow}>
            <Icon name="map-marker" size={14} color={tokens.text.secondary} />
            <Text style={styles.cardMeta} numberOfLines={1}>{item.address}</Text>
          </View>
        )}
        {(item.finalPrice != null || item.estimatedPrice != null) && (
          <View style={styles.cardRow}>
            <Icon name="cash" size={14} color={colors.primary} />
            <Text style={[styles.cardMeta, { color: colors.primary, fontWeight: '700' }]}>
              {formatCurrency(item.finalPrice ?? item.estimatedPrice)}
            </Text>
          </View>
        )}
        {item.scheduledAt && (
          <View style={styles.cardRow}>
            <Icon name="calendar" size={14} color={tokens.text.secondary} />
            <Text style={styles.cardMeta}>
              {new Date(item.scheduledAt).toLocaleDateString(i18n.language, {
                day: '2-digit', month: 'short',
              })}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderOrderItem = ({ item }: { item: any }) => {
    const product = item.items?.[0]?.product;
    return (
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <Icon name="package-variant" size={14} color={tokens.text.secondary} />
          <Text style={styles.cardTitle} numberOfLines={1}>
            {product?.name ?? t('commandes.order_label')}
          </Text>
          <View style={[styles.badge, { backgroundColor: '#F3E8FF' }]}>
            <Text style={[styles.badgeText, { color: '#6B21A8' }]}>
              {t(`order_status.${item.status}`, { defaultValue: item.status })}
            </Text>
          </View>
        </View>
        {item.totalPrice != null && (
          <View style={styles.cardRow}>
            <Icon name="cash" size={14} color={colors.primary} />
            <Text style={[styles.cardMeta, { color: colors.primary, fontWeight: '700' }]}>
              {formatCurrency(item.totalPrice)}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const currentData =
    activeTab === 'transport' ? transportList :
    activeTab === 'services'  ? bookings      : orderList;

  const emptyKey =
    activeTab === 'transport' ? 'commandes.empty_transport' :
    activeTab === 'services'  ? 'commandes.empty_services'  : 'commandes.empty_marketplace';

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabBar}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && { borderBottomColor: tokens.primary }]}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.8}
          >
            <Icon
              name={tab.icon}
              size={16}
              color={activeTab === tab.key ? tokens.primary : tokens.text.secondary}
            />
            <Text style={[styles.tabText, activeTab === tab.key && { color: tokens.primary }]}>
              {t(tab.labelKey)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading && currentData.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : currentData.length === 0 ? (
        <View style={styles.centered}>
          <Icon name="inbox-outline" size={48} color={tokens.border} />
          <Text style={styles.emptyText}>{t(emptyKey)}</Text>
        </View>
      ) : (
        <FlatList
          data={currentData}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
          renderItem={
            activeTab === 'transport' ? renderTransportItem :
            activeTab === 'services'  ? renderBookingItem   : renderOrderItem
          }
        />
      )}
    </View>
  );
};

