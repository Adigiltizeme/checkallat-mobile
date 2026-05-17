import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Button } from 'react-native-paper';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

export interface StepNavButtonsProps {
  onBack: () => void;
  onNext: () => void;
  backLabel: string;
  nextLabel: string;
  nextDisabled?: boolean;
  sticky?: boolean;
}

export const StepNavButtons = ({
  onBack,
  onNext,
  backLabel,
  nextLabel,
  nextDisabled,
  sticky,
}: StepNavButtonsProps) => (
  <View style={[styles.row, sticky && styles.sticky]}>
    <Button
      mode="outlined"
      onPress={onBack}
      style={styles.backBtn}
      textColor={colors.gray}
    >
      {backLabel}
    </Button>
    <Button
      mode="contained"
      onPress={onNext}
      disabled={nextDisabled}
      buttonColor={nextDisabled ? colors.gray : colors.primary}
      style={styles.nextBtn}
      labelStyle={styles.nextLabel}
    >
      {nextLabel}
    </Button>
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
  backBtn: { flex: 1, paddingVertical: spacing.sm },
  nextBtn: { flex: 2, paddingVertical: spacing.sm },
  nextLabel: { fontSize: 16 },
});
