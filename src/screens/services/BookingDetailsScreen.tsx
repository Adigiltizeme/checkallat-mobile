import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  Modal,
  Dimensions,
} from 'react-native';
import { Text, TextInput, IconButton } from 'react-native-paper';
import { StackScreenProps } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { getLocalizedName } from '../../utils/localize';
import { HomeStackParamList } from '../../navigation/types';
import {
  useGetBookingByIdQuery,
  useCancelBookingMutation,
  useConfirmBookingCompletionMutation,
} from '../../store/api/bookingsApi';
import { useRefetchOnFocus } from '../../hooks/useRefetchOnFocus';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

type Props = StackScreenProps<HomeStackParamList, 'BookingDetails'>;

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: string }> = {
  pending:     { color: '#92400E', bg: '#FEF3C7', icon: 'clock-outline' },
  accepted:    { color: '#1E40AF', bg: '#DBEAFE', icon: 'check-circle-outline' },
  en_route:    { color: '#3730A3', bg: '#E0E7FF', icon: 'navigation' },
  arrived:     { color: '#6B21A8', bg: '#F3E8FF', icon: 'map-marker-check' },
  in_progress: { color: '#065F46', bg: '#D1FAE5', icon: 'progress-wrench' },
  completed:   { color: '#166534', bg: '#DCFCE7', icon: 'check-all' },
  cancelled:   { color: '#7F1D1D', bg: '#FEE2E2', icon: 'close-circle-outline' },
  rejected:    { color: '#7F1D1D', bg: '#FEE2E2', icon: 'close-circle-outline' },
};

const ESCROW_MAP: Record<string, { icon: string; key: string; color: string }> = {
  pending:  { icon: '⏳', key: 'payment.escrow_pending',  color: colors.warning },
  captured: { icon: '💳', key: 'payment.escrow_captured', color: colors.primary },
  held:     { icon: '🔒', key: 'payment.escrow_held',     color: colors.primary },
  released: { icon: '✅', key: 'payment.escrow_released', color: colors.success },
  refunded: { icon: '↩️', key: 'payment.escrow_refunded', color: colors.error },
};

