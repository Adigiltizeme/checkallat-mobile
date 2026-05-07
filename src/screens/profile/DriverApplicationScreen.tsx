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
  Image,
} from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { clearDriverRecord, updateUser } from '../../store/slices/authSlice';
import { useApplyAsDriverMutation, useCancelDriverApplicationMutation } from '../../store/api/transportApi';
import { uploadMultipleImages } from '../../services/uploadService';
import { PhotoPickerGrid } from '../../components/shared/PhotoPickerGrid';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

const VEHICLE_TYPES = ['van', 'small_truck', 'large_truck'] as const;
type VehicleType = typeof VEHICLE_TYPES[number];

// ─── Vue suivi candidature ───────────────────────────────────────────────────
const ApplicationTracking = ({ navigation }: { navigation: any }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const driver = user?.driver;
  const [cancelDriverApplication, { isLoading: isCancelling }] = useCancelDriverApplicationMutation();

  const isPending = driver?.status === 'pending';
  const isRejected = driver?.status === 'rejected';

  const handleCancel = () => {
    Alert.alert(
      t('driver_apply.cancel_confirm_title'),
      t('driver_apply.cancel_confirm_msg'),
      [
        { text: t('common.back'), style: 'cancel' },
        {
          text: t('driver_apply.cancel_confirm_yes'),
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelDriverApplication().unwrap();
              dispatch(clearDriverRecord());
            } catch {
              Alert.alert(t('common.error'), t('driver_apply.cancel_error'));
            }
          },
        },
      ],
    );
  };

  const handleReapply = () => {
    Alert.alert(
      t('driver_apply.reapply_confirm_title'),
      t('driver_apply.reapply_confirm_msg'),
      [
        { text: t('common.back'), style: 'cancel' },
        {
          text: t('driver_apply.reapply_confirm_yes'),
          onPress: async () => {
            try {
              await cancelDriverApplication().unwrap();
              dispatch(clearDriverRecord());
            } catch {
              Alert.alert(t('common.error'), t('driver_apply.cancel_error'));
            }
          },
        },
      ],
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Statut */}
      <View style={[styles.statusCard, isPending ? styles.statusPending : styles.statusRejected]}>
        <Text style={[styles.statusIcon]}>{isPending ? '⏳' : '❌'}</Text>
        <Text style={[styles.statusTitle, isPending ? styles.statusTitlePending : styles.statusTitleRejected]}>
          {isPending ? t('driver_apply.status_pending') : t('driver_apply.status_rejected')}
        </Text>
        <Text style={styles.statusDesc}>
          {isPending ? t('driver_apply.status_pending_desc') : t('driver_apply.status_rejected_desc')}
        </Text>
      </View>

      {/* Documents soumis */}
      {isPending && (
        <View style={styles.docsCard}>
          <Text variant="labelLarge" style={styles.docsTitle}>
            {t('driver_apply.submitted_docs')}
          </Text>

          {/* Photos véhicule */}
          <Text variant="bodySmall" style={styles.docsLabel}>
            ✓ {t('driver_apply.vehicle_photos_label')} ({driver?.vehiclePhotos?.length ?? 0})
          </Text>
          {(driver?.vehiclePhotos?.length ?? 0) > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbRow}>
              {(driver?.vehiclePhotos ?? []).map((url: string, i: number) => (
                <Image key={i} source={{ uri: url }} style={styles.thumb} />
              ))}
            </ScrollView>
          )}

          {/* Permis */}
          {driver?.drivingLicense && (
            <>
              <Text variant="bodySmall" style={styles.docsLabel}>
                ✓ {t('driver_apply.license_label')}
              </Text>
              <Image source={{ uri: driver.drivingLicense }} style={styles.docThumb} resizeMode="contain" />
            </>
          )}

          {/* Document véhicule */}
          {driver?.vehicleInsurance && (
            <>
              <Text variant="bodySmall" style={styles.docsLabel}>
                ✓ {t('driver_apply.insurance_label')}
              </Text>
              <Image source={{ uri: driver.vehicleInsurance }} style={styles.docThumb} resizeMode="contain" />
            </>
          )}
        </View>
      )}

      {/* Actions */}
      {isPending && (
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => navigation.navigate('DriverDocuments')}
          activeOpacity={0.8}
        >
          <Text style={styles.editBtnText}>{t('driver_apply.edit_docs')}</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[styles.cancelBtn, isCancelling && styles.btnDisabled]}
        onPress={isPending ? handleCancel : handleReapply}
        disabled={isCancelling}
        activeOpacity={0.8}
      >
        {isCancelling ? (
          <ActivityIndicator color={colors.error} size="small" />
        ) : (
          <Text style={styles.cancelBtnText}>
            {isPending ? t('driver_apply.cancel_application') : t('driver_apply.reapply')}
          </Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

// ─── Formulaire de candidature ───────────────────────────────────────────────
const ApplicationForm = ({ navigation }: { navigation: any }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const token = useSelector((state: RootState) => state.auth.token);

  const [vehicleType, setVehicleType] = useState<VehicleType>('van');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleCapacity, setVehicleCapacity] = useState('');
  const [vehiclePhotos, setVehiclePhotos] = useState<string[]>([]);
  const [licensePhotos, setLicensePhotos] = useState<string[]>([]);
  const [insurancePhotos, setInsurancePhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [applyAsDriver, { isLoading }] = useApplyAsDriverMutation();

  const capacity = parseFloat(vehicleCapacity);
  const canSubmit =
    vehiclePlate.trim().length >= 3 &&
    !isNaN(capacity) && capacity > 0 &&
    vehiclePhotos.length >= 2 &&
    licensePhotos.length === 1 &&
    insurancePhotos.length === 1 &&
    !uploading && !isLoading;

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
      const result = await applyAsDriver({
        vehicleType,
        vehicleCapacity: capacity,
        vehiclePlate: vehiclePlate.trim().toUpperCase(),
        vehiclePhotos: uploadedVehiclePhotos,
        drivingLicense: uploadedLicense,
        vehicleInsurance: uploadedInsurance,
      }).unwrap();

      dispatch(updateUser({ driver: result }));

      Alert.alert(t('driver_apply.success_title'), t('driver_apply.success_msg'));
    } catch {
      Alert.alert(t('common.error'), t('driver_apply.error_msg'));
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* Type de véhicule */}
        <Text variant="labelLarge" style={styles.label}>{t('profile.vehicle_type')} *</Text>
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
        <Text variant="labelLarge" style={styles.label}>{t('profile.license_plate')} *</Text>
        <TextInput mode="outlined" value={vehiclePlate} onChangeText={setVehiclePlate}
          placeholder={t('profile.plate_placeholder')} autoCapitalize="characters"
          outlineColor={colors.border} activeOutlineColor={colors.primary} style={styles.input} />

        {/* Capacité */}
        <Text variant="labelLarge" style={styles.label}>{t('driver_apply.vehicle_capacity')} *</Text>
        <TextInput mode="outlined" value={vehicleCapacity} onChangeText={setVehicleCapacity}
          keyboardType="decimal-pad" placeholder="Ex: 10" right={<TextInput.Affix text="m³" />}
          outlineColor={colors.border} activeOutlineColor={colors.primary} style={styles.input} />

        {/* Photos véhicule */}
        <Text variant="labelLarge" style={styles.label}>{t('driver_apply.vehicle_photos_label')} *</Text>
        <Text variant="bodySmall" style={styles.hint}>{t('driver_apply.vehicle_photos_hint')}</Text>
        <PhotoPickerGrid photos={vehiclePhotos} onPhotosChange={setVehiclePhotos} maxPhotos={5} />
        {vehiclePhotos.length < 2 && (
          <Text variant="bodySmall" style={styles.errorHint}>{t('driver_apply.vehicle_photos_min')}</Text>
        )}

        {/* Permis */}
        <Text variant="labelLarge" style={[styles.label, { marginTop: spacing.lg }]}>{t('driver_apply.license_label')} *</Text>
        <Text variant="bodySmall" style={styles.hint}>{t('driver_apply.license_hint')}</Text>
        <PhotoPickerGrid photos={licensePhotos} onPhotosChange={setLicensePhotos} maxPhotos={1} />
        {licensePhotos.length === 0 && (
          <Text variant="bodySmall" style={styles.errorHint}>{t('driver_apply.license_required')}</Text>
        )}

        {/* Document véhicule */}
        <Text variant="labelLarge" style={[styles.label, { marginTop: spacing.lg }]}>{t('driver_apply.insurance_label')} *</Text>
        <Text variant="bodySmall" style={styles.hint}>{t('driver_apply.insurance_hint')}</Text>
        <PhotoPickerGrid photos={insurancePhotos} onPhotosChange={setInsurancePhotos} maxPhotos={1} />
        {insurancePhotos.length === 0 && (
          <Text variant="bodySmall" style={styles.errorHint}>{t('driver_apply.insurance_required')}</Text>
        )}

        {uploading && (
          <View style={styles.uploadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.uploadingText}>{t('transport.uploading_photos')}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
          onPress={handleSubmit} disabled={!canSubmit} activeOpacity={0.8}
        >
          {isLoading || uploading
            ? <ActivityIndicator color={colors.white} size="small" />
            : <Text style={styles.submitBtnText}>{t('driver_apply.submit')}</Text>
          }
        </TouchableOpacity>

        <Text variant="bodySmall" style={styles.footerNote}>{t('driver_apply.review_note')}</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// ─── Écran racine (routage) ───────────────────────────────────────────────────
export const DriverApplicationScreen = ({ navigation }: any) => {
  const user = useSelector((state: RootState) => state.auth.user);
  const driverStatus = user?.driver?.status;

  if (driverStatus === 'pending' || driverStatus === 'rejected') {
    return <ApplicationTracking navigation={navigation} />;
  }
  return <ApplicationForm navigation={navigation} />;
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.light },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  label: { color: colors.dark, marginBottom: spacing.sm, marginTop: spacing.md },
  hint: { color: colors.gray, marginBottom: spacing.sm, lineHeight: 18 },
  errorHint: { color: colors.error, marginTop: 4 },

  // Status card
  statusCard: {
    borderRadius: 12, padding: spacing.xl, alignItems: 'center',
    marginBottom: spacing.lg, borderWidth: 1,
  },
  statusPending: { backgroundColor: '#fefce8', borderColor: '#fde68a' },
  statusRejected: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  statusIcon: { fontSize: 40, marginBottom: spacing.sm },
  statusTitle: { fontSize: 18, fontWeight: '700', marginBottom: spacing.sm },
  statusTitlePending: { color: '#92400e' },
  statusTitleRejected: { color: '#991b1b' },
  statusDesc: { color: colors.gray, textAlign: 'center', lineHeight: 20 },

  // Docs card
  docsCard: {
    backgroundColor: colors.white, borderRadius: 12, padding: spacing.lg,
    marginBottom: spacing.lg, shadowColor: '#000', shadowOpacity: 0.05,
    shadowRadius: 4, elevation: 2,
  },
  docsTitle: { color: colors.dark, marginBottom: spacing.md },
  docsLabel: { color: colors.gray, marginTop: spacing.sm, marginBottom: 6 },
  thumbRow: { flexDirection: 'row', marginBottom: spacing.sm },
  thumb: { width: 72, height: 54, borderRadius: 6, marginRight: spacing.sm, backgroundColor: colors.border },
  docThumb: { width: '100%', height: 120, borderRadius: 8, backgroundColor: colors.border, marginBottom: spacing.sm },

  // Buttons
  editBtn: {
    backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 10,
    alignItems: 'center', marginBottom: spacing.md,
  },
  editBtnText: { color: colors.white, fontSize: 15, fontWeight: '600' },
  cancelBtn: {
    borderWidth: 1.5, borderColor: colors.error, paddingVertical: 14,
    borderRadius: 10, alignItems: 'center',
  },
  cancelBtnText: { color: colors.error, fontSize: 15, fontWeight: '600' },
  btnDisabled: { opacity: 0.5 },

  // Form
  radioGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  radioBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingVertical: 8, paddingHorizontal: spacing.md },
  radioBtnActive: { borderColor: colors.primary, backgroundColor: colors.primary + '15' },
  radioBtnText: { color: colors.gray, fontSize: 14 },
  radioBtnTextActive: { color: colors.primary, fontWeight: '600' },
  input: { backgroundColor: colors.white, marginBottom: spacing.sm },
  uploadingContainer: { alignItems: 'center', padding: spacing.md, marginVertical: spacing.md },
  uploadingText: { marginTop: spacing.sm, color: colors.gray, fontSize: 14 },
  submitBtn: { backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: spacing.xl },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: colors.white, fontSize: 16, fontWeight: '600' },
  footerNote: { textAlign: 'center', color: colors.gray, marginTop: spacing.md, fontStyle: 'italic', lineHeight: 18 },
});
