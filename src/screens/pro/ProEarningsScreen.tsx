import React, { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Card, ActivityIndicator } from 'react-native-paper';
import { StackScreenProps } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { TFunction } from 'i18next';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../theme/colors';
import { getLocalizedName } from '../../utils/localize';
import { spacing } from '../../theme/spacing';
import { formatCurrency, CURRENCY_PRESETS } from '../../config/currency';
import { ProStackParamList } from '../../navigation/types';
import { useGetProBookingsQuery } from '../../store/api/bookingsApi';
import { useGetProStatsQuery } from '../../store/api/prosApi';
import { useRefetchOnFocus } from '../../hooks/useRefetchOnFocus';
import { RootState } from '../../store';

type PeriodMode = 'daily' | 'weekly' | 'monthly' | 'all';
type Props = StackScreenProps<ProStackParamList, 'ProEarnings'>;

interface PeriodRange { start: Date; end: Date; label: string; sublabel?: string }

const PRO_GREEN = '#10B981';

const getPeriodRange = (mode: PeriodMode, offset: number, t: TFunction, locale: string): PeriodRange => {
  const now = new Date();
  if (mode === 'daily') {
    const d = new Date(now); d.setDate(d.getDate() + offset);
    const start = new Date(d); start.setHours(0, 0, 0, 0);
    const end = new Date(d); end.setHours(23, 59, 59, 999);
    const label = offset === 0 ? t('driver.earnings_today') : offset === -1 ? t('driver.earnings_yesterday') : d.toLocaleDateString(locale, { weekday: 'long', day: '2-digit', month: 'short' });
    return { start, end, label, sublabel: d.toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' }) };
  }
  if (mode === 'weekly') {
    const day = now.getDay();
    const diffToMon = day === 0 ? -6 : 1 - day;
    const mon = new Date(now); mon.setDate(now.getDate() + diffToMon + offset * 7); mon.setHours(0, 0, 0, 0);
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6); sun.setHours(23, 59, 59, 999);
    const label = offset === 0 ? t('driver.earnings_this_week') : offset === -1 ? t('driver.earnings_last_week') : t('driver.earnings_week_of', { date: mon.toLocaleDateString(locale, { day: '2-digit', month: 'short' }) });
    const sublabel = `${mon.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' })} → ${sun.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' })}`;
    return { start: mon, end: sun, label, sublabel };
  }
  if (mode === 'monthly') {
    const start = new Date(now.getFullYear(), now.getMonth() + offset, 1); start.setHours(0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0); end.setHours(23, 59, 59, 999);
    const raw = start.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
    const label = raw.charAt(0).toUpperCase() + raw.slice(1);
    const sublabel = `${start.toLocaleDateString(locale, { day: '2-digit', month: 'short' })} → ${end.toLocaleDateString(locale, { day: '2-digit', month: 'short' })}`;
    return { start, end, label, sublabel: offset === 0 ? t('driver.earnings_this_month') : sublabel };
  }
  return { start: new Date(0), end: new Date(9999, 11, 31), label: t('common.all'), sublabel: t('driver.earnings_since_start') };
};

