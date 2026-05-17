import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, IconButton, Text } from 'react-native-paper';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

export interface DateNavigatorProps {
  formattedDate: string;
  showTodayPrefix: boolean;
  todayLabel: string;
  hint?: string;
  isPrevDisabled: boolean;
  onPrevDay: () => void;
  onNextDay: () => void;
}

export const DateNavigator = ({
  formattedDate,
  showTodayPrefix,
  todayLabel,
  hint,
  isPrevDisabled,
  onPrevDay,
  onNextDay,
}: DateNavigatorProps) => (
  <Card style={styles.card}>
    <Card.Content style={styles.content}>
      <IconButton
        icon="chevron-left"
        size={24}
        onPress={onPrevDay}
        disabled={isPrevDisabled}
      />
      <View style={styles.info}>
        <Text variant="titleMedium" style={styles.dateText}>
          {showTodayPrefix ? `${todayLabel} — ${formattedDate}` : formattedDate}
        </Text>
        {!!hint && (
          <Text variant="bodySmall" style={styles.hint}>{hint}</Text>
        )}
      </View>
      <IconButton icon="chevron-right" size={24} onPress={onNextDay} />
    </Card.Content>
  </Card>
);

const styles = StyleSheet.create({
  card: { marginBottom: spacing.sm, backgroundColor: colors.white },
  content: { flexDirection: 'row', alignItems: 'center' },
  info: { flex: 1 },
  dateText: { color: colors.dark, textTransform: 'capitalize' },
  hint: { color: colors.gray, marginTop: 4 },
});
