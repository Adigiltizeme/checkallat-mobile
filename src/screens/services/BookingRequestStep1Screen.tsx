import React, { useState, useLayoutEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Text, TextInput, Button, Chip } from 'react-native-paper';
import { StackScreenProps } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { HomeStackParamList } from '../../navigation/types';
import { BookingStep1Data } from '../../types/booking';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { getLocalizedName } from '../../utils/localize';

type Props = StackScreenProps<HomeStackParamList, 'BookingRequestStep1'>;

// ─── Options par catégorie ──────────────────────────────────────────────────

type CategoryField = {
  key: string;
  labelKey: string;
  options: { value: string; labelFr: string; labelEn: string; labelAr: string }[];
};

const CATEGORY_FIELDS: Record<string, CategoryField[]> = {
  plumbing: [
    {
      key: 'problemType',
      labelKey: 'booking_request.cat_plumbing_problem',
      options: [
        { value: 'leak',         labelFr: 'Fuite',           labelEn: 'Leak',           labelAr: 'تسرّب' },
        { value: 'clog',         labelFr: 'Bouchon',         labelEn: 'Clog',           labelAr: 'انسداد' },
        { value: 'installation', labelFr: 'Installation',    labelEn: 'Installation',   labelAr: 'تركيب' },
        { value: 'repair',       labelFr: 'Réparation',      labelEn: 'Repair',         labelAr: 'إصلاح' },
      ],
    },
  ],
  electricity: [
    {
      key: 'problemType',
      labelKey: 'booking_request.cat_electricity_problem',
      options: [
        { value: 'outlet',       labelFr: 'Prise / interrupteur', labelEn: 'Outlet / switch',   labelAr: 'مقبس / مفتاح' },
        { value: 'circuit',      labelFr: 'Circuit / disjoncteur', labelEn: 'Circuit / breaker', labelAr: 'دائرة كهربائية' },
        { value: 'installation', labelFr: 'Installation',          labelEn: 'Installation',      labelAr: 'تركيب' },
        { value: 'short',        labelFr: 'Court-circuit',         labelEn: 'Short circuit',     labelAr: 'دائرة قصيرة' },
      ],
    },
  ],
  painting: [
    {
      key: 'surfaceType',
      labelKey: 'booking_request.cat_painting_surface',
      options: [
        { value: 'walls',    labelFr: 'Murs intérieurs', labelEn: 'Interior walls', labelAr: 'جدران داخلية' },
        { value: 'ceiling',  labelFr: 'Plafond',         labelEn: 'Ceiling',        labelAr: 'سقف' },
        { value: 'exterior', labelFr: 'Extérieur',       labelEn: 'Exterior',       labelAr: 'خارجي' },
        { value: 'furniture',labelFr: 'Mobilier',        labelEn: 'Furniture',      labelAr: 'أثاث' },
      ],
    },
  ],
  handyman: [
    {
      key: 'taskType',
      labelKey: 'booking_request.cat_handyman_task',
      options: [
        { value: 'assembly',   labelFr: 'Montage meuble',    labelEn: 'Furniture assembly', labelAr: 'تجميع أثاث' },
        { value: 'mounting',   labelFr: 'Fixation murale',   labelEn: 'Wall mounting',      labelAr: 'تثبيت جداري' },
        { value: 'repair',     labelFr: 'Réparation',        labelEn: 'Repair',             labelAr: 'إصلاح' },
        { value: 'general',    labelFr: 'Travaux généraux',  labelEn: 'General tasks',      labelAr: 'أعمال عامة' },
      ],
    },
  ],
  cleaning: [
    {
      key: 'cleaningType',
      labelKey: 'booking_request.cat_cleaning_type',
      options: [
        { value: 'standard',         labelFr: 'Nettoyage standard',     labelEn: 'Standard cleaning',   labelAr: 'تنظيف عادي' },
        { value: 'deep',             labelFr: 'Grand ménage',           labelEn: 'Deep cleaning',        labelAr: 'تنظيف عميق' },
        { value: 'post_construction',labelFr: 'Après travaux',          labelEn: 'Post-construction',    labelAr: 'بعد البناء' },
      ],
    },
  ],
  carpentry: [
    {
      key: 'taskType',
      labelKey: 'booking_request.cat_carpentry_task',
      options: [
        { value: 'repair',      labelFr: 'Réparation',      labelEn: 'Repair',       labelAr: 'إصلاح' },
        { value: 'installation',labelFr: 'Installation',    labelEn: 'Installation', labelAr: 'تركيب' },
        { value: 'custom',      labelFr: 'Sur mesure',      labelEn: 'Custom work',  labelAr: 'عمل مخصص' },
      ],
    },
  ],
  air_condition: [
    {
      key: 'serviceType',
      labelKey: 'booking_request.cat_ac_service',
      options: [
        { value: 'cleaning',    labelFr: 'Nettoyage',       labelEn: 'Cleaning',     labelAr: 'تنظيف' },
        { value: 'installation',labelFr: 'Installation',    labelEn: 'Installation', labelAr: 'تركيب' },
        { value: 'repair',      labelFr: 'Réparation',      labelEn: 'Repair',       labelAr: 'إصلاح' },
        { value: 'maintenance', labelFr: 'Entretien',       labelEn: 'Maintenance',  labelAr: 'صيانة' },
      ],
    },
  ],
};

