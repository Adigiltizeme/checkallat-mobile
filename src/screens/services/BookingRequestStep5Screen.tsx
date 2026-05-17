import React, { useState, useLayoutEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  TouchableOpacity,
} from 'react-native';
import { Text, Button, Card, Divider, ActivityIndicator } from 'react-native-paper';
import { StackScreenProps } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { HomeStackParamList } from '../../navigation/types';
import { CreateBookingPayload, PaymentMethod } from '../../types/booking';
import { useCreateBookingMutation } from '../../store/api/bookingsApi';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { getLocalizedName } from '../../utils/localize';

type Props = StackScreenProps<HomeStackParamList, 'BookingRequestStep5'>;

export const BookingRequestStep5Screen = ({ route, navigation }: Props) => {
  const { t, i18n } = useTranslation();
  const { categorySlug, step1Data, step2Data, step3Data, step4Data } = route.params;

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [createBooking, { isLoading }] = useCreateBookingMutation();

  useLayoutEffect(() => {
    navigation.setOptions({ title: t('booking_request.step_of', { current: 5, total: 5 }) });
  }, []);

  const categoryName = getLocalizedName(
    {
      nameFr: step1Data.categoryNameFr ?? categorySlug,
      nameEn: step1Data.categoryNameEn ?? categorySlug,
      nameAr: step1Data.categoryNameAr ?? categorySlug,
    },
    i18n.language,
  );

  const scheduleLabel = () => {
    if (step3Data.bookingType === 'immediate') return t('booking_request.immediate');
    const date = step3Data.scheduledAt
      ? new Date(step3Data.scheduledAt).toLocaleDateString(i18n.language, {
          day: 'numeric', month: 'long', year: 'numeric',
        })
      : '—';
    const slot = step3Data.timeSlot
      ? t(`booking_request.time_slot_${step3Data.timeSlot}_short`)
      : '';
    const recur =
      step3Data.isRecurring && step3Data.recurringFrequency
        ? ` · ${t(`booking_request.freq_${step3Data.recurringFrequency}`)}`
        : '';
    return `${date}${slot ? ` · ${slot}` : ''}${recur}`;
  };

  const handleSubmit = async () => {
    try {
      const payload: CreateBookingPayload = {
        categorySlug: step1Data.categorySlug,
        assignmentType: step4Data.assignmentType,
        proId: step4Data.proId,
        serviceOfferingId: step4Data.serviceOfferingId,
        bookingType: step3Data.bookingType,
        scheduledAt: step3Data.scheduledAt,
        timeSlot: step3Data.timeSlot,
        isRecurring: step3Data.isRecurring,
        recurringFrequency: step3Data.recurringFrequency,
        recurringEndDate: step3Data.recurringEndDate,
        address: step2Data.address.address,
        addressLat: step2Data.address.lat,
        addressLng: step2Data.address.lng,
        clientDescription: step1Data.clientDescription,
        clientPhotos: step1Data.clientPhotos,
        categoryData: step1Data.categoryData,
        estimatedPrice: step4Data.estimatedPrice,
        paymentMethod,
      };

      const result = await createBooking(payload).unwrap();

      Alert.alert(
        t('booking_request.success_title'),
        step4Data.assignmentType === 'auto'
          ? t('booking_request.success_msg_auto')
          : t('booking_request.success_msg_manual'),
        [
          {
            text: t('common.ok'),
            onPress: () => {
              if (step4Data.assignmentType === 'manual' && result?.id) {
                navigation.reset({
                  index: 1,
                  routes: [
                    { name: 'HomeScreen' },
                    { name: 'BookingTracking', params: { bookingId: result.id, role: 'client' } },
                  ],
                });
              } else {
                navigation.reset({ index: 0, routes: [{ name: 'HomeScreen' }] });
              }
            },
          },
        ],
      );
    } catch {
      Alert.alert(t('common.error'), t('booking_request.error_submit'));
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text variant="headlineSmall" style={styles.title}>
        {t('booking_request.step5_title')}
      </Text>

      {/* Récapitulatif */}
      <Card style={styles.card}>
        <Card.Content>
          <SummaryRow label={t('booking_request.summary_category')} value={categoryName} />
          <Divider style={styles.divider} />
          <SummaryRow label={t('booking_request.summary_address')} value={step2Data.address.address} />
          <Divider style={styles.divider} />
          <SummaryRow label={t('booking_request.summary_schedule')} value={scheduleLabel()} />
          <Divider style={styles.divider} />
          <SummaryRow
            label={t('booking_request.summary_pro')}
            value={
              step4Data.assignmentType === 'auto'
                ? t('booking_request.summary_pro_auto')
                : step4Data.proName ?? '—'
            }
          />
          {step4Data.estimatedPrice != null && (
            <>
              <Divider style={styles.divider} />
              <SummaryRow
                label={t('booking_request.summary_price_est')}
                value={`≥ ${step4Data.estimatedPrice}`}
                highlight
              />
            </>
          )}
        </Card.Content>
      </Card>

      {/* Description */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.descLabel}>{t('booking_request.description_label')}</Text>
          <Text style={styles.descText}>{step1Data.clientDescription}</Text>
        </Card.Content>
      </Card>

      {/* Photos client */}
      {step1Data.clientPhotos.length > 0 && (
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.descLabel}>{t('booking_request.photos_section')}</Text>
            <View style={styles.photosRow}>
              {step1Data.clientPhotos.map((uri, i) => (
                <Image key={i} source={{ uri }} style={styles.photoThumb} />
              ))}
            </View>
          </Card.Content>
        </Card>
      )}

      {/* Paiement */}
      <Text style={styles.sectionLabel}>{t('booking_request.payment_label')}</Text>
      <View style={styles.paymentCards}>
        <TouchableOpacity
          style={[styles.paymentCard, paymentMethod === 'cash' && styles.paymentCardActive]}
          onPress={() => setPaymentMethod('cash')}
          activeOpacity={0.8}
        >
          <Text style={styles.paymentIcon}>💵</Text>
          <View style={styles.paymentInfo}>
            <Text style={[styles.paymentTitle, paymentMethod === 'cash' && styles.paymentTitleActive]}>
              {t('booking_request.payment_cash')}
            </Text>
            <Text style={styles.paymentDesc}>{t('booking_request.payment_cash_desc')}</Text>
          </View>
          {paymentMethod === 'cash' && (
            <View style={styles.paymentCheck}><Text style={styles.paymentCheckIcon}>✓</Text></View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.paymentCard, paymentMethod === 'in_app' && styles.paymentCardActive]}
          onPress={() => setPaymentMethod('in_app')}
          activeOpacity={0.8}
        >
          <Text style={styles.paymentIcon}>💳</Text>
          <View style={styles.paymentInfo}>
            <Text style={[styles.paymentTitle, paymentMethod === 'in_app' && styles.paymentTitleActive]}>
              {t('booking_request.payment_inapp')}
            </Text>
            <Text style={styles.paymentDesc}>{t('booking_request.payment_inapp_desc')}</Text>
          </View>
          {paymentMethod === 'in_app' && (
            <View style={styles.paymentCheck}><Text style={styles.paymentCheckIcon}>✓</Text></View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.buttons}>
        <Button mode="outlined" onPress={() => navigation.goBack()} style={styles.backBtn} disabled={isLoading}>
          {t('booking_request.back')}
        </Button>
        <Button
          mode="contained"
          onPress={handleSubmit}
          style={styles.submitBtn}
          labelStyle={styles.submitBtnLabel}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size={20} color={colors.white} />
          ) : (
            t('booking_request.submit')
          )}
        </Button>
      </View>
    </ScrollView>
  );
};

