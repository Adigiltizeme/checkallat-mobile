import React, { useState } from 'react';
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
import { TextInput, Button, Text, IconButton, Card, TouchableRipple } from 'react-native-paper';
import { StackScreenProps } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import {
  TransportObjectType,
  OBJECT_TYPE_LABELS,
  Step1Data,
  VOLUME_ESTIMATES,
} from '../../types/transport';
import type { RootState } from '../../store';
import { uploadMultipleImages } from '../../services/uploadService';
import { PhotoPickerGrid } from '../../components/shared/PhotoPickerGrid';

type Props = StackScreenProps<any, 'TransportRequestStep1'>;

export const TransportRequestStep1Screen = ({ navigation }: Props) => {
  const { t } = useTranslation();
  const [objectTypes, setObjectTypes] = useState<TransportObjectType[]>(['furniture']);
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [estimatedVolume, setEstimatedVolume] = useState(0);
  const [showVolumeHelp, setShowVolumeHelp] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  const token = useSelector((state: RootState) => state.auth.token);

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

    if (estimatedVolume <= 0) {
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
      objectType: objectTypes[0], // Prendre le premier type pour la compatibilité backend
      objectTypes, // Ajouter le tableau pour info complète
      description: description.trim(),
      photos: photoUrls, // URLs Cloudinary ou array vide
      estimatedVolume,
    };

    navigation.navigate('TransportRequestStep2', { step1Data });
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text variant="headlineSmall" style={styles.title}>
        {t('transport.what_to_transport')}
      </Text>

      {/* Type d'objet - Sélection multiple */}
      <Text variant="labelLarge" style={styles.label}>
        {t('transport.obj_type_label')}
      </Text>
      <View style={styles.typeButtons}>
        {(Object.keys(OBJECT_TYPE_LABELS) as TransportObjectType[]).map((key) => (
          <TouchableOpacity
            key={key}
            style={[
              styles.typeButton,
              objectTypes.includes(key) && styles.typeButtonActive,
            ]}
            onPress={() => toggleObjectType(key)}
          >
            <Text
              style={[
                styles.typeButtonText,
                objectTypes.includes(key) && styles.typeButtonTextActive,
              ]}
            >
              {t(`transport.obj_${key}`)}
            </Text>
          </TouchableOpacity>
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
        outlineColor={colors.border}
        activeOutlineColor={colors.primary}
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

      {/* Volume estimé */}
      <View style={styles.volumeSection}>
        <View style={styles.volumeHeader}>
          <Text variant="labelLarge" style={styles.label}>
            {t('transport.volume')}
          </Text>
          <IconButton
            icon={showVolumeHelp ? 'chevron-up' : 'help-circle'}
            size={20}
            iconColor={colors.primary}
            onPress={() => setShowVolumeHelp(!showVolumeHelp)}
          />
        </View>

        <TextInput
          mode="outlined"
          placeholder="Ex: 5"
          value={estimatedVolume > 0 ? estimatedVolume.toString() : ''}
          onChangeText={(text) => {
            const value = parseFloat(text);
            setEstimatedVolume(isNaN(value) ? 0 : value);
          }}
          keyboardType="decimal-pad"
          outlineColor={colors.border}
          activeOutlineColor={colors.primary}
          right={<TextInput.Affix text="m³" />}
        />

        {/* Aide estimation volume */}
        {showVolumeHelp && (
          <Card style={styles.volumeHelpCard}>
            <Card.Content>
              <Text variant="titleSmall" style={styles.volumeHelpTitle}>
                {t('transport.volume_help_title')}
              </Text>
              {Object.entries(VOLUME_ESTIMATES).map(([item, volume]) => (
                <TouchableOpacity
                  key={item}
                  style={styles.volumeHelpItem}
                  onPress={() => {
                    setEstimatedVolume((prev) => prev + volume);
                    // setShowVolumeHelp(false);
                  }}
                >
                  <Text variant="bodyMedium">{t('transport.vol_' + item)}</Text>
                  <Text variant="bodyMedium" style={styles.volumeHelpValue}>
                    ~{volume} m³
                  </Text>
                </TouchableOpacity>
              ))}
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
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.uploadingText}>{uploadProgress}</Text>
        </View>
      )}

      {/* Boutons navigation */}
      <View style={styles.actions}>
        <Button
          mode="contained"
          onPress={handleNext}
          disabled={!description.trim() || estimatedVolume <= 0 || uploading}
          buttonColor={colors.primary}
          style={styles.nextButton}
          loading={uploading}
        >
          {uploading ? t('transport.uploading_photos') : t('transport.next')}
        </Button>
      </View>
    </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  title: {
    color: colors.dark,
    marginBottom: spacing.lg,
  },
  label: {
    color: colors.dark,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  typeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  typeButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  typeButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeButtonText: {
    color: colors.dark,
  },
  typeButtonTextActive: {
    color: colors.white,
    fontWeight: '600',
  },
  selectedTypesHint: {
    color: colors.success,
    marginTop: -spacing.sm,
    marginBottom: spacing.sm,
    fontWeight: '500',
  },
  textarea: {
    backgroundColor: colors.white,
  },
  charCount: {
    textAlign: 'right',
    color: colors.gray,
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
    backgroundColor: colors.white,
  },
  volumeHelpTitle: {
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  volumeHelpItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  volumeHelpValue: {
    color: colors.primary,
    fontWeight: '600',
  },
  volumeHelpNote: {
    color: colors.gray,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  actions: {
    marginTop: spacing.xl,
  },
  nextButton: {
    paddingVertical: spacing.sm,
  },
  uploadingContainer: {
    alignItems: 'center',
    padding: spacing.md,
    marginVertical: spacing.md,
  },
  uploadingText: {
    marginTop: spacing.sm,
    color: colors.gray,
    fontSize: 14,
  },
});
