import React, { useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useGetDriverAgendaQuery } from '../../store/api/transportApi';
import { useRefetchOnFocus } from '../../hooks/useRefetchOnFocus';
import { formatCurrency } from '../../config/currency';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

const STATUS_BADGE: Record<string, { color: string; bg: string; icon: string }> = {
  accepted:          { color: '#1E40AF', bg: '#DBEAFE', icon: 'check-circle-outline' },
  heading_to_pickup: { color: '#3730A3', bg: '#E0E7FF', icon: 'navigation' },
  arrived_at_pickup: { color: '#6B21A8', bg: '#F3E8FF', icon: 'map-marker-check' },
  in_transit:        { color: '#065F46', bg: '#D1FAE5', icon: 'truck-fast' },
};

const isToday = (d: Date) => {
  const now = new Date();
  return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
};

export const DriverAgendaScreen = () => {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<any>();
  const [refreshing, setRefreshing] = useState(false);

  const { data = [], isLoading, refetch } = useGetDriverAgendaQuery(undefined, {
    pollingInterval: 5000,
    refetchOnMountOrArgChange: true,
  });
  useRefetchOnFocus(refetch);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const items: any[] = Array.isArray(data) ? data : [];

  const renderItem = ({ item }: { item: any }) => {
    const badge = STATUS_BADGE[item.status] ?? STATUS_BADGE.accepted;
    const clientName = item.client
      ? `${item.client.firstName} ${item.client.lastName ?? ''}`
      : '—';
    const scheduledDate = item.scheduledDate ? new Date(item.scheduledDate) : null;
    const todayFlag = scheduledDate && isToday(scheduledDate);

    return (
      <TouchableOpacity
        style={[styles.card, todayFlag && styles.cardToday]}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('DriverDeliveryDetails', { requestId: item.id })}
      >
        {/* Date stripe */}
        <View style={styles.dateStripe}>
          {scheduledDate ? (
            <>
              <Text style={styles.dateDay}>
                {scheduledDate.toLocaleDateString(i18n.language, { weekday: 'short' }).toUpperCase()}
              </Text>
              <Text style={styles.dateDayNum}>{scheduledDate.getDate()}</Text>
              <Text style={styles.dateTime}>
                {scheduledDate.toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </>
          ) : (
            <Text style={styles.dateTbd}>TBD</Text>
          )}
        </View>

        {/* Content */}
        <View style={styles.cardBody}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.pickupAddress ? item.pickupAddress.split(',')[0] : t('transport.pickup')}
            </Text>
            <View style={[styles.badge, { backgroundColor: badge.bg }]}>
              <Icon name={badge.icon} size={12} color={badge.color} />
              <Text style={[styles.badgeText, { color: badge.color }]}>
                {t(`transport_status.${item.status}`, { defaultValue: item.status })}
              </Text>
            </View>
          </View>

          <View style={styles.cardRow}>
            <Icon name="account" size={14} color={colors.gray} />
            <Text style={styles.cardMeta}>{clientName}</Text>
          </View>

          {item.deliveryAddress ? (
            <View style={styles.cardRow}>
              <Icon name="flag-checkered" size={14} color={colors.gray} />
              <Text style={styles.cardMeta} numberOfLines={1}>
                {item.deliveryAddress.split(',')[0]}
              </Text>
            </View>
          ) : null}

          {item.totalPrice ? (
            <View style={styles.cardRow}>
              <Icon name="cash" size={14} color={colors.primary} />
              <Text style={[styles.cardMeta, { color: colors.primary, fontWeight: '700' }]}>
                {formatCurrency(item.totalPrice)}
              </Text>
            </View>
          ) : null}
        </View>

        <Icon name="chevron-right" size={18} color={colors.border} />
      </TouchableOpacity>
    );
  };

  if (isLoading && items.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={styles.centered}>
        <Icon name="calendar-blank-outline" size={48} color={colors.border} />
        <Text style={styles.emptyText}>{t('driver.no_agenda')}</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={items}
      keyExtractor={(item: any) => item.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
      renderItem={renderItem}
    />
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.light },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  emptyText: { color: colors.gray, fontSize: 14, textAlign: 'center' },

  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.white, borderRadius: 14,
    padding: spacing.md, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.border, gap: spacing.sm,
  },
  cardToday: { borderColor: colors.primary, borderWidth: 1.5 },

  dateStripe: {
    width: 48, alignItems: 'center', justifyContent: 'center',
    paddingRight: spacing.sm, borderRightWidth: 1, borderRightColor: colors.border,
  },
  dateDay: { fontSize: 10, fontWeight: '700', color: colors.gray, letterSpacing: 0.5 },
  dateDayNum: { fontSize: 22, fontWeight: '800', color: colors.dark, lineHeight: 26 },
  dateTime: { fontSize: 10, color: colors.primary, fontWeight: '600' },
  dateTbd: { fontSize: 11, color: colors.gray, fontWeight: '600' },

  cardBody: { flex: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: colors.dark, flex: 1, marginRight: 6 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 20, paddingHorizontal: 7, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  cardMeta: { fontSize: 12, color: colors.gray, flex: 1 },
});
