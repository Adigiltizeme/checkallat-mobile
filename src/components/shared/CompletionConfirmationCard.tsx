import React, { useMemo } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { useAppTheme } from '../../theme/ThemeProvider';
import { useCurrencyFormatter } from '../../hooks/useCurrencyFormatter';

interface Props {
  /** Qui réalise : prestataire, chauffeur ou livreur CheckAllPack */
  providerRole: 'pro' | 'driver' | 'courier';
  /** Qui regarde : sa propre ligne est affichée en premier */
  viewer: 'client' | 'provider';
  clientConfirmed: boolean;
  providerConfirmed: boolean;
  isCash: boolean;
  declaredByClient?: number | null;
  declaredByProvider?: number | null;
  /** pending | confirmed | disputed */
  cashStatus?: string | null;
  currency?: string | null;
  style?: StyleProp<ViewStyle>;
}

/**
 * Double confirmation de fin de prestation (client + prestataire), commune aux prestations,
 * au transport et à CheckAllPack — avec, en espèces, les montants déclarés par chacun.
 */
export const CompletionConfirmationCard: React.FC<Props> = ({
  providerRole, viewer, clientConfirmed, providerConfirmed, isCash,
  declaredByClient, declaredByProvider, cashStatus, currency, style,
}) => {
  const { t } = useTranslation();
  const { tokens } = useAppTheme();
  const { format, formatWithCurrency } = useCurrencyFormatter();
  const money = (n: number) => (currency ? formatWithCurrency(n, currency) : format(n));

  const styles = useMemo(() => StyleSheet.create({
    card: {
      backgroundColor: tokens.card, borderRadius: 14, padding: spacing.md,
      marginBottom: spacing.md, borderWidth: 1, borderColor: tokens.border,
    },
    title: {
      fontSize: 12, fontWeight: '700', color: tokens.text.secondary,
      textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 5 },
    party: { flex: 1, fontSize: 14, color: tokens.text.primary },
    pill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
    pillText: { fontSize: 12, fontWeight: '700' },
    cashBlock: { marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: tokens.border },
    cashTitle: { fontSize: 13, fontWeight: '600', color: tokens.text.primary, marginBottom: 2 },
    amount: { fontSize: 14, color: tokens.text.primary, fontVariant: ['tabular-nums'] },
    status: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: spacing.xs },
    statusText: { flex: 1, fontSize: 12, lineHeight: 17 },
  }), [tokens]);

  const providerLabel = t(`completion_card.party_${providerRole}`);
  const parties = [
    { key: 'client', label: t('completion_card.party_client'), confirmed: clientConfirmed, declared: declaredByClient },
    { key: 'provider', label: providerLabel, confirmed: providerConfirmed, declared: declaredByProvider },
  ];
  if (viewer === 'provider') parties.reverse();

  const bothConfirmed = clientConfirmed && providerConfirmed;
  const hasDeclaration = declaredByClient != null || declaredByProvider != null;
  const statusCfg =
    cashStatus === 'confirmed'
      ? { icon: 'check-decagram', color: colors.success, key: 'completion_card.cash_match' }
      : cashStatus === 'disputed'
        ? { icon: 'alert-circle', color: colors.error, key: 'completion_card.cash_mismatch' }
        : { icon: 'clock-outline', color: tokens.text.secondary, key: 'completion_card.cash_waiting' };

  return (
    <View style={[styles.card, style]}>
      <Text style={styles.title}>
        {t(bothConfirmed ? 'completion_card.title_done' : 'completion_card.title_pending')}
      </Text>

      {parties.map((p) => (
        <View key={p.key} style={styles.row}>
          <Icon
            name={p.confirmed ? 'check-circle' : 'clock-outline'}
            size={18}
            color={p.confirmed ? colors.success : tokens.text.secondary}
          />
          <Text style={styles.party}>{p.label}</Text>
          <View style={[styles.pill, { backgroundColor: (p.confirmed ? colors.success : tokens.text.secondary) + '1F' }]}>
            <Text style={[styles.pillText, { color: p.confirmed ? colors.success : tokens.text.secondary }]}>
              {t(p.confirmed ? 'completion_card.confirmed' : 'completion_card.waiting')}
            </Text>
          </View>
        </View>
      ))}

      {isCash && hasDeclaration && (
        <View style={styles.cashBlock}>
          <Text style={styles.cashTitle}>{t('completion_card.cash_title')}</Text>
          {parties.map((p) => (
            <View key={p.key} style={styles.row}>
              <Icon name="cash" size={18} color={tokens.text.secondary} />
              <Text style={styles.party}>{p.label}</Text>
              <Text style={styles.amount}>{p.declared != null ? money(p.declared) : '—'}</Text>
            </View>
          ))}
          <View style={styles.status}>
            <Icon name={statusCfg.icon} size={15} color={statusCfg.color} style={{ marginTop: 1 }} />
            <Text style={[styles.statusText, { color: statusCfg.color }]}>{t(statusCfg.key)}</Text>
          </View>
        </View>
      )}
    </View>
  );
};
