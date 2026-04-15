import React, { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text, Card, ActivityIndicator, Button } from 'react-native-paper';
import { StackScreenProps } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { TFunction } from 'i18next';
import { useStripe } from '@stripe/stripe-react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { formatCurrency, CURRENCY_PRESETS } from '../../config/currency';
import { DriverStackParamList } from '../../navigation/types';
import { useGetDriverStatsQuery, useGetMyDeliveriesQuery, usePayCommissionMutation } from '../../store/api/transportApi';
import { useRefetchOnFocus } from '../../hooks/useRefetchOnFocus';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

type PeriodMode = 'daily' | 'weekly' | 'monthly' | 'all';

type Props = StackScreenProps<DriverStackParamList, 'DriverEarnings'>;

interface PeriodRange {
  start: Date;
  end: Date;
  label: string;
  sublabel?: string;
}

const getPeriodRange = (mode: PeriodMode, offset: number, t: TFunction, locale: string): PeriodRange => {
  const now = new Date();

  if (mode === 'daily') {
    const d = new Date(now);
    d.setDate(d.getDate() + offset);
    const start = new Date(d); start.setHours(0, 0, 0, 0);
    const end = new Date(d); end.setHours(23, 59, 59, 999);
    const label =
      offset === 0 ? t('driver.earnings_today') :
      offset === -1 ? t('driver.earnings_yesterday') :
      d.toLocaleDateString(locale, { weekday: 'long', day: '2-digit', month: 'short' });
    const sublabel = d.toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' });
    return { start, end, label, sublabel };
  }

  if (mode === 'weekly') {
    const day = now.getDay();
    const diffToMon = day === 0 ? -6 : 1 - day;
    const mon = new Date(now);
    mon.setDate(now.getDate() + diffToMon + offset * 7);
    mon.setHours(0, 0, 0, 0);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    sun.setHours(23, 59, 59, 999);
    const label = offset === 0 ? t('driver.earnings_this_week') : offset === -1 ? t('driver.earnings_last_week') : t('driver.earnings_week_of', { date: mon.toLocaleDateString(locale, { day: '2-digit', month: 'short' }) });
    const sublabel = `${mon.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' })} → ${sun.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' })}`;
    return { start: mon, end: sun, label, sublabel };
  }

  if (mode === 'monthly') {
    const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
    end.setHours(23, 59, 59, 999);
    const raw = start.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
    const label = raw.charAt(0).toUpperCase() + raw.slice(1);
    const sublabel = `${start.toLocaleDateString(locale, { day: '2-digit', month: 'short' })} → ${end.toLocaleDateString(locale, { day: '2-digit', month: 'short' })}`;
    return { start, end, label, sublabel: offset === 0 ? t('driver.earnings_this_month') : sublabel };
  }

  // all
  return { start: new Date(0), end: new Date(9999, 11, 31), label: t('common.all'), sublabel: t('driver.earnings_since_start') };
};

