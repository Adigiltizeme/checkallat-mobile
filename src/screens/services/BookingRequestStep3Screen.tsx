import React, { useState, useLayoutEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { Text, Switch, Chip, Card } from 'react-native-paper';
import { ChocolateButton } from '../../components/shared/ChocolateButton';
import { useAppTheme } from '../../theme/ThemeProvider';
import { StackScreenProps } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import DateTimePicker from '@react-native-community/datetimepicker';
import { HomeStackParamList } from '../../navigation/types';
import { BookingStep3Data, BookingTimeSlot, RecurringFrequency } from '../../types/booking';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { ModePickerCard } from '../../components/shared/ModePickerCard';
import { DateNavigator } from '../../components/shared/DateNavigator';
import { TimeSlotPicker, TimeSlotOption } from '../../components/shared/TimeSlotPicker';

type Props = StackScreenProps<HomeStackParamList, 'BookingRequestStep3'>;

// Heure de fin de chaque créneau (pour la désactivation si aujourd'hui)
const SLOT_END_HOUR: Record<BookingTimeSlot, number> = {
  morning: 12,
  afternoon: 17,
  evening: 20,
};

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isSlotAvailableToday(slot: BookingTimeSlot): boolean {
  return new Date().getHours() < SLOT_END_HOUR[slot];
}

const FREQUENCIES: { value: RecurringFrequency; labelKey: string }[] = [
  { value: 'weekly',   labelKey: 'booking_request.freq_weekly' },
  { value: 'biweekly', labelKey: 'booking_request.freq_biweekly' },
  { value: 'monthly',  labelKey: 'booking_request.freq_monthly' },
];

export const BookingRequestStep3Screen = ({ route, navigation }: Props) => {
  const { tokens } = useAppTheme();

  const styles = useMemo(() => StyleSheet.create({
  container: { flex: 1, backgroundColor: tokens.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  title: { color: tokens.text.primary, marginBottom: spacing.lg },
  sectionLabel: { color: tokens.text.primary, marginBottom: spacing.sm, marginTop: spacing.md },
  modeRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  infoCard: { backgroundColor: '#E3F2FD', marginTop: spacing.sm, marginBottom: spacing.sm },
  warningCard: { backgroundColor: '#FFF3E0', marginTop: spacing.sm, marginBottom: spacing.sm },
  infoText: { color: tokens.text.primary, lineHeight: 22 },
  warningText: { color: '#E65100', lineHeight: 20 },
  recurringCard: { borderRadius: 12, marginTop: spacing.lg, backgroundColor: tokens.backgroundAlt },
  recurringHeader: { flexDirection: 'row', alignItems: 'center' },
  recurringTexts: { flex: 1 },
  recurringTitle: { fontSize: 15, fontWeight: '600', color: tokens.text.primary },
  recurringDesc: { fontSize: 12, color: tokens.text.secondary, marginTop: 2 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.sm },
  chip: { backgroundColor: tokens.card },
  chipSelected: { backgroundColor: tokens.primary },
  chipTextSelected: { color: colors.white },
  dateBtn: { borderColor: tokens.border, marginBottom: spacing.xs },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl },
  backWrap: { flex: 1 },
  nextWrap: { flex: 2 },
  }), [tokens]);
  const { t, i18n } = useTranslation();
  const { categorySlug, step1Data, step2Data } = route.params;

  const isCleaningCategory = categorySlug === 'cleaning';

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [bookingType, setBookingType] = useState<'immediate' | 'scheduled'>('immediate');
  const [scheduledDate, setScheduledDate] = useState<Date>(new Date(today));
  const [timeSlot, setTimeSlot] = useState<BookingTimeSlot>('morning');
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<RecurringFrequency>('weekly');
  const [recurringEndDate, setRecurringEndDate] = useState<Date>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    return d;
  });
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ title: t('booking_request.step_of', { current: 3, total: 5 }) });
  }, []);

  const isToday = isSameDay(scheduledDate, today);

  const addDays = (days: number) => {
    const newDate = new Date(scheduledDate);
    newDate.setDate(newDate.getDate() + days);
    setScheduledDate(newDate);
  };

  const formatDate = (date: Date): string =>
    date.toLocaleDateString(i18n.language, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

  const slots: TimeSlotOption[] = (
    ['morning', 'afternoon', 'evening'] as BookingTimeSlot[]
  ).map((s) => ({
    value: s,
    icon: s === 'morning' ? '🌅' : s === 'afternoon' ? '☀️' : '🌆',
    label: t(`booking_request.time_slot_${s}_short`),
    hours: s === 'morning' ? '8h – 12h' : s === 'afternoon' ? '12h – 17h' : '17h – 20h',
    unavailable: isToday && !isSlotAvailableToday(s),
    passedLabel: t('booking_request.slot_passed'),
    unavailableTitle: t('booking_request.slot_unavailable_title'),
    unavailableMessage: t('booking_request.slot_unavailable_msg'),
  }));

  const handleNext = () => {
    const step3Data: BookingStep3Data = {
      bookingType,
      scheduledAt: bookingType === 'scheduled' ? scheduledDate.toISOString() : undefined,
      timeSlot: bookingType === 'scheduled' ? timeSlot : undefined,
      isRecurring: bookingType === 'scheduled' && isCleaningCategory && isRecurring,
      recurringFrequency: isRecurring ? frequency : undefined,
      recurringEndDate: isRecurring ? recurringEndDate.toISOString() : undefined,
    };
    navigation.navigate('BookingRequestStep4', { categorySlug, step1Data, step2Data, step3Data });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text variant="headlineSmall" style={styles.title}>
        {t('booking_request.step3_title')}
      </Text>

      {/* Choix du mode */}
      <View style={styles.modeRow}>
        <ModePickerCard
          icon="⚡"
          title={t('booking_request.immediate')}
          hint={t('booking_request.immediate_hint_short')}
          selected={bookingType === 'immediate'}
          onPress={() => setBookingType('immediate')}
        />
        <ModePickerCard
          icon="📅"
          title={t('booking_request.scheduled')}
          hint={t('booking_request.scheduled_hint_short')}
          selected={bookingType === 'scheduled'}
          onPress={() => setBookingType('scheduled')}
        />
      </View>

      {bookingType === 'immediate' ? (
        <Card style={styles.infoCard}>
          <Card.Content>
            <Text variant="bodyMedium" style={styles.infoText}>
              {t('booking_request.immediate_info')}
            </Text>
          </Card.Content>
        </Card>
      ) : (
        <>
          {/* Sélection date */}
          <Text variant="labelLarge" style={styles.sectionLabel}>
            {t('booking_request.date_label')}
          </Text>
          <DateNavigator
            formattedDate={formatDate(scheduledDate)}
            showTodayPrefix={isToday}
            todayLabel={t('common.today')}
            hint={t('booking_request.date_hint')}
            isPrevDisabled={isToday}
            onPrevDay={() => addDays(-1)}
            onNextDay={() => addDays(1)}
          />

          {/* Avertissement si aujourd'hui */}
          {isToday && (
            <Card style={styles.warningCard}>
              <Card.Content>
                <Text variant="bodySmall" style={styles.warningText}>
                  ⚠️ {t('booking_request.today_slot_warning')}
                </Text>
              </Card.Content>
            </Card>
          )}

          {/* Sélection créneau */}
          <Text variant="labelLarge" style={styles.sectionLabel}>
            {t('booking_request.time_slot_label')}
          </Text>
          <TimeSlotPicker
            slots={slots}
            selected={timeSlot}
            onSelect={(v) => setTimeSlot(v as BookingTimeSlot)}
          />

          {/* Récurrence (nettoyage uniquement) */}
          {isCleaningCategory && (
            <Card style={styles.recurringCard}>
              <Card.Content>
                <View style={styles.recurringHeader}>
                  <View style={styles.recurringTexts}>
                    <Text style={styles.recurringTitle}>{t('booking_request.recurring_label')}</Text>
                    <Text style={styles.recurringDesc}>{t('booking_request.recurring_desc')}</Text>
                  </View>
                  <Switch value={isRecurring} onValueChange={setIsRecurring} color={colors.primary} />
                </View>

                {isRecurring && (
                  <>
                    <Text style={[styles.sectionLabel, { marginTop: spacing.md }]}>
                      {t('booking_request.frequency_label')}
                    </Text>
                    <View style={styles.chipsRow}>
                      {FREQUENCIES.map(f => (
                        <Chip
                          key={f.value}
                          selected={frequency === f.value}
                          onPress={() => setFrequency(f.value)}
                          style={[styles.chip, frequency === f.value && styles.chipSelected]}
                          textStyle={frequency === f.value ? styles.chipTextSelected : undefined}
                        >
                          {t(f.labelKey)}
                        </Chip>
                      ))}
                    </View>

                    <Text style={[styles.sectionLabel, { marginTop: spacing.md }]}>
                      {t('booking_request.recurring_end_label')}
                    </Text>
                    <ChocolateButton
                      variant="outline"
                      onPress={() => setShowEndDatePicker(true)}
                      style={styles.dateBtn}
                    >
                      {recurringEndDate.toLocaleDateString(i18n.language, { day: 'numeric', month: 'long', year: 'numeric' })}
                    </ChocolateButton>
                    {showEndDatePicker && (
                      <DateTimePicker
                        value={recurringEndDate}
                        mode="date"
                        minimumDate={scheduledDate}
                        onChange={(_, date) => {
                          setShowEndDatePicker(Platform.OS === 'ios');
                          if (date) setRecurringEndDate(date);
                        }}
                      />
                    )}
                  </>
                )}
              </Card.Content>
            </Card>
          )}
        </>
      )}

      {/* Navigation */}
      <View style={styles.actions}>
        <View style={styles.backWrap}>
          <ChocolateButton variant="outline" onPress={() => navigation.goBack()}>
            {t('booking_request.back')}
          </ChocolateButton>
        </View>
        <View style={styles.nextWrap}>
          <ChocolateButton onPress={handleNext}>
            {t('booking_request.next')}
          </ChocolateButton>
        </View>
      </View>
    </ScrollView>
  );
};
