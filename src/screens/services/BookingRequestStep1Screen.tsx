import React, { useState, useLayoutEffect, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { ChocolateButton } from '../../components/shared/ChocolateButton';
import { ChocolateChip } from '../../components/shared/ChocolateChip';
import { useAppTheme } from '../../theme/ThemeProvider';
import { StackScreenProps } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { HomeStackParamList } from '../../navigation/types';
import { BookingStep1Data } from '../../types/booking';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { getLocalizedName } from '../../utils/localize';
import { RootState } from '../../store';
import { PhotoPickerGrid } from '../../components/shared/PhotoPickerGrid';
import { CATEGORY_FIELDS, HAS_URGENCY } from '../../config/categoryFields';

type Props = StackScreenProps<HomeStackParamList, 'BookingRequestStep1'>;

export const BookingRequestStep1Screen = ({ route, navigation }: Props) => {
  const { tokens } = useAppTheme();
  const { t, i18n } = useTranslation();
  const { categorySlug, categoryNameFr, categoryNameEn, categoryNameAr, prefill, step2Prefill } = route.params as any;
  const user = useSelector((state: RootState) => state.auth.user);

  const categoryName = getLocalizedName(
    { nameFr: categoryNameFr, nameEn: categoryNameEn, nameAr: categoryNameAr },
    i18n.language,
  );

  useLayoutEffect(() => {
    navigation.setOptions({ title: t('booking_request.step_of', { current: 1, total: 5 }) });
  }, []);

  // Guard : un pro actif ne peut pas réserver dans une catégorie qu'il propose lui-même
  useEffect(() => {
    const proSlugs: string[] = user?.pro?.serviceCategorySlugs ?? [];
    if (user?.pro?.status === 'active' && proSlugs.includes(categorySlug)) {
      Alert.alert(t('common.access_denied'), t('home.pro_cannot_book_own_category'), [
        { text: t('common.ok'), onPress: () => navigation.goBack() },
      ]);
    }
  }, []);

  const fields = CATEGORY_FIELDS[categorySlug] ?? [];
  const showUrgency = HAS_URGENCY.includes(categorySlug);

  const [selections, setSelections] = useState<Record<string, string[]>>(prefill?.categoryData ?? {});
  const [urgency, setUrgency] = useState<'normal' | 'urgent'>(prefill?.urgency ?? 'normal');
  const [description, setDescription] = useState(prefill?.clientDescription ?? '');
  const [photos, setPhotos] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: tokens.background },
    content: { padding: spacing.md, paddingBottom: spacing.xl },
    stepLabel: { fontSize: 12, color: tokens.text.secondary, marginBottom: spacing.xs },
    categoryTitle: { fontSize: 20, fontWeight: '700', color: tokens.text.primary, marginBottom: spacing.lg },
    section: { marginBottom: spacing.lg },
    sectionLabel: { fontSize: 14, fontWeight: '600', color: tokens.text.primary, marginBottom: spacing.sm },
    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    textarea: { backgroundColor: tokens.backgroundAlt, maxHeight: 120 },
    nextBtn: { marginTop: spacing.md },
    errorText: { fontSize: 12, color: colors.error, marginTop: 4 },
  }), [tokens]);

  const toggleSelection = (fieldKey: string, value: string) => {
    setSelections(prev => {
      const current = prev[fieldKey] ?? [];
      return {
        ...prev,
        [fieldKey]: current.includes(value)
          ? current.filter(v => v !== value)
          : [...current, value],
      };
    });
  };

  const isValid = () => {
    if (description.trim().length < 10) return false;
    for (const field of fields) {
      if (!selections[field.key]?.length) return false;
    }
    return true;
  };

  const handleNext = () => {
    setSubmitted(true);
    if (!isValid()) return;
    const step1Data: BookingStep1Data = {
      categorySlug,
      categoryNameFr,
      categoryNameEn,
      categoryNameAr,
      clientDescription: description.trim(),
      clientPhotos: photos,
      categoryData: { ...selections, urgency },
    };
    navigation.navigate('BookingRequestStep2', { categorySlug, step1Data, step2Prefill });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.stepLabel}>{t('booking_request.step_of', { current: 1, total: 5 })}</Text>
      <Text style={styles.categoryTitle}>{categoryName}</Text>

      {/* Champs dynamiques par catégorie */}
      {fields.map(field => (
        <View key={field.key} style={styles.section}>
          <Text style={styles.sectionLabel}>{t(field.labelKey)}</Text>
          <View style={styles.chipsRow}>
            {field.options.map(opt => {
              const label = getLocalizedName(
                { nameFr: opt.labelFr, nameEn: opt.labelEn, nameAr: opt.labelAr },
                i18n.language,
              );
              return (
                <ChocolateChip
                  key={opt.value}
                  label={label}
                  selected={(selections[field.key] ?? []).includes(opt.value)}
                  onPress={() => toggleSelection(field.key, opt.value)}
                />
              );
            })}
          </View>
              {submitted && !selections[field.key]?.length && (
            <Text style={styles.errorText}>{t('common.required')}</Text>
          )}
        </View>
      ))}

      {/* Urgence */}
      {showUrgency && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('booking_request.urgency_label')}</Text>
          <View style={styles.chipsRow}>
            {(['normal', 'urgent'] as const).map(u => (
              <ChocolateChip
                key={u}
                label={u === 'normal'
                  ? t('booking_request.urgency_normal')
                  : t('booking_request.urgency_urgent', { pct: 30 })}
                selected={urgency === u}
                onPress={() => setUrgency(u)}
              />
            ))}
          </View>
        </View>
      )}

      {/* Description */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t('booking_request.description_label')}</Text>
        <TextInput
          mode="outlined"
          multiline
          numberOfLines={4}
          placeholder={t('booking_request.description_placeholder')}
          value={description}
          onChangeText={setDescription}
          outlineColor={submitted && description.trim().length < 10 ? colors.error : tokens.border}
          activeOutlineColor={tokens.primary}
          style={styles.textarea}
        />
        {submitted && description.trim().length < 10 && (
          <Text style={styles.errorText}>{t('booking_request.description_min')}</Text>
        )}
      </View>

      {/* Photos */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t('booking_request.photos_label')}</Text>
        <PhotoPickerGrid
          photos={photos}
          onPhotosChange={setPhotos}
          maxPhotos={5}
        />
      </View>

      <ChocolateButton onPress={handleNext} style={styles.nextBtn}>
        {t('booking_request.next')}
      </ChocolateButton>
    </ScrollView>
  );
};

