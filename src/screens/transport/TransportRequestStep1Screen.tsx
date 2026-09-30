import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { TextInput, Text, IconButton, Card } from 'react-native-paper';
import { ChocolateButton } from '../../components/shared/ChocolateButton';
import { ChocolateChip } from '../../components/shared/ChocolateChip';
import { StackScreenProps } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { colors } from '../../theme/colors';
import { useAppTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/spacing';
import {
  TransportObjectType,
  OBJECT_TYPE_LABELS,
  Step1Data,
  VOLUME_ESTIMATES,
  COURIER_OBJECT_TYPES,
  STANDARD_OBJECT_TYPES,
  COURIER_VOLUME_ESTIMATES,
} from '../../types/transport';
import type { RootState } from '../../store';
import { uploadMultipleImages } from '../../services/uploadService';
import { PhotoPickerGrid } from '../../components/shared/PhotoPickerGrid';
import { useCourierLimits } from '../../hooks/useCourierLimits';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

type Props = StackScreenProps<any, 'TransportRequestStep1'>;

export const TransportRequestStep1Screen = ({ route, navigation }: Props) => {
  const { tokens } = useAppTheme();


  const styles = useMemo(() => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  title: {
    color: tokens.text.primary,
    marginBottom: spacing.lg,
  },
  label: {
    color: tokens.text.primary,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  typeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  selectedTypesHint: {
    color: colors.success,
    marginTop: -spacing.sm,
    marginBottom: spacing.sm,
    fontWeight: '500',
  },
  textarea: {
    backgroundColor: tokens.backgroundAlt,
  },
  charCount: {
    textAlign: 'right',
    color: tokens.text.secondary,
    marginTop: 4,
  },
  photoSection: {
    marginTop: spacing.md,
  },
  volumeSection: {
    marginTop: spacing.md,
  },
  volumeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  volumeHelpCard: {
    marginTop: spacing.sm,
    backgroundColor: tokens.card,
  },
  volumeHelpTitle: {
    color: tokens.primary,
    marginBottom: spacing.sm,
  },
  volumeHelpItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: tokens.border,
  },
  volumeHelpValue: {
    color: tokens.primary,
    fontWeight: '600',
  },
  volumeHelpNote: {
    color: tokens.text.secondary,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  uploadingContainer: {
    alignItems: 'center',
    padding: spacing.md,
    marginVertical: spacing.md,
  },
  uploadingText: {
    marginTop: spacing.sm,
    color: tokens.text.secondary,
    fontSize: 14,
  },
  }), [tokens]);

  const { t } = useTranslation();
  const { prefill, step2Prefill, step3Prefill, vehicleCategory } = (route.params ?? {}) as {
    prefill?: { objectTypes: string[]; description: string; estimatedVolume: number };
    step2Prefill?: any;
    step3Prefill?: any;
    vehicleCategory?: 'standard' | 'courier';
  };
  const isCourierMode = vehicleCategory === 'courier';
  const availableObjectTypes = isCourierMode ? COURIER_OBJECT_TYPES : STANDARD_OBJECT_TYPES;
  const activeVolumeEstimates = isCourierMode ? COURIER_VOLUME_ESTIMATES : VOLUME_ESTIMATES;
  const [objectTypes, setObjectTypes] = useState<TransportObjectType[]>(
    (prefill?.objectTypes as TransportObjectType[]) ?? (isCourierMode ? ['small_parcel'] : ['furniture'])
  );
  const [description, setDescription] = useState(prefill?.description ?? '');
  const [photos, setPhotos] = useState<string[]>([]);
  const [estimatedVolume, setEstimatedVolume] = useState(prefill?.estimatedVolume ?? 0);
  const [estimatedWeight, setEstimatedWeight] = useState(0);
  const [showVolumeHelp, setShowVolumeHelp] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  const token = useSelector((state: RootState) => state.auth.token);
  const courierLimits = useCourierLimits();
  const isWeightTooHigh = isCourierMode && estimatedWeight > courierLimits.maxWeightKg;

  // Toggle type d'objet (sélection multiple)
  const toggleObjectType = (type: TransportObjectType) => {
    if (objectTypes.includes(type)) {
      // Garder au moins un type sélectionné
      if (objectTypes.length > 1) {
        setObjectTypes(objectTypes.filter((t) => t !== type));
      }
    } else {
      setObjectTypes([...objectTypes, type]);
    }
  };

  // Valider et passer au step 2
  const handleNext = async () => {
    if (!description.trim()) {
      Alert.alert(t('transport.description_required'), t('transport.description_required_msg'));
      return;
    }

    if (isCourierMode && estimatedWeight <= 0) {
      Alert.alert(t('transport.weight_required'), t('transport.weight_required_msg'));
      return;
    }

    if (isWeightTooHigh) {
      Alert.alert(
        t('transport.courier_weight_too_high_title'),
        t('transport.courier_weight_too_high_msg', { max: courierLimits.maxWeightKg }),
      );
      return;
    }

    if (!isCourierMode && estimatedVolume <= 0) {
      Alert.alert(t('transport.volume_required'), t('transport.volume_required_msg'));
      return;
    }

    // Upload photos vers Cloudinary si présentes
    let uploadedPhotoUrls = photos;

    if (photos.length > 0 && token) {
      try {
        setUploading(true);
        setUploadProgress(t('transport.uploading_photos'));

        uploadedPhotoUrls = await uploadMultipleImages(
          photos,
          token,
          (current, total) => {
            setUploadProgress(t('transport.upload_progress', { current, total }));
          }
        );

        setUploadProgress('');
      } catch (error: any) {
        setUploading(false);
        setUploadProgress('');
        Alert.alert(
          t('transport.upload_error_title'),
          t('transport.upload_error_msg', { error: error.message }),
          [
            { text: t('common.cancel'), style: 'cancel' },
            {
              text: t('transport.continue_without_photos'),
              onPress: () => {
                uploadedPhotoUrls = [];
                proceedToNextStep([]);
              },
            },
          ]
        );
        return;
      } finally {
        setUploading(false);
      }
    }

    proceedToNextStep(uploadedPhotoUrls);
  };

  const proceedToNextStep = (photoUrls: string[]) => {
    const step1Data: Step1Data = {
      objectType: objectTypes[0],
      objectTypes,
      vehicleCategory: vehicleCategory ?? 'standard',
      description: description.trim(),
      photos: photoUrls,
      estimatedVolume: isCourierMode ? 0.01 : estimatedVolume,
      estimatedWeight: isCourierMode ? estimatedWeight : undefined,
    };

    navigation.navigate('TransportRequestStep2', { step1Data, step2Prefill, step3Prefill, vehicleCategory });
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={'padding'}
    >
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {isCourierMode && (
        <View style={{ backgroundColor: tokens.primary + '15', borderColor: tokens.primary, borderWidth: 1, borderRadius: 10, padding: spacing.md, marginBottom: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Icon name="motorbike" size={24} color={tokens.primary} />
          <View style={{ flex: 1 }}>
            <Text variant="labelLarge" style={{ color: tokens.primary, fontWeight: '700' }}>{t('transport.courier_mode_title')}</Text>
            <Text variant="bodySmall" style={{ color: tokens.text.secondary }}>{t('transport.courier_mode_desc')}</Text>
          </View>
        </View>
      )}
      <Text variant="headlineSmall" style={styles.title}>
        {t('transport.what_to_transport')}
      </Text>

      {/* Type d'objet - Sélection multiple */}
      <Text variant="labelLarge" style={styles.label}>
        {t(isCourierMode ? 'transport.courier_obj_type_label' : 'transport.obj_type_label')}
      </Text>
      <View style={styles.typeButtons}>
        {availableObjectTypes.map((key) => (
          <ChocolateChip
            key={key}
            label={t(`transport.obj_${key}`)}
            selected={objectTypes.includes(key)}
            onPress={() => toggleObjectType(key)}
          />
        ))}
      </View>
      {objectTypes.length > 1 && (
        <Text variant="bodySmall" style={styles.selectedTypesHint}>
          {t('transport.obj_types_selected', { count: objectTypes.length })}
        </Text>
      )}

      {/* Description */}
      <Text variant="labelLarge" style={styles.label}>
        {t('transport.description_label')}
      </Text>
      <TextInput
        mode="outlined"
        placeholder={t('transport.description_label')}
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={4}
        maxLength={500}
        outlineColor={tokens.border}
        activeOutlineColor={tokens.primary}
        style={styles.textarea}
      />
      <Text variant="bodySmall" style={styles.charCount}>
        {description.length}/500
      </Text>

      {/* Photos */}
      <View style={styles.photoSection}>
        <Text variant="labelLarge" style={styles.label}>
          {t('transport.photos_label', { max: 5 })}
        </Text>
        <PhotoPickerGrid
          photos={photos}
          onPhotosChange={setPhotos}
          maxPhotos={5}
        />
      </View>

      {/* Volume estimé (standard) ou Poids estimé (courier) */}
      <View style={styles.volumeSection}>
        <View style={styles.volumeHeader}>
          <Text variant="labelLarge" style={styles.label}>
            {isCourierMode ? t('transport.weight_label') : t('transport.volume')}
          </Text>
          <IconButton
            icon={showVolumeHelp ? 'chevron-up' : 'help-circle'}
            size={20}
            iconColor={tokens.primary}
            onPress={() => setShowVolumeHelp(!showVolumeHelp)}
          />
        </View>

        {isCourierMode ? (
          <TextInput
            mode="outlined"
            placeholder="Ex: 3"
            value={estimatedWeight > 0 ? estimatedWeight.toString() : ''}
            onChangeText={(text) => {
              const value = parseFloat(text);
              setEstimatedWeight(isNaN(value) ? 0 : value);
            }}
            keyboardType="decimal-pad"
            outlineColor={isWeightTooHigh ? colors.error : tokens.border}
            activeOutlineColor={isWeightTooHigh ? colors.error : tokens.primary}
            error={isWeightTooHigh}
            right={<TextInput.Affix text={t('transport.weight_unit')} />}
          />
        ) : (
          <TextInput
            mode="outlined"
            placeholder="Ex: 5"
            value={estimatedVolume > 0 ? estimatedVolume.toString() : ''}
            onChangeText={(text) => {
              const value = parseFloat(text);
              setEstimatedVolume(isNaN(value) ? 0 : value);
            }}
            keyboardType="decimal-pad"
            outlineColor={tokens.border}
            activeOutlineColor={tokens.primary}
            right={<TextInput.Affix text="m³" />}
          />
        )}
        {isCourierMode && (
          <Text
            variant="bodySmall"
            style={{ marginTop: spacing.xs, color: isWeightTooHigh ? colors.error : tokens.text.secondary }}
          >
            {isWeightTooHigh
              ? t('transport.courier_weight_too_high_msg', { max: courierLimits.maxWeightKg })
              : t('transport.courier_weight_max_hint', { max: courierLimits.maxWeightKg })}
          </Text>
        )}

        {/* Aide estimation */}
        {showVolumeHelp && (
          <Card style={styles.volumeHelpCard}>
            <Card.Content>
              <Text variant="titleSmall" style={styles.volumeHelpTitle}>
                {isCourierMode ? t('transport.weight_help_title') : t('transport.volume_help_title')}
              </Text>
              {isCourierMode ? (
                <>
                  {([
                    ['wt_letter', 0.1],
                    ['wt_small_parcel', 2],
                    ['wt_medium_parcel', 5],
                    ['wt_large_parcel', 15],
                    ['wt_meal', 3],
                  ] as [string, number][]).map(([key, kg]) => (
                    <TouchableOpacity
                      key={key}
                      style={styles.volumeHelpItem}
                      onPress={() => setEstimatedWeight((prev) => Math.round((prev + kg) * 10) / 10)}
                    >
                      <Text variant="bodyMedium">{t('transport.' + key)}</Text>
                      <Text variant="bodyMedium" style={styles.volumeHelpValue}>~{kg} kg</Text>
                    </TouchableOpacity>
                  ))}
                </>
              ) : (
                Object.entries(activeVolumeEstimates).map(([item, volume]) => (
                  <TouchableOpacity
                    key={item}
                    style={styles.volumeHelpItem}
                    onPress={() => setEstimatedVolume((prev) => prev + volume)}
                  >
                    <Text variant="bodyMedium">{t('transport.vol_' + item)}</Text>
                    <Text variant="bodyMedium" style={styles.volumeHelpValue}>~{volume} m³</Text>
                  </TouchableOpacity>
                ))
              )}
              <Text variant="bodySmall" style={styles.volumeHelpNote}>
                {t('transport.volume_help_note')}
              </Text>
            </Card.Content>
          </Card>
        )}
      </View>

      {/* Indicateur upload */}
      {uploading && (
        <View style={styles.uploadingContainer}>
          <ActivityIndicator size="large" color={tokens.primary} />
          <Text style={styles.uploadingText}>{uploadProgress}</Text>
        </View>
      )}

      <ChocolateButton
        onPress={handleNext}
        disabled={!description.trim() || (isCourierMode ? estimatedWeight <= 0 : estimatedVolume <= 0) || uploading}
        loading={uploading}
        style={{ marginTop: spacing.xl }}
      >
        {uploading ? t('transport.uploading_photos') : t('transport.next')}
      </ChocolateButton>
    </ScrollView>
    </KeyboardAvoidingView>
  );
};
