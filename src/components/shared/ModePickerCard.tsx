import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

export interface ModePickerCardProps {
  icon: string;
  title: string;
  hint?: string;
  selected: boolean;
  onPress: () => void;
}

export const ModePickerCard = ({ icon, title, hint, selected, onPress }: ModePickerCardProps) => (
  <TouchableOpacity
    style={[styles.card, selected && styles.cardActive]}
    onPress={onPress}
    activeOpacity={0.8}
  >
    <Text style={styles.icon}>{icon}</Text>
    <Text variant="titleSmall" style={[styles.label, selected && styles.labelActive]}>
      {title}
    </Text>
    {!!hint && (
      <Text variant="bodySmall" style={styles.hint}>{hint}</Text>
    )}
    {selected && (
      <View style={styles.check}>
        <Text style={styles.checkIcon}>✓</Text>
      </View>
    )}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    padding: spacing.md,
    alignItems: 'center',
    position: 'relative',
  },
  cardActive: { borderColor: colors.primary, backgroundColor: '#E8F5F3' },
  icon: { fontSize: 28, marginBottom: spacing.xs },
  label: { color: colors.dark, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  labelActive: { color: colors.primary },
  hint: { color: colors.gray, textAlign: 'center', fontSize: 11 },
  check: {
    position: 'absolute', top: 6, right: 6,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  checkIcon: { color: colors.white, fontSize: 12, fontWeight: '700' },
});
