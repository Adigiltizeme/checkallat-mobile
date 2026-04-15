import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { StackScreenProps } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { DriverStackParamList } from '../../navigation/types';
import {
  useUploadProofPhotosMutation,
  useUpdateTransportStatusMutation,
} from '../../store/api/transportApi';
import { uploadMultipleImages } from '../../services/uploadService';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { PhotoPickerGrid } from '../../components/shared/PhotoPickerGrid';

type Props = StackScreenProps<DriverStackParamList, 'DriverProofPhotos'>;

export const DriverProofPhotosScreen = ({ navigation, route }: Props) => {
  const { t } = useTranslation();
  const { requestId, type, nextStatus } = route.params;

  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  const [uploadProofPhotos] = useUploadProofPhotosMutation();
  const [updateStatus] = useUpdateTransportStatusMutation();
  const token = useSelector((state: RootState) => state.auth.token);

  const isLoading = uploading;

  const handleConfirm = async () => {
    if (photos.length === 0) {
      Alert.alert(t('common.error'), t('driver.photos_required_msg'));
      return;
    }
    if (!token) {
      Alert.alert(t('common.error'), t('auth.session_expired'));
      return;
    }

    try {
      setUploading(true);

      // 1. Upload photos vers Cloudinary
      setUploadProgress(t('driver.upload_progress', { current: 0, total: photos.length }));
      const uploadedUrls = await uploadMultipleImages(photos, token, (current, total) => {
        setUploadProgress(t('driver.upload_progress', { current, total }));
      });

      // 2. Enregistrer les photos sur le transport
      setUploadProgress(t('driver.saving_photos'));
      await uploadProofPhotos({ requestId, type, photos: uploadedUrls }).unwrap();

      // 3. Déclencher la transition de statut immédiatement après
      setUploadProgress(t('driver.updating_status'));
      await updateStatus({ requestId, status: nextStatus }).unwrap();

      // 4. Une seule confirmation — puis retour à l'écran de détails
      Alert.alert(
        t('common.success'),
        type === 'before'
          ? t('driver.photos_before_done_msg')
          : t('driver.photos_after_done_msg'),
        [{ text: t('common.ok'), onPress: () => navigation.goBack() }],
      );
    } catch (error: any) {
      console.error('DriverProofPhotos error:', error);
      Alert.alert(
        t('common.error'),
        error?.data?.message || t('driver.photos_upload_error'),
      );
    } finally {
      setUploading(false);
      setUploadProgress('');
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Titre contextuel */}
        <Text variant="titleLarge" style={styles.title}>
          {type === 'before'
            ? '📸 ' + t('driver.photos_before_title')
            : '📸 ' + t('driver.photos_after_title')}
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          {t('driver.photos_subtitle')}
        </Text>

        {/* Grid partagé — obligatoire, zoom */}
        <PhotoPickerGrid
          photos={photos}
          onPhotosChange={setPhotos}
          maxPhotos={5}
          mandatory
          isUploading={uploading}
          uploadProgress={uploadProgress}
        />

        <Text variant="bodySmall" style={styles.hint}>
          💡 {t('driver.photos_hint')}
        </Text>
      </ScrollView>

      {/* Actions */}
      <View style={styles.bottomActions}>
        <Button
          mode="outlined"
          onPress={() => navigation.goBack()}
          disabled={isLoading}
          style={styles.cancelButton}
        >
          {t('common.cancel')}
        </Button>
        <Button
          mode="contained"
          onPress={handleConfirm}
          loading={isLoading}
          disabled={isLoading || photos.length === 0}
          buttonColor={colors.primary}
          style={styles.submitButton}
        >
          {isLoading
            ? uploadProgress
            : t('driver.confirm_photos_and_continue')}
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  subtitle: {
    color: colors.gray,
    marginBottom: spacing.md,
  },
  hint: {
    color: colors.gray,
    fontStyle: 'italic',
    marginTop: spacing.md,
  },
  bottomActions: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    elevation: 4,
  },
  cancelButton: {
    flex: 1,
  },
  submitButton: {
    flex: 2,
  },
});
