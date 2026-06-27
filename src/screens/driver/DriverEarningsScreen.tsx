import React, { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text, Card, ActivityIndicator, Button } from 'react-native-paper';
import { StackScreenProps } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { TFunction } from 'i18next';
import { useStripe } from '@stripe/stripe-react-native';
import { colors } from '../../theme/colors';
import { useAppTheme } from '../../theme/ThemeProvider';
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
  const { tokens } = useAppTheme();


  const styles = useMemo(() => StyleSheet.create({
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
  tabTextActive: { color: tokens.primary, fontWeight: '700' },

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
  totalCard: { marginBottom: spacing.md, backgroundColor: tokens.primary, elevation: 4 },
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
  viewReviewsText: { color: tokens.primary, marginTop: spacing.xs, textAlign: 'center', fontSize: 12 },

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
  }), [tokens]);

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
  }, [deliveries, periodMode, period]);

  // TODO: restore renderItem and JSX return
  return null;
};