export const DriverEarningsScreen = ({ navigation }: Props) => {
  const { t, i18n } = useTranslation();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
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
  const [payCommission, { isLoading: payingCommission }] = usePayCommissionMutation();
  const [commissionPaid, setCommissionPaid] = useState(false);

  const handlePayCommissionOnline = async () => {
    try {
      // 1. Créer le PaymentIntent côté backend
      const result = await payCommission().unwrap();

      // 2. Initialiser le Payment Sheet Stripe
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'CheckAll@t',
        paymentIntentClientSecret: result.clientSecret,
        allowsDelayedPaymentMethods: false,
      });

      if (initError) {
        Alert.alert(t('common.error'), initError.message);
        return;
      }

      // 3. Présenter le Payment Sheet à l'utilisateur
      const { error: payError } = await presentPaymentSheet();

      if (payError) {
        if (payError.code !== 'Canceled') {
          Alert.alert(t('common.error'), payError.message);
        }
        return;
      }

      // 4. Succès — masquage optimiste immédiat + refetch en arrière-plan
      setCommissionPaid(true);
      refetchStats();
      Alert.alert(
        t('payment.success_title'),
        t('driver.commission_paid_success_msg'),
        [{ text: t('common.ok') }],
      );
    } catch (error: any) {
      Alert.alert(
        t('common.error'),
        error?.data?.message || t('driver.commission_payment_error'),
      );
    }
  };

  const [periodMode, setPeriodMode] = useState<PeriodMode>('monthly');
  const [periodOffset, setPeriodOffset] = useState(0);

  const formatAmount = (amount: number) => {
    const currencyCode = stats?.currency || 'EUR';
    const preset = CURRENCY_PRESETS[currencyCode as keyof typeof CURRENCY_PRESETS];
    if (!preset) return formatCurrency(amount);
    const rounded = amount.toFixed(preset.decimals);
    const [integerPart, decimalPart] = rounded.split('.');
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, preset.thousandsSeparator);
    const formattedAmount = decimalPart
      ? `${formattedInteger}${preset.decimalSeparator}${decimalPart}`
      : formattedInteger;
    return preset.position === 'before'
      ? `${preset.symbol}${formattedAmount}`
      : `${formattedAmount} ${preset.symbol}`;
  };

  const formatDate = (isoDate: string) =>
    new Date(isoDate).toLocaleDateString(i18n.language, { day: '2-digit', month: 'short', year: 'numeric' });

  const period = useMemo(() => getPeriodRange(periodMode, periodOffset, t, i18n.language), [periodMode, periodOffset, t, i18n.language]);

  const periodDeliveries = useMemo(() => {
    if (!deliveries) return [];
    return deliveries.filter((d: any) => {
      if (d.status !== 'completed') return false;
      if (periodMode === 'all') return true;
      const date = new Date(d.completedAt);
      return date >= period.start && date <= period.end;
    });
  }, [deliveries, period, periodMode]);

  const periodEarnings = useMemo(
    () => periodDeliveries.reduce((sum: number, d: any) => sum + ((d as any).payment?.proNetAmount ?? d.price ?? d.totalPrice ?? 0), 0),
    [periodDeliveries],
  );

  const handlePrev = () => setPeriodOffset(o => o - 1);
  const handleNext = () => setPeriodOffset(o => Math.min(o + 1, 0));
  const handleModeChange = (mode: PeriodMode) => {
    setPeriodMode(mode);
    setPeriodOffset(0);
  };

  if (statsLoading || deliveriesLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const PERIOD_TABS: { key: PeriodMode; label: string }[] = [
    { key: 'daily', label: t('driver.earnings_period_daily') },
    { key: 'weekly', label: t('driver.earnings_period_weekly') },
    { key: 'monthly', label: t('driver.earnings_period_monthly') },
    { key: 'all', label: t('common.all') },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Alerte commission cash pendante */}
      {(stats as any)?.pendingCashCommission > 0 && !commissionPaid && (
        <View style={styles.commissionAlert}>
          <Icon name="alert-circle" size={20} color={colors.warning} style={{ marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.commissionAlertTitle}>
              {t('driver.cash_commission_due_title')}
            </Text>
            <Text style={styles.commissionAlertText}>
              {t('driver.cash_commission_due_msg', {
                amount: formatAmount((stats as any).pendingCashCommission),
              })}
            </Text>
            <Button
              mode="contained"
              onPress={handlePayCommissionOnline}
              loading={payingCommission}
              disabled={payingCommission}
              buttonColor={colors.warning}
              textColor="#7B5800"
              style={styles.commissionPayButton}
              labelStyle={{ fontSize: 13, fontWeight: '700' }}
              icon="credit-card"
            >
              {t('driver.pay_commission_online')}
            </Button>
          </View>
        </View>
      )}

      {/* Onglets de période */}
      <View style={styles.tabsContainer}>
        {PERIOD_TABS.map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            onPress={() => handleModeChange(key)}
            style={[styles.tab, periodMode === key && styles.tabActive]}
          >
            <Text style={[styles.tabText, periodMode === key && styles.tabTextActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Navigateur de période */}
      {periodMode !== 'all' && (
        <View style={styles.periodNav}>
          <TouchableOpacity onPress={handlePrev} style={styles.navArrow}>
            <Icon name="chevron-left" size={28} color={colors.primary} />
          </TouchableOpacity>

          <View style={styles.periodLabelContainer}>
            <Text style={styles.periodLabel}>{period.label}</Text>
            {period.sublabel && period.sublabel !== period.label && (
              <Text style={styles.periodSublabel}>{period.sublabel}</Text>
            )}
          </View>

          <TouchableOpacity
            onPress={handleNext}
            style={[styles.navArrow, periodOffset >= 0 && styles.navArrowDisabled]}
            disabled={periodOffset >= 0}
          >
            <Icon name="chevron-right" size={28} color={periodOffset >= 0 ? colors.gray : colors.primary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Carte gains de la période */}
      <Card style={styles.totalCard}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.totalLabel}>
            💰 {periodMode === 'all' ? t('driver.earnings_total') : t('driver.earnings_period')}
          </Text>
          <Text variant="displayMedium" style={styles.totalAmount}>
            {formatAmount(periodMode === 'all' ? (stats?.totalEarnings || 0) : periodEarnings)}
          </Text>
          <Text variant="bodySmall" style={styles.totalSubtext}>
            {periodMode === 'all'
              ? t('driver.earnings_since_start')
              : t('driver.earnings_deliveries_count', {
                  count: periodDeliveries.length,
                  s: periodDeliveries.length > 1 ? 's' : '',
                })}
          </Text>

          {/* Badge Paiement Sécurisé */}
          {(stats as any)?.hasSecurePaymentBadge && (
            <View style={styles.badgeContainer}>
              <View style={styles.badge}>
                <Icon name="shield-check" size={16} color={colors.success} />
                <Text variant="bodySmall" style={styles.badgeText}>
                  🏆 {t('driver.secure_payment_badge')}
                </Text>
              </View>
              <Text variant="bodySmall" style={styles.badgeSubtext}>
                {((stats as any)?.inAppPaymentRate || 0).toFixed(0)}% {t('driver.in_app_payments')}
              </Text>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* Grille statistiques globales */}
      <View style={styles.statsGrid}>
        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <Icon name="truck-check" size={32} color={colors.success} />
            <Text variant="headlineSmall" style={styles.statNumber}>
              {periodMode === 'all' ? (stats?.completedDeliveries || 0) : periodDeliveries.length}
            </Text>
            <Text variant="bodySmall" style={styles.statLabel}>
              {t('driver.stats_completed')}
            </Text>
          </Card.Content>
        </Card>

        <TouchableOpacity style={styles.statCard} onPress={() => navigation.navigate('DriverReviews', {})}>
          <Card style={styles.clickableCard}>
            <Card.Content style={styles.statContent}>
              <Icon name="star" size={32} color={colors.warning} />
              <Text variant="headlineSmall" style={styles.statNumber}>
                {stats?.averageRating?.toFixed(1) || '0.0'}
              </Text>
              <Text variant="bodySmall" style={styles.statLabel}>{t('driver.stats_rating')}</Text>
              <Text variant="bodySmall" style={styles.viewReviewsText}>👁️ {t('driver.view_reviews')}</Text>
            </Card.Content>
          </Card>
        </TouchableOpacity>

        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <Icon name="clock-check" size={32} color={colors.info} />
            <Text variant="headlineSmall" style={styles.statNumber}>
              {stats?.onTimeRate?.toFixed(0) || '0'}%
            </Text>
            <Text variant="bodySmall" style={styles.statLabel}>{t('driver.on_time_rate')}</Text>
          </Card.Content>
        </Card>

        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <Icon name="cancel" size={32} color={colors.error} />
            <Text variant="headlineSmall" style={styles.statNumber}>
              {stats?.cancelledDeliveries || 0}
            </Text>
            <Text variant="bodySmall" style={styles.statLabel}>{t('driver.cancellations')}</Text>
          </Card.Content>
        </Card>
      </View>

      {/* Liste livraisons de la période */}
      <View style={styles.recentSection}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          📊 {periodMode === 'all' ? t('driver.full_history') : `${t('driver.deliveries_period_label')} — ${period.label}`}
        </Text>

        {periodDeliveries.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content style={styles.emptyContent}>
              <Icon name="cash-remove" size={48} color={colors.gray} />
              <Text variant="bodyMedium" style={styles.emptyText}>
                {t('driver.no_deliveries_period')}
              </Text>
            </Card.Content>
          </Card>
        ) : (
          periodDeliveries.map((delivery: any) => (
            <TouchableOpacity
              key={delivery.id}
              onPress={() => {
                const pmtId = (delivery as any).payment?.id;
                if (pmtId) {
                  navigation.navigate('PaymentDetails', { paymentId: pmtId });
                } else {
                  navigation.navigate('PaymentDetails', { requestId: delivery.id });
                }
              }}
            >
              <Card style={styles.earningCard}>
                <Card.Content>
                  <View style={styles.earningHeader}>
                    <View style={styles.earningInfo}>
                      <Text variant="titleSmall" style={styles.earningTitle}>
                        {t('driver.delivery_id', { id: delivery.id.slice(0, 8) })}
                      </Text>
                      <Text variant="bodySmall" style={styles.earningDate}>
                        {formatDate(delivery.completedAt)}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text variant="titleMedium" style={styles.earningAmount}>
                        {(delivery as any).payment?.proNetAmount
                          ? formatAmount((delivery as any).payment.proNetAmount)
                          : formatAmount(delivery.price || delivery.totalPrice || 0)}
                      </Text>
                      {(delivery as any).payment?.proNetAmount && (
                        <Text variant="bodySmall" style={{ color: colors.gray, fontSize: 10 }}>
                          {t('driver.net')}
                        </Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.earningDetails}>
                    <View style={styles.earningDetail}>
                      <Icon name="map-marker-distance" size={16} color={colors.gray} />
                      <Text variant="bodySmall" style={styles.earningDetailText}>
                        {delivery.distance?.toFixed(1)} km
                      </Text>
                    </View>
                    <View style={styles.earningDetail}>
                      <Icon name="package-variant" size={16} color={colors.gray} />
                      <Text variant="bodySmall" style={styles.earningDetailText}>
                        {t('transport.obj_' + delivery.objectType)}
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#E5E7EB' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Icon name="chevron-right" size={14} color={colors.primary} />
                      <Text variant="bodySmall" style={{ color: colors.primary, fontSize: 11 }}>
                        {t('common.details')}
                      </Text>
                    </View>
                  </View>
                </Card.Content>
              </Card>
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: spacing.md, paddingBottom: spacing.xl * 2 },

  // Onglets de période
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.lightGray || '#F3F4F6',
    borderRadius: 10,
    padding: 4,
    marginBottom: spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.xs,
    paddingHorizontal: 4,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: { fontSize: 11, color: colors.gray, fontWeight: '500', textAlign: 'center' },
  tabTextActive: { color: colors.primary, fontWeight: '700' },

  // Navigateur de période
  periodNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: 10,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    elevation: 2,
  },
  navArrow: { padding: 4 },
  navArrowDisabled: { opacity: 0.3 },
  periodLabelContainer: { flex: 1, alignItems: 'center' },
  periodLabel: { fontSize: 15, fontWeight: '700', color: '#111827', textAlign: 'center' },
  periodSublabel: { fontSize: 12, color: colors.gray, marginTop: 2, textAlign: 'center' },

  // Carte totaux
  totalCard: { marginBottom: spacing.md, backgroundColor: colors.primary, elevation: 4 },
  totalLabel: { color: colors.white, marginBottom: spacing.xs },
  totalAmount: { color: colors.white, fontWeight: 'bold', marginBottom: spacing.xs },
  totalSubtext: { color: colors.white + 'CC' },
  badgeContainer: { marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.3)' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: 4 },
  badgeText: { color: colors.white, fontWeight: 'bold' },
  badgeSubtext: { color: colors.white + 'CC', fontSize: 11 },

  // Stats grid
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  statCard: { width: '48%', backgroundColor: colors.white, elevation: 2 },
  clickableCard: { backgroundColor: 'transparent', elevation: 0 },
  statContent: { alignItems: 'center', paddingVertical: spacing.md },
  statNumber: { fontWeight: 'bold', marginTop: spacing.xs },
  statLabel: { color: colors.gray, marginTop: spacing.xs, textAlign: 'center' },
  viewReviewsText: { color: colors.primary, marginTop: spacing.xs, textAlign: 'center', fontSize: 12 },

  // Liste
  recentSection: { marginTop: spacing.md },
  sectionTitle: { fontWeight: 'bold', marginBottom: spacing.md },
  emptyCard: { backgroundColor: colors.white, elevation: 2 },
  emptyContent: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyText: { color: colors.gray, marginTop: spacing.md },
  earningCard: { marginBottom: spacing.sm, backgroundColor: colors.white, elevation: 2 },
  earningHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm },
  earningInfo: { flex: 1 },
  earningTitle: { fontWeight: 'bold', marginBottom: 4 },
  earningDate: { color: colors.gray },
  earningAmount: { fontWeight: 'bold', color: colors.success },
  earningDetails: { flexDirection: 'row', gap: spacing.md },
  earningDetail: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  earningDetailText: { color: colors.gray },

  commissionAlert: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: '#FFF8E1',
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  commissionAlertTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#7B5800',
    marginBottom: 2,
  },
  commissionAlertText: {
    fontSize: 13,
    color: '#7B5800',
    lineHeight: 18,
  },
  commissionPayButton: {
    marginTop: spacing.sm,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
});
