import React, { useState, useRef, useEffect, useMemo } from 'react';
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
import { PhotoPickerGrid } from '../../components/shared/PhotoPickerGrid';
import { uploadMultipleImages } from '../../services/uploadService';
import { Text, TextInput } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useSelector, useDispatch } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { getLocalizedName } from '../../utils/localize';
import { RootState } from '../../store';
import { clearProRecord, updateUser, refreshProfile } from '../../store/slices/authSlice';
import { useCreateProProfileMutation, useDeleteProProfileMutation, useUpdateProProfileMutation } from '../../store/api/prosApi';
import { useGetCategoriesQuery } from '../../store/api/servicesApi';
import { useGetProfileQuery } from '../../store/api/authApi';
import { colors } from '../../theme/colors';
import { useAppTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/spacing';


const isMCIconName = (s?: string | null) => !!s && /^[a-z0-9-]+$/.test(s);

// ─── Suivi candidature ───────────────────────────────────────────────────────
const ApplicationTracking = ({ navigation, styles, tokens }: { navigation: any; styles: any; tokens: any }) => {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const pro = user?.pro;
  const [deleteProProfile, { isLoading: isCancelling }] = useDeleteProProfileMutation();
  const [updateProProfile, { isLoading: isUpdating }] = useUpdateProProfileMutation();

  const { data: allCategories = [] } = useGetCategoriesQuery({ activeOnly: true });

  const [addingCategories, setAddingCategories] = useState(false);
  const [newSlugs, setNewSlugs] = useState<string[]>([]);

  // Polling du profil pour détecter l'acceptation/refus par l'admin sans redémarrer l'app
  const prevStatusRef = useRef<string | null>(pro?.status ?? null);
  const { data: freshProfile } = useGetProfileQuery(undefined, {
    pollingInterval: 20_000,
    refetchOnMountOrArgChange: true,
  });
  useEffect(() => {
    if (!freshProfile) return;
    const newStatus = freshProfile?.pro?.status;
    if (newStatus && newStatus !== prevStatusRef.current) {
      prevStatusRef.current = newStatus;
      dispatch(refreshProfile(freshProfile));
      if (newStatus === 'active') {
        Alert.alert(t('pro_apply.accepted_title'), t('pro_apply.accepted_message'));
      } else if (newStatus === 'rejected') {
        Alert.alert(t('pro_apply.rejected_title'), t('pro_apply.rejected_message'));
      }
    }
  }, [freshProfile?.pro?.status]);

  const status = pro?.status ?? 'pending';
  const isPending   = status === 'pending';
  const isRejected  = status === 'rejected';
  const isActive    = status === 'active';
  const isSuspended = status === 'suspended';

  const handleCancel = () => {
    Alert.alert(
      t('pro_apply.cancel_confirm_title'),
      t('pro_apply.cancel_confirm_msg'),
      [
        { text: t('common.back'), style: 'cancel' },
        {
          text: t('pro_apply.cancel_confirm_yes'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteProProfile(pro.id).unwrap();
              dispatch(clearProRecord());
            } catch {
              Alert.alert(t('common.error'), t('pro_apply.cancel_error'));
            }
          },
        },
      ],
    );
  };

  const handleReapply = () => {
    Alert.alert(
      t('pro_apply.reapply_confirm_title'),
      t('pro_apply.reapply_confirm_msg'),
      [
        { text: t('common.back'), style: 'cancel' },
        {
          text: t('pro_apply.reapply_confirm_yes'),
          onPress: async () => {
            try {
              await deleteProProfile(pro.id).unwrap();
              dispatch(clearProRecord());
            } catch {
              Alert.alert(t('common.error'), t('pro_apply.cancel_error'));
            }
          },
        },
      ],
    );
  };

  const getCategoryName = (slug: string) => {
    const cat = allCategories.find((c: any) => c.slug === slug);
    return cat ? getLocalizedName(cat, i18n.language) : slug;
  };

  const handleAddCategories = async () => {
    if (newSlugs.length === 0) return;
    const existing: string[] = pro?.serviceCategories ?? [];
    const merged = Array.from(new Set([...existing, ...newSlugs]));
    try {
      const result = await updateProProfile({ id: pro.id, serviceCategories: merged }).unwrap();
      dispatch(updateUser({ pro: { ...pro, ...result, serviceCategories: merged } }));
      setAddingCategories(false);
      setNewSlugs([]);
      Alert.alert(t('pro_apply.add_categories_success_title'), t('pro_apply.add_categories_success_msg'));
    } catch {
      Alert.alert(t('common.error'), t('pro_apply.add_categories_error'));
    }
  };

  const kycRenewalReason: string | null = (pro as any)?.kycRenewalReason ?? null;

  // ── Profil actif ──
  if (isActive) {
    const currentSlugs: string[] = pro?.serviceCategories ?? [];
    const availableToAdd = (allCategories as any[]).filter(
      (c: any) => !currentSlugs.includes(c.slug),
    );

    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {kycRenewalReason && (
          <TouchableOpacity
            style={{
              backgroundColor: '#F59E0B22',
              borderLeftWidth: 4,
              borderLeftColor: '#F59E0B',
              borderRadius: 8,
              padding: 14,
              marginBottom: 16,
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: 10,
            }}
            onPress={() => navigation.navigate('ProDocuments')}
            activeOpacity={0.85}
          >
            <Icon name="alert-circle" size={22} color="#F59E0B" style={{ marginTop: 1 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#F59E0B', fontWeight: '700', marginBottom: 4 }}>
                {t('kyc.renewal_banner_title')}
              </Text>
              <Text style={{ color: tokens.text.primary, lineHeight: 20, fontSize: 13 }}>
                {kycRenewalReason}
              </Text>
              <Text style={{ color: tokens.primary, fontSize: 12, marginTop: 6, fontWeight: '600' }}>
                {t('common.update')} →
              </Text>
            </View>
          </TouchableOpacity>
        )}
        <View style={styles.statusHeader}>
          <View style={[styles.statusIcon, { backgroundColor: '#D1FAE5' }]}>
            <Icon name="briefcase-check" size={40} color={tokens.primary} />
          </View>
          <Text style={styles.statusTitle}>{t('pro_apply.status_active')}</Text>
          <Text style={styles.statusDesc}>{t('pro_apply.status_active_desc')}</Text>
        </View>

        {currentSlugs.length > 0 && (
          <View style={styles.infoCard}>
            <Text style={styles.infoCardTitle}>{t('pro_apply.submitted_categories')}</Text>
            <View style={styles.categoriesWrap}>
              {currentSlugs.map((slug: string) => (
                <View key={slug} style={[styles.categoryChip, { backgroundColor: tokens.primary + '15' }]}>
                  <Text style={[styles.categoryChipText, { color: tokens.primary }]}>
                    {getCategoryName(slug)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Formulaire ajout catégories */}
        {!addingCategories && availableToAdd.length > 0 && (
          <TouchableOpacity
            style={[styles.reapplyBtn, { backgroundColor: tokens.primary + 'DD', marginBottom: spacing.sm }]}
            onPress={() => setAddingCategories(true)}
          >
            <Icon name="plus-circle-outline" size={18} color={colors.white} />
            <Text style={styles.reapplyBtnText}>{t('pro_apply.add_categories_btn')}</Text>
          </TouchableOpacity>
        )}

        {addingCategories && (
          <View style={styles.infoCard}>
            <Text style={styles.infoCardTitle}>{t('pro_apply.add_categories_title')}</Text>
            <Text style={[styles.infoCardTitle, { fontWeight: '400', textTransform: 'none', marginBottom: spacing.sm }]}>
              {t('pro_apply.add_categories_hint')}
            </Text>
            <View style={styles.categoriesGrid}>
              {availableToAdd.map((cat: any) => {
                const selected = newSlugs.includes(cat.slug);
                return (
                  <TouchableOpacity
                    key={cat.slug}
                    style={[styles.categoryCard, selected && styles.categoryCardActive]}
                    onPress={() =>
                      setNewSlugs((prev) =>
                        prev.includes(cat.slug) ? prev.filter((s) => s !== cat.slug) : [...prev, cat.slug],
                      )
                    }
                    activeOpacity={0.8}
                  >
                    {cat.icon && /^[a-z0-9-]+$/.test(cat.icon) ? (
                      <Icon name={cat.icon} size={20} color={selected ? tokens.primary : tokens.text.secondary} />
                    ) : (
                      <Text style={{ fontSize: 20 }}>{cat.icon || '📁'}</Text>
                    )}
                    <Text style={[styles.categoryCardText, selected && { color: tokens.primary, fontWeight: '700' }]}>
                      {getLocalizedName(cat, i18n.language)}
                    </Text>
                    {selected && (
                      <View style={styles.categoryCheckmark}>
                        <Icon name="check-circle" size={16} color={tokens.primary} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
              <TouchableOpacity
                style={[styles.cancelBtn, { flex: 1, marginBottom: 0 }]}
                onPress={() => { setAddingCategories(false); setNewSlugs([]); }}
              >
                <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.reapplyBtn, { flex: 2 }, (newSlugs.length === 0 || isUpdating) && { opacity: 0.5 }]}
                onPress={handleAddCategories}
                disabled={newSlugs.length === 0 || isUpdating}
              >
                <Icon name="check" size={18} color={colors.white} />
                <Text style={styles.reapplyBtnText}>
                  {isUpdating ? t('common.loading') : t('pro_apply.add_categories_confirm')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[styles.cancelBtn, { marginTop: spacing.sm }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelBtnText}>{t('common.back')}</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ── Profil suspendu ──
  if (isSuspended) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.statusHeader}>
          <View style={[styles.statusIcon, { backgroundColor: '#FEF3C7' }]}>
            <Icon name="pause-circle-outline" size={40} color="#F59E0B" />
          </View>
          <Text style={styles.statusTitle}>{t('pro_apply.status_suspended')}</Text>
          <Text style={styles.statusDesc}>{t('pro_apply.status_suspended_desc')}</Text>
        </View>
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelBtnText}>{t('common.back')}</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ── Pending / Rejected ──
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.statusHeader}>
        <View style={[styles.statusIcon, { backgroundColor: isPending ? '#FEF3C7' : '#FEE2E2' }]}>
          <Icon
            name={isPending ? 'clock-outline' : 'alert-circle-outline'}
            size={40}
            color={isPending ? '#F59E0B' : colors.error}
          />
        </View>
        <Text style={styles.statusTitle}>
          {t(isPending ? 'pro_apply.status_pending' : 'pro_apply.status_rejected')}
        </Text>
        <Text style={styles.statusDesc}>
          {t(isPending ? 'pro_apply.status_pending_desc' : 'pro_apply.status_rejected_desc')}
        </Text>
      </View>

      {isRejected && pro?.rejectionReason ? (
        <View style={styles.reasonCard}>
          <Text style={styles.reasonLabel}>{t('pro_apply.rejection_reason_label')}</Text>
          <Text style={styles.reasonText}>{pro.rejectionReason}</Text>
        </View>
      ) : null}

      {pro?.serviceCategories?.length > 0 && (
        <View style={styles.infoCard}>
          <Text style={styles.infoCardTitle}>{t('pro_apply.submitted_categories')}</Text>
          <View style={styles.categoriesWrap}>
            {pro.serviceCategories.map((slug: string) => (
              <View key={slug} style={styles.categoryChip}>
                <Text style={styles.categoryChipText}>{getCategoryName(slug)}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {isPending && (
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={handleCancel}
          disabled={isCancelling}
        >
          <Text style={styles.cancelBtnText}>
            {isCancelling ? t('common.loading') : t('pro_apply.cancel_application')}
          </Text>
        </TouchableOpacity>
      )}

      {isRejected && (
        <TouchableOpacity
          style={styles.reapplyBtn}
          onPress={handleReapply}
          disabled={isCancelling}
        >
          <Icon name="briefcase-plus" size={18} color={colors.white} />
          <Text style={styles.reapplyBtnText}>
            {isCancelling ? t('common.loading') : t('pro_apply.reapply')}
          </Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

// ─── Formulaire candidature ──────────────────────────────────────────────────
export const ProApplicationScreen = ({ navigation }: any) => {
  const { tokens } = useAppTheme();

  const styles = useMemo(() => StyleSheet.create({
  container: { flex: 1, backgroundColor: tokens.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },

  // Tracking
  statusHeader: { alignItems: 'center', paddingVertical: spacing.xl },
  statusIcon: { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  statusTitle: { fontSize: 18, fontWeight: '700', color: tokens.text.primary, textAlign: 'center', marginBottom: spacing.sm },
  statusDesc: { fontSize: 14, color: tokens.text.secondary, textAlign: 'center', lineHeight: 22 },
  reasonCard: {
    backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fed7aa',
    borderRadius: 12, padding: spacing.md, marginBottom: spacing.lg,
  },
  reasonLabel: { fontSize: 11, fontWeight: '700', color: '#92400E', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  reasonText: { fontSize: 14, color: '#78350F', lineHeight: 20 },
  infoCard: {
    backgroundColor: tokens.card, borderRadius: 12, padding: spacing.md,
    marginBottom: spacing.lg, borderWidth: 1, borderColor: tokens.border,
  },
  infoCardTitle: { fontSize: 13, fontWeight: '600', color: tokens.text.secondary, marginBottom: spacing.sm },
  cancelBtn: {
    borderWidth: 1.5, borderColor: colors.error, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginBottom: spacing.sm,
  },
  cancelBtnText: { color: colors.error, fontSize: 14, fontWeight: '700' },
  reapplyBtn: {
    backgroundColor: tokens.primary, borderRadius: 12, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
  },
  reapplyBtnText: { color: colors.white, fontSize: 14, fontWeight: '700' },

  // Form
  formHeader: { alignItems: 'center', paddingVertical: spacing.lg },
  formHeaderIcon: { width: 72, height: 72, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  formTitle: { fontSize: 20, fontWeight: '700', color: tokens.text.primary, textAlign: 'center', marginBottom: spacing.xs },
  formSubtitle: { fontSize: 13, color: tokens.text.secondary, textAlign: 'center', lineHeight: 20 },

  sectionLabel: { fontSize: 14, fontWeight: '600', color: tokens.text.primary, marginBottom: spacing.xs },
  sectionHint: { fontSize: 12, color: tokens.text.secondary, marginBottom: spacing.sm },
  errorHint: { fontSize: 12, color: colors.error, marginTop: 4 },

  categoriesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xs },
  categoryCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: tokens.card, borderRadius: 10, padding: spacing.sm,
    borderWidth: 1.5, borderColor: tokens.border, position: 'relative',
  },
  categoryCardActive: { borderColor: tokens.primary, backgroundColor: tokens.primary + '08' },
  categoryCardText: { fontSize: 13, color: tokens.text.primary },
  categoryCheckmark: { position: 'absolute', top: -6, right: -6 },

  categoriesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  categoryChip: { backgroundColor: tokens.primary + '15', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  categoryChipText: { fontSize: 12, color: tokens.primary, fontWeight: '600' },

  radiusRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', marginBottom: spacing.xs },
  radiusChip: {
    paddingHorizontal: spacing.md, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: tokens.border, backgroundColor: tokens.card,
  },
  radiusChipActive: { borderColor: tokens.primary, backgroundColor: tokens.primary + '15' },
  radiusChipText: { fontSize: 13, color: tokens.text.secondary },

  reviewNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs,
    backgroundColor: tokens.card, borderRadius: 10, padding: spacing.md,
    marginTop: spacing.lg, borderWidth: 1, borderColor: tokens.border,
  },
  reviewNoteText: { flex: 1, fontSize: 12, color: tokens.text.secondary, lineHeight: 18 },

  submitBtn: {
    backgroundColor: tokens.primary, borderRadius: 14, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, marginTop: spacing.lg,
  },
  submitBtnText: { color: colors.white, fontSize: 16, fontWeight: '700' },

  docTypeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.sm },
  docTypeChip: {
    paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20,
    borderWidth: 1.5, borderColor: tokens.border, backgroundColor: 'transparent',
  },
  docTypeChipActive: { borderColor: tokens.primary, backgroundColor: tokens.primary + '18' },
  docTypeChipText: { color: tokens.text.secondary, fontSize: 13 },
  docTypeChipTextActive: { color: tokens.primary, fontWeight: '600' },
}), [tokens]);

  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const token = useSelector((state: RootState) => state.auth.token);
  const { userLat, userLng } = useSelector((state: RootState) => state.location);

  const { data: categories = [] } = useGetCategoriesQuery({ activeOnly: true });
  const [createProProfile, { isLoading }] = useCreateProProfileMutation();

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [bio, setBio] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [serviceAreaRadius, setServiceAreaRadius] = useState('10');
  const [submitted, setSubmitted] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [idDocumentType, setIdDocumentType] = useState<'national_id' | 'passport' | 'residence_permit'>('national_id');
  const [idFrontPhotos, setIdFrontPhotos] = useState<string[]>([]);
  const [idBackPhotos, setIdBackPhotos] = useState<string[]>([]);
  const [selfiePhotos, setSelfiePhotos] = useState<string[]>([]);
  const isPassport = idDocumentType === 'passport';
  const kycValid = idFrontPhotos.length > 0 && (isPassport || idBackPhotos.length > 0) && selfiePhotos.length > 0;

  const isLocalUri = (uri: string) => uri.startsWith('file://') || uri.startsWith('/') || uri.startsWith('content://');

  const pro = user?.pro;
  const hasApplication = !!pro;

  if (hasApplication) {
    return <ApplicationTracking navigation={navigation} styles={styles} tokens={tokens} />;
  }

  const toggleCategory = (slug: string) => {
    setSelectedCategories((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );
  };

  const canSubmit =
    selectedCategories.length > 0 &&
    bio.trim().length >= 20 &&
    kycValid &&
    !isLoading &&
    !uploading;

  const handleSubmit = async () => {
    setSubmitted(true);
    if (!canSubmit) return;
    if (!token) return;

    try {
      setUploading(true);

      const [frontUrl] = await uploadMultipleImages(
        idFrontPhotos.filter(isLocalUri),
        token,
      );
      const finalFront = isLocalUri(idFrontPhotos[0]) ? frontUrl : idFrontPhotos[0];

      let finalBack: string | undefined;
      if (!isPassport && idBackPhotos.length > 0) {
        if (isLocalUri(idBackPhotos[0])) {
          const [backUrl] = await uploadMultipleImages([idBackPhotos[0]], token);
          finalBack = backUrl;
        } else {
          finalBack = idBackPhotos[0];
        }
      }

      const [selfieUrl] = await uploadMultipleImages(
        selfiePhotos.filter(isLocalUri),
        token,
      );
      const finalSelfie = isLocalUri(selfiePhotos[0]) ? selfieUrl : selfiePhotos[0];

      setUploading(false);

      const result = await createProProfile({
        companyName: companyName.trim() || undefined,
        bio: bio.trim(),
        serviceCategories: selectedCategories,
        serviceAreaRadius: parseFloat(serviceAreaRadius) || 10,
        serviceAreaCenterLat: userLat ?? 0,
        serviceAreaCenterLng: userLng ?? 0,
        idDocumentType,
        idDocumentFront: finalFront,
        idDocumentBack: finalBack,
        selfiePhoto: finalSelfie,
      }).unwrap();

      dispatch(updateUser({ pro: { ...result, serviceCategorySlugs: selectedCategories } }));

      Alert.alert(t('pro_apply.success_title'), t('pro_apply.success_msg'));
    } catch {
      setUploading(false);
      Alert.alert(t('common.error'), t('pro_apply.error_msg'));
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={'padding'}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.formHeader}>
          <View style={[styles.formHeaderIcon, { backgroundColor: tokens.primary + '20' }]}>
            <Icon name="briefcase-check" size={36} color={tokens.primary} />
          </View>
          <Text style={styles.formTitle}>{t('pro_apply.title')}</Text>
          <Text style={styles.formSubtitle}>{t('pro_apply.subtitle')}</Text>
        </View>

        {/* Catégories */}
        <Text style={styles.sectionLabel}>{t('pro_apply.categories_label')} *</Text>
        <Text style={styles.sectionHint}>{t('pro_apply.categories_hint')}</Text>
        <View style={styles.categoriesGrid}>
          {categories.map((cat: any) => {
            const selected = selectedCategories.includes(cat.slug);
            return (
              <TouchableOpacity
                key={cat.slug}
                style={[styles.categoryCard, selected && styles.categoryCardActive]}
                onPress={() => toggleCategory(cat.slug)}
                activeOpacity={0.8}
              >
                {isMCIconName(cat.icon) ? (
                  <Icon
                    name={cat.icon}
                    size={22}
                    color={selected ? tokens.primary : tokens.text.secondary}
                  />
                ) : (
                  <Text style={{ fontSize: 22 }}>{cat.icon || '📁'}</Text>
                )}
                <Text style={[styles.categoryCardText, selected && { color: tokens.primary, fontWeight: '700' }]}>
                  {getLocalizedName(cat, i18n.language)}
                </Text>
                {selected && (
                  <View style={styles.categoryCheckmark}>
                    <Icon name="check-circle" size={16} color={tokens.primary} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
        {submitted && selectedCategories.length === 0 && (
          <Text style={styles.errorHint}>{t('pro_apply.categories_required')}</Text>
        )}

        {/* Bio */}
        <Text style={[styles.sectionLabel, { marginTop: spacing.lg }]}>{t('pro_apply.bio_label')} *</Text>
        <TextInput
          mode="outlined"
          value={bio}
          onChangeText={setBio}
          placeholder={t('pro_apply.bio_placeholder')}
          multiline
          numberOfLines={4}
          outlineColor={tokens.border}
          activeOutlineColor={tokens.primary}
          style={{ backgroundColor: tokens.card, minHeight: 100 }}
        />
        {submitted && bio.trim().length < 20 && (
          <Text style={styles.errorHint}>{t('pro_apply.bio_min')}</Text>
        )}

        {/* Nom société */}
        <Text style={[styles.sectionLabel, { marginTop: spacing.lg }]}>
          {t('pro_apply.company_label')} <Text style={{ color: tokens.text.secondary, fontWeight: '400' }}>({t('common.optional')})</Text>
        </Text>
        <TextInput
          mode="outlined"
          value={companyName}
          onChangeText={setCompanyName}
          placeholder={t('pro_apply.company_placeholder')}
          outlineColor={tokens.border}
          activeOutlineColor={tokens.primary}
          style={{ backgroundColor: colors.white }}
        />

        {/* Zone de service */}
        <Text style={[styles.sectionLabel, { marginTop: spacing.lg }]}>{t('pro_apply.service_radius_label')}</Text>
        <View style={styles.radiusRow}>
          {['5', '10', '20', '30', '50'].map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.radiusChip, serviceAreaRadius === r && styles.radiusChipActive]}
              onPress={() => setServiceAreaRadius(r)}
            >
              <Text style={[styles.radiusChipText, serviceAreaRadius === r && { color: tokens.primary, fontWeight: '700' }]}>
                {r} km
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Section KYC */}
        <Text style={[styles.sectionLabel, { marginTop: spacing.xl }]}>{t('kyc.section_title')} *</Text>
        <Text style={styles.sectionHint}>{t('kyc.section_hint')}</Text>

        <Text style={[styles.sectionLabel, { marginTop: spacing.sm }]}>{t('kyc.document_type')}</Text>
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

        <Text style={styles.sectionLabel}>{t('kyc.id_front')} *</Text>
        <Text style={styles.sectionHint}>{t('kyc.id_front_hint')}</Text>
        <PhotoPickerGrid photos={idFrontPhotos} onPhotosChange={setIdFrontPhotos} maxPhotos={1} />
        {submitted && idFrontPhotos.length === 0 && (
          <Text style={styles.errorHint}>{t('kyc.id_front_required')}</Text>
        )}

        {!isPassport && (
          <>
            <Text style={[styles.sectionLabel, { marginTop: spacing.md }]}>{t('kyc.id_back')} *</Text>
            <Text style={styles.sectionHint}>{t('kyc.id_back_hint')}</Text>
            <PhotoPickerGrid photos={idBackPhotos} onPhotosChange={setIdBackPhotos} maxPhotos={1} />
            {submitted && idBackPhotos.length === 0 && (
              <Text style={styles.errorHint}>{t('kyc.id_back_required')}</Text>
            )}
          </>
        )}

        <Text style={[styles.sectionLabel, { marginTop: spacing.md }]}>{t('kyc.selfie')} *</Text>
        <Text style={styles.sectionHint}>{t('kyc.selfie_hint')}</Text>
        <PhotoPickerGrid photos={selfiePhotos} onPhotosChange={setSelfiePhotos} maxPhotos={1} />
        {submitted && selfiePhotos.length === 0 && (
          <Text style={styles.errorHint}>{t('kyc.selfie_required')}</Text>
        )}

        {uploading && (
          <View style={{ alignItems: 'center', padding: spacing.md }}>
            <ActivityIndicator size="large" color={tokens.primary} />
            <Text style={{ marginTop: spacing.sm, color: tokens.text.secondary, fontSize: 14 }}>
              {t('transport.uploading_photos')}
            </Text>
          </View>
        )}

        {/* Note légale */}
        <View style={styles.reviewNote}>
          <Icon name="information-outline" size={16} color={tokens.text.secondary} />
          <Text style={styles.reviewNoteText}>{t('pro_apply.review_note')}</Text>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, !canSubmit && { opacity: 0.5 }]}
          onPress={handleSubmit}
          disabled={!canSubmit}
          activeOpacity={0.85}
        >
          <Icon name="briefcase-check" size={20} color={colors.white} />
          <Text style={styles.submitBtnText}>
            {isLoading || uploading ? t('common.loading') : t('pro_apply.submit')}
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
};

