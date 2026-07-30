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
import { useUpdateProProfileMutation } from '../../store/api/prosApi';
import { uploadMultipleImages } from '../../services/uploadService';
import { PhotoPickerGrid } from '../../components/shared/PhotoPickerGrid';
import { colors } from '../../theme/colors';
import { useAppTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/spacing';

export const ProDocumentsScreen = ({ navigation }: any) => {
  const { tokens } = useAppTheme();

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: tokens.background },
    content: { padding: spacing.lg, paddingBottom: spacing.xxl },
    label: { color: tokens.text.primary, marginBottom: spacing.sm, marginTop: spacing.md },
    hint: { color: tokens.text.secondary, marginBottom: spacing.sm, lineHeight: 18 },
    errorHint: { color: colors.error, marginTop: 4 },
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
    kycBannerContent: { flex: 1 },
    kycBannerTitle: { color: '#F59E0B', fontWeight: '700', marginBottom: 4 },
    kycBannerMsg: { color: tokens.text.primary, lineHeight: 20 },
    docTypeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.sm },
    docTypeChip: {
      paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20,
      borderWidth: 1.5, borderColor: tokens.border, backgroundColor: 'transparent',
    },
    docTypeChipActive: { borderColor: tokens.primary, backgroundColor: tokens.primary + '18' },
    docTypeChipText: { color: tokens.text.secondary, fontSize: 13 },
    docTypeChipTextActive: { color: tokens.primary, fontWeight: '600' },
    saveBtn: {
      backgroundColor: tokens.primary, paddingVertical: 14, borderRadius: 10,
      alignItems: 'center', marginTop: spacing.xl,
    },
    saveBtnDisabled: { opacity: 0.5 },
    saveBtnText: { color: colors.white, fontSize: 16, fontWeight: '600' },
  }), [tokens]);

  const { t } = useTranslation();
  const dispatch = useDispatch();
  const token = useSelector((state: RootState) => state.auth.token);
  const user = useSelector((state: RootState) => state.auth.user);
  const pro = user?.pro;

  const kycRenewalReason: string | null = (pro as any)?.kycRenewalReason ?? null;

  const [idDocumentType, setIdDocumentType] = useState<'national_id' | 'passport' | 'residence_permit'>(
    ((pro as any)?.idDocumentType as any) ?? 'national_id',
  );
  const [idFrontPhotos, setIdFrontPhotos] = useState<string[]>(
    (pro as any)?.idDocumentFront ? [(pro as any).idDocumentFront] : [],
  );
  const [idBackPhotos, setIdBackPhotos] = useState<string[]>(
    (pro as any)?.idDocumentBack ? [(pro as any).idDocumentBack] : [],
  );
  const [selfiePhotos, setSelfiePhotos] = useState<string[]>(
    (pro as any)?.selfiePhoto ? [(pro as any).selfiePhoto] : [],
  );

  const isPassport = idDocumentType === 'passport';
  const kycValid = idFrontPhotos.length > 0 && (isPassport || idBackPhotos.length > 0) && selfiePhotos.length > 0;

  const [updateProProfile, { isLoading }] = useUpdateProProfileMutation();
  const [uploading, setUploading] = useState(false);

  const isLocalUri = (uri: string) =>
    uri.startsWith('file://') || uri.startsWith('/') || uri.startsWith('content://');

  const idFrontChanged = idFrontPhotos[0] !== (pro as any)?.idDocumentFront;
  const idBackChanged  = idBackPhotos[0]  !== (pro as any)?.idDocumentBack;
  const selfieChanged  = selfiePhotos[0]  !== (pro as any)?.selfiePhoto;
  const hasChanges = idFrontChanged || idBackChanged || selfieChanged;

  const handleSave = async () => {
    if (!kycValid) {
      Alert.alert(t('common.error'), t('kyc.id_front_required'));
      return;
    }
    if (!token || !pro?.id) return;

    try {
      setUploading(true);

      let finalFront = idFrontPhotos[0] ?? (pro as any)?.idDocumentFront ?? '';
      if (idFrontPhotos[0] && isLocalUri(idFrontPhotos[0])) {
        const [url] = await uploadMultipleImages([idFrontPhotos[0]], token);
        finalFront = url;
      }

      let finalBack: string | null = idBackPhotos[0] ?? (pro as any)?.idDocumentBack ?? null;
      if (idBackPhotos[0] && isLocalUri(idBackPhotos[0])) {
        const [url] = await uploadMultipleImages([idBackPhotos[0]], token);
        finalBack = url;
      }

      let finalSelfie = selfiePhotos[0] ?? (pro as any)?.selfiePhoto ?? '';
      if (selfiePhotos[0] && isLocalUri(selfiePhotos[0])) {
        const [url] = await uploadMultipleImages([selfiePhotos[0]], token);
        finalSelfie = url;
      }

      setUploading(false);

      const result = await updateProProfile({
        id: pro.id,
        idDocumentType,
        idDocumentFront: finalFront,
        idDocumentBack: finalBack,
        selfiePhoto: finalSelfie,
      }).unwrap();

      dispatch(updateUser({ pro: { ...pro, ...result } }));

      Alert.alert(t('common.success'), t('driver_docs.save_success'), [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch {
      setUploading(false);
      Alert.alert(t('common.error'), t('driver_docs.save_error'));
    }
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

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

        <Text variant="labelLarge" style={styles.label}>{t('kyc.section_title')} *</Text>
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
        {idFrontPhotos.length === 0 && (
          <Text variant="bodySmall" style={styles.errorHint}>{t('kyc.id_front_required')}</Text>
        )}

        {!isPassport && (
          <>
            <Text variant="labelMedium" style={styles.label}>{t('kyc.id_back')} *</Text>
            <Text variant="bodySmall" style={styles.hint}>{t('kyc.id_back_hint')}</Text>
            <PhotoPickerGrid photos={idBackPhotos} onPhotosChange={setIdBackPhotos} maxPhotos={1} />
            {idBackPhotos.length === 0 && (
              <Text variant="bodySmall" style={styles.errorHint}>{t('kyc.id_back_required')}</Text>
            )}
          </>
        )}

        <Text variant="labelMedium" style={[styles.label, { marginTop: spacing.md }]}>{t('kyc.selfie')} *</Text>
        <Text variant="bodySmall" style={styles.hint}>{t('kyc.selfie_hint')}</Text>
        <PhotoPickerGrid photos={selfiePhotos} onPhotosChange={setSelfiePhotos} maxPhotos={1} />
        {selfiePhotos.length === 0 && (
          <Text variant="bodySmall" style={styles.errorHint}>{t('kyc.selfie_required')}</Text>
        )}

        {uploading && (
          <View style={{ alignItems: 'center', padding: spacing.md, marginTop: spacing.md }}>
            <ActivityIndicator size="large" color={tokens.primary} />
            <Text style={{ marginTop: spacing.sm, color: tokens.text.secondary, fontSize: 14 }}>
              {t('transport.uploading_photos')}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.saveBtn, (!hasChanges || uploading || isLoading || !kycValid) && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!hasChanges || uploading || isLoading || !kycValid}
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
