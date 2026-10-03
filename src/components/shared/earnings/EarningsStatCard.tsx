import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Text } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { spacing } from '../../../theme/spacing';
import { useAppTheme } from '../../../theme/ThemeProvider';

interface Props {
  icon: string;
  iconColor: string;
  value: string | number;
  label: string;
  /** Carte cliquable (ex. « Voir les avis ») */
  onPress?: () => void;
  actionLabel?: string;
}

/** Indicateur de la grille des écrans de revenus */
export const EarningsStatCard: React.FC<Props> = ({ icon, iconColor, value, label, onPress, actionLabel }) => {
  const { tokens } = useAppTheme();
  const styles = useMemo(() => StyleSheet.create({
    card: { width: '48%', backgroundColor: tokens.card, elevation: 2 },
    content: { alignItems: 'center', paddingVertical: spacing.md },
    value: { fontWeight: 'bold', marginTop: spacing.xs, fontVariant: ['tabular-nums'] },
    label: { color: tokens.text.secondary, marginTop: spacing.xs, textAlign: 'center' },
    action: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.xs },
    actionText: { color: tokens.primary, fontSize: 12, fontWeight: '600' },
  }), [tokens]);

  return (
    <Card style={styles.card} onPress={onPress}>
      <Card.Content style={styles.content}>
        <Icon name={icon} size={32} color={iconColor} />
        <Text variant="headlineSmall" style={styles.value}>{value}</Text>
        <Text variant="bodySmall" style={styles.label}>{label}</Text>
        {onPress && actionLabel && (
          <View style={styles.action}>
            <Text style={styles.actionText}>{actionLabel}</Text>
            <Icon name="chevron-right" size={14} color={tokens.primary} />
          </View>
        )}
      </Card.Content>
    </Card>
  );
};