const SummaryRow = ({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) => (
  <View style={styles.summaryRow}>
    <Text style={styles.summaryLabel}>{label}</Text>
    <Text style={[styles.summaryValue, highlight && styles.summaryValueHighlight]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.light },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  title: { color: colors.dark, marginBottom: spacing.lg },
  card: { borderRadius: 12, marginBottom: spacing.md, elevation: 2 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: spacing.sm },
  summaryLabel: { fontSize: 13, color: colors.gray, flex: 1 },
  summaryValue: { fontSize: 14, fontWeight: '500', color: colors.dark, flex: 2, textAlign: 'right' },
  summaryValueHighlight: { color: colors.primary, fontWeight: '700' },
  divider: { backgroundColor: colors.lightGray },
  descLabel: { fontSize: 13, color: colors.gray, marginBottom: 4 },
  descText: { fontSize: 14, color: colors.dark, lineHeight: 20 },
  photosRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: spacing.xs },
  photoThumb: { width: 64, height: 64, borderRadius: 8, backgroundColor: colors.lightGray },
  sectionLabel: { fontSize: 14, fontWeight: '600', color: colors.dark, marginBottom: spacing.sm },
  paymentCards: { gap: spacing.sm, marginBottom: spacing.lg },
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    padding: spacing.md,
    position: 'relative',
  },
  paymentCardActive: { borderColor: colors.primary, backgroundColor: '#E8F5F3' },
  paymentIcon: { fontSize: 24, marginRight: spacing.md },
  paymentInfo: { flex: 1 },
  paymentTitle: { fontSize: 15, fontWeight: '600', color: colors.dark },
  paymentTitleActive: { color: colors.primary },
  paymentDesc: { fontSize: 12, color: colors.gray, marginTop: 2 },
  paymentCheck: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  paymentCheckIcon: { color: colors.white, fontSize: 13, fontWeight: '700' },
  buttons: { flexDirection: 'row', gap: spacing.sm },
  backBtn: { flex: 1, borderColor: colors.primary },
  submitBtn: { flex: 2, backgroundColor: colors.primary, borderRadius: 8 },
  submitBtnLabel: { fontSize: 16, paddingVertical: 4 },
});
