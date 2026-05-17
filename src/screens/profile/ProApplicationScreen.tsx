import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useSelector, useDispatch } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { getLocalizedName } from '../../utils/localize';
import { RootState } from '../../store';
import { clearProRecord, updateUser } from '../../store/slices/authSlice';
import { useCreateProProfileMutation, useDeleteProProfileMutation } from '../../store/api/prosApi';
import { useGetCategoriesQuery } from '../../store/api/servicesApi';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

const PRO_COLOR = '#10B981';

const isMCIconName = (s?: string | null) => !!s && /^[a-z0-9-]+$/.test(s);

// ─── Suivi candidature ───────────────────────────────────────────────────────
const ApplicationTracking = ({ navigation }: { navigation: any }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const pro = user?.pro;
  const [deleteProProfile, { isLoading: isCancelling }] = useDeleteProProfileMutation();

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

  // ── Profil actif ──
  if (isActive) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.statusHeader}>
          <View style={[styles.statusIcon, { backgroundColor: '#D1FAE5' }]}>
            <Icon name="briefcase-check" size={40} color={PRO_COLOR} />
          </View>
          <Text style={styles.statusTitle}>{t('pro_apply.status_active')}</Text>
          <Text style={styles.statusDesc}>{t('pro_apply.status_active_desc')}</Text>
        </View>

        {pro?.serviceCategories?.length > 0 && (
          <View style={styles.infoCard}>
            <Text style={styles.infoCardTitle}>{t('pro_apply.submitted_categories')}</Text>
            <View style={styles.categoriesWrap}>
              {pro.serviceCategories.map((slug: string) => (
                <View key={slug} style={[styles.categoryChip, { backgroundColor: PRO_COLOR + '15' }]}>
                  <Text style={[styles.categoryChipText, { color: PRO_COLOR }]}>{slug}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <TouchableOpacity
          style={styles.reapplyBtn}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={18} color={colors.white} />
          <Text style={styles.reapplyBtnText}>{t('common.back')}</Text>
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
                <Text style={styles.categoryChipText}>{slug}</Text>
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
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const { userLat, userLng } = useSelector((state: RootState) => state.location);

  const { data: categories = [] } = useGetCategoriesQuery({ activeOnly: true });
  const [createProProfile, { isLoading }] = useCreateProProfileMutation();

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [bio, setBio] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [serviceAreaRadius, setServiceAreaRadius] = useState('10');
  const [submitted, setSubmitted] = useState(false);

  const pro = user?.pro;
  const hasApplication = !!pro;

  if (hasApplication) {
    return <ApplicationTracking navigation={navigation} />;
  }

  const toggleCategory = (slug: string) => {
    setSelectedCategories((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );
  };

  const canSubmit =
    selectedCategories.length > 0 &&
    bio.trim().length >= 20 &&
    !isLoading;

  const handleSubmit = async () => {
    setSubmitted(true);
    if (!canSubmit) return;

    try {
      const result = await createProProfile({
        companyName: companyName.trim() || undefined,
        bio: bio.trim(),
        serviceCategories: selectedCategories,
        serviceAreaRadius: parseFloat(serviceAreaRadius) || 10,
        serviceAreaCenterLat: userLat ?? 0,
        serviceAreaCenterLng: userLng ?? 0,
      }).unwrap();

      dispatch(updateUser({ pro: result }));

      Alert.alert(t('pro_apply.success_title'), t('pro_apply.success_msg'));
    } catch {
      Alert.alert(t('common.error'), t('pro_apply.error_msg'));
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.formHeader}>
          <View style={[styles.formHeaderIcon, { backgroundColor: PRO_COLOR + '20' }]}>
            <Icon name="briefcase-check" size={36} color={PRO_COLOR} />
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
                    color={selected ? PRO_COLOR : colors.gray}
                  />
                ) : (
                  <Text style={{ fontSize: 22 }}>{cat.icon || '📁'}</Text>
                )}
                <Text style={[styles.categoryCardText, selected && { color: PRO_COLOR, fontWeight: '700' }]}>
                  {getLocalizedName(cat, i18n.language)}
                </Text>
                {selected && (
                  <View style={styles.categoryCheckmark}>
                    <Icon name="check-circle" size={16} color={PRO_COLOR} />
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
          outlineColor={colors.border}
          activeOutlineColor={PRO_COLOR}
          style={{ backgroundColor: colors.white, minHeight: 100 }}
        />
        {submitted && bio.trim().length < 20 && (
          <Text style={styles.errorHint}>{t('pro_apply.bio_min')}</Text>
        )}

        {/* Nom société */}
        <Text style={[styles.sectionLabel, { marginTop: spacing.lg }]}>
          {t('pro_apply.company_label')} <Text style={{ color: colors.gray, fontWeight: '400' }}>({t('common.optional')})</Text>
        </Text>
        <TextInput
          mode="outlined"
          value={companyName}
          onChangeText={setCompanyName}
          placeholder={t('pro_apply.company_placeholder')}
          outlineColor={colors.border}
          activeOutlineColor={PRO_COLOR}
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
              <Text style={[styles.radiusChipText, serviceAreaRadius === r && { color: PRO_COLOR, fontWeight: '700' }]}>
                {r} km
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Note légale */}
        <View style={styles.reviewNote}>
          <Icon name="information-outline" size={16} color={colors.gray} />
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
            {isLoading ? t('common.loading') : t('pro_apply.submit')}
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.light },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },

  // Tracking
  statusHeader: { alignItems: 'center', paddingVertical: spacing.xl },
  statusIcon: { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  statusTitle: { fontSize: 18, fontWeight: '700', color: colors.dark, textAlign: 'center', marginBottom: spacing.sm },
  statusDesc: { fontSize: 14, color: colors.gray, textAlign: 'center', lineHeight: 22 },
  reasonCard: {
    backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fed7aa',
    borderRadius: 12, padding: spacing.md, marginBottom: spacing.lg,
  },
  reasonLabel: { fontSize: 11, fontWeight: '700', color: '#92400E', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  reasonText: { fontSize: 14, color: '#78350F', lineHeight: 20 },
  infoCard: {
    backgroundColor: colors.white, borderRadius: 12, padding: spacing.md,
    marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.border,
  },
  infoCardTitle: { fontSize: 13, fontWeight: '600', color: colors.gray, marginBottom: spacing.sm },
  cancelBtn: {
    borderWidth: 1.5, borderColor: colors.error, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginBottom: spacing.sm,
  },
  cancelBtnText: { color: colors.error, fontSize: 14, fontWeight: '700' },
  reapplyBtn: {
    backgroundColor: PRO_COLOR, borderRadius: 12, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
  },
  reapplyBtnText: { color: colors.white, fontSize: 14, fontWeight: '700' },

  // Form
  formHeader: { alignItems: 'center', paddingVertical: spacing.lg },
  formHeaderIcon: { width: 72, height: 72, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  formTitle: { fontSize: 20, fontWeight: '700', color: colors.dark, textAlign: 'center', marginBottom: spacing.xs },
  formSubtitle: { fontSize: 13, color: colors.gray, textAlign: 'center', lineHeight: 20 },

  sectionLabel: { fontSize: 14, fontWeight: '600', color: colors.dark, marginBottom: spacing.xs },
  sectionHint: { fontSize: 12, color: colors.gray, marginBottom: spacing.sm },
  errorHint: { fontSize: 12, color: colors.error, marginTop: 4 },

  categoriesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xs },
  categoryCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: colors.white, borderRadius: 10, padding: spacing.sm,
    borderWidth: 1.5, borderColor: colors.border, position: 'relative',
  },
  categoryCardActive: { borderColor: PRO_COLOR, backgroundColor: PRO_COLOR + '08' },
  categoryCardText: { fontSize: 13, color: colors.dark },
  categoryCheckmark: { position: 'absolute', top: -6, right: -6 },

  categoriesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  categoryChip: { backgroundColor: PRO_COLOR + '15', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  categoryChipText: { fontSize: 12, color: PRO_COLOR, fontWeight: '600' },

  radiusRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', marginBottom: spacing.xs },
  radiusChip: {
    paddingHorizontal: spacing.md, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white,
  },
  radiusChipActive: { borderColor: PRO_COLOR, backgroundColor: PRO_COLOR + '15' },
  radiusChipText: { fontSize: 13, color: colors.gray },

  reviewNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs,
    backgroundColor: colors.white, borderRadius: 10, padding: spacing.md,
    marginTop: spacing.lg, borderWidth: 1, borderColor: colors.border,
  },
  reviewNoteText: { flex: 1, fontSize: 12, color: colors.gray, lineHeight: 18 },

  submitBtn: {
    backgroundColor: PRO_COLOR, borderRadius: 14, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, marginTop: spacing.lg,
  },
  submitBtnText: { color: colors.white, fontSize: 16, fontWeight: '700' },
});
