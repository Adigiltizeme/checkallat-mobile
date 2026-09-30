import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useGetMyEarningsQuery, EarningStatus } from '../../store/api/payoutsApi';
import { useRefetchOnFocus } from '../../hooks/useRefetchOnFocus';
import { useCurrencyFormatter } from '../../hooks/useCurrencyFormatter';
import { useAppTheme } from '../../theme/ThemeProvider';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

interface Props {
  role: 'driver' | 'pro';
  /** Devise de repli si aucun gain n'en porte encore */
  fallbackCurrency?: string;
}

const STATUS_COLORS: Record<EarningStatus, string> = {
  on_hold: '#6366F1',
  blocked: '#EA580C',
  pending: '#CA8A04',
  processing: '#2563EB',
  paid: '#16A34A',
  failed: '#DC2626',
  cancelled: '#6B7280',
};

/**
 * Gains gardés de côté par la plateforme jusqu'au versement : en garantie, disponibles,
 * en cours de virement, commission cash due et prochain versement. Commun chauffeurs / prestataires.
 */
export const PayoutBalanceCard: React.FC<Props> = ({ role, fallbackCurrency }) => {
  const { t, i18n } = useTranslation();
  const { tokens } = useAppTheme();
  const { formatWithCurrency, format } = useCurrencyFormatter();
  const { data, isLoading, refetch } = useGetMyEarningsQuery(role, {
    pollingInterval: 30_000,
    refetchOnMountOrArgChange: true,
  });
  useRefetchOnFocus(refetch);

  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  const currency = data?.payouts.find((p) => p.currency)?.currency ?? fallbackCurrency;
  const money = (n: number) => (currency ? formatWithCurrency(n, currency) : format(n));
  const date = (iso: string, withTime = false) =>
    new Date(iso).toLocaleDateString(i18n.language, {
      day: 'numeric',
      month: 'short',
      ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
    });

  if (isLoading) {
    return (
      <View style={[styles.card, styles.center]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (!data) return null;

  const commission = data.pendingCashCommission ?? 0;
  const offsetOnNext = data.netCashCommissions && data.available > 0 && commission > 0;
  const nextAmount = Math.max(0, data.available - (data.netCashCommissions ? Math.min(commission, data.available) : 0));

  const rows: { key: string; label: string; value: number; color: string; hint?: string }[] = [
    {
      key: 'available',
      label: t('earnings.available'),
      value: data.available,
      color: STATUS_COLORS.pending,
    },
    {
      key: 'on_hold',
      label: t('earnings.on_hold'),
      value: data.onHold,
      color: STATUS_COLORS.on_hold,
      hint: data.onHold > 0 && data.nextReleaseAt ? t('earnings.on_hold_until', { date: date(data.nextReleaseAt, true) }) : undefined,
    },
    { key: 'processing', label: t('earnings.processing'), value: data.processing, color: STATUS_COLORS.processing },
    {
      key: 'blocked',
      label: t('earnings.blocked'),
      value: data.blocked,
      color: STATUS_COLORS.blocked,
      hint: data.blocked > 0 ? t('earnings.blocked_hint') : undefined,
    },
  ].filter((r) => r.key === 'available' || r.key === 'on_hold' || r.value > 0);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Icon name="piggy-bank-outline" size={22} color={colors.primary} />
        <Text style={styles.title}>{t('earnings.title')}</Text>
      </View>
      <Text style={styles.subtitle}>{t('earnings.subtitle', { days: data.holdDays })}</Text>

      {rows.map((r) => (
        <View key={r.key} style={styles.row}>
          <View style={[styles.dot, { backgroundColor: r.color }]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.rowLabel}>{r.label}</Text>
            {r.hint && <Text style={styles.rowHint}>{r.hint}</Text>}
          </View>
          <Text style={styles.rowValue}>{money(r.value)}</Text>
        </View>
      ))}

      {commission > 0 && (
        <View style={styles.row}>
          <View style={[styles.dot, { backgroundColor: colors.error }]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.rowLabel}>{t('earnings.cash_commission_due')}</Text>
            <Text style={styles.rowHint}>
              {offsetOnNext ? t('earnings.cash_commission_offset') : t('earnings.cash_commission_pay_hint')}
            </Text>
          </View>
          <Text style={[styles.rowValue, { color: colors.error }]}>− {money(commission)}</Text>
        </View>
      )}

      <View style={styles.next}>
        <Text style={styles.nextLabel}>{t('earnings.next_payout')}</Text>
        <Text style={styles.nextValue}>{money(nextAmount)}</Text>
        <Text style={styles.nextHint}>
          {data.payoutMode === 'automatic' && data.nextPayoutAt
            ? t('earnings.next_payout_date', { date: date(data.nextPayoutAt, true) })
            : t('earnings.next_payout_manual')}
        </Text>
      </View>

      <Text style={styles.total}>{t('earnings.total_received', { amount: money(data.totalPayoutReceived ?? 0) })}</Text>

      {data.payouts.length > 0 && (
        <View style={styles.history}>
          <Text style={styles.historyTitle}>{t('earnings.recent')}</Text>
          {data.payouts.slice(0, 5).map((p) => (
            <View key={p.id} style={styles.historyRow}>
              <Text style={styles.historyDate}>{date(p.createdAt)}</Text>
              <Text style={[styles.historyStatus, { color: STATUS_COLORS[p.status] ?? tokens.text.secondary }]}>
                {t(`earnings.status_${p.status}`)}
              </Text>
              <Text style={styles.historyAmount}>{p.currency ? formatWithCurrency(p.netAmount, p.currency) : money(p.netAmount)}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const makeStyles = (tokens: any) =>
  StyleSheet.create({
    card: {
      backgroundColor: tokens.card,
      borderRadius: 16,
      padding: spacing.md,
      marginBottom: spacing.md,
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: tokens.border,
    },
    center: { alignItems: 'center', justifyContent: 'center', minHeight: 120 },
    header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    title: { fontSize: 17, fontWeight: '700', color: tokens.text.primary },
    subtitle: { fontSize: 12, lineHeight: 17, color: tokens.text.secondary },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 4 },
    dot: { width: 10, height: 10, borderRadius: 5 },
    rowLabel: { fontSize: 14, color: tokens.text.primary },
    rowHint: { fontSize: 11, color: tokens.text.secondary, marginTop: 1 },
    rowValue: { fontSize: 15, fontWeight: '700', color: tokens.text.primary, fontVariant: ['tabular-nums'] },
    next: {
      marginTop: spacing.xs,
      padding: spacing.sm,
      borderRadius: 12,
      backgroundColor: '#ECFDF5',
    },
    nextLabel: { fontSize: 12, fontWeight: '600', color: '#065F46' },
    nextValue: { fontSize: 22, fontWeight: '800', color: '#047857', fontVariant: ['tabular-nums'] },
    nextHint: { fontSize: 12, color: '#065F46' },
    total: { fontSize: 12, color: tokens.text.secondary },
    history: { marginTop: spacing.xs, gap: 4 },
    historyTitle: { fontSize: 13, fontWeight: '700', color: tokens.text.primary },
    historyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    historyDate: { width: 64, fontSize: 12, color: tokens.text.secondary },
    historyStatus: { flex: 1, fontSize: 12, fontWeight: '600' },
    historyAmount: { fontSize: 13, fontWeight: '600', color: tokens.text.primary, fontVariant: ['tabular-nums'] },
  });