export const ProEarningsScreen = ({ navigation }: Props) => {
  const { t, i18n } = useTranslation();
  const pro = useSelector((state: RootState) => (state.auth.user as any)?.pro);
  const proId: string = pro?.id ?? '';

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

  const [periodMode, setPeriodMode] = useState<PeriodMode>('monthly');
  const [periodOffset, setPeriodOffset] = useState(0);

  const allBookings: any[] = Array.isArray(bookingsData) ? bookingsData : ((bookingsData as any)?.bookings ?? []);

  const formatAmount = (amount: number) => {
    const currencyCode = 'EGP';
    const preset = CURRENCY_PRESETS[currencyCode as keyof typeof CURRENCY_PRESETS];
    if (!preset) return formatCurrency(amount);
    const rounded = amount.toFixed(preset.decimals);
    const [int, dec] = rounded.split('.');
    const formatted = int.replace(/\B(?=(\d{3})+(?!\d))/g, preset.thousandsSeparator);
    const full = dec ? `${formatted}${preset.decimalSeparator}${dec}` : formatted;
    return preset.position === 'before' ? `${preset.symbol}${full}` : `${full} ${preset.symbol}`;
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(i18n.language, { day: '2-digit', month: 'short', year: 'numeric' });

  const period = useMemo(() => getPeriodRange(periodMode, periodOffset, t, i18n.language), [periodMode, periodOffset, t, i18n.language]);

  const periodBookings = useMemo(() => {
    return allBookings.filter((b) => {
      if (b.status !== 'completed') return false;
      if (periodMode === 'all') return true;
      const date = new Date(b.completedAt ?? b.updatedAt);
      return date >= period.start && date <= period.end;
    });
  }, [allBookings, period, periodMode]);

  const getBookingAmount = (b: any): number => {
    if (b.paymentMethod === 'cash') {
      return b.finalPrice ?? b.cashAmountDeclaredByPro ?? b.cashAmountDeclaredByClient ?? b.estimatedPrice ?? 0;
    }
    return b.finalPrice ?? b.estimatedPrice ?? 0;
  };

  const periodEarnings = useMemo(
    () => periodBookings.reduce((sum, b) => sum + getBookingAmount(b), 0),
    [periodBookings],
  );

  const totalEarnings = useMemo(
    () => allBookings.filter((b) => b.status === 'completed').reduce((sum, b) => sum + getBookingAmount(b), 0),
    [allBookings],
  );

  if (statsLoading || bookingsLoading) {
    return <View style={styles.centerContainer}><ActivityIndicator size="large" color={PRO_GREEN} /></View>;
  }

  const PERIOD_TABS: { key: PeriodMode; label: string }[] = [
    { key: 'daily', label: t('driver.earnings_period_daily') },
    { key: 'weekly', label: t('driver.earnings_period_weekly') },
    { key: 'monthly', label: t('driver.earnings_period_monthly') },
    { key: 'all', label: t('common.all') },
  ];

  const displayRating = (stats as any)?.averageRating > 0 ? ((stats as any).averageRating as number).toFixed(1) : '5.0';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Onglets de période */}
      <View style={styles.tabsContainer}>
        {PERIOD_TABS.map(({ key, label }) => (
          <TouchableOpacity key={key} onPress={() => { setPeriodMode(key); setPeriodOffset(0); }} style={[styles.tab, periodMode === key && styles.tabActive]}>
            <Text style={[styles.tabText, periodMode === key && styles.tabTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Navigateur de période */}
      {periodMode !== 'all' && (
        <View style={styles.periodNav}>
          <TouchableOpacity onPress={() => setPeriodOffset(o => o - 1)} style={styles.navArrow}>
            <Icon name="chevron-left" size={28} color={PRO_GREEN} />
          </TouchableOpacity>
          <View style={styles.periodLabelContainer}>
            <Text style={styles.periodLabel}>{period.label}</Text>
            {period.sublabel && period.sublabel !== period.label && (
              <Text style={styles.periodSublabel}>{period.sublabel}</Text>
            )}
          </View>
          <TouchableOpacity onPress={() => setPeriodOffset(o => Math.min(o + 1, 0))} style={[styles.navArrow, periodOffset >= 0 && styles.navArrowDisabled]} disabled={periodOffset >= 0}>
            <Icon name="chevron-right" size={28} color={periodOffset >= 0 ? colors.gray : PRO_GREEN} />
          </TouchableOpacity>
        </View>
      )}

      {/* Carte gains */}
      <Card style={styles.totalCard}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.totalLabel}>
            💰 {periodMode === 'all' ? t('driver.earnings_total') : t('driver.earnings_period')}
          </Text>
          <Text variant="displayMedium" style={styles.totalAmount}>
            {formatAmount(periodMode === 'all' ? totalEarnings : periodEarnings)}
          </Text>
          <Text variant="bodySmall" style={styles.totalSubtext}>
            {periodMode === 'all'
              ? t('driver.earnings_since_start')
              : t('pro_space.earnings_bookings_count', { count: periodBookings.length })}
          </Text>
        </Card.Content>
      </Card>

      {/* Grille stats */}
      <View style={styles.statsGrid}>
        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <Icon name="briefcase-check-outline" size={32} color={colors.success} />
            <Text variant="headlineSmall" style={styles.statNumber}>
              {periodMode === 'all' ? ((stats as any)?.completedBookings ?? 0) : periodBookings.length}
            </Text>
            <Text variant="bodySmall" style={styles.statLabel}>{t('pro_space.stats_completed')}</Text>
          </Card.Content>
        </Card>

        <TouchableOpacity style={styles.statCard} onPress={() => navigation.navigate('ProReviews', {})}>
          <Card style={styles.clickableCard}>
            <Card.Content style={styles.statContent}>
              <Icon name="star" size={32} color={colors.warning} />
              <Text variant="headlineSmall" style={styles.statNumber}>{displayRating}</Text>
              <Text variant="bodySmall" style={styles.statLabel}>{t('driver.stats_rating')}</Text>
              <Text variant="bodySmall" style={styles.viewReviewsText}>👁️ {t('driver.view_reviews')}</Text>
            </Card.Content>
          </Card>
        </TouchableOpacity>

        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <Icon name="check-circle-outline" size={32} color={colors.info} />
            <Text variant="headlineSmall" style={styles.statNumber}>
              {Math.round((stats as any)?.acceptanceRate ?? 0)}%
            </Text>
            <Text variant="bodySmall" style={styles.statLabel}>{t('pros.acceptance_rate', { rate: Math.round((stats as any)?.acceptanceRate ?? 0) })}</Text>
          </Card.Content>
        </Card>

        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <Icon name="cancel" size={32} color={colors.error} />
            <Text variant="headlineSmall" style={styles.statNumber}>
              {allBookings.filter((b) => b.status === 'cancelled').length}
            </Text>
            <Text variant="bodySmall" style={styles.statLabel}>{t('driver.cancellations')}</Text>
          </Card.Content>
        </Card>
      </View>

      {/* Liste missions de la période */}
      <View style={styles.recentSection}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          📊 {periodMode === 'all' ? t('pro_space.full_history') : `${t('pro_space.bookings_period_label')} — ${period.label}`}
        </Text>
        {periodBookings.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content style={styles.emptyContent}>
              <Icon name="cash-remove" size={48} color={colors.gray} />
              <Text variant="bodyMedium" style={styles.emptyText}>{t('pro_space.no_bookings_period')}</Text>
            </Card.Content>
          </Card>
        ) : (
          periodBookings.map((booking) => {
            const serviceName =
              (booking.serviceOffering?.category
                ? getLocalizedName(booking.serviceOffering.category, i18n.language)
                : null) ||
              ((booking as any).category
                ? getLocalizedName((booking as any).category, i18n.language)
                : null) ||
              '—';
            const clientName = booking.client ? `${booking.client.firstName} ${booking.client.lastName}` : '—';
            const amount = getBookingAmount(booking);
            const isCash = booking.paymentMethod === 'cash';
            return (
              <TouchableOpacity key={booking.id} onPress={() => navigation.navigate('ProBookingDetails', { bookingId: booking.id })}>
                <Card style={styles.earningCard}>
                  <Card.Content>
                    <View style={styles.earningHeader}>
                      <View style={styles.earningInfo}>
                        <Text variant="titleSmall" style={styles.earningTitle}>{serviceName}</Text>
                        <Text variant="bodySmall" style={styles.earningDate}>{clientName}</Text>
                        <Text variant="bodySmall" style={styles.earningDate}>{formatDate(booking.completedAt ?? booking.updatedAt)}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text variant="titleMedium" style={styles.earningAmount}>{formatAmount(amount)}</Text>
                        {booking.finalPrice && <Text variant="bodySmall" style={{ color: colors.gray, fontSize: 10 }}>{t('pro_space.final')}</Text>}
                      </View>
                    </View>
                    <View style={styles.earningMeta}>
                      <View style={styles.earningDetail}>
                        <Icon name={isCash ? 'cash' : 'credit-card-outline'} size={14} color={colors.gray} />
                        <Text variant="bodySmall" style={styles.earningDetailText}>
                          {isCash ? t('payment.cash') : t('payment.card')}
                        </Text>
                      </View>
                      {booking.address && (
                        <View style={styles.earningDetail}>
                          <Icon name="map-marker-outline" size={14} color={colors.gray} />
                          <Text variant="bodySmall" style={styles.earningDetailText} numberOfLines={1}>
                            {booking.address}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#E5E7EB' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Icon name="chevron-right" size={14} color={PRO_GREEN} />
                        <Text variant="bodySmall" style={{ color: PRO_GREEN, fontSize: 11 }}>{t('common.details')}</Text>
                      </View>
                    </View>
                  </Card.Content>
                </Card>
              </TouchableOpacity>
            );
          })
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: spacing.md, paddingBottom: spacing.xl * 2 },

  tabsContainer: { flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 10, padding: 4, marginBottom: spacing.md },
  tab: { flex: 1, paddingVertical: spacing.xs, paddingHorizontal: 4, borderRadius: 8, alignItems: 'center' },
  tabActive: { backgroundColor: colors.white, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  tabText: { fontSize: 11, color: colors.gray, fontWeight: '500', textAlign: 'center' },
  tabTextActive: { color: PRO_GREEN, fontWeight: '700' },

  periodNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.white, borderRadius: 10, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, marginBottom: spacing.md, elevation: 2 },
  navArrow: { padding: 4 },
  navArrowDisabled: { opacity: 0.3 },
  periodLabelContainer: { flex: 1, alignItems: 'center' },
  periodLabel: { fontSize: 15, fontWeight: '700', color: '#111827', textAlign: 'center' },
  periodSublabel: { fontSize: 12, color: colors.gray, marginTop: 2, textAlign: 'center' },

  totalCard: { marginBottom: spacing.md, backgroundColor: PRO_GREEN, elevation: 4 },
  totalLabel: { color: colors.white, marginBottom: spacing.xs },
  totalAmount: { color: colors.white, fontWeight: 'bold', marginBottom: spacing.xs },
  totalSubtext: { color: 'rgba(255,255,255,0.8)' },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  statCard: { width: '48%', backgroundColor: colors.white, elevation: 2 },
  clickableCard: { backgroundColor: 'transparent', elevation: 0 },
  statContent: { alignItems: 'center', paddingVertical: spacing.md },
  statNumber: { fontWeight: 'bold', marginTop: spacing.xs },
  statLabel: { color: colors.gray, marginTop: spacing.xs, textAlign: 'center' },
  viewReviewsText: { color: PRO_GREEN, marginTop: spacing.xs, textAlign: 'center', fontSize: 12 },

  recentSection: { marginTop: spacing.md },
  sectionTitle: { fontWeight: 'bold', marginBottom: spacing.md },
  emptyCard: { backgroundColor: colors.white, elevation: 2 },
  emptyContent: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyText: { color: colors.gray, marginTop: spacing.md },
  earningCard: { marginBottom: spacing.sm, backgroundColor: colors.white, elevation: 2 },
  earningHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm },
  earningInfo: { flex: 1 },
  earningTitle: { fontWeight: 'bold', marginBottom: 2 },
  earningDate: { color: colors.gray, fontSize: 12 },
  earningAmount: { fontWeight: 'bold', color: colors.success },
  earningMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: 6 },
  earningDetail: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  earningDetailText: { color: colors.gray, fontSize: 12, flexShrink: 1 },
});