export const BookingDetailsScreen = ({ route, navigation }: Props) => {
  const { t, i18n } = useTranslation();
  const { bookingId } = route.params;

  const { data: booking, isLoading, refetch } = useGetBookingByIdQuery(bookingId, {
    pollingInterval: 5000,
    refetchOnMountOrArgChange: true,
  });
  useRefetchOnFocus(refetch);

  const [cancelBooking, { isLoading: isCancelling }] = useCancelBookingMutation();
  const [confirmCompletion, { isLoading: isConfirming }] = useConfirmBookingCompletionMutation();

  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showCashModal, setShowCashModal] = useState(false);
  const [cashAmountInput, setCashAmountInput] = useState('');
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [photoModalVisible, setPhotoModalVisible] = useState(false);

  const openPhotoViewer = (index: number) => {
    setSelectedPhotoIndex(index);
    setPhotoModalVisible(true);
  };

  const closePhotoViewer = () => {
    setPhotoModalVisible(false);
    setSelectedPhotoIndex(null);
  };

  const goToNextPhoto = () => {
    const photos: string[] = (booking as any)?.clientPhotos ?? [];
    if (selectedPhotoIndex !== null && selectedPhotoIndex < photos.length - 1) {
      setSelectedPhotoIndex(selectedPhotoIndex + 1);
    }
  };

  const goToPreviousPhoto = () => {
    if (selectedPhotoIndex !== null && selectedPhotoIndex > 0) {
      setSelectedPhotoIndex(selectedPhotoIndex - 1);
    }
  };

  if (isLoading || !booking) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  const status = booking.status ?? 'pending';
  const statusCfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  const isPending    = status === 'pending';
  const isInProgress = status === 'in_progress';
  const isCash       = (booking as any).paymentMethod === 'cash';
  const proConfirmed = !!(booking as any).proConfirmedCompletion;
  const clientConfirmed = !!(booking as any).clientConfirmedCompletion;

  const pro = booking.pro;
  const proName = pro?.user
    ? `${pro.user.firstName} ${pro.user.lastName}`
    : pro?.companyName ?? '—';
  const proLetter = proName.charAt(0).toUpperCase();

  const serviceName = booking.category
    ? getLocalizedName(booking.category, i18n.language)
    : (booking as any).category?.slug ?? '—';

  const scheduledAt = booking.scheduledAt ? new Date(booking.scheduledAt) : null;
  const clientPhotos: string[] = (booking as any).clientPhotos ?? [];
  const payment = (booking as any).payment;

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      Alert.alert(t('common.error'), t('booking.cancel_reason_required'));
      return;
    }
    try {
      await cancelBooking({ id: bookingId, role: 'client', reason: cancelReason.trim() }).unwrap();
      setShowCancelForm(false);
      setCancelReason('');
    } catch {
      Alert.alert(t('common.error'), t('booking.error_cancel'));
    }
  };

  const handleConfirmCompletion = () => {
    if (isCash) {
      setCashAmountInput('');
      setShowCashModal(true);
    } else {
      Alert.alert(
        t('booking.confirm_completion_title'),
        t('booking.confirm_completion_msg'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.confirm'),
            onPress: async () => {
              try {
                await confirmCompletion({ id: bookingId, role: 'client' }).unwrap();
              } catch {
                Alert.alert(t('common.error'), t('booking.error_confirm'));
              }
            },
          },
        ],
      );
    }
  };

  const submitCashConfirmation = async () => {
    const cashAmount = parseFloat(cashAmountInput);
    setShowCashModal(false);
    try {
      await confirmCompletion({
        id: bookingId,
        role: 'client',
        ...(isNaN(cashAmount) ? {} : { cashAmount }),
      }).unwrap();
    } catch {
      Alert.alert(t('common.error'), t('booking.error_confirm'));
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Status banner */}
      <View style={[styles.statusBanner, { backgroundColor: statusCfg.bg }]}>
        <Icon name={statusCfg.icon} size={22} color={statusCfg.color} />
        <Text style={[styles.statusText, { color: statusCfg.color }]}>
          {t(`booking_status.${status}`, { defaultValue: status })}
        </Text>
      </View>

      {/* Pro info */}
      {pro && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('pros.title')}</Text>
          <View style={styles.proRow}>
            <View style={styles.proAvatar}>
              <Text style={styles.proAvatarLetter}>{proLetter}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.proName}>{proName}</Text>
              {pro.averageRating ? (
                <Text style={styles.proRating}>⭐ {pro.averageRating.toFixed(1)}</Text>
              ) : null}
            </View>
          </View>
        </View>
      )}

      {/* Service details */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('booking.select_service')}</Text>
        <View style={styles.detailRow}>
          <Icon name="briefcase-outline" size={18} color={colors.gray} />
          <Text style={styles.detailText}>{serviceName}</Text>
        </View>
        {((booking as any).serviceOffering?.priceMin || (booking as any).serviceOffering?.priceMax) && (
          <View style={styles.detailRow}>
            <Icon name="tag-outline" size={18} color={colors.gray} />
            <Text style={styles.detailText}>
              {(booking as any).serviceOffering.priceMax
                ? `${(booking as any).serviceOffering.priceMin} – ${(booking as any).serviceOffering.priceMax} EGP`
                : `${t('services.from_price', { price: (booking as any).serviceOffering.priceMin, currency: 'EGP' })}`}
            </Text>
          </View>
        )}
      </View>

      {/* Booking details */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('common.details')}</Text>
        {scheduledAt && (
          <View style={styles.detailRow}>
            <Icon name="calendar-outline" size={18} color={colors.gray} />
            <Text style={styles.detailText}>
              {scheduledAt.toLocaleDateString(i18n.language, {
                weekday: 'long', day: 'numeric', month: 'long',
              })}
            </Text>
          </View>
        )}
        {(booking as any).address ? (
          <View style={styles.detailRow}>
            <Icon name="map-marker-outline" size={18} color={colors.gray} />
            <Text style={styles.detailText}>{(booking as any).address}</Text>
          </View>
        ) : null}
        {(booking as any).paymentMethod && (
          <View style={styles.detailRow}>
            <Icon
              name={(booking as any).paymentMethod === 'cash' ? 'cash' : 'shield-check'}
              size={18}
              color={colors.gray}
            />
            <Text style={styles.detailText}>
              {t((booking as any).paymentMethod === 'cash' ? 'booking.payment_cash' : 'booking.payment_inapp')}
            </Text>
          </View>
        )}
        {(booking as any).clientDescription ? (
          <View style={[styles.detailRow, { alignItems: 'flex-start' }]}>
            <Icon name="text-box-outline" size={18} color={colors.gray} style={{ marginTop: 2 }} />
            <Text style={[styles.detailText, { flex: 1 }]}>{(booking as any).clientDescription}</Text>
          </View>
        ) : null}
      </View>

      {/* Client photos */}
      {clientPhotos.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('booking.photos_label')}</Text>
          <View style={styles.photosGrid}>
            {clientPhotos.map((photo, index) => (
              <TouchableOpacity
                key={index}
                style={styles.photoThumbnail}
                onPress={() => openPhotoViewer(index)}
              >
                <Image source={{ uri: photo }} style={styles.thumbnailImage} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Escrow / payment section — in-app only */}
      {(booking as any).paymentMethod === 'in_app' && payment && (
        <View style={[styles.card, styles.escrowCard]}>
          <Text style={styles.cardTitle}>{t('payment.escrow_status_title')}</Text>
          {(() => {
            const info = ESCROW_MAP[payment.escrowStatus] ?? ESCROW_MAP.pending;
            return (
              <View>
                <Text style={[styles.escrowStatus, { color: info.color }]}>
                  {info.icon}  {t(info.key)}
                </Text>
                <Text style={styles.escrowNote}>
                  {t(`payment.escrow_explanation_${payment.escrowStatus}`, { defaultValue: '' })}
                </Text>
              </View>
            );
          })()}
        </View>
      )}

      {/* Pending in-app payment notice */}
      {(booking as any).paymentMethod === 'in_app' && !payment && status === 'pending' && (
        <View style={[styles.card, styles.warningCard]}>
          <Text style={styles.warningText}>⚠️ {t('payment.pending_payment_notice')}</Text>
        </View>
      )}

      {/* Completion confirmations — visible dès in_progress */}
      {(isInProgress || status === 'completed') && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('booking.confirm_completion_title')}</Text>
          <View style={styles.detailRow}>
            <Icon
              name={clientConfirmed ? 'check-circle' : 'clock-outline'}
              size={18}
              color={clientConfirmed ? colors.success : colors.gray}
            />
            <Text style={styles.detailText}>
              {t('booking.client_confirmed')}{' '}{clientConfirmed ? '✓' : '—'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Icon
              name={proConfirmed ? 'check-circle' : 'clock-outline'}
              size={18}
              color={proConfirmed ? colors.success : colors.gray}
            />
            <Text style={styles.detailText}>
              {t('booking.pro_confirmed')}{' '}{proConfirmed ? '✓' : '—'}
            </Text>
          </View>
          {/* Cash anti-fraud amounts */}
          {isCash && (booking as any).cashAmountDeclaredByClient != null && (
            <View style={[styles.detailRow, { marginTop: spacing.xs }]}>
              <Icon name="cash" size={18} color={
                (booking as any).cashPaymentStatus === 'disputed' ? colors.error :
                (booking as any).cashPaymentStatus === 'confirmed' ? colors.success : colors.gray
              } />
              <Text style={[styles.detailText, { fontSize: 12 }]}>
                {t('booking.cash_declared_client')}: {(booking as any).cashAmountDeclaredByClient} EGP
                {(booking as any).cashAmountDeclaredByPro != null &&
                  `  •  ${t('booking.cash_declared_pro')}: ${(booking as any).cashAmountDeclaredByPro} EGP`}
                {(booking as any).cashPaymentStatus === 'disputed' && '  ⚠️'}
                {(booking as any).cashPaymentStatus === 'confirmed' && '  ✓'}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Cancel form */}
      {showCancelForm && (
        <View style={styles.cancelForm}>
          <Text style={styles.cancelFormTitle}>{t('booking.cancel_reason_label')}</Text>
          <TextInput
            mode="outlined"
            value={cancelReason}
            onChangeText={setCancelReason}
            placeholder={t('booking.cancel_reason_placeholder')}
            multiline
            numberOfLines={3}
            outlineColor={colors.border}
            activeOutlineColor={colors.error}
            style={{ backgroundColor: colors.white }}
          />
          <View style={styles.cancelFormActions}>
            <TouchableOpacity
              style={styles.cancelFormAbort}
              onPress={() => { setShowCancelForm(false); setCancelReason(''); }}
            >
              <Text style={styles.cancelFormAbortText}>{t('common.back')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.cancelFormConfirm, (!cancelReason.trim() || isCancelling) && { opacity: 0.5 }]}
              onPress={handleCancel}
              disabled={!cancelReason.trim() || isCancelling}
            >
              <Text style={styles.cancelFormConfirmText}>
                {isCancelling ? t('common.loading') : t('booking.cancel_btn')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Track button */}
      {['accepted', 'en_route', 'arrived', 'in_progress'].includes(status) && (
        <TouchableOpacity
          style={styles.trackBtn}
          onPress={() => navigation.navigate('BookingTracking', { bookingId, role: 'client' })}
          activeOpacity={0.85}
        >
          <Icon name="map-marker-path" size={20} color={colors.white} />
          <Text style={styles.trackBtnText}>{t('booking_tracking.title')}</Text>
        </TouchableOpacity>
      )}

      {/* Cancel button */}
      {isPending && !showCancelForm && (
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => setShowCancelForm(true)}
          activeOpacity={0.85}
        >
          <Icon name="close-circle-outline" size={20} color={colors.error} />
          <Text style={styles.cancelBtnText}>{t('booking.cancel_btn')}</Text>
        </TouchableOpacity>
      )}

      {/* Confirm completion — contextuel selon l'état */}
      {isInProgress && !clientConfirmed && proConfirmed && (
        <TouchableOpacity
          style={[styles.confirmBtnUrgent, isConfirming && { opacity: 0.6 }]}
          onPress={handleConfirmCompletion}
          disabled={isConfirming}
          activeOpacity={0.85}
        >
          <Icon name="check-decagram" size={22} color={colors.white} />
          <Text style={styles.confirmBtnText}>
            {isConfirming ? t('common.loading') : t('booking.pro_finished_confirm')}
          </Text>
        </TouchableOpacity>
      )}
      {isInProgress && !clientConfirmed && !proConfirmed && (
        <TouchableOpacity
          style={[styles.confirmBtn, isConfirming && { opacity: 0.6 }]}
          onPress={handleConfirmCompletion}
          disabled={isConfirming}
          activeOpacity={0.85}
        >
          <Icon name="check-circle-outline" size={20} color={colors.white} />
          <Text style={styles.confirmBtnText}>
            {isConfirming ? t('common.loading') : t('booking.confirm_completion_btn')}
          </Text>
        </TouchableOpacity>
      )}
      {isInProgress && clientConfirmed && !proConfirmed && (
        <View style={styles.waitingBanner}>
          <Icon name="clock-outline" size={20} color={colors.warning} />
          <Text style={styles.waitingText}>{t('booking.waiting_pro_confirm')}</Text>
        </View>
      )}

      {/* Modal saisie montant cash */}
      <Modal visible={showCashModal} transparent animationType="fade" onRequestClose={() => setShowCashModal(false)}>
        <View style={styles.cashModalOverlay}>
          <View style={styles.cashModalBox}>
            <Text style={styles.cashModalTitle}>{t('booking.cash_amount_title')}</Text>
            <Text style={styles.cashModalMsg}>{t('booking.cash_amount_msg_client')}</Text>
            <TextInput
              mode="outlined"
              value={cashAmountInput}
              onChangeText={setCashAmountInput}
              keyboardType="numeric"
              placeholder="0.00"
              outlineColor={colors.border}
              activeOutlineColor={colors.primary}
              style={{ backgroundColor: colors.white, marginTop: spacing.sm }}
              right={<TextInput.Affix text="EGP" />}
            />
            <View style={styles.cashModalActions}>
              <TouchableOpacity
                style={styles.cashModalCancel}
                onPress={() => setShowCashModal(false)}
              >
                <Text style={{ color: colors.gray, fontWeight: '600' }}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.cashModalConfirm, isConfirming && { opacity: 0.5 }]}
                onPress={submitCashConfirmation}
                disabled={isConfirming}
              >
                <Text style={{ color: colors.white, fontWeight: '700' }}>
                  {isConfirming ? t('common.loading') : t('common.confirm')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Photo viewer modal */}
      {clientPhotos.length > 0 && (
        <Modal
          visible={photoModalVisible}
          transparent
          animationType="fade"
          onRequestClose={closePhotoViewer}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {t('transport.photo_counter', {
                  current: (selectedPhotoIndex ?? 0) + 1,
                  total: clientPhotos.length,
                })}
              </Text>
              <IconButton icon="close" iconColor={colors.white} size={24} onPress={closePhotoViewer} />
            </View>

            <View style={styles.modalImageContainer}>
              {selectedPhotoIndex !== null && (
                <Image
                  source={{ uri: clientPhotos[selectedPhotoIndex] }}
                  style={styles.modalImage}
                  resizeMode="contain"
                />
              )}
            </View>

            {clientPhotos.length > 1 && (
              <View style={styles.modalNavigation}>
                <IconButton
                  icon="chevron-left"
                  iconColor={colors.white}
                  size={40}
                  onPress={goToPreviousPhoto}
                  disabled={selectedPhotoIndex === 0}
                  style={[styles.navButton, selectedPhotoIndex === 0 && styles.navButtonDisabled]}
                />
                <IconButton
                  icon="chevron-right"
                  iconColor={colors.white}
                  size={40}
                  onPress={goToNextPhoto}
                  disabled={selectedPhotoIndex === clientPhotos.length - 1}
                  style={[styles.navButton, selectedPhotoIndex === clientPhotos.length - 1 && styles.navButtonDisabled]}
                />
              </View>
            )}
          </View>
        </Modal>
      )}

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.light },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: colors.gray, fontSize: 14 },

  statusBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    borderRadius: 12, padding: spacing.md, marginBottom: spacing.md,
  },
  statusText: { fontSize: 15, fontWeight: '700' },

  card: {
    backgroundColor: colors.white, borderRadius: 14,
    padding: spacing.md, marginBottom: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  cardTitle: {
    fontSize: 13, fontWeight: '700', color: colors.gray,
    textTransform: 'uppercase', marginBottom: spacing.sm, letterSpacing: 0.5,
  },

  proRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  proAvatar: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: colors.primary + '20', alignItems: 'center', justifyContent: 'center',
  },
  proAvatarLetter: { fontSize: 18, fontWeight: '700', color: colors.primary },
  proName: { fontSize: 15, fontWeight: '700', color: colors.dark },
  proRating: { fontSize: 12, color: colors.gray, marginTop: 2 },

  detailRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: 6,
  },
  detailText: { fontSize: 14, color: colors.dark, flex: 1 },

  photosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  photoThumbnail: {
    width: 70, height: 70, borderRadius: 8,
    overflow: 'hidden', borderWidth: 1, borderColor: colors.border,
  },
  thumbnailImage: { width: '100%', height: '100%', resizeMode: 'cover' },

  escrowCard: { borderColor: colors.primary + '40' },
  escrowStatus: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  escrowNote: { fontSize: 13, color: colors.gray, lineHeight: 18 },

  warningCard: { backgroundColor: '#FFF3CD', borderColor: '#F59E0B40' },
  warningText: { fontSize: 13, color: '#856404', lineHeight: 18, textAlign: 'center' },

  cancelForm: {
    backgroundColor: colors.white, borderRadius: 14,
    padding: spacing.md, marginBottom: spacing.md,
    borderWidth: 1, borderColor: colors.error + '60',
  },
  cancelFormTitle: { fontSize: 14, fontWeight: '600', color: colors.dark, marginBottom: spacing.sm },
  cancelFormActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  cancelFormAbort: {
    flex: 1, borderRadius: 10, paddingVertical: 12,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center',
  },
  cancelFormAbortText: { fontSize: 14, color: colors.gray, fontWeight: '600' },
  cancelFormConfirm: {
    flex: 2, borderRadius: 10, paddingVertical: 12,
    backgroundColor: colors.error, alignItems: 'center',
  },
  cancelFormConfirmText: { fontSize: 14, color: colors.white, fontWeight: '700' },

  cancelBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, borderRadius: 14, paddingVertical: 14,
    borderWidth: 1.5, borderColor: colors.error, marginBottom: spacing.md,
  },
  cancelBtnText: { fontSize: 15, fontWeight: '700', color: colors.error },

  trackBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, borderRadius: 14, paddingVertical: 14,
    backgroundColor: colors.primary, marginBottom: spacing.md,
  },
  trackBtnText: { fontSize: 15, fontWeight: '700', color: colors.white },

  confirmBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, borderRadius: 14, paddingVertical: 14,
    backgroundColor: colors.success, marginBottom: spacing.md,
  },
  confirmBtnUrgent: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, borderRadius: 14, paddingVertical: 16,
    backgroundColor: '#059669', marginBottom: spacing.md,
    borderWidth: 2, borderColor: '#34D399',
  },
  confirmBtnText: { fontSize: 15, fontWeight: '700', color: colors.white },
  waitingBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, borderRadius: 14, paddingVertical: 14,
    backgroundColor: '#FEF3C7', marginBottom: spacing.md,
    borderWidth: 1, borderColor: '#F59E0B40',
  },
  waitingText: { fontSize: 14, fontWeight: '600', color: colors.warning },

  cashModalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', padding: spacing.lg,
  },
  cashModalBox: {
    backgroundColor: colors.white, borderRadius: 16,
    padding: spacing.lg, width: '100%', maxWidth: 400,
  },
  cashModalTitle: { fontSize: 17, fontWeight: '700', color: colors.dark, marginBottom: spacing.xs },
  cashModalMsg: { fontSize: 14, color: colors.gray, lineHeight: 20 },
  cashModalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  cashModalCancel: {
    flex: 1, borderRadius: 10, paddingVertical: 12,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center',
  },
  cashModalConfirm: {
    flex: 2, borderRadius: 10, paddingVertical: 12,
    backgroundColor: colors.primary, alignItems: 'center',
  },

  modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)' },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingTop: spacing.xl, paddingBottom: spacing.md,
  },
  modalTitle: { color: colors.white, fontSize: 16, fontWeight: '600' },
  modalImageContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modalImage: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height * 0.7,
  },
  modalNavigation: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.xl,
  },
  navButton: { backgroundColor: 'rgba(255,255,255,0.2)' },
  navButtonDisabled: { opacity: 0.3 },
});
