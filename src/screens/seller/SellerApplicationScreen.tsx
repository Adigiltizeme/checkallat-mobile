import React, { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text, TextInput, Switch } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { RootState } from '../../store';
import { setActiveRole, updateUser } from '../../store/slices/authSlice';
import { useApplySellerMutation, useCancelSellerApplicationMutation, useGetDomainsQuery } from '../../store/api/marketplaceApi';
import { uploadLocalImages } from '../../services/uploadService';
import { PhotoPickerGrid } from '../../components/shared/PhotoPickerGrid';
import { KycSection, useKycState, isKycValid } from '../../components/shared/KycSection';
import { AddressAutocompleteInput, AddressValue } from '../../components/shared/AddressAutocompleteInput';
import { ChocolateButton } from '../../components/shared/ChocolateButton';
import { useAppTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/spacing';
import { colors } from '../../theme/colors';
import { localizedName } from '../../types/marketplace';
import { EmailVerificationCard } from '../../components/shared/EmailVerificationCard';
import { useEmailVerification } from '../../hooks/useEmailVerification';

const BUSINESS_TYPES = ['individual', 'artisan', 'small_business', 'company'] as const;

function useStyles() {
  const { tokens } = useAppTheme();
  return useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: tokens.background },
    content: { padding: spacing.lg, paddingBottom: spacing.xxl },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: tokens.text.primary, marginTop: spacing.lg, marginBottom: spacing.sm },
    label: { color: tokens.text.primary, marginBottom: spacing.xs, marginTop: spacing.md, fontWeight: '600' },
    hint: { color: tokens.text.secondary, fontSize: 12, lineHeight: 17, marginBottom: spacing.xs },
    error: { color: colors.error, fontSize: 12, marginTop: 4 },
    input: { backgroundColor: tokens.backgroundAlt, marginBottom: spacing.sm },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, borderWidth: 1, borderColor: tokens.border, backgroundColor: tokens.card },
    chipActive: { backgroundColor: tokens.primary, borderColor: tokens.primary },
    chipText: { color: tokens.text.primary, fontSize: 13 },
    switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm },
    switchLabel: { flex: 1, color: tokens.text.primary, fontSize: 14 },
    row: { flexDirection: 'row', gap: spacing.sm },
    statusCard: { borderRadius: 12, padding: spacing.xl, alignItems: 'center', marginBottom: spacing.lg, borderWidth: 1 },
    statusTitle: { fontSize: 18, fontWeight: '700', marginVertical: spacing.sm, textAlign: 'center' },
    statusDesc: { color: tokens.text.secondary, textAlign: 'center', lineHeight: 20 },
    reasonCard: { backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fed7aa', borderRadius: 10, padding: spacing.lg, marginBottom: spacing.lg },
    reasonLabel: { fontSize: 12, fontWeight: '700', color: '#9a3412', marginBottom: 6, textTransform: 'uppercase' },
    reasonText: { fontSize: 14, color: '#7c2d12', lineHeight: 20 },
    footerNote: { textAlign: 'center', color: tokens.text.secondary, marginTop: spacing.md, fontStyle: 'italic', lineHeight: 18 },
  }), [tokens]);
}

