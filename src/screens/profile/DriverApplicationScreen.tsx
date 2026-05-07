import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { useApplyAsDriverMutation } from '../../store/api/transportApi';
import { uploadMultipleImages } from '../../services/uploadService';
import { PhotoPickerGrid } from '../../components/shared/PhotoPickerGrid';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

const VEHICLE_TYPES = ['van', 'small_truck', 'large_truck'] as const;
type VehicleType = typeof VEHICLE_TYPES[number];

export const DriverApplicationScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const token = useSelector((state: RootState) => state.auth.token);

  const [vehicleType, setVehicleType] = useState<VehicleType>('van');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleCapacity, setVehicleCapacity] = useState('');

  // Vehicle photos: minimum 2 (front with plate + side view)
  const [vehiclePhotos, setVehiclePhotos] = useState<string[]>([]);
  // Driving license: single photo
  const [licensePhotos, setLicensePhotos] = useState<string[]>([]);
  // Vehicle insurance: single photo
  const [insurancePhotos, setInsurancePhotos] = useState<string[]>([]);

  const [uploading, setUploading] = useState(false);
  const [applyAsDriver, { isLoading }] = useApplyAsDriverMutation();

  const capacity = parseFloat(vehicleCapacity);
  const canSubmit =
    vehiclePlate.trim().length >= 3 &&
    !isNaN(capacity) &&
    capacity > 0 &&
    vehiclePhotos.length >= 2 &&
    licensePhotos.length === 1 &&
    insurancePhotos.length === 1 &&
    !uploading &&
    !isLoading;

  const handleSubmit = async () => {
    if (!token) return;

    let uploadedVehiclePhotos = vehiclePhotos;
    let uploadedLicense = licensePhotos[0];
    let uploadedInsurance = insurancePhotos[0];

    try {
      setUploading(true);

      uploadedVehiclePhotos = await uploadMultipleImages(vehiclePhotos, token);

      const uploadedLicenseArr = await uploadMultipleImages(licensePhotos, token);
      uploadedLicense = uploadedLicenseArr[0];

      const uploadedInsuranceArr = await uploadMultipleImages(insurancePhotos, token);
      uploadedInsurance = uploadedInsuranceArr[0];
    } catch (err: any) {
      setUploading(false);
      Alert.alert(t('common.error'), t('transport.upload_error_msg', { error: err.message }));
      return;
    } finally {
      setUploading(false);
    }

    try {
      await applyAsDriver({
        vehicleType,
        vehicleCapacity: capacity,
        vehiclePlate: vehiclePlate.trim().toUpperCase(),
        vehiclePhotos: uploadedVehiclePhotos,
        drivingLicense: uploadedLicense,
        vehicleInsurance: uploadedInsurance,
      }).unwrap();

      Alert.alert(t('driver_apply.success_title'), t('driver_apply.success_msg'), [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert(t('common.error'), t('driver_apply.error_msg'));
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Type de véhicule */}
        <Text variant="labelLarge" style={styles.label}>
          {t('profile.vehicle_type')} *
        </Text>
        <View style={styles.radioGroup}>
          {VEHICLE_TYPES.map((type) => (
            <TouchableOpacity
              key={type}
              style={[styles.radioBtn, vehicleType === type && styles.radioBtnActive]}
              onPress={() => setVehicleType(type)}
              activeOpacity={0.8}
            >
              <Text style={[styles.radioBtnText, vehicleType === type && styles.radioBtnTextActive]}>
                {t(`transport.vehicle_${type}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Immatriculation */}
        <Text variant="labelLarge" style={styles.label}>
          {t('profile.license_plate')} *
        </Text>
        <TextInput
          mode="outlined"
          value={vehiclePlate}
          onChangeText={setVehiclePlate}
          placeholder={t('profile.plate_placeholder')}
          autoCapitalize="characters"
          outlineColor={colors.border}
          activeOutlineColor={colors.primary}
          style={styles.input}
        />

        {/* Capacité */}
        <Text variant="labelLarge" style={styles.label}>
          {t('driver_apply.vehicle_capacity')} *
        </Text>
        <TextInput
          mode="outlined"
          value={vehicleCapacity}
          onChangeText={setVehicleCapacity}
          keyboardType="decimal-pad"
          placeholder="Ex: 10"
          right={<TextInput.Affix text="m³" />}
          outlineColor={colors.border}
          activeOutlineColor={colors.primary}
          style={styles.input}
        />

        {/* Photos véhicule */}
        <Text variant="labelLarge" style={styles.label}>
          {t('driver_apply.vehicle_photos_label')} *
        </Text>
        <Text variant="bodySmall" style={styles.hint}>
          {t('driver_apply.vehicle_photos_hint')}
        </Text>
        <PhotoPickerGrid
          photos={vehiclePhotos}
          onPhotosChange={setVehiclePhotos}
          maxPhotos={5}
        />
        {vehiclePhotos.length < 2 && (
          <Text variant="bodySmall" style={styles.errorHint}>
            {t('driver_apply.vehicle_photos_min')}
          </Text>
        )}

        {/* Permis de conduire */}
        <Text variant="labelLarge" style={[styles.label, { marginTop: spacing.lg }]}>
          {t('driver_apply.license_label')} *
        </Text>
        <Text variant="bodySmall" style={styles.hint}>
          {t('driver_apply.license_hint')}
        </Text>
        <PhotoPickerGrid
          photos={licensePhotos}
          onPhotosChange={setLicensePhotos}
          maxPhotos={1}
        />
        {licensePhotos.length === 0 && (
          <Text variant="bodySmall" style={styles.errorHint}>
            {t('driver_apply.license_required')}
          </Text>
        )}

        {/* Assurance véhicule */}
        <Text variant="labelLarge" style={[styles.label, { marginTop: spacing.lg }]}>
          {t('driver_apply.insurance_label')} *
        </Text>
        <Text variant="bodySmall" style={styles.hint}>
          {t('driver_apply.insurance_hint')}
        </Text>
        <PhotoPickerGrid
          photos={insurancePhotos}
          onPhotosChange={setInsurancePhotos}
          maxPhotos={1}
        />
        {insurancePhotos.length === 0 && (
          <Text variant="bodySmall" style={styles.errorHint}>
            {t('driver_apply.insurance_required')}
          </Text>
        )}

        {/* Upload indicator */}
        {uploading && (
          <View style={styles.uploadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.uploadingText}>{t('transport.uploading_photos')}</Text>
          </View>
        )}

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit}
          activeOpacity={0.8}
        >
          {isLoading || uploading ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <Text style={styles.submitBtnText}>{t('driver_apply.submit')}</Text>
          )}
        </TouchableOpacity>

        <Text variant="bodySmall" style={styles.footerNote}>
          {t('driver_apply.review_note')}
        </Text>
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
  label: {
    color: colors.dark,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  hint: {
    color: colors.gray,
    marginBottom: spacing.sm,
    lineHeight: 18,
  },
  errorHint: {
    color: colors.error,
    marginTop: 4,
  },
  radioGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  radioBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
  },
  radioBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '15',
  },
  radioBtnText: {
    color: colors.gray,
    fontSize: 14,
  },
  radioBtnTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  input: {
    backgroundColor: colors.white,
    marginBottom: spacing.sm,
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
  submitBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  footerNote: {
    textAlign: 'center',
    color: colors.gray,
    marginTop: spacing.md,
    fontStyle: 'italic',
    lineHeight: 18,
  },
});