const HAS_URGENCY = ['plumbing', 'electricity', 'handyman', 'air_condition'];

export const BookingRequestStep1Screen = ({ route, navigation }: Props) => {
  const { t, i18n } = useTranslation();
  const { categorySlug, categoryNameFr, categoryNameEn, categoryNameAr } = route.params;

  const categoryName = getLocalizedName(
    { nameFr: categoryNameFr, nameEn: categoryNameEn, nameAr: categoryNameAr },
    i18n.language,
  );

  useLayoutEffect(() => {
    navigation.setOptions({ title: t('booking_request.step_of', { current: 1, total: 5 }) });
  }, []);

  const fields = CATEGORY_FIELDS[categorySlug] ?? [];
  const showUrgency = HAS_URGENCY.includes(categorySlug);

  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [urgency, setUrgency] = useState<'normal' | 'urgent'>('normal');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsMultipleSelection: true,
    });
    if (!result.canceled) {
      const uris = result.assets.map(a => a.uri);
      setPhotos(prev => [...prev, ...uris].slice(0, 5));
    }
  };

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
    navigation.navigate('BookingRequestStep2', { categorySlug, step1Data });
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
                <Chip
                  key={opt.value}
                  selected={(selections[field.key] ?? []).includes(opt.value)}
                  onPress={() => toggleSelection(field.key, opt.value)}
                  style={[
                    styles.chip,
                    (selections[field.key] ?? []).includes(opt.value) && styles.chipSelected,
                  ]}
                  textStyle={(selections[field.key] ?? []).includes(opt.value) ? styles.chipTextSelected : undefined}
                >
                  {label}
                </Chip>
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
              <Chip
                key={u}
                selected={urgency === u}
                onPress={() => setUrgency(u)}
                style={[styles.chip, urgency === u && styles.chipSelected]}
                textStyle={urgency === u ? styles.chipTextSelected : undefined}
              >
                {u === 'normal'
                  ? t('booking_request.urgency_normal')
                  : t('booking_request.urgency_urgent', { pct: 30 })}
              </Chip>
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
          outlineColor={submitted && description.trim().length < 10 ? colors.error : colors.border}
          activeOutlineColor={colors.primary}
          style={styles.textarea}
        />
        {submitted && description.trim().length < 10 && (
          <Text style={styles.errorText}>{t('booking_request.description_min')}</Text>
        )}
      </View>

      {/* Photos */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t('booking_request.photos_label')}</Text>
        <View style={styles.photosRow}>
          {photos.map((uri, i) => (
            <TouchableOpacity key={i} onPress={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))}>
              <Image source={{ uri }} style={styles.photoThumb} />
            </TouchableOpacity>
          ))}
          {photos.length < 5 && (
            <TouchableOpacity style={styles.addPhotoBtn} onPress={pickPhoto}>
              <Text style={styles.addPhotoText}>+</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <Button
        mode="contained"
        onPress={handleNext}
        style={styles.nextBtn}
        labelStyle={styles.nextBtnLabel}
      >
        {t('booking_request.next')}
      </Button>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  stepLabel: { fontSize: 12, color: colors.gray, marginBottom: spacing.xs },
  categoryTitle: { fontSize: 20, fontWeight: '700', color: colors.dark, marginBottom: spacing.lg },
  section: { marginBottom: spacing.lg },
  sectionLabel: { fontSize: 14, fontWeight: '600', color: colors.dark, marginBottom: spacing.sm },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { marginBottom: 4, backgroundColor: colors.lightGray },
  chipSelected: { backgroundColor: colors.primary },
  chipTextSelected: { color: colors.white },
  textarea: { backgroundColor: colors.white, maxHeight: 120 },
  photosRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoThumb: { width: 72, height: 72, borderRadius: 8, backgroundColor: colors.lightGray },
  addPhotoBtn: {
    width: 72,
    height: 72,
    borderRadius: 8,
    backgroundColor: colors.lightGray,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoText: { fontSize: 28, color: colors.gray },
  nextBtn: { marginTop: spacing.md, borderRadius: 8, backgroundColor: colors.primary },
  nextBtnLabel: { fontSize: 16, paddingVertical: 4 },
  errorText: { fontSize: 12, color: colors.error, marginTop: 4 },
});
