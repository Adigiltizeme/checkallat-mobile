import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Text } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { updateUser } from '../../store/slices/authSlice';
import { useUpdateDriverProfileMutation } from '../../store/api/transportApi';
import { uploadMultipleImages } from '../../services/uploadService';
import { PhotoPickerGrid } from '../../components/shared/PhotoPickerGrid';
import { colors } from '../../theme/colors';
import { useAppTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/spacing';

export const DriverDocumentsScreen = ({ navigation }: any) => {
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
  label: {
    color: tokens.text.primary,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  hint: {
    color: tokens.text.secondary,
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
    color: tokens.text.secondary,
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
    backgroundColor: tokens.backgroundAlt,
  },
  licenseThumb: {
    width: '100%',
    height: 140,
    borderRadius: 8,
    backgroundColor: tokens.backgroundAlt,
    marginTop: spacing.xs,
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
  saveBtn: {
    backgroundColor: tokens.primary,
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
  kycBanner: {
    backgroundColor: '#F59E0B22',
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  kycBannerContent: {
    flex: 1,
  },
  kycBannerTitle: {
    color: '#F59E0B',
    fontWeight: '700',
    marginBottom: 4,
  },
  kycBannerMsg: {
    color: tokens.text.primary,
    lineHeight: 20,
  },
  docTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.sm,
  },
  docTypeChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: tokens.border,
    backgroundColor: 'transparent',
  },
  docTypeChipActive: {
    borderColor: tokens.primary,
    backgroundColor: tokens.primary + '18',
  },
  docTypeChipText: {
    color: tokens.text.secondary,
    fontSize: 13,
  },
  docTypeChipTextActive: {
    color: tokens.primary,
    fontWeight: '600',
  },
  }), [tokens]);

  const { t } = useTranslation();
  const dispatch = useDispatch();
  const token = useSelector((state: RootState) => state.auth.token);
  const user = useSelector((state: RootState) => state.auth.user);

  const driver = user?.driver;

  const kycRenewalReason: string | null = (driver as any)?.kycRenewalReason ?? null;

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
  // KYC — pré-remplir si déjà soumis
  const [idDocumentType, setIdDocumentType] = useState<'national_id' | 'passport' | 'residence_permit'>(
    ((driver as any)?.idDocumentType as any) ?? 'national_id'
  );
  const [idFrontPhotos, setIdFrontPhotos] = useState<string[]>(
    (driver as any)?.idDocumentFront ? [(driver as any).idDocumentFront] : []
  );
  const [idBackPhotos, setIdBackPhotos] = useState<string[]>(
    (driver as any)?.idDocumentBack ? [(driver as any).idDocumentBack] : []
  );
  const [selfiePhotos, setSelfiePhotos] = useState<string[]>(
    (driver as any)?.selfiePhoto ? [(driver as any).selfiePhoto] : []
  );

  const isPassport = idDocumentType === 'passport';
  const kycValid = idFrontPhotos.length > 0 && (isPassport || idBackPhotos.length > 0) && selfiePhotos.length > 0;

  const [uploading, setUploading] = useState(false);
  const [updateDriverProfile, { isLoading }] = useUpdateDriverProfileMutation();

  const vehiclePhotosChanged =
    JSON.stringify(vehiclePhotos) !== JSON.stringify(driver?.vehiclePhotos ?? []);
  const licenseChanged = licensePhotos[0] !== driver?.drivingLicense;
  const insuranceChanged = insurancePhotos[0] !== driver?.vehicleInsurance;
  const idFrontChanged = idFrontPhotos[0] !== (driver as any)?.idDocumentFront;
  const idBackChanged = idBackPhotos[0] !== (driver as any)?.idDocumentBack;
  const selfieChanged = selfiePhotos[0] !== (driver as any)?.selfiePhoto;

  const hasChanges = vehiclePhotosChanged || licenseChanged || insuranceChanged
    || idFrontChanged || idBackChanged || selfieChanged;

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

      let finalIdFront = idFrontPhotos[0] ?? (driver as any)?.idDocumentFront ?? '';
      if (idFrontPhotos[0] && isLocalUri(idFrontPhotos[0])) {
        const uploaded = await uploadMultipleImages([idFrontPhotos[0]], token);
        finalIdFront = uploaded[0];
      }
      let finalIdBack: string | null = idBackPhotos[0] ?? (driver as any)?.idDocumentBack ?? null;
      if (idBackPhotos[0] && isLocalUri(idBackPhotos[0])) {
        const uploaded = await uploadMultipleImages([idBackPhotos[0]], token);
        finalIdBack = uploaded[0];
      }
      let finalSelfie = selfiePhotos[0] ?? (driver as any)?.selfiePhoto ?? '';
      if (selfiePhotos[0] && isLocalUri(selfiePhotos[0])) {
        const uploaded = await uploadMultipleImages([selfiePhotos[0]], token);
        finalSelfie = uploaded[0];
      }

      await updateDriverProfile({
        vehiclePhotos: finalVehiclePhotos,
        drivingLicense: finalLicense,
        vehicleInsurance: finalInsurance,
        idDocumentType,
        idDocumentFront: finalIdFront,
        idDocumentBack: finalIdBack,
        selfiePhoto: finalSelfie,
      }).unwrap();

      dispatch(updateUser({
        driver: {
          ...driver,
          vehiclePhotos: finalVehiclePhotos,
          drivingLicense: finalLicense,
          vehicleInsurance: finalInsurance,
        } as any,
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
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Bannière renouvellement KYC */}
      {kycRenewalReason && (
        <View style={styles.kycBanner}>
          <Icon name="alert-circle" size={22} color="#F59E0B" style={{ marginTop: 1 }} />
          <View style={styles.kycBannerContent}>
            <Text variant="labelMedium" style={styles.kycBannerTitle}>
              {t('kyc.renewal_banner_title')}
            </Text>
            <Text variant="bodySmall" style={styles.kycBannerMsg}>
              {kycRenewalReason}
            </Text>
          </View>
        </View>
      )}

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

      {/* Section KYC : Pièce d'identité & selfie */}
      <Text variant="labelLarge" style={[styles.label, { marginTop: spacing.xl }]}>
        {t('kyc.section_title')} *
      </Text>
      <Text variant="bodySmall" style={styles.hint}>
        {t('kyc.section_hint')}
      </Text>

      <Text variant="labelMedium" style={[styles.label, { marginTop: spacing.sm }]}>
        {t('kyc.document_type')}
      </Text>
      <View style={styles.docTypeRow}>
        {(['national_id', 'passport', 'residence_permit'] as const).map((type) => (
          <TouchableOpacity
            key={type}
            style={[styles.docTypeChip, idDocumentType === type && styles.docTypeChipActive]}
            onPress={() => setIdDocumentType(type)}
          >
            <Text style={[styles.docTypeChipText, idDocumentType === type && styles.docTypeChipTextActive]}>
              {t(`kyc.doc_${type}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text variant="labelMedium" style={styles.label}>
        {t('kyc.id_front')} *
      </Text>
      <Text variant="bodySmall" style={styles.hint}>
        {t('kyc.id_front_hint')}
      </Text>
      <PhotoPickerGrid photos={idFrontPhotos} onPhotosChange={setIdFrontPhotos} maxPhotos={1} />
      {idFrontPhotos.length === 0 && (
        <Text variant="bodySmall" style={styles.errorHint}>{t('kyc.id_front_required')}</Text>
      )}

      {!isPassport && (
        <>
          <Text variant="labelMedium" style={styles.label}>
            {t('kyc.id_back')} *
          </Text>
          <Text variant="bodySmall" style={styles.hint}>
            {t('kyc.id_back_hint')}
          </Text>
          <PhotoPickerGrid photos={idBackPhotos} onPhotosChange={setIdBackPhotos} maxPhotos={1} />
          {idBackPhotos.length === 0 && (
            <Text variant="bodySmall" style={styles.errorHint}>{t('kyc.id_back_required')}</Text>
          )}
        </>
      )}

      <Text variant="labelMedium" style={[styles.label, { marginTop: spacing.md }]}>
        {t('kyc.selfie')} *
      </Text>
      <Text variant="bodySmall" style={styles.hint}>
        {t('kyc.selfie_hint')}
      </Text>
      <PhotoPickerGrid photos={selfiePhotos} onPhotosChange={setSelfiePhotos} maxPhotos={1} />
      {selfiePhotos.length === 0 && (
        <Text variant="bodySmall" style={styles.errorHint}>{t('kyc.selfie_required')}</Text>
      )}

      {/* Upload indicator */}
      {uploading && (
        <View style={styles.uploadingContainer}>
          <ActivityIndicator size="large" color={tokens.primary} />
          <Text style={styles.uploadingText}>{t('transport.uploading_photos')}</Text>
        </View>
      )}

      {/* Bouton Enregistrer */}
      <TouchableOpacity
        style={[styles.saveBtn, (!hasChanges || uploading || isLoading || vehiclePhotos.length < 2 || licensePhotos.length === 0 || insurancePhotos.length === 0 || !kycValid) && styles.saveBtnDisabled]}
        onPress={handleSave}
        disabled={!hasChanges || uploading || isLoading || vehiclePhotos.length < 2 || licensePhotos.length === 0 || insurancePhotos.length === 0 || !kycValid}
        activeOpacity={0.8}
      >
        {uploading || isLoading ? (
          <ActivityIndicator color={colors.white} size="small" />
        ) : (
          <Text style={styles.saveBtnText}>{t('common.save')}</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
    </KeyboardAvoidingView>
  );
};
