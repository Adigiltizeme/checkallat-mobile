import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Card, Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { useAppTheme } from '../../../theme/ThemeProvider';
import { useCurrencyFormatter } from '../../../hooks/useCurrencyFormatter';
import { usePayCashCommission } from '../../../hooks/usePayCashCommission';
import { getPeriodRange, isInPeriod, PeriodMode } from '../../../utils/earningsPeriod';
import type { Earnings } from '../../../types/earnings';
import { ChocolateButton } from '../ChocolateButton';
import { PayoutBalanceCard } from '../PayoutBalanceCard';

export interface EarningsItem {
  id: string;
  /** Date de fin (filtrage par période) */
  date: string | null;
  earnings?: Earnings;
}

interface Props<T extends EarningsItem> {
  role: 'driver' | 'pro';
  loading: boolean;
  /** Courses / prestations terminées */
  items: T[];
  fallbackCurrency?: string;
  pendingCommission: number;
  onCommissionPaid: () => void;
  countLabel: (count: number) => string;
  listTitle: (periodLabel: string | null) => string;
  emptyLabel: string;
  /** Sous la carte des gains (ex. badge paiement sécurisé) */
  totalFooter?: React.ReactNode;
  renderStats: (periodItems: T[], mode: PeriodMode) => React.ReactNode;
  renderItem: (item: T) => React.ReactNode;
}

/**
 * Écran de revenus commun aux chauffeurs, livreurs et prestataires : périodes, gains nets
 * (après commission, calculés par le serveur), indicateurs, solde à verser et historique.
 */
