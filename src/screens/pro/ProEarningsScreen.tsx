import React, { useMemo } from 'react';
import { StackScreenProps } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { colors } from '../../theme/colors';
import { getLocalizedName } from '../../utils/localize';
import { useCurrencyFormatter } from '../../hooks/useCurrencyFormatter';
import { ProStackParamList } from '../../navigation/types';
import { useGetProBookingsQuery } from '../../store/api/bookingsApi';
import { useGetProStatsQuery } from '../../store/api/prosApi';
import { useRefetchOnFocus } from '../../hooks/useRefetchOnFocus';
import { RootState } from '../../store';
import { EarningsDashboard } from '../../components/shared/earnings/EarningsDashboard';
import { EarningsStatCard } from '../../components/shared/earnings/EarningsStatCard';
import { EarningListItem } from '../../components/shared/earnings/EarningListItem';
import type { Earnings } from '../../types/earnings';

type Props = StackScreenProps<ProStackParamList, 'ProEarnings'>;

interface BookingItem {
  id: string;
  date: string | null;
  earnings?: Earnings;
  raw: any;
}

export const ProEarningsScreen = ({ navigation }: Props) => {
  const { t, i18n } = useTranslation();
  const { currencyCode: activeCurrencyCode } = useCurrencyFormatter();
  const proId: string = useSelector((state: RootState) => (state.auth.user as any)?.pro?.id ?? '');

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useGetProStatsQuery(proId, {
    pollingInterval: 30_000,
    refetchOnMountOrArgChange: true,
    skip: !proId,
  });
  const { data: bookingsData, isLoading: bookingsLoading, refetch } = useGetProBookingsQuery(proId, {
    pollingInterval: 8000,
    refetchOnMountOrArgChange: true,
    skip: !proId,
  });
  useRefetchOnFocus(refetch);
  useRefetchOnFocus(refetchStats);

  const allBookings: any[] = Array.isArray(bookingsData) ? bookingsData : ((bookingsData as any)?.bookings ?? []);
  const items = useMemo<BookingItem[]>(
    () => allBookings
      .filter((b) => b.status === 'completed')
      .map((b) => ({ id: b.id, date: b.completedAt ?? b.updatedAt ?? null, earnings: b.earnings, raw: b })),
    [allBookings],
  );
  const cancelledCount = useMemo(() => allBookings.filter((b) => b.status === 'cancelled').length, [allBookings]);

  const s = stats as any;
  const formatDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString(i18n.language, { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  return (
    <EarningsDashboard<BookingItem>
      role="pro"
      loading={statsLoading || bookingsLoading}
      items={items}
      fallbackCurrency={s?.currency ?? activeCurrencyCode}
      pendingCommission={s?.pendingCashCommission ?? 0}
      onCommissionPaid={refetchStats}
      countLabel={(count) => t('pro_space.earnings_bookings_count', { count })}
      listTitle={(label) => (label ? `${t('pro_space.bookings_period_label')} — ${label}` : t('pro_space.full_history'))}
      emptyLabel={t('pro_space.no_bookings_period')}
      renderStats={(periodItems, mode) => (
        <>
          <EarningsStatCard
            icon="briefcase-check-outline"
            iconColor={colors.success}
            value={mode === 'all' ? (s?.completedBookings ?? 0) : periodItems.length}
            label={t('pro_space.stats_completed')}
          />
          <EarningsStatCard
            icon="star"
            iconColor={colors.warning}
            value={s?.averageRating > 0 ? (s.averageRating as number).toFixed(1) : '—'}
            label={s?.averageRating > 0 ? t('driver.stats_rating') : t('earnings.no_rating')}
            onPress={() => navigation.navigate('ProReviews', {})}
            actionLabel={t('driver.view_reviews')}
          />
          <EarningsStatCard
            icon="check-circle-outline"
            iconColor={colors.info}
            value={`${Math.round(s?.acceptanceRate ?? 0)}%`}
            label={t('earnings.acceptance')}
          />
          <EarningsStatCard
            icon="cancel"
            iconColor={colors.error}
            value={cancelledCount}
            label={t('driver.cancellations')}
          />
        </>
      )}
      renderItem={(item) => {
        const b = item.raw;
        const category = b.serviceOffering?.category ?? b.category;
        const isCash = b.paymentMethod === 'cash';
        return (
          <EarningListItem
            title={(category ? getLocalizedName(category, i18n.language) : null) || '—'}
            lines={[b.client ? `${b.client.firstName} ${b.client.lastName}` : '—', formatDate(item.date)]}
            earnings={item.earnings}
            fallbackCurrency={b.currency}
            meta={[
              { icon: isCash ? 'cash' : 'credit-card-outline', label: t(isCash ? 'earnings.method_cash' : 'earnings.method_in_app') },
              ...(b.address ? [{ icon: 'map-marker-outline', label: b.address as string }] : []),
            ]}
            onPress={() => navigation.navigate('ProBookingDetails', { bookingId: item.id })}
          />
        );
      }}
    />
  );
};
