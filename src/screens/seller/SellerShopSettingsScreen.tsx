import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Alert } from 'react-native';
import { Text, TextInput, Switch, ActivityIndicator } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { useGetMySellerShopQuery, useUpdateMySellerShopMutation } from '../../store/api/marketplaceApi';
import { uploadLocalImages } from '../../services/uploadService';
import { PhotoPickerGrid } from '../../components/shared/PhotoPickerGrid';
import { AddressAutocompleteInput, AddressValue } from '../../components/shared/AddressAutocompleteInput';
import { ChocolateButton } from '../../components/shared/ChocolateButton';
import { useAppTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/spacing';
import { colors } from '../../theme/colors';
import { localizedName, type OpeningHours } from '../../types/marketplace';

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

type DayState = { open: boolean; from: string; to: string };

export const SellerShopSettingsScreen = ({ navigation }: any) => {
  const { tokens } = useAppTheme();
  const { t, i18n } = useTranslation();
  const token = useSelector((s: RootState) => s.auth.token);
  const { data: shop, isLoading } = useGetMySellerShopQuery(undefined, { refetchOnMountOrArgChange: true });
  const [updateShop, { isLoading: saving }] = useUpdateMySellerShopMutation();

  const [businessName, setBusinessName] = useState('');
  const [description, setDescription] = useState('');
  const [logo, setLogo] = useState<string[]>([]);
  const [banner, setBanner] = useState<string[]>([]);
  const [address, setAddress] = useState<AddressValue>({ address: '', lat: null, lng: null });
  const [pickupInstructions, setPickupInstructions] = useState('');
  const [offersPickup, setOffersPickup] = useState(true);
  const [offersDelivery, setOffersDelivery] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState('');
  const [deliveryRadius, setDeliveryRadius] = useState('');
  const [prepTime, setPrepTime] = useState('20');
  const [useHours, setUseHours] = useState(false);
  const [days, setDays] = useState<Record<string, DayState>>(
    Object.fromEntries(DAYS.map((d) => [d, { open: true, from: '09:00', to: '18:00' }])),
  );
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!shop) return;
    setBusinessName(shop.businessName);
    setDescription(shop.description);
    setLogo(shop.logo ? [shop.logo] : []);
    setBanner(shop.bannerUrl ? [shop.bannerUrl] : []);
    setAddress({ address: shop.address, lat: shop.addressLat, lng: shop.addressLng });
    setPickupInstructions(shop.pickupInstructions ?? '');
    setOffersPickup(shop.offersPickup);
    setOffersDelivery(shop.offersDelivery);
    setDeliveryFee(shop.sellerDeliveryFee != null ? String(shop.sellerDeliveryFee) : '');
    setDeliveryRadius(shop.deliveryRadius != null ? String(shop.deliveryRadius) : '');
    setPrepTime(String(shop.preparationTimeMin));
    if (shop.openingHours && Object.keys(shop.openingHours).length > 0) {
      setUseHours(true);
      setDays(Object.fromEntries(DAYS.map((d) => {
        const slot = shop.openingHours?.[d]?.[0];
        return [d, slot ? { open: true, from: slot.open, to: slot.close } : { open: false, from: '09:00', to: '18:00' }];
      })));
    }
  }, [shop]);

  const hoursValid = !useHours || DAYS.every((d) => !days[d].open || (TIME_RE.test(days[d].from) && TIME_RE.test(days[d].to) && days[d].from < days[d].to));
  const fee = parseFloat(deliveryFee.replace(',', '.'));
  const canSave = businessName.trim().length >= 2 && address.lat != null && hoursValid && (!offersDelivery || (!isNaN(fee) && fee >= 0)) && !uploading && !saving;

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: tokens.background },
    content: { padding: spacing.lg, paddingBottom: spacing.xxl },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: tokens.text.primary, marginTop: spacing.lg, marginBottom: spacing.sm },
    hint: { fontSize: 12, color: tokens.text.secondary, marginBottom: spacing.xs, lineHeight: 17 },
    input: { backgroundColor: tokens.backgroundAlt, marginBottom: spacing.sm },
    row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
    switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
    switchLabel: { flex: 1, color: tokens.text.primary },
    dayRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 4 },
    dayLabel: { width: 72, color: tokens.text.primary, fontWeight: '600' },
    timeInput: { flex: 1, backgroundColor: tokens.backgroundAlt, height: 40 },
    domains: { color: tokens.text.primary },
    error: { color: colors.error, fontSize: 12 },
  }), [tokens]);

  if (isLoading || !shop) {
    return <View style={[styles.container, { justifyContent: 'center' }]}><ActivityIndicator color={tokens.primary} /></View>;
  }

  const setDay = (day: string, patch: Partial<DayState>) => setDays((prev) => ({ ...prev, [day]: { ...prev[day], ...patch } }));

  const handleSave = async () => {
    if (!token || !canSave) return;
    try {
      setUploading(true);
      const [logoUrl] = await uploadLocalImages(logo, token);
      const [bannerUrl] = await uploadLocalImages(banner, token);
      setUploading(false);
      const openingHours: OpeningHours | undefined = useHours
        ? Object.fromEntries(DAYS.map((d) => [d, days[d].open ? [{ open: days[d].from, close: days[d].to }] : []]))
        : {};
      await updateShop({
        businessName: businessName.trim(),
        description: description.trim(),
        ...(logoUrl ? { logo: logoUrl } : {}),
        ...(bannerUrl ? { bannerUrl } : {}),
        address: address.address,
        addressLat: address.lat!,
        addressLng: address.lng!,
        pickupInstructions: pickupInstructions.trim(),
        offersPickup,
        offersDelivery,
        ...(offersDelivery ? { sellerDeliveryFee: fee, ...(deliveryRadius ? { deliveryRadius: parseFloat(deliveryRadius) } : {}) } : {}),
        preparationTimeMin: parseInt(prepTime, 10) || 0,
        openingHours,
      }).unwrap();
      Alert.alert(t('common.success'), t('seller.shop_saved'));
      navigation.goBack();
    } catch (err: any) {
      setUploading(false);
      const msg = err?.data?.message;
      Alert.alert(t('common.error'), Array.isArray(msg) ? msg.join('\n') : msg || t('common.error'));
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionTitle}>{t('seller.shop_title')}</Text>
        <TextInput mode="outlined" label={`${t('seller.business_name')} *`} value={businessName} onChangeText={setBusinessName}
          outlineColor={tokens.border} activeOutlineColor={tokens.primary} style={styles.input} />
        <TextInput mode="outlined" label={t('seller.description')} value={description} onChangeText={setDescription} multiline numberOfLines={4}
          outlineColor={tokens.border} activeOutlineColor={tokens.primary} style={styles.input} />
        <Text style={styles.hint}>{t('seller.logo')}</Text>
        <PhotoPickerGrid photos={logo} onPhotosChange={setLogo} maxPhotos={1} />
        <Text style={[styles.hint, { marginTop: spacing.sm }]}>{t('seller.banner')}</Text>
        <PhotoPickerGrid photos={banner} onPhotosChange={setBanner} maxPhotos={1} />

        <Text style={styles.sectionTitle}>{t('seller.domains_title')}</Text>
        <Text style={styles.domains}>{shop.domains.map((d) => localizedName(d, i18n.language)).join(' · ')}</Text>
        <Text style={styles.hint}>{t('seller.domains_admin_only')}</Text>

        <Text style={styles.sectionTitle}>{t('seller.address_title')}</Text>
        <AddressAutocompleteInput label={t('seller.shop_address')} value={address} onChange={setAddress} />
        <TextInput mode="outlined" label={t('seller.pickup_instructions')} value={pickupInstructions} onChangeText={setPickupInstructions}
          outlineColor={tokens.border} activeOutlineColor={tokens.primary} style={[styles.input, { marginTop: spacing.sm }]} />

        <Text style={styles.sectionTitle}>{t('seller.fulfillment_title')}</Text>
        <Text style={styles.hint}>{t('seller.fulfillment_hint')}</Text>
        <View style={styles.switchRow}><Text style={styles.switchLabel}>{t('seller.offers_pickup')}</Text><Switch value={offersPickup} onValueChange={setOffersPickup} color={tokens.primary} /></View>
        <View style={styles.switchRow}><Text style={styles.switchLabel}>{t('seller.offers_own_delivery')}</Text><Switch value={offersDelivery} onValueChange={setOffersDelivery} color={tokens.primary} /></View>
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

        <Text style={styles.sectionTitle}>{t('seller.opening_hours')}</Text>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>{t('seller.use_opening_hours')}</Text>
          <Switch value={useHours} onValueChange={setUseHours} color={tokens.primary} />
        </View>
        {!useHours && <Text style={styles.hint}>{t('seller.always_open_hint')}</Text>}
        {useHours && DAYS.map((d) => (
          <View key={d} style={styles.dayRow}>
            <Text style={styles.dayLabel}>{t(`seller.day_${d}`)}</Text>
            <Switch value={days[d].open} onValueChange={(open) => setDay(d, { open })} color={tokens.primary} />
            {days[d].open ? (
              <>
                <TextInput mode="outlined" dense value={days[d].from} onChangeText={(from) => setDay(d, { from })} placeholder="09:00" maxLength={5}
                  outlineColor={tokens.border} activeOutlineColor={tokens.primary} style={styles.timeInput} />
                <Text>–</Text>
                <TextInput mode="outlined" dense value={days[d].to} onChangeText={(to) => setDay(d, { to })} placeholder="18:00" maxLength={5}
                  outlineColor={tokens.border} activeOutlineColor={tokens.primary} style={styles.timeInput} />
              </>
            ) : (
              <Text style={{ flex: 1, color: tokens.text.secondary }}>{t('marketplace.closed_today')}</Text>
            )}
          </View>
        ))}
        {!hoursValid && <Text style={styles.error}>{t('seller.hours_invalid')}</Text>}

        <ChocolateButton onPress={handleSave} disabled={!canSave} loading={uploading || saving} style={{ marginTop: spacing.xl }}>
          {t('common.save')}
        </ChocolateButton>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