export function EarningsDashboard<T extends EarningsItem>({
  role, loading, items, fallbackCurrency, pendingCommission, onCommissionPaid,
  countLabel, listTitle, emptyLabel, totalFooter, renderStats, renderItem,
}: Props<T>) {
  const { t, i18n } = useTranslation();
  const { tokens } = useAppTheme();
  const { format, formatWithCurrency } = useCurrencyFormatter();
  const { pay, paying, paid } = usePayCashCommission(role, onCommissionPaid);
  const [mode, setMode] = useState<PeriodMode>('monthly');
  const [offset, setOffset] = useState(0);
  const section = role === 'driver' ? 'driver' : 'pro_space';

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: tokens.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: tokens.background },
    content: { padding: spacing.md, paddingBottom: spacing.xl * 2 },

    alert: {
      flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, backgroundColor: colors.warning + '1A',
      borderRadius: 10, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.warning,
    },
    alertTitle: { fontSize: 14, fontWeight: '700', color: tokens.text.primary, marginBottom: 2 },
    alertText: { fontSize: 13, color: tokens.text.primary, lineHeight: 18 },
    alertButton: { marginTop: spacing.sm, alignSelf: 'flex-start' },

    tabs: { flexDirection: 'row', backgroundColor: tokens.backgroundAlt, borderRadius: 10, padding: 4, marginBottom: spacing.md },
    tab: { flex: 1, paddingVertical: spacing.xs, paddingHorizontal: 4, borderRadius: 8, alignItems: 'center' },
    tabActive: { backgroundColor: tokens.card, elevation: 2 },
    tabText: { fontSize: 11, color: tokens.text.secondary, fontWeight: '500', textAlign: 'center' },
    tabTextActive: { color: tokens.primary, fontWeight: '700' },

    nav: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: tokens.card,
      borderRadius: 10, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, marginBottom: spacing.md, elevation: 2,
    },
    navArrow: { padding: 4 },
    navArrowDisabled: { opacity: 0.3 },
    navLabelBox: { flex: 1, alignItems: 'center' },
    navLabel: { fontSize: 15, fontWeight: '700', color: tokens.text.primary, textAlign: 'center' },
    navSublabel: { fontSize: 12, color: tokens.text.secondary, marginTop: 2, textAlign: 'center' },

    totalCard: { marginBottom: spacing.md, backgroundColor: tokens.primary, elevation: 4 },
    totalLabel: { color: colors.white, marginBottom: spacing.xs },
    totalAmount: { color: colors.white, fontWeight: 'bold', marginBottom: spacing.xs, fontVariant: ['tabular-nums'] },
    totalSub: { color: colors.white + 'CC' },
    totalHint: { color: colors.white + 'B3', fontSize: 11, marginTop: 2 },

    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.sm, marginBottom: spacing.lg },

    listSection: { marginTop: spacing.md },
    listTitle: { fontWeight: 'bold', marginBottom: spacing.md },
    emptyCard: { backgroundColor: tokens.card, elevation: 2 },
    emptyContent: { alignItems: 'center', paddingVertical: spacing.xl },
    emptyText: { color: tokens.text.secondary, marginTop: spacing.md, textAlign: 'center' },
  }), [tokens]);

  const period = useMemo(() => getPeriodRange(mode, offset, t, i18n.language), [mode, offset, t, i18n.language]);
  const periodItems = useMemo(() => items.filter((i) => isInPeriod(i.date, mode, period)), [items, mode, period]);

  // Gains nets par devise (un prestataire peut avoir travaillé dans plusieurs pays)
  const netByCurrency = useMemo(() => {
    const map: Record<string, number> = {};
    periodItems.forEach((i) => {
      if (!i.earnings) return;
      const cur = i.earnings.currency || fallbackCurrency || '';
      map[cur] = (map[cur] ?? 0) + i.earnings.net;
    });
    return map;
  }, [periodItems, fallbackCurrency]);
  const hasEstimate = periodItems.some((i) => i.earnings && !i.earnings.settled);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={tokens.primary} /></View>;
  }

  const TABS: { key: PeriodMode; label: string }[] = [
    { key: 'daily', label: t('driver.earnings_period_daily') },
    { key: 'weekly', label: t('driver.earnings_period_weekly') },
    { key: 'monthly', label: t('driver.earnings_period_monthly') },
    { key: 'all', label: t('common.all') },
  ];
  const totals = Object.entries(netByCurrency);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Commission due sur les paiements en espèces */}
      {pendingCommission > 0 && !paid && (
        <View style={styles.alert}>
          <Icon name="alert-circle" size={20} color={colors.warning} style={{ marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.alertTitle}>{t(`${section}.cash_commission_due_title`)}</Text>
            <Text style={styles.alertText}>
              {t(`${section}.cash_commission_due_msg`, {
                amount: fallbackCurrency ? formatWithCurrency(pendingCommission, fallbackCurrency) : format(pendingCommission),
              })}
            </Text>
            <ChocolateButton onPress={pay} loading={paying} disabled={paying} style={styles.alertButton} size="sm">
              {t(`${section}.pay_commission_online`)}
            </ChocolateButton>
          </View>
        </View>
      )}

      {/* Période */}
      <View style={styles.tabs}>
        {TABS.map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            onPress={() => { setMode(key); setOffset(0); }}
            style={[styles.tab, mode === key && styles.tabActive]}
            accessibilityRole="tab"
            accessibilityState={{ selected: mode === key }}
          >
            <Text style={[styles.tabText, mode === key && styles.tabTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {mode !== 'all' && (
        <View style={styles.nav}>
          <TouchableOpacity onPress={() => setOffset((o) => o - 1)} style={styles.navArrow} accessibilityLabel={t('earnings.previous_period')}>
            <Icon name={i18n.dir?.() === 'rtl' ? 'chevron-right' : 'chevron-left'} size={28} color={tokens.primary} />
          </TouchableOpacity>
          <View style={styles.navLabelBox}>
            <Text style={styles.navLabel}>{period.label}</Text>
            {period.sublabel && period.sublabel !== period.label && <Text style={styles.navSublabel}>{period.sublabel}</Text>}
          </View>
          <TouchableOpacity
            onPress={() => setOffset((o) => Math.min(o + 1, 0))}
            style={[styles.navArrow, offset >= 0 && styles.navArrowDisabled]}
            disabled={offset >= 0}
            accessibilityLabel={t('earnings.next_period')}
          >
            <Icon name={i18n.dir?.() === 'rtl' ? 'chevron-left' : 'chevron-right'} size={28} color={offset >= 0 ? tokens.text.secondary : tokens.primary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Gains nets de la période */}
      <Card style={styles.totalCard}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.totalLabel}>
            {t(mode === 'all' ? 'earnings.net_total' : 'earnings.net_period')}
          </Text>
          {totals.length > 0 ? (
            totals.map(([cur, amount]) => (
              <Text key={cur} variant="displaySmall" style={styles.totalAmount} adjustsFontSizeToFit numberOfLines={1}>
                {cur ? formatWithCurrency(amount, cur) : format(amount)}
              </Text>
            ))
          ) : (
            <Text variant="displaySmall" style={styles.totalAmount}>
              {fallbackCurrency ? formatWithCurrency(0, fallbackCurrency) : format(0)}
            </Text>
          )}
          <Text variant="bodySmall" style={styles.totalSub}>
            {mode === 'all' ? t('driver.earnings_since_start') : countLabel(periodItems.length)}
          </Text>
          <Text style={styles.totalHint}>
            {t(hasEstimate ? 'earnings.after_commission_with_estimate' : 'earnings.after_commission')}
          </Text>
          {totalFooter}
        </Card.Content>
      </Card>

      <View style={styles.statsGrid}>{renderStats(periodItems, mode)}</View>

      {/* Gains gardés de côté par la plateforme jusqu'au versement */}
      <PayoutBalanceCard role={role} fallbackCurrency={fallbackCurrency} />

      <View style={styles.listSection}>
        <Text variant="titleMedium" style={styles.listTitle}>
          {listTitle(mode === 'all' ? null : period.label)}
        </Text>
        {periodItems.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content style={styles.emptyContent}>
              <Icon name="cash-remove" size={48} color={tokens.text.secondary} />
              <Text variant="bodyMedium" style={styles.emptyText}>{emptyLabel}</Text>
            </Card.Content>
          </Card>
        ) : (
          periodItems.map((item) => <React.Fragment key={item.id}>{renderItem(item)}</React.Fragment>)
        )}
      </View>
    </ScrollView>
  );
}
