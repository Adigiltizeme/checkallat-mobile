import React, { useState } from 'react';
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
import { TransportStackParamList } from '../../navigation/types';
import { useOpenDisputeMutation } from '../../store/api/transportApi';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

type Props = StackScreenProps<TransportStackParamList, 'Dispute'>;

const CATEGORIES = ['quality', 'payment', 'cancellation', 'damage', 'fraud', 'other'] as const;

export const DisputeScreen = ({ route, navigation }: Props) => {
  const { t } = useTranslation();
  const { requestId } = route.params;

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [showError, setShowError] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [openDispute, { isLoading }] = useOpenDisputeMutation();

  const handleSubmit = async () => {
    if (!selectedCategory || description.trim().length < 20) {
      setShowError(true);
      return;
    }
    setShowError(false);
    try {
      await openDispute({
        id: requestId,
        category: selectedCategory,
        description: description.trim(),
      }).unwrap();
      setSubmitted(true);
    } catch (error: any) {
      // If a dispute already exists, show that info
      if (error?.status === 409 || error?.data?.statusCode === 409) {
        setSubmitted(true);
        return;
      }
      setShowError(true);
    }
  };

  if (submitted) {
    return (
      <View style={styles.successContainer}>
        <Icon name="check-circle" size={80} color={colors.success} />
        <Text variant="titleLarge" style={styles.successTitle}>{t('dispute.submitted_title')}</Text>
        <Text variant="bodyMedium" style={styles.successMsg}>{t('dispute.submitted_msg')}</Text>
        <Button
          mode="contained"
          onPress={() => navigation.goBack()}
          buttonColor={colors.primary}
          style={styles.doneBtn}
          icon="arrow-left"
        >
          {t('common.back')}
        </Button>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        {/* Subtitle */}
        <View style={styles.header}>
          <Icon name="alert-circle-outline" size={40} color={colors.error} />
          <Text variant="bodyMedium" style={styles.subtitle}>{t('dispute.subtitle')}</Text>
        </View>

        {/* Warning */}
        <View style={styles.warningBox}>
          <Text variant="bodySmall" style={styles.warningText}>{t('dispute.warning')}</Text>
        </View>

        <View style={styles.formCard}>
          {/* Category */}
          <Text variant="labelMedium" style={styles.fieldLabel}>{t('dispute.category_label')}</Text>
          <View style={styles.categoryChips}>
            {CATEGORIES.map((cat) => (
              <Chip
                key={cat}
                selected={selectedCategory === cat}
                onPress={() => { setSelectedCategory(cat); setShowError(false); }}
                style={[
                  styles.categoryChip,
                  selectedCategory === cat && styles.categoryChipSelected,
                ]}
                textStyle={[
                  styles.categoryChipText,
                  selectedCategory === cat && styles.categoryChipTextSelected,
                ]}
                showSelectedCheck={false}
              >
                {t(`dispute.category_${cat}`)}
              </Chip>
            ))}
          </View>
          {showError && !selectedCategory && (
            <Text variant="bodySmall" style={styles.errorText}>{t('dispute.description_required')}</Text>
          )}

          {/* Description */}
          <Text variant="labelMedium" style={[styles.fieldLabel, { marginTop: spacing.lg }]}>
            {t('dispute.description_label')}
          </Text>
          <TextInput
            style={[styles.textInput, showError && description.trim().length < 20 && styles.inputError]}
            placeholder={t('dispute.description_placeholder')}
            placeholderTextColor="#9CA3AF"
            value={description}
            onChangeText={(v) => { setDescription(v); setShowError(false); }}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            maxLength={2000}
          />
          {showError && description.trim().length < 20 && (
            <Text variant="bodySmall" style={styles.errorText}>{t('dispute.description_required')}</Text>
          )}
          <Text variant="bodySmall" style={styles.charCount}>{description.length}/2000</Text>

          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={isLoading}
            disabled={isLoading}
            buttonColor={colors.error}
            icon="flag"
            style={styles.submitBtn}
          >
            {isLoading ? t('dispute.submitting') : t('dispute.submit_btn')}
          </Button>
        </View>

        <View style={{ height: spacing.xl * 2 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: '#F5F5F5' },

  header: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    padding: spacing.xl,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  subtitle: { color: '#6B7280', textAlign: 'center' },

  warningBox: {
    backgroundColor: '#FFFBEB',
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    marginHorizontal: spacing.md,
    padding: spacing.md,
    borderRadius: 10,
    marginBottom: spacing.md,
  },
  warningText: { color: '#92400E', lineHeight: 18 },

  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: spacing.lg,
    marginHorizontal: spacing.md,
  },
  fieldLabel: {
    color: '#374151',
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  categoryChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryChip: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryChipSelected: {
    backgroundColor: '#FEE2E2',
    borderColor: colors.error,
  },
  categoryChipText: { color: '#374151', fontSize: 13 },
  categoryChipTextSelected: { color: colors.error, fontWeight: '600' },

  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    padding: spacing.md,
    color: '#111827',
    fontSize: 14,
    minHeight: 140,
    backgroundColor: '#F9FAFB',
  },
  inputError: { borderColor: colors.error },
  errorText: { color: colors.error, marginTop: 4 },
  charCount: { color: '#9CA3AF', textAlign: 'right', marginTop: 4 },

  submitBtn: { marginTop: spacing.lg, borderRadius: 10 },

  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: '#F5F5F5',
  },
  successTitle: { fontWeight: 'bold', color: '#111827', marginTop: spacing.lg, textAlign: 'center' },
  successMsg: { color: '#6B7280', textAlign: 'center', marginTop: spacing.sm, lineHeight: 22 },
  doneBtn: { marginTop: spacing.xl, borderRadius: 10, minWidth: 180 },
});
