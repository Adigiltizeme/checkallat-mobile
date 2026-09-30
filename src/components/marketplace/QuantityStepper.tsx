import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppTheme } from '../../theme/ThemeProvider';

interface Props {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number | null;
  size?: 'sm' | 'md';
}

export const QuantityStepper = ({ value, onChange, min = 1, max = null, size = 'md' }: Props) => {
  const { tokens } = useAppTheme();
  const dim = size === 'sm' ? 28 : 36;
  const canDecrease = value > min;
  const canIncrease = max == null || value < max;

  return (
    <View style={[styles.row, { borderColor: tokens.border }]}>
      <TouchableOpacity
        style={[styles.btn, { width: dim, height: dim }]}
        onPress={() => canDecrease && onChange(value - 1)}
        disabled={!canDecrease}
        accessibilityRole="button"
      >
        <Icon name="minus" size={size === 'sm' ? 16 : 20} color={canDecrease ? tokens.primary : tokens.border} />
      </TouchableOpacity>
      <Text style={[styles.value, { color: tokens.text.primary, minWidth: dim }]}>{value}</Text>
      <TouchableOpacity
        style={[styles.btn, { width: dim, height: dim }]}
        onPress={() => canIncrease && onChange(value + 1)}
        disabled={!canIncrease}
        accessibilityRole="button"
      >
        <Icon name="plus" size={size === 'sm' ? 16 : 20} color={canIncrease ? tokens.primary : tokens.border} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 20, alignSelf: 'flex-start' },
  btn: { alignItems: 'center', justifyContent: 'center' },
  value: { textAlign: 'center', fontWeight: '700', fontVariant: ['tabular-nums'] },
});
