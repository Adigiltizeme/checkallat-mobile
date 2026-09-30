import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Switch } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/spacing';

interface Props {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

/** Déclaration du sac isotherme d'un livreur 2 roues (requis pour les livraisons chaîne du froid). */
export const InsulatedBagSwitch = ({ value, onValueChange, disabled }: Props) => {
  const { tokens } = useAppTheme();
  const { t } = useTranslation();

  return (
    <View style={[styles.row, { backgroundColor: tokens.card, borderColor: tokens.border }]}>
      <Icon name="snowflake" size={22} color="#0EA5E9" />
      <View style={styles.text}>
        <Text variant="labelLarge" style={{ color: tokens.text.primary }}>
          {t('driver_apply.insulated_bag_label')}
        </Text>
        <Text variant="bodySmall" style={{ color: tokens.text.secondary }}>
          {t('driver_apply.insulated_bag_hint')}
        </Text>
      </View>
      <Switch value={value} onValueChange={onValueChange} disabled={disabled} color={tokens.primary} />
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  text: { flex: 1 },
});
