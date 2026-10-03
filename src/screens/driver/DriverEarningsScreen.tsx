import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { StackScreenProps } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { DriverStackParamList } from '../../navigation/types';
import { useGetDriverStatsQuery, useGetMyDeliveriesQuery } from '../../store/api/transportApi';
import { useRefetchOnFocus } from '../../hooks/useRefetchOnFocus';
import { useDriverIdentity } from '../../hooks/useDriverIdentity';
import { EarningsDashboard } from '../../components/shared/earnings/EarningsDashboard';
import { EarningsStatCard } from '../../components/shared/earnings/EarningsStatCard';
import { EarningListItem } from '../../components/shared/earnings/EarningListItem';
import type { Earnings } from '../../types/earnings';

type Props = StackScreenProps<DriverStackParamList, 'DriverEarnings'>;

interface DeliveryItem {
  id: string;
  date: string | null;
  earnings?: Earnings;
  raw: any;
}

export const DriverEarningsScreen = ({ navigation }: Props) => {
  const { t, i18n } = useTranslation();
  const { icon: vehicleIcon } = useDriverIdentity();

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useGetDriverStatsQuery(undefined, {
    pollingInterval: 30_000,
    refetchOnMountOrArgChange: true,
  });
  const { data: deliveries, isLoading: deliveriesLoading, refetch } = useGetMyDeliveriesQuery(undefined, {
    pollingInterval: 8000,
    refetchOnMountOrArgChange: true,
  });
  useRefetchOnFocus(refetch);
  useRefetchOnFocus(refetchStats);

  const items = useMemo<DeliveryItem[]>(
    () => (deliveries ?? [])
      .filter((d: any) => d.status === 'completed')
      .map((d: any) => ({ id: d.id, date: d.completedAt ?? null, earnings: d.earnings, raw: d })),
    [deliveries],
  );

  const formatDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString(i18n.language, { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const secureBadge = (stats as any)?.hasSecurePaymentBadge ? (
    <View style={styles.badgeContainer}>
      <View style={styles.badge}>
        <Icon name="shield-check" size={16} color={colors.white} />
        <Text variant="bodySmall" style={styles.badgeText}>{t('driver.secure_payment_badge')}</Text>
      </View>
      <Text variant="bodySmall" style={styles.badgeSubtext}>
        {((stats as any)?.inAppPaymentRate || 0).toFixed(0)}% {t('driver.in_app_payments')}
      </Text>
    </View>
  ) : null;

  return (
    <EarningsDashboard<DeliveryItem>
      role="driver"
      loading={statsLoading || deliveriesLoading}
      items={items}
      fallbackCurrency={stats?.currency ?? undefined}
      pendingCommission={(stats as any)?.pendingCashCommission ?? 0}
      onCommissionPaid={refetchStats}
      countLabel={(count) => t('driver.earnings_deliveries_count', { count, s: count > 1 ? 's' : '' })}
      listTitle={(label) => (label ? `${t('driver.deliveries_period_label')} — ${label}` : t('driver.full_history'))}
      emptyLabel={t('driver.no_deliveries_period')}
      totalFooter={secureBadge}
      renderStats={(periodItems, mode) => (
        <>
          <EarningsStatCard
            icon={vehicleIcon}
            iconColor={colors.success}
            value={mode === 'all' ? (stats?.completedDeliveries ?? 0) : periodItems.length}
            label={t('driver.stats_completed')}
          />
          <EarningsStatCard
            icon="star"
            iconColor={colors.warning}
            value={stats?.averageRating ? stats.averageRating.toFixed(1) : '—'}
            label={stats?.averageRating ? t('driver.stats_rating') : t('earnings.no_rating')}
            onPress={() => navigation.navigate('DriverReviews', {})}
            actionLabel={t('driver.view_reviews')}
          />
          <EarningsStatCard
            icon="clock-check"
            iconColor={colors.info}
            value={`${stats?.onTimeRate?.toFixed(0) ?? '0'}%`}
            label={t('driver.on_time_rate')}
          />
          <EarningsStatCard
            icon="cancel"
            iconColor={colors.error}
            value={stats?.cancelledDeliveries ?? 0}
            label={t('driver.cancellations')}
          />
        </>
      )}
      renderItem={(item) => (
        <EarningListItem
          title={t('driver.delivery_id', { id: item.id.slice(0, 8) })}
          lines={[formatDate(item.date)]}
          earnings={item.earnings}
          fallbackCurrency={item.raw.currency}
          meta={[
            { icon: 'map-marker-distance', label: `${item.raw.distance?.toFixed(1) ?? '—'} km` },
            { icon: 'package-variant', label: t('transport.obj_' + item.raw.objectType) },
            { icon: item.raw.paymentMethod === 'cash' ? 'cash' : 'credit-card-outline', label: t(item.raw.paymentMethod === 'cash' ? 'earnings.method_cash' : 'earnings.method_in_app') },
          ]}
          onPress={() =>
            item.raw.payment?.id
              ? navigation.navigate('PaymentDetails', { paymentId: item.raw.payment.id })
              : navigation.navigate('PaymentDetails', { requestId: item.id })
          }
        />
      )}
    />
  );
};

const styles = StyleSheet.create({
  badgeContainer: { marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.3)' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: 4 },
  badgeText: { color: colors.white, fontWeight: 'bold' },
  badgeSubtext: { color: colors.white + 'CC', fontSize: 11 },
});