// ─── Suivi de candidature ────────────────────────────────────────────────────
const ApplicationTracking = ({ onReapply }: { onReapply: () => void }) => {
  const { t } = useTranslation();
  const styles = useStyles();
  const dispatch = useDispatch();
  const seller = useSelector((s: RootState) => s.auth.user?.marketplaceSeller);
  const [cancelApplication, { isLoading }] = useCancelSellerApplicationMutation();
  const isPending = seller?.status === 'pending';

  const handleCancel = () => {
    Alert.alert(t('seller.cancel_application_title'), t('seller.cancel_application_msg'), [
      { text: t('common.back'), style: 'cancel' },
      {
        text: t('seller.cancel_application_confirm'),
        style: 'destructive',
        onPress: async () => {
          try {
            await cancelApplication().unwrap();
            dispatch(updateUser({ marketplaceSeller: null }));
          } catch {
            Alert.alert(t('common.error'), t('common.error'));
          }
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={[styles.statusCard, isPending ? { backgroundColor: '#fefce8', borderColor: '#fde68a' } : { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}>
        <Text style={{ fontSize: 40 }}>{isPending ? '⏳' : '❌'}</Text>
        <Text style={[styles.statusTitle, { color: isPending ? '#92400e' : '#991b1b' }]}>
          {isPending ? t('seller.status_pending') : t('seller.status_rejected')}
        </Text>
        <Text style={styles.statusDesc}>{isPending ? t('seller.status_pending_desc') : t('seller.status_rejected_desc')}</Text>
      </View>
      {!isPending && !!seller?.rejectionReason && (
        <View style={styles.reasonCard}>
          <Text style={styles.reasonLabel}>{t('seller.rejection_reason')}</Text>
          <Text style={styles.reasonText}>{seller.rejectionReason}</Text>
        </View>
      )}
      {isPending ? (
        <ChocolateButton variant="outline" onPress={handleCancel} loading={isLoading}>{t('seller.cancel_application')}</ChocolateButton>
      ) : (
        <ChocolateButton onPress={onReapply}>{t('seller.reapply')}</ChocolateButton>
      )}
    </ScrollView>
  );
};

// ─── Formulaire ──────────────────────────────────────────────────────────────
const ApplicationForm = () => {
  const { t, i18n } = useTranslation();
  const { tokens } = useAppTheme();
  const styles = useStyles();
  const dispatch = useDispatch();
  const token = useSelector((s: RootState) => s.auth.token);
  const countryCode = useSelector((s: RootState) => s.location.selectedCountryCode ?? s.location.detectedCountryCode ?? undefined);
  const { data: domains = [], isLoading: loadingDomains } = useGetDomainsQuery();
  const [applySeller, { isLoading }] = useApplySellerMutation();
  const kyc = useKycState();
  const emailCheck = useEmailVerification();

  const [domainIds, setDomainIds] = useState<string[]>([]);
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState<(typeof BUSINESS_TYPES)[number]>('individual');
  const [description, setDescription] = useState('');
  const [logo, setLogo] = useState<string[]>([]);
  const [banner, setBanner] = useState<string[]>([]);
  const [address, setAddress] = useState<AddressValue>({ address: '', lat: null, lng: null });
  const [pickupInstructions, setPickupInstructions] = useState('');
  const [offersPickup, setOffersPickup] = useState(true);
  const [offersDelivery, setOffersDelivery] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState('');
  const [deliveryRadius, setDeliveryRadius] = useState('5');
  const [prepTime, setPrepTime] = useState('20');
  const [healthCert, setHealthCert] = useState<string[]>([]);
  const [licenseNumber, setLicenseNumber] = useState('');
  const [uploading, setUploading] = useState(false);

  const needsHealthCert = domains.some((d) => domainIds.includes(d.id) && d.requiresHealthCertificate);
  const fee = parseFloat(deliveryFee.replace(',', '.'));
  const canSubmit =
    domainIds.length > 0 &&
    businessName.trim().length >= 2 &&
    description.trim().length >= 10 &&
    address.lat != null &&
    (!offersDelivery || (!isNaN(fee) && fee >= 0)) &&
    (!needsHealthCert || healthCert.length === 1) &&
    isKycValid(kyc.state) &&
    !emailCheck.blocksApplication &&
    !uploading && !isLoading;

  const toggleDomain = (id: string) =>
    setDomainIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  const handleSubmit = async () => {
    if (!token || !canSubmit) return;
    const { idDocumentType, idFrontPhotos, idBackPhotos, selfiePhotos } = kyc.state;
    try {
      setUploading(true);
      const [logoUrl] = await uploadLocalImages(logo, token);
      const [bannerUrl] = await uploadLocalImages(banner, token);
      const [healthUrl] = await uploadLocalImages(healthCert, token);
      const [idFront] = await uploadLocalImages(idFrontPhotos, token);
      const [idBack] = idDocumentType === 'passport' ? [undefined] : await uploadLocalImages(idBackPhotos, token);
      const [selfie] = await uploadLocalImages(selfiePhotos, token);
      setUploading(false);

      const result = await applySeller({
        businessName: businessName.trim(),
        businessType,
        description: description.trim(),
        ...(logoUrl ? { logo: logoUrl } : {}),
        ...(bannerUrl ? { bannerUrl } : {}),
        domainIds,
        address: address.address,
        addressLat: address.lat!,
        addressLng: address.lng!,
        offersPickup,
        offersDelivery,
        ...(offersDelivery ? { sellerDeliveryFee: fee, deliveryRadius: parseFloat(deliveryRadius) || undefined } : {}),
        ...(pickupInstructions.trim() ? { pickupInstructions: pickupInstructions.trim() } : {}),
        preparationTimeMin: parseInt(prepTime, 10) || 20,
        ...(healthUrl ? { healthCertificate: healthUrl } : {}),
        ...(licenseNumber.trim() ? { licenseNumber: licenseNumber.trim() } : {}),
        idDocumentType,
        idDocumentFront: idFront,
        ...(idBack ? { idDocumentBack: idBack } : {}),
        selfiePhoto: selfie,
        ...(countryCode ? { countryCode: countryCode.toUpperCase() } : {}),
      }).unwrap();

      dispatch(updateUser({ marketplaceSeller: result }));
      Alert.alert(t('seller.submitted_title'), t('seller.submitted_msg'));
    } catch (err: any) {
      setUploading(false);
      const msg = err?.data?.message;
      Alert.alert(t('common.error'), Array.isArray(msg) ? msg.join('\n') : msg || t('seller.submit_error'));
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* E-mail : obligatoire pour candidater selon le pays, recommandé ailleurs */}
        <EmailVerificationCard required={emailCheck.requiredForApplication} />
        <Text style={styles.hint}>{t('seller.apply_intro')}</Text>

        <Text style={styles.sectionTitle}>{t('seller.domains_title')} *</Text>
        <Text style={styles.hint}>{t('seller.domains_hint')}</Text>
        {loadingDomains ? <ActivityIndicator color={tokens.primary} /> : (
          <View style={styles.chips}>
            {domains.map((d) => {
              const active = domainIds.includes(d.id);
              return (
                <TouchableOpacity key={d.id} style={[styles.chip, active && styles.chipActive]} onPress={() => toggleDomain(d.id)}>
                  {!!d.icon && <Icon name={d.icon} size={16} color={active ? '#FFFFFF' : tokens.primary} />}
                  <Text style={[styles.chipText, active && { color: '#FFFFFF' }]}>{localizedName(d, i18n.language)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <Text style={styles.sectionTitle}>{t('seller.shop_title')}</Text>
        <TextInput mode="outlined" label={`${t('seller.business_name')} *`} value={businessName} onChangeText={setBusinessName}
          outlineColor={tokens.border} activeOutlineColor={tokens.primary} style={styles.input} />
        <Text style={styles.label}>{t('seller.business_type')}</Text>
        <View style={styles.chips}>
          {BUSINESS_TYPES.map((type) => (
            <TouchableOpacity key={type} style={[styles.chip, businessType === type && styles.chipActive]} onPress={() => setBusinessType(type)}>
              <Text style={[styles.chipText, businessType === type && { color: '#FFFFFF' }]}>{t(`seller.business_type_${type}`)}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput mode="outlined" label={`${t('seller.description')} *`} value={description} onChangeText={setDescription} multiline numberOfLines={4}
          outlineColor={tokens.border} activeOutlineColor={tokens.primary} style={[styles.input, { marginTop: spacing.md }]} />
        <Text style={styles.label}>{t('seller.logo')}</Text>
        <PhotoPickerGrid photos={logo} onPhotosChange={setLogo} maxPhotos={1} />
        <Text style={styles.label}>{t('seller.banner')}</Text>
        <PhotoPickerGrid photos={banner} onPhotosChange={setBanner} maxPhotos={1} />

        <Text style={styles.sectionTitle}>{t('seller.address_title')} *</Text>
        <Text style={styles.hint}>{t('seller.address_hint')}</Text>
        <AddressAutocompleteInput label={t('seller.shop_address')} value={address} onChange={setAddress} />
        <TextInput mode="outlined" label={t('seller.pickup_instructions')} value={pickupInstructions} onChangeText={setPickupInstructions}
          outlineColor={tokens.border} activeOutlineColor={tokens.primary} style={[styles.input, { marginTop: spacing.sm }]} />

        <Text style={styles.sectionTitle}>{t('seller.fulfillment_title')}</Text>
        <Text style={styles.hint}>{t('seller.fulfillment_hint')}</Text>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>{t('seller.offers_pickup')}</Text>
          <Switch value={offersPickup} onValueChange={setOffersPickup} color={tokens.primary} />
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>{t('seller.offers_own_delivery')}</Text>
          <Switch value={offersDelivery} onValueChange={setOffersDelivery} color={tokens.primary} />
        </View>
        {offersDelivery && (
          <View style={styles.row}>
            <TextInput mode="outlined" label={`${t('seller.own_delivery_fee')} *`} value={deliveryFee} onChangeText={setDeliveryFee} keyboardType="decimal-pad"
              outlineColor={tokens.border} activeOutlineColor={tokens.primary} style={[styles.input, { flex: 1 }]} />
            <TextInput mode="outlined" label={t('seller.delivery_radius')} value={deliveryRadius} onChangeText={setDeliveryRadius} keyboardType="decimal-pad"
              right={<TextInput.Affix text="km" />} outlineColor={tokens.border} activeOutlineColor={tokens.primary} style={[styles.input, { flex: 1 }]} />
          </View>
        )}
        <TextInput mode="outlined" label={t('seller.preparation_time')} value={prepTime} onChangeText={setPrepTime} keyboardType="number-pad"
          right={<TextInput.Affix text="min" />} outlineColor={tokens.border} activeOutlineColor={tokens.primary} style={styles.input} />

        <Text style={styles.sectionTitle}>{t('seller.documents_title')}</Text>
        {needsHealthCert && (
          <>
            <Text style={styles.label}>{t('seller.health_certificate')} *</Text>
            <Text style={styles.hint}>{t('seller.health_certificate_hint')}</Text>
            <PhotoPickerGrid photos={healthCert} onPhotosChange={setHealthCert} maxPhotos={1} mandatory />
          </>
        )}
        <TextInput mode="outlined" label={t('seller.license_number')} value={licenseNumber} onChangeText={setLicenseNumber}
          outlineColor={tokens.border} activeOutlineColor={tokens.primary} style={[styles.input, { marginTop: spacing.sm }]} />

        <KycSection {...kyc.props} showErrors />

        <ChocolateButton onPress={handleSubmit} disabled={!canSubmit} loading={uploading || isLoading} style={{ marginTop: spacing.xl }}>
          {uploading ? t('transport.uploading_photos') : t('seller.submit')}
        </ChocolateButton>
        <Text style={styles.footerNote}>{t('seller.review_note')}</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// ─── Écran racine ────────────────────────────────────────────────────────────
export const SellerApplicationScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const styles = useStyles();
  const dispatch = useDispatch();
  const status = useSelector((s: RootState) => s.auth.user?.marketplaceSeller?.status);
  const [reapplying, setReapplying] = useState(false);

  if (status === 'active') {
    return (
      <View style={[styles.container, styles.content, { justifyContent: 'center' }]}>
        <View style={[styles.statusCard, { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' }]}>
          <Text style={{ fontSize: 40 }}>🎉</Text>
          <Text style={[styles.statusTitle, { color: '#065f46' }]}>{t('seller.status_active')}</Text>
          <Text style={styles.statusDesc}>{t('seller.status_active_desc')}</Text>
        </View>
        <ChocolateButton onPress={() => dispatch(setActiveRole({ role: 'seller' }))}>{t('seller.switch_to_seller')}</ChocolateButton>
      </View>
    );
  }
  if ((status === 'pending' || status === 'rejected') && !reapplying) {
    return <ApplicationTracking onReapply={() => setReapplying(true)} />;
  }
  return <ApplicationForm />;
};
