import React, { useState, useMemo } from 'react';
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
import { Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { clearDriverRecord, updateUser } from '../../store/slices/authSlice';
import { useApplyAsDriverMutation, useCancelDriverApplicationMutation } from '../../store/api/transportApi';
import { uploadMultipleImages } from '../../services/uploadService';
import { KycSection, useKycState, isKycValid } from '../../components/shared/KycSection';
import { KybFranceSection, useKybFranceState, isKybFranceValid } from '../../components/shared/KybFranceSection';
import { colors } from '../../theme/colors';
import { useAppTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/spacing';
import { DriverVehicleForm, VehicleDeclaration, useDriverVehicleForm } from '../../components/transport/DriverVehicleForm';
import { VEHICLE_ERROR_KEYS } from '../../utils/vehicleRequirements';
import { EmailVerificationCard } from '../../components/shared/EmailVerificationCard';
import { useEmailVerification } from '../../hooks/useEmailVerification';

// ─── Styles hook ─────────────────────────────────────────────────────────────
function useDriverStyles() {
  const { tokens } = useAppTheme();
  return useMemo(() => StyleSheet.create({
  container: { flex: 1, backgroundColor: tokens.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },

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
  statusDesc: { color: tokens.text.secondary, textAlign: 'center', lineHeight: 20 },

  // Rejection reason card
  reasonCard: {
    backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fed7aa',
    borderRadius: 10, padding: spacing.lg, marginBottom: spacing.lg,
  },
  reasonLabel: { fontSize: 12, fontWeight: '700', color: '#9a3412', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  reasonText: { fontSize: 14, color: '#7c2d12', lineHeight: 20 },

  // Docs card
  docsCard: {
    backgroundColor: tokens.card, borderRadius: 12, padding: spacing.lg,
    marginBottom: spacing.lg, shadowColor: '#000', shadowOpacity: 0.05,
    shadowRadius: 4, elevation: 2,
  },
  docsTitle: { color: tokens.text.primary, marginBottom: spacing.md },
  docsLabel: { color: tokens.text.secondary, marginTop: spacing.sm, marginBottom: 6 },
  thumbRow: { flexDirection: 'row', marginBottom: spacing.sm },
  thumb: { width: 72, height: 54, borderRadius: 6, marginRight: spacing.sm, backgroundColor: tokens.border },
  docThumb: { width: '100%', height: 120, borderRadius: 8, backgroundColor: tokens.border, marginBottom: spacing.sm },

  // Buttons
  editBtn: {
    paddingVertical: 14, borderRadius: 10,
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
  uploadingContainer: { alignItems: 'center', padding: spacing.md, marginVertical: spacing.md },
  uploadingText: { marginTop: spacing.sm, color: tokens.text.secondary, fontSize: 14 },
  submitBtn: { paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: spacing.xl },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: colors.white, fontSize: 16, fontWeight: '600' },
  footerNote: { textAlign: 'center', color: tokens.text.secondary, marginTop: spacing.md, fontStyle: 'italic', lineHeight: 18 },

  }), [tokens]);
}

// ─── Vue suivi candidature ───────────────────────────────────────────────────
const ApplicationTracking = ({ navigation }: { navigation: any }) => {
  const { t } = useTranslation();
  const { tokens } = useAppTheme();
  const styles = useDriverStyles();
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

      {/* Motif du refus */}
      {isRejected && driver?.rejectionReason ? (
        <View style={styles.reasonCard}>
          <Text style={styles.reasonLabel}>{t('driver_apply.rejection_reason_label')}</Text>
          <Text style={styles.reasonText}>{driver.rejectionReason}</Text>
        </View>
      ) : null}

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
                ✓ {t(driver.vehicleType === 'bicycle' ? 'driver_apply.bike_proof_label' : 'driver_apply.insurance_label')}
              </Text>
              <Image source={{ uri: driver.vehicleInsurance }} style={styles.docThumb} resizeMode="contain" />
            </>
          )}
        </View>
      )}

      {/* Actions */}
      {isPending && (
        <TouchableOpacity
          style={[styles.editBtn, { backgroundColor: tokens.primary }]}
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
  const { tokens } = useAppTheme();
  const styles = useDriverStyles();
  const dispatch = useDispatch();
  const token = useSelector((state: RootState) => state.auth.token);

  const vehicle = useDriverVehicleForm();
  const { state: v, requirements } = vehicle;
  const [hasInsulatedBag, setHasInsulatedBag] = useState(false);
  const [declarationAccepted, setDeclarationAccepted] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [applyAsDriver, { isLoading }] = useApplyAsDriverMutation();

  const kyc = useKycState();
  const kybFr = useKybFranceState();
  const emailCheck = useEmailVerification();
  const user = useSelector((state: RootState) => state.auth.user);
  const isFR = (user?.activeCountryId ?? user?.homeCountryId ?? '').toUpperCase() === 'FR';

  const isCourierVehicle = v.vehicleType === 'motorbike' || v.vehicleType === 'bicycle';
  const canSubmit =
    vehicle.isValid &&
    declarationAccepted &&
    isKycValid(kyc.state) &&
    (!isFR || isKybFranceValid(kybFr.state)) &&
    !emailCheck.blocksApplication &&
    !uploading && !isLoading;

  const handleSubmit = async () => {
    if (!token) return;
    const { idDocumentType, idFrontPhotos, idBackPhotos, selfiePhotos } = kyc.state;
    const { legalStatus, siret, apeNafCode, rcPhotos } = kybFr.state;
    const isPassport = idDocumentType === 'passport';
    const sendLicense = requirements.license !== 'none' && v.licensePhotos.length > 0;

    let uploadedVehiclePhotos: string[];
    let uploadedLicense: string | undefined;
    let uploadedVehicleDoc: string | undefined;
    let uploadedIdFront: string;
    let uploadedIdBack: string | undefined;
    let uploadedSelfie: string;
    let uploadedRcTransport: string | undefined;

    try {
      setUploading(true);
      uploadedVehiclePhotos = await uploadMultipleImages(v.vehiclePhotos, token);
      if (sendLicense) uploadedLicense = (await uploadMultipleImages(v.licensePhotos, token))[0];
      // Vélo : aucun document du véhicule n'est demandé
      if (requirements.vehicleDocument === 'registration' && v.vehicleDocPhotos.length > 0) {
        uploadedVehicleDoc = (await uploadMultipleImages(v.vehicleDocPhotos, token))[0];
      }
      uploadedIdFront = (await uploadMultipleImages(idFrontPhotos, token))[0];
      if (!isPassport && idBackPhotos.length > 0) {
        uploadedIdBack = (await uploadMultipleImages(idBackPhotos, token))[0];
      }
      uploadedSelfie = (await uploadMultipleImages(selfiePhotos, token))[0];
      if (isFR && rcPhotos.length > 0) {
        uploadedRcTransport = (await uploadMultipleImages(rcPhotos, token))[0];
      }
    } catch (err: any) {
      Alert.alert(t('common.error'), t('transport.upload_error_msg', { error: err.message }));
      return;
    } finally {
      setUploading(false);
    }

    try {
      const result = await applyAsDriver({
        vehicleType: v.vehicleType,
        motorbikeClass: v.vehicleType === 'motorbike' ? v.motorbikeClass ?? undefined : undefined,
        vehicleCapacity: vehicle.effectiveCapacity,
        vehiclePlate: requirements.plate ? v.vehiclePlate.trim().toUpperCase() : '',
        vehiclePhotos: uploadedVehiclePhotos,
        drivingLicense: uploadedLicense,
        vehicleInsurance: uploadedVehicleDoc,
        vehicleDeclarationAccepted: declarationAccepted,
        idDocumentType,
        idDocumentFront: uploadedIdFront,
        idDocumentBack: uploadedIdBack,
        selfiePhoto: uploadedSelfie,
        ...(isCourierVehicle && { hasInsulatedBag }),
        ...(isFR && {
          legalStatus,
          siret: siret.replace(/\s/g, ''),
          apeNafCode: apeNafCode.trim(),
          rcProInsuranceUrl: uploadedRcTransport,
        }),
      }).unwrap();

      dispatch(updateUser({ driver: result }));
      Alert.alert(t('driver_apply.success_title'), t('driver_apply.success_msg'));
    } catch (err: any) {
      const code = err?.data?.code;
      Alert.alert(t('common.error'), code && VEHICLE_ERROR_KEYS[code] ? t(VEHICLE_ERROR_KEYS[code]) : t('driver_apply.error_msg'));
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={'padding'}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* E-mail : obligatoire pour candidater selon le pays, recommandé ailleurs */}
        <EmailVerificationCard required={emailCheck.requiredForApplication} />

        <DriverVehicleForm
          state={v}
          onChange={vehicle.set}
          requirements={requirements}
          insulatedBag={{ value: hasInsulatedBag, onValueChange: setHasInsulatedBag }}
        />

        {/* Section KYC */}
        <KycSection {...kyc.props} showErrors />

        {/* Section KYB France */}
        {isFR && <KybFranceSection {...kybFr.props} showErrors />}

        <VehicleDeclaration checked={declarationAccepted} onToggle={() => setDeclarationAccepted((c) => !c)} />

        {uploading && (
          <View style={styles.uploadingContainer}>
            <ActivityIndicator size="large" color={tokens.primary} />
            <Text style={styles.uploadingText}>{t('transport.uploading_photos')}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: tokens.primary }, !canSubmit && styles.submitBtnDisabled]}
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
