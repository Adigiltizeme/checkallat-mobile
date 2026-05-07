import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { updateUser } from '../../store/slices/authSlice';
import { useUpdateDriverProfileMutation } from '../../store/api/transportApi';
import { uploadMultipleImages } from '../../services/uploadService';
import { PhotoPickerGrid } from '../../components/shared/PhotoPickerGrid';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

export const DriverDocumentsScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const token = useSelector((state: RootState) => state.auth.token);
  const user = useSelector((state: RootState) => state.auth.user);

  const driver = user?.driver;

  // Photos véhicule — on pré-remplit avec les URLs existantes
  const [vehiclePhotos, setVehiclePhotos] = useState<string[]>(driver?.vehiclePhotos ?? []);
  // Permis — on stocke l'URL courante comme tableau pour PhotoPickerGrid
  const [licensePhotos, setLicensePhotos] = useState<string[]>(
    driver?.drivingLicense ? [driver.drivingLicense] : []
  );
  // Assurance véhicule
  const [insurancePhotos, setInsurancePhotos] = useState<string[]>(
    driver?.vehicleInsurance ? [driver.vehicleInsurance] : []
  );

  const [uploading, setUploading] = useState(false);
  const [updateDriverProfile, { isLoading }] = useUpdateDriverProfileMutation();

  const vehiclePhotosChanged =
    JSON.stringify(vehiclePhotos) !== JSON.stringify(driver?.vehiclePhotos ?? []);
  const licenseChanged = licensePhotos[0] !== driver?.drivingLicense;
  const insuranceChanged = insurancePhotos[0] !== driver?.vehicleInsurance;

  const hasChanges = vehiclePhotosChanged || licenseChanged || insuranceChanged;

  // Sépare les URIs locaux (nouveaux) des URLs Cloudinary (existants)
  const isLocalUri = (uri: string) => uri.startsWith('file://') || uri.startsWith('/') || uri.startsWith('content://');

  const handleSave = async () => {
    if (vehiclePhotos.length < 2) {
      Alert.alert(t('common.error'), t('driver_apply.vehicle_photos_min'));
      return;
    }
    if (licensePhotos.length === 0) {
      Alert.alert(t('common.error'), t('driver_apply.license_required'));
      return;
    }
    if (insurancePhotos.length === 0) {
      Alert.alert(t('common.error'), t('driver_apply.insurance_required'));
      return;
    }
    if (!token) return;

    try {
      setUploading(true);

      // Upload uniquement les nouvelles photos locales
      let finalVehiclePhotos = vehiclePhotos;
      const newVehicleUris = vehiclePhotos.filter(isLocalUri);
      if (newVehicleUris.length > 0) {
        const uploadedNew = await uploadMultipleImages(newVehicleUris, token);
        // Remplacer les URIs locaux par les URLs uploadées, conserver l'ordre
        let uploadIdx = 0;
        finalVehiclePhotos = vehiclePhotos.map((p) =>
          isLocalUri(p) ? uploadedNew[uploadIdx++] : p
        );
      }

      let finalLicense = licensePhotos[0];
      if (isLocalUri(licensePhotos[0])) {
        const uploaded = await uploadMultipleImages([licensePhotos[0]], token);
        finalLicense = uploaded[0];
      }

      let finalInsurance = insurancePhotos[0] ?? driver?.vehicleInsurance ?? '';
      if (insurancePhotos[0] && isLocalUri(insurancePhotos[0])) {
        const uploaded = await uploadMultipleImages([insurancePhotos[0]], token);
        finalInsurance = uploaded[0];
      }

      setUploading(false);

      await updateDriverProfile({
        vehiclePhotos: finalVehiclePhotos,
        drivingLicense: finalLicense,
        vehicleInsurance: finalInsurance,
      }).unwrap();

      dispatch(updateUser({
        driver: {
          ...driver,
          vehiclePhotos: finalVehiclePhotos,
          drivingLicense: finalLicense,
          vehicleInsurance: finalInsurance,
        },
      }));

      Alert.alert(t('common.success'), t('driver_docs.save_success'), [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      setUploading(false);
      Alert.alert(t('common.error'), t('driver_docs.save_error'));
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
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

      {/* Aperçu photos existantes Cloudinary (non éditables dans la grille) */}
      {vehiclePhotos.filter((p) => !isLocalUri(p)).length > 0 && (
        <View style={styles.existingSection}>
          <Text variant="labelSmall" style={styles.existingLabel}>
            {t('driver_docs.current_photos')}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.existingRow}>
            {vehiclePhotos.filter((p) => !isLocalUri(p)).map((url, i) => (
              <Image key={i} source={{ uri: url }} style={styles.existingThumb} />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Permis de conduire */}
      <Text variant="labelLarge" style={[styles.label, { marginTop: spacing.xl }]}>
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
      {/* Aperçu permis actuel si URL Cloudinary */}
      {driver?.drivingLicense && !isLocalUri(driver.drivingLicense) && licensePhotos[0] === driver.drivingLicense && (
        <View style={styles.existingSection}>
          <Text variant="labelSmall" style={styles.existingLabel}>
            {t('driver_docs.current_license')}
          </Text>
          <Image source={{ uri: driver.drivingLicense }} style={styles.licenseThumb} resizeMode="contain" />
        </View>
      )}

      {licensePhotos.length === 0 && (
        <Text variant="bodySmall" style={styles.errorHint}>
          {t('driver_apply.license_required')}
        </Text>
      )}

      {/* Assurance véhicule */}
      <Text variant="labelLarge" style={[styles.label, { marginTop: spacing.xl }]}>
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
      {/* Aperçu assurance actuelle si URL Cloudinary */}
      {driver?.vehicleInsurance && !isLocalUri(driver.vehicleInsurance) && insurancePhotos[0] === driver.vehicleInsurance && (
        <View style={styles.existingSection}>
          <Text variant="labelSmall" style={styles.existingLabel}>
            {t('driver_docs.current_insurance')}
          </Text>
          <Image source={{ uri: driver.vehicleInsurance }} style={styles.licenseThumb} resizeMode="contain" />
        </View>
      )}
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

      {/* Bouton Enregistrer */}
      <TouchableOpacity
        style={[styles.saveBtn, (!hasChanges || uploading || isLoading || vehiclePhotos.length < 2 || licensePhotos.length === 0 || insurancePhotos.length === 0) && styles.saveBtnDisabled]}
        onPress={handleSave}
        disabled={!hasChanges || uploading || isLoading || vehiclePhotos.length < 2 || licensePhotos.length === 0 || insurancePhotos.length === 0}
        activeOpacity={0.8}
      >
        {uploading || isLoading ? (
          <ActivityIndicator color={colors.white} size="small" />
        ) : (
          <Text style={styles.saveBtnText}>{t('common.save')}</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
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
  existingSection: {
    marginTop: spacing.sm,
  },
  existingLabel: {
    color: colors.gray,
    marginBottom: spacing.xs,
  },
  existingRow: {
    flexDirection: 'row',
  },
  existingThumb: {
    width: 80,
    height: 60,
    borderRadius: 6,
    marginRight: spacing.sm,
    backgroundColor: colors.border,
  },
  licenseThumb: {
    width: '100%',
    height: 140,
    borderRadius: 8,
    backgroundColor: colors.border,
    marginTop: spacing.xs,
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
  saveBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
