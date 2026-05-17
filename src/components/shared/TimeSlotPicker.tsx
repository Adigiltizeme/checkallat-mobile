import React from 'react';
import { View, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Text } from 'react-native-paper';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

export interface TimeSlotOption {
  value: string;
  icon: string;
  label: string;
  hours?: string;
  unavailable?: boolean;
  passedLabel: string;
  unavailableTitle: string;
  unavailableMessage: string;
}

export interface TimeSlotPickerProps {
  slots: TimeSlotOption[];
  selected: string;
  onSelect: (value: string) => void;
}

export const TimeSlotPicker = ({ slots, selected, onSelect }: TimeSlotPickerProps) => (
  <View style={styles.container}>
    {slots.map((slot) => {
      const isActive = selected === slot.value;
      return (
        <TouchableOpacity
          key={slot.value}
          style={[
            styles.card,
            isActive && styles.cardActive,
            slot.unavailable && styles.cardDisabled,
          ]}
          onPress={() => {
            if (slot.unavailable) {
              Alert.alert(slot.unavailableTitle, slot.unavailableMessage);
              return;
            }
            onSelect(slot.value);
          }}
          activeOpacity={slot.unavailable ? 1 : 0.8}
        >
          <View style={styles.content}>
            <Text style={styles.icon}>{slot.icon}</Text>
            <Text
              variant="bodyLarge"
              style={[
                styles.label,
                isActive && styles.labelActive,
                slot.unavailable && styles.labelDisabled,
              ]}
            >
              {slot.label}
            </Text>
            {!!slot.hours && (
              <Text
                variant="bodySmall"
                style={[
                  styles.hours,
                  isActive && styles.hoursActive,
                  slot.unavailable && styles.labelDisabled,
                ]}
              >
                {slot.hours}
              </Text>
            )}
            {slot.unavailable && (
              <Text variant="bodySmall" style={styles.passedLabel}>
                {slot.passedLabel}
              </Text>
            )}
          </View>
          {isActive && !slot.unavailable && (
            <View style={styles.checkmark}>
              <Text style={styles.checkmarkIcon}>✓</Text>
            </View>
          )}
        </TouchableOpacity>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    padding: spacing.md,
    position: 'relative',
  },
  cardActive: { borderColor: colors.primary, backgroundColor: '#E8F5F3' },
  cardDisabled: { backgroundColor: '#F5F5F5', borderColor: '#E0E0E0', opacity: 0.6 },
  content: { alignItems: 'center' },
  icon: { fontSize: 32, marginBottom: spacing.xs },
  label: { color: colors.dark, fontWeight: '600' },
  labelActive: { color: colors.primary },
  labelDisabled: { color: colors.gray },
  hours: { color: colors.gray, marginTop: 4 },
  hoursActive: { color: colors.primary },
  passedLabel: { color: '#E65100', marginTop: 4, fontWeight: '600' },
  checkmark: {
    position: 'absolute', top: spacing.sm, right: spacing.sm,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  checkmarkIcon: { color: colors.white, fontSize: 16, fontWeight: '700' },
});
