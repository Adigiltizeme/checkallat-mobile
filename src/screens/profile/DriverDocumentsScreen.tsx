import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
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
import { DriverVehicleForm, VehicleDeclaration, useDriverVehicleForm } from '../../components/transport/DriverVehicleForm';
import { VEHICLE_ERROR_KEYS, DriverVehicleType, MotorbikeClass } from '../../utils/vehicleRequirements';
import { colors } from '../../theme/colors';
import { useAppTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/spacing';

// Sépare les URIs locaux (nouveaux) des URLs déjà hébergées
const isLocalUri = (uri: string) => uri.startsWith('file://') || uri.startsWith('/') || uri.startsWith('content://');

export const DriverDocumentsScreen = ({ navigation }: any) => {
  const { tokens } = useAppTheme();
  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: tokens.background },
    content: { padding: spacing.lg, paddingBottom: spacing.xxl },
    label: { color: tokens.text.primary, marginBottom: spacing.sm, marginTop: spacing.md },
    hint: { color: tokens.text.secondary, marginBottom: spacing.sm, lineHeight: 18 },
    errorHint: { color: colors.error, marginTop: 4 },
    uploadingContainer: { alignItems: 'center', padding: spacing.md, marginVertical: spacing.md },
    uploadingText: { marginTop: spacing.sm, color: tokens.text.secondary, fontSize: 14 },
    saveBtn: { backgroundColor: tokens.primary, paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: spacing.xl },
    saveBtnDisabled: { opacity: 0.5 },
    saveBtnText: { color: colors.white, fontSize: 16, fontWeight: '600' },
    banner: {
      borderLeftWidth: 4, borderRadius: 8, padding: spacing.md, marginBottom: spacing.lg,
      flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    },
    bannerContent: { flex: 1 },
    bannerTitle: { fontWeight: '700', marginBottom: 4 },
    bannerMsg: { color: tokens.text.primary, lineHeight: 20 },
    docTypeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.sm },
    docTypeChip: {
      paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20,
      borderWidth: 1.5, borderColor: tokens.border, backgroundColor: 'transparent',
    },
    docTypeChipActive: { borderColor: tokens.primary, backgroundColor: tokens.primary + '18' },
    docTypeChipText: { color: tokens.text.secondary, fontSize: 13 },
    docTypeChipTextActive: { color: tokens.primary, fontWeight: '600' },
    reviewNote: { textAlign: 'center', color: tokens.text.secondary, marginTop: spacing.md, fontStyle: 'italic', lineHeight: 18 },
  }), [tokens]);

  const { t } = useTranslation();
  const dispatch = useDispatch();
  const token = useSelector((state: RootState) => state.auth.token);
  const user = useSelector((state: RootState) => state.auth.user);
  const driver: any = user?.driver;

  const kycRenewalReason: string | null = driver?.kycRenewalReason ?? null;

  const initialVehicle = {
    vehicleType: (driver?.vehicleType ?? 'van') as DriverVehicleType,
    motorbikeClass: (driver?.motorbikeClass ?? null) as MotorbikeClass | null,
    vehiclePlate: driver?.vehiclePlate ?? '',
    vehicleCapacity: driver?.vehicleCapacity ? String(driver.vehicleCapacity) : '',
    vehiclePhotos: driver?.vehiclePhotos ?? [],
    licensePhotos: driver?.drivingLicense ? [driver.drivingLicense] : [],
    vehicleDocPhotos: driver?.vehicleInsurance ? [driver.vehicleInsurance] : [],
  };
  const vehicle = useDriverVehicleForm(initialVehicle);
  const { state: v, requirements } = vehicle;

  // KYC — pré-rempli si déjà soumis
  const [idDocumentType, setIdDocumentType] = useState<'national_id' | 'passport' | 'residence_permit'>(
    driver?.idDocumentType ?? 'national_id',
  );
  const [idFrontPhotos, setIdFrontPhotos] = useState<string[]>(driver?.idDocumentFront ? [driver.idDocumentFront] : []);
  const [idBackPhotos, setIdBackPhotos] = useState<string[]>(driver?.idDocumentBack ? [driver.idDocumentBack] : []);
  const [selfiePhotos, setSelfiePhotos] = useState<string[]>(driver?.selfiePhoto ? [driver.selfiePhoto] : []);
  const isPassport = idDocumentType === 'passport';
  const kycValid = idFrontPhotos.length > 0 && (isPassport || idBackPhotos.length > 0) && selfiePhotos.length > 0;

  const [declarationAccepted, setDeclarationAccepted] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [updateDriverProfile, { isLoading }] = useUpdateDriverProfileMutation();

  // Sac isotherme : enregistré immédiatement, sans revalidation (uniquement pour le véhicule actuel)
  const isCurrentCourier = initialVehicle.vehicleType === 'motorbike' || initialVehicle.vehicleType === 'bicycle';
  const [hasInsulatedBag, setHasInsulatedBag] = useState<boolean>(!!driver?.hasInsulatedBag);
  const [savingBag, setSavingBag] = useState(false);
  const handleInsulatedBagChange = async (value: boolean) => {
    setHasInsulatedBag(value);
    setSavingBag(true);
    try {
      await updateDriverProfile({ hasInsulatedBag: value }).unwrap();
      dispatch(updateUser({ driver: { ...driver, hasInsulatedBag: value } }));
    } catch {
      setHasInsulatedBag(!value);
      Alert.alert(t('common.error'), t('driver_docs.save_error'));
    } finally {
      setSavingBag(false);
    }
  };

  // Nouveau véhicule = type, catégorie ou plaque différents → engagement + revalidation
  const vehicleIdentityChanged =
    v.vehicleType !== initialVehicle.vehicleType ||
    (v.motorbikeClass ?? null) !== (initialVehicle.motorbikeClass ?? null) ||
    (requirements.plate && v.vehiclePlate.trim().toUpperCase() !== (initialVehicle.vehiclePlate ?? '').toUpperCase());

  const same = (a: string[], b: string[]) => JSON.stringify(a) === JSON.stringify(b);
  const hasChanges =
    vehicleIdentityChanged ||
    v.vehicleCapacity !== initialVehicle.vehicleCapacity ||
    !same(v.vehiclePhotos, initialVehicle.vehiclePhotos) ||
    !same(v.licensePhotos, initialVehicle.licensePhotos) ||
    !same(v.vehicleDocPhotos, initialVehicle.vehicleDocPhotos) ||
    idDocumentType !== (driver?.idDocumentType ?? 'national_id') ||
    idFrontPhotos[0] !== driver?.idDocumentFront ||
    idBackPhotos[0] !== driver?.idDocumentBack ||
    selfiePhotos[0] !== driver?.selfiePhoto;

  const canSave =
    hasChanges && vehicle.isValid && kycValid &&
    (!vehicleIdentityChanged || declarationAccepted) &&
    !uploading && !isLoading;

  /** Upload des seules photos locales, en conservant l'ordre */
  const resolveUris = async (uris: string[]): Promise<string[]> => {
    const locals = uris.filter(isLocalUri);
    if (locals.length === 0 || !token) return uris;
    const uploaded = await uploadMultipleImages(locals, token);
    let i = 0;
    return uris.map((u) => (isLocalUri(u) ? uploaded[i++] : u));
  };

  const save = async () => {
    if (!token) return;
    try {
      setUploading(true);
      const [vehiclePhotos, licenseUris, docUris, idFront, idBack, selfie] = await Promise.all([
        resolveUris(v.vehiclePhotos),
        resolveUris(requirements.license === 'none' ? [] : v.licensePhotos),
        resolveUris(v.vehicleDocPhotos),
        resolveUris(idFrontPhotos),
        resolveUris(isPassport ? [] : idBackPhotos),
        resolveUris(selfiePhotos),
      ]);
      setUploading(false);

      const updated = await updateDriverProfile({
        ...(vehicleIdentityChanged && {
          vehicleType: v.vehicleType,
          motorbikeClass: v.vehicleType === 'motorbike' ? v.motorbikeClass : null,
          vehiclePlate: requirements.plate ? v.vehiclePlate.trim().toUpperCase() : '',
          vehicleDeclarationAccepted: declarationAccepted,
        }),
        ...(requirements.fixedCapacity == null && { vehicleCapacity: vehicle.effectiveCapacity }),
        vehiclePhotos,
        drivingLicense: licenseUris[0] ?? null,
        vehicleInsurance: docUris[0],
        idDocumentType,
        idDocumentFront: idFront[0],
        idDocumentBack: idBack[0] ?? null,
        selfiePhoto: selfie[0],
      }).unwrap();

      dispatch(updateUser({ driver: { ...driver, ...updated } }));
      Alert.alert(
        t('common.success'),
        t(vehicleIdentityChanged ? 'driver_docs.vehicle_change_sent' : 'driver_docs.save_success'),
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (err: any) {
      setUploading(false);
      const code = err?.data?.code;
      Alert.alert(t('common.error'), code && VEHICLE_ERROR_KEYS[code] ? t(VEHICLE_ERROR_KEYS[code]) : t('driver_docs.save_error'));
    }
  };

  // Toute modification repasse le profil en vérification : on prévient avant d'envoyer
  const handleSave = () => {
    Alert.alert(
      t(vehicleIdentityChanged ? 'driver_docs.vehicle_change_title' : 'driver_docs.resubmit_title'),
      t(vehicleIdentityChanged ? 'driver_docs.vehicle_change_msg' : 'driver_docs.resubmit_msg'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('driver_docs.resubmit_confirm'), onPress: save },
      ],
    );
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Bannière renouvellement KYC */}
        {kycRenewalReason && (
          <View style={[styles.banner, { backgroundColor: '#F59E0B22', borderLeftColor: '#F59E0B' }]}>
            <Icon name="alert-circle" size={22} color="#F59E0B" style={{ marginTop: 1 }} />
            <View style={styles.bannerContent}>
              <Text variant="labelMedium" style={[styles.bannerTitle, { color: '#F59E0B' }]}>{t('kyc.renewal_banner_title')}</Text>
              <Text variant="bodySmall" style={styles.bannerMsg}>{kycRenewalReason}</Text>
            </View>
          </View>
        )}

        {/* Alerte vitesse : livreur déclaré à vélo mais trajets trop rapides */}
        {initialVehicle.vehicleType === 'bicycle' && (driver?.speedAnomalyCount ?? 0) > 0 && (
          <View style={[styles.banner, { backgroundColor: colors.error + '18', borderLeftColor: colors.error }]}>
            <Icon name="speedometer" size={22} color={colors.error} style={{ marginTop: 1 }} />
            <View style={styles.bannerContent}>
              <Text variant="labelMedium" style={[styles.bannerTitle, { color: colors.error }]}>{t('driver_docs.speed_warning_title')}</Text>
              <Text variant="bodySmall" style={styles.bannerMsg}>{t('driver_docs.speed_warning_msg')}</Text>
            </View>
          </View>
        )}

        <DriverVehicleForm
          state={v}
          onChange={vehicle.set}
          requirements={requirements}
          insulatedBag={isCurrentCourier && v.vehicleType === initialVehicle.vehicleType
            ? { value: hasInsulatedBag, onValueChange: handleInsulatedBagChange, disabled: savingBag }
            : undefined}
        />

        {/* Pièce d'identité & selfie */}
        <Text variant="labelLarge" style={[styles.label, { marginTop: spacing.xl }]}>{t('kyc.section_title')} *</Text>
        <Text variant="bodySmall" style={styles.hint}>{t('kyc.section_hint')}</Text>

        <Text variant="labelMedium" style={[styles.label, { marginTop: spacing.sm }]}>{t('kyc.document_type')}</Text>
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

        <Text variant="labelMedium" style={styles.label}>{t('kyc.id_front')} *</Text>
        <Text variant="bodySmall" style={styles.hint}>{t('kyc.id_front_hint')}</Text>
        <PhotoPickerGrid photos={idFrontPhotos} onPhotosChange={setIdFrontPhotos} maxPhotos={1} />
        {idFrontPhotos.length === 0 && <Text variant="bodySmall" style={styles.errorHint}>{t('kyc.id_front_required')}</Text>}

        {!isPassport && (
          <>
            <Text variant="labelMedium" style={styles.label}>{t('kyc.id_back')} *</Text>
            <Text variant="bodySmall" style={styles.hint}>{t('kyc.id_back_hint')}</Text>
            <PhotoPickerGrid photos={idBackPhotos} onPhotosChange={setIdBackPhotos} maxPhotos={1} />
            {idBackPhotos.length === 0 && <Text variant="bodySmall" style={styles.errorHint}>{t('kyc.id_back_required')}</Text>}
          </>
        )}

        <Text variant="labelMedium" style={[styles.label, { marginTop: spacing.md }]}>{t('kyc.selfie')} *</Text>
        <Text variant="bodySmall" style={styles.hint}>{t('kyc.selfie_hint')}</Text>
        <PhotoPickerGrid photos={selfiePhotos} onPhotosChange={setSelfiePhotos} maxPhotos={1} />
        {selfiePhotos.length === 0 && <Text variant="bodySmall" style={styles.errorHint}>{t('kyc.selfie_required')}</Text>}

        {vehicleIdentityChanged && (
          <VehicleDeclaration checked={declarationAccepted} onToggle={() => setDeclarationAccepted((c) => !c)} />
        )}

        {uploading && (
          <View style={styles.uploadingContainer}>
            <ActivityIndicator size="large" color={tokens.primary} />
            <Text style={styles.uploadingText}>{t('transport.uploading_photos')}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!canSave}
          activeOpacity={0.8}
        >
          {uploading || isLoading
            ? <ActivityIndicator color={colors.white} size="small" />
            : <Text style={styles.saveBtnText}>{t('common.save')}</Text>}
        </TouchableOpacity>
        <Text variant="bodySmall" style={styles.reviewNote}>{t('driver_docs.review_note')}</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
