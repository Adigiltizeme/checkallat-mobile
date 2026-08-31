import React, { useState, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { StackScreenProps } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { getLocalizedName } from '../../utils/localize';
import { HomeStackParamList } from '../../navigation/types';
import { useGetProByIdQuery } from '../../store/api/prosApi';
import { useGetProOfferingsQuery } from '../../store/api/servicesApi';
import { useCreateBookingMutation } from '../../store/api/bookingsApi';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { colors } from '../../theme/colors';
import { useAppTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/spacing';
import { CURRENCY_CONFIG } from '../../config/currency';
import { CountrySelectionModal } from '../../components/shared/CountrySelectionModal';
import { SUPPORTED_COUNTRIES } from '../../config/countries';

type Props = StackScreenProps<HomeStackParamList, 'CreateBooking'>;

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function isToday(date: Date): boolean {
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

export const CreateBookingScreen = ({ route, navigation }: Props) => {
  const { tokens } = useAppTheme();


  const styles = useMemo(() => StyleSheet.create({
  container: { flex: 1, backgroundColor: tokens.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },

  label: { fontSize: 14, fontWeight: '600', color: tokens.text.primary, marginBottom: spacing.sm },
  hint: { fontSize: 12, color: tokens.text.secondary, marginBottom: spacing.sm },
  errorHint: { fontSize: 12, color: colors.error, marginTop: 4 },
  emptyText: { fontSize: 13, color: tokens.text.secondary, fontStyle: 'italic' },

  // Pro summary
  proSummary: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: tokens.card, borderRadius: 14, padding: spacing.md,
    marginBottom: spacing.lg, borderWidth: 1, borderColor: tokens.border,
  },
  proAvatarSmall: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: tokens.primary + '20', alignItems: 'center', justifyContent: 'center',
  },
  proAvatarLetter: { fontSize: 18, fontWeight: '700', color: tokens.primary },
  proSummaryName: { fontSize: 14, fontWeight: '700', color: tokens.text.primary },
  proSummaryRating: { fontSize: 12, color: tokens.text.secondary, marginTop: 2 },

  // Offerings
  offeringOption: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: tokens.card, borderRadius: 12, padding: spacing.md,
    marginBottom: spacing.sm, borderWidth: 1.5, borderColor: tokens.border,
  },
  offeringOptionActive: { borderColor: tokens.primary, backgroundColor: tokens.primary + '08' },
  radioCircle: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2,
    borderColor: tokens.border, alignItems: 'center', justifyContent: 'center',
  },
  radioCircleActive: { borderColor: tokens.primary },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: tokens.primary },
  offeringName: { fontSize: 14, fontWeight: '600', color: tokens.text.primary },
  offeringNameActive: { color: tokens.primary },
  offeringPrice: { fontSize: 12, color: tokens.text.secondary, marginTop: 2 },

  // Inputs
  textArea: { backgroundColor: tokens.backgroundAlt, minHeight: 100 },
  input: { backgroundColor: tokens.backgroundAlt },

  // Date
  dateCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: tokens.card, borderRadius: 12,
    borderWidth: 1, borderColor: tokens.border, overflow: 'hidden',
  },
  dateArrow: { padding: spacing.md },
  dateCenter: { flex: 1, alignItems: 'center', paddingVertical: spacing.md },
  dateText: { fontSize: 14, fontWeight: '600', color: tokens.text.primary, textTransform: 'capitalize' },

  // Payment
  paymentRow: { flexDirection: 'row', gap: spacing.md },
  paymentOption: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: tokens.card, borderRadius: 12, padding: spacing.md,
    borderWidth: 1.5, borderColor: tokens.border, justifyContent: 'center',
  },
  paymentOptionActive: { borderColor: tokens.primary, backgroundColor: tokens.primary + '08' },
  paymentLabel: { fontSize: 13, color: tokens.text.secondary, fontWeight: '500' },
  paymentLabelActive: { color: tokens.primary, fontWeight: '700' },

  // Summary
  summaryCard: {
    backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0',
    borderRadius: 12, padding: spacing.md, marginTop: spacing.lg,
  },
  summaryTitle: { fontSize: 14, fontWeight: '700', color: '#166534', marginBottom: spacing.sm },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  summaryLabel: { fontSize: 13, color: tokens.text.secondary },
  summaryValue: { fontSize: 13, color: tokens.text.primary, fontWeight: '500' },

  // Submit
  submitBtn: {
    backgroundColor: tokens.primary, borderRadius: 14, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, marginTop: spacing.xl,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: colors.white, fontSize: 16, fontWeight: '700' },
  }), [tokens]);

  const { t, i18n } = useTranslation();
  const { proId, offeringId: preSelectedOffering } = route.params;
  const { userLat, userLng } = useSelector((state: RootState) => state.location);
  const user = useSelector((state: RootState) => state.auth.user);

  const { data: pro } = useGetProByIdQuery(proId);
  const { data: offerings = [] } = useGetProOfferingsQuery(proId, {
    refetchOnMountOrArgChange: true,
  });
  const [createBooking, { isLoading }] = useCreateBookingMutation();

  const availableOfferings = offerings.filter((o: any) => o.isAvailable !== false);

  const [selectedOfferingId, setSelectedOfferingId] = useState<string>(preSelectedOffering ?? '');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [scheduledDate, setScheduledDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    return d;
  });
  const [paymentMethod, setPaymentMethod] = useState<'in_app' | 'cash'>('cash');

  // Pays de la prestation : par défaut le pays du Pro, modifiable pour commande à distance
  const proCountryCode = (pro?.countryId ?? '').toLowerCase();
  const userActiveCode = (user?.activeCountryId ?? user?.homeCountryId ?? '').toLowerCase();
  const [serviceCountryCode, setServiceCountryCode] = useState<string>(proCountryCode || userActiveCode || '');
  const [countryModalVisible, setCountryModalVisible] = useState(false);
  const serviceCountry = useMemo(
    () => SUPPORTED_COUNTRIES.find(c => c.code === serviceCountryCode) ?? null,
    [serviceCountryCode],
  );
  // Commande à distance : l'utilisateur est dans un pays différent du service
  const isRemoteOrder = !!userActiveCode && !!serviceCountryCode && userActiveCode !== serviceCountryCode;

  const selectedOffering = availableOfferings.find((o: any) => o.id === selectedOfferingId);

  const canSubmit =
    selectedOfferingId.length > 0 &&
    description.trim().length >= 10 &&
    address.trim().length >= 5 &&
    !isLoading;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    try {
      const booking = await createBooking({
        proId,
        serviceOfferingId: selectedOfferingId,
        bookingType: 'scheduled',
        scheduledAt: scheduledDate.toISOString(),
        address: address.trim(),
        addressLat: userLat ?? 0,
        addressLng: userLng ?? 0,
        clientDescription: description.trim(),
        paymentMethod,
        ...(serviceCountryCode && { countryId: serviceCountryCode.toUpperCase() }),
      }).unwrap();

      navigation.replace('BookingDetails', { bookingId: booking.id });
    } catch {
      Alert.alert(t('common.error'), t('booking.error_create'));
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={'padding'}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Pro summary */}
        {pro && (
          <View style={styles.proSummary}>
            <View style={styles.proAvatarSmall}>
              <Text style={styles.proAvatarLetter}>
                {(pro.user?.firstName ?? pro.companyName ?? '?').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={styles.proSummaryName}>
                {pro.user ? `${pro.user.firstName} ${pro.user.lastName}` : pro.companyName}
              </Text>
              {pro.averageRating ? (
                <Text style={styles.proSummaryRating}>⭐ {pro.averageRating.toFixed(1)}</Text>
              ) : null}
            </View>
          </View>
        )}

        {/* ─── Pays de la prestation / commande à distance ─── */}
        <TouchableOpacity
          onPress={() => setCountryModalVisible(true)}
          style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            backgroundColor: isRemoteOrder ? tokens.primary + '12' : tokens.card,
            borderRadius: 10, padding: spacing.md, marginBottom: spacing.md,
            borderWidth: 1, borderColor: isRemoteOrder ? tokens.primary : tokens.border,
          }}
          activeOpacity={0.75}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Icon name={isRemoteOrder ? 'earth' : 'map-marker'} size={18} color={isRemoteOrder ? tokens.primary : tokens.text.secondary} />
            <View>
              <Text style={{ fontSize: 11, color: tokens.text.secondary }}>{t('booking.service_country')}</Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: isRemoteOrder ? tokens.primary : tokens.text.primary }}>
                {serviceCountry ? `${serviceCountry.flag} ${t(`country.${serviceCountry.nameKey}`)}` : t('country.select_country')}
              </Text>
            </View>
          </View>
          <Icon name="chevron-down" size={18} color={tokens.text.secondary} />
        </TouchableOpacity>
        {isRemoteOrder && (
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: tokens.primary + '10', borderRadius: 8, padding: spacing.sm, marginBottom: spacing.md, borderLeftWidth: 3, borderLeftColor: tokens.primary }}>
            <Icon name="information-outline" size={16} color={tokens.primary} style={{ marginTop: 1 }} />
            <Text style={{ flex: 1, fontSize: 12, color: tokens.text.primary, lineHeight: 18 }}>
              {t('booking.remote_order_notice')}
            </Text>
          </View>
        )}

        {/* Service selection */}
        <Text style={styles.label}>{t('booking.select_service')} *</Text>
        <Text style={styles.hint}>{t('booking.select_service_hint')}</Text>
        {availableOfferings.length === 0 ? (
          <Text style={styles.emptyText}>{t('pros.no_offerings')}</Text>
        ) : (
          availableOfferings.map((offering: any) => (
            <TouchableOpacity
              key={offering.id}
              style={[styles.offeringOption, selectedOfferingId === offering.id && styles.offeringOptionActive]}
              onPress={() => setSelectedOfferingId(offering.id)}
              activeOpacity={0.8}
            >
              <View style={[styles.radioCircle, selectedOfferingId === offering.id && styles.radioCircleActive]}>
                {selectedOfferingId === offering.id && <View style={styles.radioInner} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.offeringName, selectedOfferingId === offering.id && styles.offeringNameActive]}>
                  {getLocalizedName(offering.category, i18n.language)}
                </Text>
                {offering.priceMin ? (
                  <Text style={styles.offeringPrice}>
                    {offering.priceMax
                      ? `${offering.priceMin} – ${offering.priceMax} ${CURRENCY_CONFIG.code}`
                      : `${t('services.from_price', { price: offering.priceMin, currency: CURRENCY_CONFIG.code })}`}
                  </Text>
                ) : (
                  <Text style={styles.offeringPrice}>{t('pros.price_on_quote')}</Text>
                )}
              </View>
            </TouchableOpacity>
          ))
        )}

        {/* Description */}
        <Text style={[styles.label, { marginTop: spacing.lg }]}>{t('booking.describe_problem')} *</Text>
        <TextInput
          mode="outlined"
          value={description}
          onChangeText={setDescription}
          placeholder={t('booking.describe_placeholder')}
          multiline
          numberOfLines={4}
          outlineColor={tokens.border}
          activeOutlineColor={tokens.primary}
          style={styles.textArea}
        />
        {description.trim().length > 0 && description.trim().length < 10 && (
          <Text style={styles.errorHint}>{t('booking.description_required')}</Text>
        )}

        {/* Address */}
        <Text style={[styles.label, { marginTop: spacing.lg }]}>{t('booking.address_label')} *</Text>
        <TextInput
          mode="outlined"
          value={address}
          onChangeText={setAddress}
          placeholder={t('booking.address_placeholder')}
          outlineColor={tokens.border}
          activeOutlineColor={tokens.primary}
          style={styles.input}
          left={<TextInput.Icon icon="map-marker-outline" color={tokens.text.secondary} />}
        />

        {/* Date */}
        <Text style={[styles.label, { marginTop: spacing.lg }]}>{t('booking.scheduled_date')} *</Text>
        <View style={styles.dateCard}>
          <TouchableOpacity
            onPress={() => {
              const prev = addDays(scheduledDate, -1);
              if (!isToday(prev)) setScheduledDate(prev);
            }}
            disabled={isToday(addDays(scheduledDate, -1))}
            style={styles.dateArrow}
          >
            <Icon
              name="chevron-left"
              size={24}
              color={isToday(addDays(scheduledDate, -1)) ? tokens.border : tokens.text.primary}
            />
          </TouchableOpacity>
          <View style={styles.dateCenter}>
            <Text style={styles.dateText}>
              {scheduledDate.toLocaleDateString(i18n.language, {
                weekday: 'long', day: 'numeric', month: 'long',
              })}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setScheduledDate(addDays(scheduledDate, 1))} style={styles.dateArrow}>
            <Icon name="chevron-right" size={24} color={tokens.text.primary} />
          </TouchableOpacity>
        </View>

        {/* Payment */}
        <Text style={[styles.label, { marginTop: spacing.lg }]}>{t('booking.payment_method')} *</Text>
        <View style={styles.paymentRow}>
          {(['cash', 'in_app'] as const).map((method) => (
            <TouchableOpacity
              key={method}
              style={[styles.paymentOption, paymentMethod === method && styles.paymentOptionActive]}
              onPress={() => setPaymentMethod(method)}
              activeOpacity={0.8}
            >
              <Icon
                name={method === 'cash' ? 'cash' : 'shield-check'}
                size={22}
                color={paymentMethod === method ? tokens.primary : tokens.text.secondary}
              />
              <Text style={[styles.paymentLabel, paymentMethod === method && styles.paymentLabelActive]}>
                {t(method === 'cash' ? 'booking.payment_cash' : 'booking.payment_inapp')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Summary */}
        {selectedOffering && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>{t('booking.summary_title')}</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{t('booking.select_service')}</Text>
              <Text style={styles.summaryValue}>
                {getLocalizedName(selectedOffering.category, i18n.language)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{t('booking.scheduled_date')}</Text>
              <Text style={styles.summaryValue}>
                {scheduledDate.toLocaleDateString(i18n.language, { day: 'numeric', month: 'long' })}
              </Text>
            </View>
            {selectedOffering.priceMin && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{t('booking.price_estimate')}</Text>
                <Text style={[styles.summaryValue, { color: tokens.primary, fontWeight: '700' }]}>
                  {selectedOffering.priceMax
                    ? `${selectedOffering.priceMin} – ${selectedOffering.priceMax} ${CURRENCY_CONFIG.code}`
                    : `${t('services.from_price', { price: selectedOffering.priceMin, currency: CURRENCY_CONFIG.code })}`}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit}
          activeOpacity={0.85}
        >
          {isLoading ? (
            <Text style={styles.submitBtnText}>{t('common.loading')}</Text>
          ) : (
            <>
              <Icon name="calendar-check" size={20} color={colors.white} />
              <Text style={styles.submitBtnText}>{t('booking.confirm_booking')}</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      <CountrySelectionModal
        visible={countryModalVisible}
        selectedCode={serviceCountryCode}
        onSelect={setServiceCountryCode}
        onClose={() => setCountryModalVisible(false)}
        title={t('booking.service_country')}
      />
    </KeyboardAvoidingView>
  );
};
