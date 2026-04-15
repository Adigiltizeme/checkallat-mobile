import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Button, Text, Card, IconButton } from 'react-native-paper';
import { StackScreenProps } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { Step1Data, Step2Data, Step3Data, Step4Data, TimeSlot, TIME_SLOT_LABELS } from '../../types/transport';

type Props = StackScreenProps<any, 'TransportRequestStep4'>;

// Heure de fin de créneau — un créneau est indisponible si l'heure actuelle dépasse sa fin
// Matin 8h-12h, Après-midi 12h-17h, Soir 17h-20h, Flexible = toujours dispo
const SLOT_END_HOUR: Record<TimeSlot, number | null> = {
  morning: 12,
  afternoon: 17,
  evening: 20,
  flexible: null,
};

function isSlotAvailableToday(slot: TimeSlot): boolean {
  const endHour = SLOT_END_HOUR[slot];
  if (endHour === null) return true;
  return new Date().getHours() < endHour;
}


function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getTimeSlotIcon(slot: TimeSlot): string {
  const icons: Record<TimeSlot, string> = {
    morning: '🌅',
    afternoon: '☀️',
    evening: '🌆',
    flexible: '⏰',
  };
  return icons[slot];
}

function getTimeSlotHours(slot: TimeSlot): string {
  const hours: Record<TimeSlot, string> = {
    morning: '8h - 12h',
    afternoon: '12h - 17h',
    evening: '17h - 20h',
    flexible: '',
  };
  return hours[slot];
}

