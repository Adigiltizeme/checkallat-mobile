import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Text, Chip, Button } from 'react-native-paper';
import { StackScreenProps } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useOpenBookingDisputeMutation } from '../../store/api/bookingsApi';
import { colors } from '../../theme/colors';
import { useAppTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/spacing';

type Props = StackScreenProps<any, 'BookingDispute'>;

const CATEGORIES = ['quality', 'payment', 'cancellation', 'damage', 'fraud', 'other'] as const;

export const BookingDisputeScreen = ({ route, navigation }: Props) => {
  const { tokens } = useAppTheme();


  const styles = useMemo(() => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.light },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },

  infoBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: `${tokens.primary}12`, borderRadius: 10,
    padding: spacing.md, marginBottom: spacing.lg,
    borderLeftWidth: 3, borderLeftColor: tokens.primary,
  },
  infoText: { flex: 1, color: colors.dark, lineHeight: 18 },

  sectionLabel: {
    color: colors.dark, fontWeight: '700',
    marginBottom: spacing.sm, marginTop: spacing.md,
  },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.xs },
  chip: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  chipSelected: { backgroundColor: tokens.primary, borderColor: tokens.primary },
  chipText: { color: colors.dark },
  chipTextSelected: { color: colors.white },

  textarea: {
    backgroundColor: colors.white,
    borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    padding: spacing.md, fontSize: 14, color: colors.dark,
    minHeight: 130,
  },
  textareaError: { borderColor: colors.error },
  charCount: { fontSize: 11, color: colors.gray, marginTop: 4, textAlign: 'right' },

  error: { color: colors.error, fontSize: 12, marginTop: 4 },

  submitBtn: { marginTop: spacing.lg, borderRadius: 10 },
  submitBtnContent: { paddingVertical: 6 },
  cancelBtn: { marginTop: spacing.sm },

  successContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: spacing.xl, gap: spacing.md,
  },
  successTitle: { color: colors.dark, fontWeight: '700', textAlign: 'center' },
  successSubtitle: { color: colors.gray, textAlign: 'center', lineHeight: 20 },
  successBtn: { marginTop: spacing.md },
  }), [tokens]);

  const { t } = useTranslation();
  const { bookingId } = route.params as { bookingId: string };

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [showError, setShowError] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [openDispute, { isLoading }] = useOpenBookingDisputeMutation();

  const handleSubmit = async () => {
    if (!selectedCategory || description.trim().length < 20) {
      setShowError(true);
      return;
    }
    setShowError(false);
    try {
      await openDispute({ id: bookingId, category: selectedCategory, description: description.trim() }).unwrap();
      setSubmitted(true);
    } catch (error: any) {
      if (error?.status === 409 || error?.data?.statusCode === 409) {
        setSubmitted(true);
      }
    }
  };

  if (submitted) {
    return (
      <View style={styles.successContainer}>
        <Icon name="check-circle" size={64} color={colors.success} />
        <Text variant="headlineSmall" style={styles.successTitle}>
          {t('dispute.submitted_title')}
        </Text>
        <Text variant="bodyMedium" style={styles.successSubtitle}>
          {t('dispute.submitted_msg')}
        </Text>
        <Button mode="outlined" onPress={() => navigation.goBack()} style={styles.successBtn}>
          {t('common.back')}
        </Button>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        <View style={styles.infoBox}>
          <Icon name="shield-half-full" size={20} color={tokens.primary} />
          <Text variant="bodySmall" style={styles.infoText}>{t('dispute.info_note')}</Text>
        </View>

        <Text variant="titleMedium" style={styles.sectionLabel}>{t('dispute.category_label')}</Text>
        <View style={styles.chips}>
          {CATEGORIES.map((cat) => (
            <Chip
              key={cat}
              selected={selectedCategory === cat}
              onPress={() => setSelectedCategory(cat)}
              style={[styles.chip, selectedCategory === cat && styles.chipSelected]}
              textStyle={selectedCategory === cat ? styles.chipTextSelected : styles.chipText}
            >
              {t(`dispute.category_${cat}`)}
            </Chip>
          ))}
        </View>
        {showError && !selectedCategory && (
          <Text style={styles.error}>{t('dispute.description_required')}</Text>
        )}

        <Text variant="titleMedium" style={styles.sectionLabel}>{t('dispute.description_label')}</Text>
        <TextInput
          style={[styles.textarea, showError && description.trim().length < 20 && styles.textareaError]}
          value={description}
          onChangeText={setDescription}
          placeholder={t('dispute.description_placeholder')}
          placeholderTextColor={colors.gray}
          multiline
          numberOfLines={6}
          maxLength={2000}
          textAlignVertical="top"
        />
        <Text style={styles.charCount}>{description.trim().length} / 20 {t('dispute.chars_min')}</Text>
        {showError && description.trim().length < 20 && (
          <Text style={styles.error}>{t('dispute.description_too_short')}</Text>
        )}

        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={isLoading}
          disabled={isLoading}
          style={styles.submitBtn}
          contentStyle={styles.submitBtnContent}
        >
          {t('dispute.submit_btn')}
        </Button>

        <Button mode="text" onPress={() => navigation.goBack()} style={styles.cancelBtn}>
          {t('common.cancel')}
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
