import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { ChocolateButton } from './ChocolateButton';

export interface StepNavButtonsProps {
  onBack: () => void;
  onNext: () => void;
  backLabel: string;
  nextLabel: string;
  nextDisabled?: boolean;
  nextLoading?: boolean;
  sticky?: boolean;
}

export const StepNavButtons = ({
  onBack,
  onNext,
  backLabel,
  nextLabel,
  nextDisabled,
  nextLoading,
  sticky,
}: StepNavButtonsProps) => (
  <View style={[styles.row, sticky && styles.sticky]}>
    <View style={styles.backWrap}>
      <ChocolateButton variant="outline" onPress={onBack} size="md">
        {backLabel}
      </ChocolateButton>
    </View>
    <View style={styles.nextWrap}>
      <ChocolateButton
        variant="primary"
        onPress={onNext}
        disabled={nextDisabled}
        loading={nextLoading}
        size="md"
      >
        {nextLabel}
      </ChocolateButton>
    </View>
  </View>
);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl },
  sticky: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: spacing.md,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 0,
  },
  backWrap: { flex: 1 },
  nextWrap: { flex: 2 },
});
