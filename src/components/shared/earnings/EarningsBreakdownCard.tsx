import React, { useMemo } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Card, Divider, Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { useAppTheme } from '../../../theme/ThemeProvider';
import { useCurrencyFormatter } from '../../../hooks/useCurrencyFormatter';
import type { Earnings } from '../../../types/earnings';

interface Props {
  earnings: Earnings;
  style?: StyleProp<ViewStyle>;
}

/**
 * Détail des gains d'une course ou d'une prestation pour le chauffeur, livreur ou prestataire :
 * gain net en avant, puis montant payé par le client, commission et moyen de paiement.
 */
export const EarningsBreakdownCard: React.FC<Props> = ({ earnings, style }) => {
  const { t } = useTranslation();
  const { tokens } = useAppTheme();
  const { format, formatWithCurrency } = useCurrencyFormatter();
  const money = (n: number) => (earnings.currency ? formatWithCurrency(n, earnings.currency) : format(n));

  const styles = useMemo(() => StyleSheet.create({
    card: { marginBottom: spacing.md, backgroundColor: tokens.card, elevation: 2 },
    title: { fontSize: 15, fontWeight: '600' },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5, gap: spacing.sm },
    netLabel: { fontWeight: '600', color: tokens.text.primary },
    netValue: { fontWeight: '700', color: tokens.primary, fontVariant: ['tabular-nums'] },
    label: { color: tokens.text.secondary, flex: 1 },
    value: { color: tokens.text.primary, textAlign: 'right', fontVariant: ['tabular-nums'] },
    estimate: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 2 },
    estimateText: { flex: 1, color: tokens.text.secondary, fontSize: 12, lineHeight: 17 },
    divider: { marginVertical: spacing.sm },
  }), [tokens]);

  return (
    <Card style={[styles.card, style]}>
      <Card.Title title={t('earnings.amounts_title')} titleStyle={styles.title} />
      <Card.Content>
        <View style={styles.row}>
          <Text variant="bodyMedium" style={styles.netLabel}>{t('earnings.net_amount')}</Text>
          <Text variant="titleMedium" style={styles.netValue}>{money(earnings.net)}</Text>
        </View>
        {!earnings.settled && (
          <View style={styles.estimate}>
            <Icon name="information-outline" size={14} color={tokens.text.secondary} style={{ marginTop: 1 }} />
            <Text style={styles.estimateText}>{t('earnings.estimate_note')}</Text>
          </View>
        )}
        <Divider style={styles.divider} />
        <View style={styles.row}>
          <Text variant="bodySmall" style={styles.label}>{t('earnings.gross_amount')}</Text>
          <Text variant="bodySmall" style={styles.value}>{money(earnings.gross)}</Text>
        </View>
        <View style={styles.row}>
          <Text variant="bodySmall" style={styles.label}>
            {t('earnings.commission', { rate: earnings.commissionRate })}
          </Text>
          <Text variant="bodySmall" style={[styles.value, { color: colors.error }]}>−{money(earnings.commission)}</Text>
        </View>
        <View style={styles.row}>
          <Text variant="bodySmall" style={styles.label}>{t('earnings.payment_method')}</Text>
          <Text variant="bodySmall" style={styles.value}>
            {t(earnings.paymentMethod === 'cash' ? 'earnings.method_cash' : 'earnings.method_in_app')}
          </Text>
        </View>
      </Card.Content>
    </Card>
  );
};
