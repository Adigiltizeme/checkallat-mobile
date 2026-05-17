import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Button, TextInput } from 'react-native-paper';
import { StackScreenProps } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { ProStackParamList } from '../../navigation/types';
import { useUploadBookingPhotosMutation, useMarkStartedMutation, useConfirmBookingCompletionMutation } from '../../store/api/bookingsApi';
import { uploadMultipleImages } from '../../services/uploadService';
import { RootState } from '../../store';
import { PhotoPickerGrid } from '../../components/shared/PhotoPickerGrid';

type Props = StackScreenProps<ProStackParamList, 'ProProofPhotos'>;

export const ProProofPhotosScreen = ({ navigation, route }: Props) => {
  const { t } = useTranslation();
  const { bookingId, type, nextAction, isCash } = route.params;

  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [cashAmountInput, setCashAmountInput] = useState('');

  const [uploadBookingPhotos] = useUploadBookingPhotosMutation();
  const [markStarted] = useMarkStartedMutation();
  const [confirmCompletion] = useConfirmBookingCompletionMutation();
  const token = useSelector((state: RootState) => state.auth.token);

  const showCashField = isCash && nextAction === 'complete';

  const handleConfirm = async () => {
    if (photos.length === 0) {
      Alert.alert(t('common.error'), t('driver.photos_required_msg'));
      return;
    }
    if (showCashField && !cashAmountInput.trim()) {
      Alert.alert(t('common.error'), t('booking.cash_amount_required'));
      return;
    }
    if (!token) {
      Alert.alert(t('common.error'), t('auth.session_expired'));
      return;
    }

    try {
      setUploading(true);

      setUploadProgress(t('driver.upload_progress', { current: 0, total: photos.length }));
      const uploadedUrls = await uploadMultipleImages(photos, token, (current, total) => {
        setUploadProgress(t('driver.upload_progress', { current, total }));
      });

      setUploadProgress(t('driver.saving_photos'));
      await uploadBookingPhotos({ id: bookingId, type, photos: uploadedUrls }).unwrap();

      setUploadProgress(t('driver.updating_status'));
      if (nextAction === 'start') {
        await markStarted(bookingId).unwrap();
      } else {
        const cashAmount = parseFloat(cashAmountInput);
        await confirmCompletion({
          id: bookingId,
          role: 'pro',
          ...(showCashField && !isNaN(cashAmount) ? { cashAmount } : {}),
        }).unwrap();
      }

      Alert.alert(
        t('common.success'),
        type === 'before'
          ? t('pro_space.photos_before_done_msg')
          : t('pro_space.photos_after_done_msg'),
        [{ text: t('common.ok'), onPress: () => navigation.goBack() }],
      );
    } catch (error: any) {
      console.error('ProProofPhotos error:', error);
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
        <Text variant="titleLarge" style={styles.title}>
          {type === 'before'
            ? '📸 ' + t('pro_space.photos_before_title')
            : '📸 ' + t('pro_space.photos_after_title')}
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          {t('driver.photos_subtitle')}
        </Text>

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

        {showCashField && (
          <View style={styles.cashSection}>
            <Text variant="titleSmall" style={styles.cashLabel}>
              💵 {t('booking.cash_amount_msg_pro')}
            </Text>
            <TextInput
              mode="outlined"
              value={cashAmountInput}
              onChangeText={setCashAmountInput}
              keyboardType="numeric"
              placeholder="0.00"
              outlineColor={colors.border}
              activeOutlineColor={colors.primary}
              style={{ backgroundColor: colors.white, marginTop: spacing.xs }}
              right={<TextInput.Affix text="EGP" />}
            />
          </View>
        )}
      </ScrollView>

      <View style={styles.bottomActions}>
        <Button
          mode="outlined"
          onPress={() => navigation.goBack()}
          disabled={uploading}
          style={styles.cancelButton}
        >
          {t('common.cancel')}
        </Button>
        <Button
          mode="contained"
          onPress={handleConfirm}
          loading={uploading}
          disabled={uploading || photos.length === 0}
          buttonColor={colors.primary}
          style={styles.submitButton}
        >
          {uploading ? uploadProgress : t('driver.confirm_photos_and_continue')}
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
  cashSection: {
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: '#FFF9C4',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F59E0B40',
  },
  cashLabel: {
    color: '#92400E',
    fontWeight: '600',
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