export const TransportRequestStep4Screen = ({ route, navigation }: Props) => {
  const { t, i18n } = useTranslation();
  const { step1Data, step2Data, step3Data } = route.params as {
    step1Data: Step1Data;
    step2Data: Step2Data;
    step3Data: Step3Data;
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [mode, setMode] = useState<'immediate' | 'scheduled'>('immediate');
  const [scheduledDate, setScheduledDate] = useState(new Date(today));
  const [timeSlot, setTimeSlot] = useState<TimeSlot>('morning');

  const addDays = (days: number) => {
    const newDate = new Date(scheduledDate);
    newDate.setDate(newDate.getDate() + days);
    setScheduledDate(newDate);
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString(i18n.language, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const isToday = isSameDay(scheduledDate, today);

  const handleNext = () => {
    if (mode === 'immediate') {
      // Disponible 24/7 — aucune restriction horaire, dépend uniquement de la disponibilité des chauffeurs
    } else {
      // Vérifier que le créneau sélectionné est encore disponible aujourd'hui
      if (isToday && !isSlotAvailableToday(timeSlot)) {
        Alert.alert(
          t('transport.slot_unavailable_title'),
          t('transport.slot_unavailable_msg'),
          [{ text: t('common.ok') }],
        );
        return;
      }
    }

    const step4Data: Step4Data = {
      scheduledDate: mode === 'immediate' ? new Date().toISOString() : scheduledDate.toISOString(),
      timeSlot: mode === 'immediate' ? 'flexible' : timeSlot,
      isImmediate: mode === 'immediate',
    };

    navigation.navigate('TransportRequestStep5', {
      step1Data,
      step2Data,
      step3Data,
      step4Data,
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text variant="headlineSmall" style={styles.title}>
        {t('transport.step4_question')}
      </Text>

      {/* Choix du mode : deux cartes côte à côte */}
      <View style={styles.modeRow}>
        <TouchableOpacity
          style={[styles.modeCard, mode === 'immediate' && styles.modeCardActive]}
          onPress={() => setMode('immediate')}
          activeOpacity={0.8}
        >
          <Text style={styles.modeIcon}>⚡</Text>
          <Text
            variant="titleSmall"
            style={[styles.modeLabel, mode === 'immediate' && styles.modeLabelActive]}
          >
            {t('transport.immediate_mode')}
          </Text>
          <Text variant="bodySmall" style={styles.modeHint}>
            {t('transport.immediate_hint_short')}
          </Text>
          {mode === 'immediate' && <View style={styles.modeCheck}><Text style={styles.modeCheckIcon}>✓</Text></View>}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modeCard, mode === 'scheduled' && styles.modeCardActive]}
          onPress={() => setMode('scheduled')}
          activeOpacity={0.8}
        >
          <Text style={styles.modeIcon}>📅</Text>
          <Text
            variant="titleSmall"
            style={[styles.modeLabel, mode === 'scheduled' && styles.modeLabelActive]}
          >
            {t('transport.scheduled_mode')}
          </Text>
          <Text variant="bodySmall" style={styles.modeHint}>
            {t('transport.scheduled_hint_short')}
          </Text>
          {mode === 'scheduled' && <View style={styles.modeCheck}><Text style={styles.modeCheckIcon}>✓</Text></View>}
        </TouchableOpacity>
      </View>

      {mode === 'immediate' ? (
        <Card style={styles.infoCard}>
          <Card.Content>
            <Text variant="bodyMedium" style={styles.infoText}>
              {t('transport.immediate_info')}
            </Text>
          </Card.Content>
        </Card>
      ) : (
        <>
          {/* Sélection Date */}
          <Text variant="labelLarge" style={styles.label}>
            {t('common.date')}
          </Text>
          <Card style={styles.dateCard}>
            <Card.Content style={styles.dateCardContent}>
              <IconButton
                icon="chevron-left"
                size={24}
                onPress={() => addDays(-1)}
                disabled={isToday} // Pas avant aujourd'hui
              />
              <View style={styles.dateInfo}>
                <Text variant="titleMedium" style={styles.dateText}>
                  {isToday
                    ? `${t('transport.today_label')} — ${formatDate(scheduledDate)}`
                    : formatDate(scheduledDate)}
                </Text>
                <Text variant="bodySmall" style={styles.dateHint}>
                  {t('transport.date_hint')}
                </Text>
              </View>
              <IconButton icon="chevron-right" size={24} onPress={() => addDays(1)} />
            </Card.Content>
          </Card>

          {/* Avertissement si aujourd'hui et certains créneaux indisponibles */}
          {isToday && (
            <Card style={styles.warningCard}>
              <Card.Content>
                <Text variant="bodySmall" style={styles.warningText}>
                  ⚠️ {t('transport.today_slot_warning')}
                </Text>
              </Card.Content>
            </Card>
          )}

          {/* Sélection Créneau */}
          <Text variant="labelLarge" style={styles.label}>
            {t('transport.time_slot')}
          </Text>

          <View style={styles.timeSlots}>
            {(Object.keys(TIME_SLOT_LABELS) as TimeSlot[]).map((slot) => {
              const unavailableToday = isToday && !isSlotAvailableToday(slot);
              const isActive = timeSlot === slot;

              return (
                <TouchableOpacity
                  key={slot}
                  style={[
                    styles.timeSlotCard,
                    isActive && styles.timeSlotCardActive,
                    unavailableToday && styles.timeSlotCardDisabled,
                  ]}
                  onPress={() => {
                    if (unavailableToday) {
                      Alert.alert(t('transport.slot_unavailable_title'), t('transport.slot_unavailable_msg'));
                      return;
                    }
                    setTimeSlot(slot);
                  }}
                  activeOpacity={unavailableToday ? 1 : 0.8}
                >
                  <View style={styles.timeSlotContent}>
                    <Text variant="titleMedium" style={styles.timeSlotText}>
                      {getTimeSlotIcon(slot)}
                    </Text>
                    <Text
                      variant="bodyLarge"
                      style={[
                        styles.timeSlotLabel,
                        isActive && styles.timeSlotLabelActive,
                        unavailableToday && styles.timeSlotLabelDisabled,
                      ]}
                    >
                      {t('transport.' + slot)}
                    </Text>
                    {slot !== 'flexible' && (
                      <Text
                        variant="bodySmall"
                        style={[
                          styles.timeSlotHours,
                          isActive && styles.timeSlotHoursActive,
                          unavailableToday && styles.timeSlotLabelDisabled,
                        ]}
                      >
                        {getTimeSlotHours(slot)}
                      </Text>
                    )}
                    {unavailableToday && (
                      <Text variant="bodySmall" style={styles.unavailableLabel}>
                        {t('transport.slot_passed')}
                      </Text>
                    )}
                  </View>
                  {isActive && !unavailableToday && (
                    <View style={styles.checkmark}>
                      <Text style={styles.checkmarkIcon}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {timeSlot === 'flexible' && (
            <Card style={styles.infoCard}>
              <Card.Content>
                <Text variant="bodyMedium" style={styles.infoText}>
                  💡 {t('transport.flexible_info')}
                </Text>
              </Card.Content>
            </Card>
          )}
        </>
      )}

      {/* Boutons navigation */}
      <View style={styles.actions}>
        <Button
          mode="outlined"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          textColor={colors.gray}
        >
          {t('common.back')}
        </Button>
        <Button
          mode="contained"
          onPress={handleNext}
          buttonColor={colors.primary}
          style={styles.nextButton}
        >
          {t('transport.next')}
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.light },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  title: { color: colors.dark, marginBottom: spacing.lg },
  label: { color: colors.dark, marginBottom: spacing.sm, marginTop: spacing.md },

  // Mode selection
  modeRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  modeCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    padding: spacing.md,
    alignItems: 'center',
    position: 'relative',
  },
  modeCardActive: { borderColor: colors.primary, backgroundColor: '#E8F5F3' },
  modeIcon: { fontSize: 28, marginBottom: spacing.xs },
  modeLabel: { color: colors.dark, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  modeLabelActive: { color: colors.primary },
  modeHint: { color: colors.gray, textAlign: 'center', fontSize: 11 },
  modeCheck: {
    position: 'absolute', top: 6, right: 6,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  modeCheckIcon: { color: colors.white, fontSize: 12, fontWeight: '700' },

  // Date
  dateCard: { marginBottom: spacing.sm, backgroundColor: colors.white },
  dateCardContent: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  dateInfo: { flex: 1 },
  dateText: { color: colors.dark, textTransform: 'capitalize' },
  dateHint: { color: colors.gray, marginTop: 4 },

  // Warnings / Info
  infoCard: { backgroundColor: '#E3F2FD', marginTop: spacing.sm, marginBottom: spacing.sm },
  warningCard: { backgroundColor: '#FFF3E0', marginTop: spacing.sm, marginBottom: spacing.sm },
  infoText: { color: colors.dark, lineHeight: 22 },
  warningText: { color: '#E65100', lineHeight: 20 },

  // Time slots
  timeSlots: { gap: spacing.md },
  timeSlotCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    padding: spacing.md,
    position: 'relative',
  },
  timeSlotCardActive: { borderColor: colors.primary, backgroundColor: '#E8F5F3' },
  timeSlotCardDisabled: { backgroundColor: '#F5F5F5', borderColor: '#E0E0E0', opacity: 0.6 },
  timeSlotContent: { alignItems: 'center' },
  timeSlotText: { fontSize: 32, marginBottom: spacing.xs },
  timeSlotLabel: { color: colors.dark, fontWeight: '600' },
  timeSlotLabelActive: { color: colors.primary },
  timeSlotLabelDisabled: { color: colors.gray },
  timeSlotHours: { color: colors.gray, marginTop: 4 },
  timeSlotHoursActive: { color: colors.primary },
  unavailableLabel: { color: '#E65100', marginTop: 4, fontWeight: '600' },
  checkmark: {
    position: 'absolute', top: spacing.sm, right: spacing.sm,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  checkmarkIcon: { color: colors.white, fontSize: 16, fontWeight: '700' },

  // Actions
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl },
  backButton: { flex: 1, paddingVertical: spacing.sm },
  nextButton: { flex: 2, paddingVertical: spacing.sm },
});
