import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppTheme } from '../../theme/ThemeProvider';
import { colors } from '../../theme/colors';

export interface CourierOptionsLike {
  isExpress?: boolean;
  requiresSignature?: boolean;
  isFragile?: boolean;
  isColdChain?: boolean;
}

interface Props {
  vehicleCategory?: string | null;
  courierOptions?: CourierOptionsLike | null;
  /** Masque le badge "CheckAllPack" (quand l'écran l'affiche déjà ailleurs) */
  hideCategory?: boolean;
}

/** Badges CheckAllPack + options choisies par le client (express, signature, fragile, froid). */
export const CourierOptionsBadges = ({ vehicleCategory, courierOptions, hideCategory }: Props) => {
  const { tokens } = useAppTheme();
  const { t } = useTranslation();

  if (vehicleCategory !== 'courier') return null;

  const options = courierOptions ?? {};
  const badges: Array<{ key: string; icon: string; label: string; color: string }> = [];
  if (!hideCategory) {
    badges.push({ key: 'category', icon: 'moped', label: t('transport.checkallpack_badge'), color: tokens.primary });
  }
  if (options.isExpress) badges.push({ key: 'express', icon: 'lightning-bolt', label: t('transport.courier_opt_express'), color: colors.warning });
  if (options.requiresSignature) badges.push({ key: 'signature', icon: 'draw', label: t('transport.courier_opt_signature'), color: colors.info });
  if (options.isFragile) badges.push({ key: 'fragile', icon: 'glass-fragile', label: t('transport.courier_opt_fragile'), color: colors.error });
  if (options.isColdChain) badges.push({ key: 'cold', icon: 'snowflake', label: t('transport.courier_opt_cold_chain'), color: '#0EA5E9' });

  if (badges.length === 0) return null;

  return (
    <View style={styles.row}>
      {badges.map((b) => (
        <View key={b.key} style={[styles.badge, { backgroundColor: b.color + '18', borderColor: b.color + '55' }]}>
          <Icon name={b.icon} size={13} color={b.color} />
          <Text style={[styles.label, { color: b.color }]}>{b.label}</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 4 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  label: { fontSize: 11, fontWeight: '700' },
});
