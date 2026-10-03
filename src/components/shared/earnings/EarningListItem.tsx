import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { useAppTheme } from '../../../theme/ThemeProvider';
import { useCurrencyFormatter } from '../../../hooks/useCurrencyFormatter';
import type { Earnings } from '../../../types/earnings';

interface Props {
  title: string;
  /** Lignes secondaires (client, date…) */
  lines: string[];
  earnings?: Earnings;
  fallbackCurrency?: string;
  /** Informations en pied de carte (distance, moyen de paiement, adresse…) */
  meta: { icon: string; label: string }[];
  onPress: () => void;
}

/** Course ou prestation terminée dans l'historique des revenus : le gain net en avant */
export const EarningListItem: React.FC<Props> = ({ title, lines, earnings, fallbackCurrency, meta, onPress }) => {
  const { t } = useTranslation();
  const { tokens } = useAppTheme();
  const { format, formatWithCurrency } = useCurrencyFormatter();
  const currency = earnings?.currency || fallbackCurrency;
  const money = (n: number) => (currency ? formatWithCurrency(n, currency) : format(n));

  const styles = useMemo(() => StyleSheet.create({
    card: { marginBottom: spacing.sm, backgroundColor: tokens.card, elevation: 2 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm, gap: spacing.sm },
    info: { flex: 1 },
    title: { fontWeight: 'bold', marginBottom: 2 },
    line: { color: tokens.text.secondary, fontSize: 12 },
    amountBox: { alignItems: 'flex-end' },
    amount: { fontWeight: 'bold', color: colors.success, fontVariant: ['tabular-nums'] },
    caption: { color: tokens.text.secondary, fontSize: 11 },
    meta: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 },
    metaText: { color: tokens.text.secondary, fontSize: 12, flexShrink: 1 },
    footer: {
      flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 4,
      marginTop: spacing.sm, paddingTop: 6, borderTopWidth: 1, borderTopColor: tokens.border,
    },
    footerText: { color: tokens.primary, fontSize: 12, fontWeight: '600' },
  }), [tokens]);

  return (
    <Card style={styles.card} onPress={onPress}>
      <Card.Content>
        <View style={styles.header}>
          <View style={styles.info}>
            <Text variant="titleSmall" style={styles.title}>{title}</Text>
            {lines.map((l, i) => <Text key={i} variant="bodySmall" style={styles.line}>{l}</Text>)}
          </View>
          {earnings && (
            <View style={styles.amountBox}>
              <Text variant="titleMedium" style={styles.amount}>{money(earnings.net)}</Text>
              <Text style={styles.caption}>
                {t(earnings.settled ? 'earnings.net_caption' : 'earnings.net_estimated_caption')}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.meta}>
          {meta.map((m, i) => (
            <View key={i} style={styles.metaItem}>
              <Icon name={m.icon} size={14} color={tokens.text.secondary} />
              <Text style={styles.metaText} numberOfLines={1}>{m.label}</Text>
            </View>
          ))}
        </View>
        <View style={styles.footer}>
          <Text style={styles.footerText}>{t('common.details')}</Text>
          <Icon name="chevron-right" size={14} color={tokens.primary} />
        </View>
      </Card.Content>
    </Card>
  );
};
