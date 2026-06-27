import React, { useMemo } from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { creamTile, creamTilePressed } from '../../theme/shadows';
import { useAppTheme } from '../../theme/ThemeProvider';

export interface ModePickerCardProps {
  icon: string;
  title: string;
  hint?: string;
  selected: boolean;
  onPress: () => void;
}

export const ModePickerCard = ({ icon, title, hint, selected, onPress }: ModePickerCardProps) => {
  const { tokens } = useAppTheme();

  const styles = useMemo(() => StyleSheet.create({
  card: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    position: 'relative',
    borderRadius: 12,
  },
  // ── Styles teal (flat, clean) — border individuel pour surcharger card ─
  cardDefaultTeal: {
    borderTopWidth: 1.5,
    borderLeftWidth: 1.5,
    borderBottomWidth: 1.5,
    borderRightWidth: 1.5,
    borderTopColor: '#E0E0E0',
    borderLeftColor: '#E0E0E0',
    borderBottomColor: '#E0E0E0',
    borderRightColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  cardPressedTeal: {
    borderTopWidth: 1.5,
    borderLeftWidth: 1.5,
    borderBottomWidth: 1.5,
    borderRightWidth: 1.5,
    borderTopColor: '#00B8A9',
    borderLeftColor: '#00B8A9',
    borderBottomColor: '#00B8A9',
    borderRightColor: '#00B8A9',
    backgroundColor: '#F0FCFB',
  },
  cardActiveTeal: {
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderTopColor: '#00B8A9',
    borderLeftColor: '#00B8A9',
    borderBottomColor: '#00B8A9',
    borderRightColor: '#00B8A9',
    backgroundColor: '#E6F9F7',
    elevation: 2,
  },
  // ── État actif chocolat : tuile enfoncée avec bordure dorée ───────────
  cardActive: {
    borderRadius: 12,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderTopColor: tokens.primary,
    borderLeftColor: tokens.primary,
    borderBottomColor: colors.tileHighlight,
    borderRightColor: colors.tileHighlight,
    backgroundColor: '#F5E8D5',
    elevation: 2,
  },
  icon: { fontSize: 22, marginBottom: 2 },
  label: { color: colors.dark, fontWeight: '700', textAlign: 'center', marginBottom: 2 },
  labelActive: { color: tokens.primary },
  hint: { color: colors.gray, textAlign: 'center', fontSize: 11 },
  check: {
    position: 'absolute', top: 6, right: 6,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: tokens.secondary,
    justifyContent: 'center', alignItems: 'center',
  },
  checkIcon: { color: colors.dark, fontSize: 12, fontWeight: '700' },
  }), [tokens]);
  const { mode } = useAppTheme();
  const isTeal = mode === 'teal';

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        isTeal
          ? (selected ? styles.cardActiveTeal : pressed ? styles.cardPressedTeal : styles.cardDefaultTeal)
          : (selected ? styles.cardActive : pressed ? creamTilePressed : creamTile),
      ]}
      onPress={onPress}
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
    </Pressable>
  );
};

