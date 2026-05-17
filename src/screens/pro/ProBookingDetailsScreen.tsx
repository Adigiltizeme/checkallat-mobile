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
import { ProStackParamList } from '../../navigation/types';
import {
  useGetBookingByIdQuery,
  useUpdateBookingStatusMutation,
  useConfirmBookingCompletionMutation,
  useCancelBookingMutation,
  useMarkArrivedMutation,
  useMarkStartedMutation,
  useMarkEnRouteMutation,
} from '../../store/api/bookingsApi';
import { useRefetchOnFocus } from '../../hooks/useRefetchOnFocus';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

type Props = StackScreenProps<ProStackParamList, 'ProBookingDetails'>;

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

export const ProBookingDetailsScreen = ({ route, navigation }: Props) => {
  const { t, i18n } = useTranslation();
  const { bookingId } = route.params;

  const { data: booking, isLoading, refetch } = useGetBookingByIdQuery(bookingId, {
    pollingInterval: 5000,
    refetchOnMountOrArgChange: true,
  });
  useRefetchOnFocus(refetch);

  const [updateStatus, { isLoading: isUpdating }] = useUpdateBookingStatusMutation();
  const [confirmCompletion, { isLoading: isConfirming }] = useConfirmBookingCompletionMutation();
  const [cancelBooking, { isLoading: isCancelling }] = useCancelBookingMutation();
  const [markArrived, { isLoading: isArrivedLoading }] = useMarkArrivedMutation();
  const [markStarted, { isLoading: isStartedLoading }] = useMarkStartedMutation();
  const [markEnRoute, { isLoading: isEnRouteLoading }] = useMarkEnRouteMutation();

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
  const isAccepted   = status === 'accepted';
  const isEnRoute    = status === 'en_route';
  const isArrived    = status === 'arrived';
  const isInProgress = status === 'in_progress';
  const isCash       = (booking as any).paymentMethod === 'cash';

  const clientName = (booking as any).client?.firstName
    ? `${(booking as any).client.firstName} ${(booking as any).client.lastName ?? ''}`
    : '—';
  const serviceName = getLocalizedName(
    (booking as any).serviceOffering?.category ?? (booking as any).category,
    i18n.language,
  );
  const scheduledAt = booking.scheduledAt ? new Date(booking.scheduledAt) : null;
  const clientPhotos: string[] = (booking as any).clientPhotos ?? [];
  const payment = (booking as any).payment;

  const handleAccept = async () => {
    try {
      await updateStatus({ id: bookingId, status: 'accepted', role: 'pro' }).unwrap();
    } catch {
      Alert.alert(t('common.error'), t('pro_space.error_update'));
    }
  };

  const handleEnRoute = async () => {
    try {
      await markEnRoute(bookingId).unwrap();
    } catch {
      Alert.alert(t('common.error'), t('pro_space.error_update'));
    }
  };

  const handleArrived = async () => {
    try {
      await markArrived(bookingId).unwrap();
    } catch {
      Alert.alert(t('common.error'), t('pro_space.error_update'));
    }
  };

  const handleStartWork = async () => {
    try {
      await markStarted(bookingId).unwrap();
    } catch {
      Alert.alert(t('common.error'), t('pro_space.error_update'));
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
                await confirmCompletion({ id: bookingId, role: 'pro' }).unwrap();
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
        role: 'pro',
        ...(isNaN(cashAmount) ? {} : { cashAmount }),
      }).unwrap();
    } catch {
      Alert.alert(t('common.error'), t('booking.error_confirm'));
    }
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      Alert.alert(t('common.error'), t('booking.cancel_reason_required'));
      return;
    }
    try {
      await cancelBooking({ id: bookingId, role: 'pro', reason: cancelReason.trim() }).unwrap();
      setShowCancelForm(false);
      setCancelReason('');
    } catch {
      Alert.alert(t('common.error'), t('booking.error_cancel'));
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Status */}
      <View style={[styles.statusBanner, { backgroundColor: statusCfg.bg }]}>
        <Icon name={statusCfg.icon} size={22} color={statusCfg.color} />
        <Text style={[styles.statusText, { color: statusCfg.color }]}>
          {t(`booking_status.${status}`, { defaultValue: status })}
        </Text>
      </View>

      {/* Client */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('pro_space.client_section')}</Text>
        <View style={styles.clientRow}>
          <View style={styles.clientAvatar}>
            <Text style={styles.clientAvatarLetter}>
              {((booking as any).client?.firstName ?? '?').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={styles.clientName}>{clientName}</Text>
            {(booking as any).client?.phone && (
              <Text style={styles.clientPhone}>{(booking as any).client.phone}</Text>
            )}
          </View>
        </View>
      </View>

      {/* Service */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('booking.select_service')}</Text>
        <View style={styles.detailRow}>
          <Icon name="briefcase-outline" size={18} color={colors.gray} />
          <Text style={styles.detailText}>{serviceName}</Text>
        </View>
        {(booking as any).serviceOffering?.priceMin && (
          <View style={styles.detailRow}>
            <Icon name="tag-outline" size={18} color={colors.gray} />
            <Text style={styles.detailText}>
              {(booking as any).serviceOffering.priceMax
                ? `${(booking as any).serviceOffering.priceMin} – ${(booking as any).serviceOffering.priceMax} EGP`
                : `${(booking as any).serviceOffering.priceMin}+ EGP`}
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
        {(booking as any).address && (
          <View style={styles.detailRow}>
            <Icon name="map-marker-outline" size={18} color={colors.gray} />
            <Text style={styles.detailText}>{(booking as any).address}</Text>
          </View>
        )}
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
        {(booking as any).clientDescription && (
          <View style={[styles.detailRow, { alignItems: 'flex-start' }]}>
            <Icon name="text-box-outline" size={18} color={colors.gray} style={{ marginTop: 2 }} />
            <Text style={[styles.detailText, { flex: 1 }]}>{(booking as any).clientDescription}</Text>
          </View>
        )}
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

      {/* Earnings / escrow section */}
      {payment && (
        <View style={[styles.card, styles.escrowCard]}>
          <Text style={styles.cardTitle}>{t('payment.escrow_status_title')}</Text>
          {(() => {
            const info = ESCROW_MAP[payment.escrowStatus] ?? ESCROW_MAP.pending;
            return (
              <View>
                <Text style={[styles.escrowStatus, { color: info.color }]}>
                  {info.icon}  {t(info.key)}
                </Text>
                {payment.proNetAmount && (
                  <View style={[styles.detailRow, { marginTop: spacing.xs }]}>
                    <Icon name="cash" size={18} color={colors.success} />
                    <Text style={[styles.detailText, { color: colors.success, fontWeight: '700' }]}>
                      {t('driver.net_amount_label')}: {payment.proNetAmount} EGP
                    </Text>
                  </View>
                )}
              </View>
            );
          })()}
        </View>
      )}

      {/* Completion confirmations — visible dès in_progress */}
      {(isInProgress || status === 'completed') && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('booking.confirm_completion_title')}</Text>
          <View style={styles.detailRow}>
            <Icon
              name={(booking as any).proConfirmedCompletion ? 'check-circle' : 'clock-outline'}
              size={18}
              color={(booking as any).proConfirmedCompletion ? colors.success : colors.gray}
            />
            <Text style={styles.detailText}>
              {t('booking.pro_confirmed')}{' '}
              {(booking as any).proConfirmedCompletion ? '✓' : '—'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Icon
              name={(booking as any).clientConfirmedCompletion ? 'check-circle' : 'clock-outline'}
              size={18}
              color={(booking as any).clientConfirmedCompletion ? colors.success : colors.gray}
            />
            <Text style={styles.detailText}>
              {t('booking.client_confirmed')}{' '}
              {(booking as any).clientConfirmedCompletion ? '✓' : '—'}
            </Text>
          </View>
          {/* Cash anti-fraud amounts */}
          {isCash && (booking as any).cashAmountDeclaredByPro != null && (
            <View style={[styles.detailRow, { marginTop: spacing.xs }]}>
              <Icon name="cash" size={18} color={
                (booking as any).cashPaymentStatus === 'disputed' ? colors.error :
                (booking as any).cashPaymentStatus === 'confirmed' ? colors.success : colors.gray
              } />
              <Text style={[styles.detailText, { fontSize: 12 }]}>
                {t('booking.cash_declared_pro')}: {(booking as any).cashAmountDeclaredByPro} EGP
                {(booking as any).cashAmountDeclaredByClient != null &&
                  `  •  ${t('booking.cash_declared_client')}: ${(booking as any).cashAmountDeclaredByClient} EGP`}
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
              style={styles.cancelAbortBtn}
              onPress={() => { setShowCancelForm(false); setCancelReason(''); }}
            >
              <Text style={{ color: colors.gray, fontWeight: '600' }}>{t('common.back')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.cancelConfirmBtn, (!cancelReason.trim() || isCancelling) && { opacity: 0.5 }]}
              onPress={handleCancel}
              disabled={!cancelReason.trim() || isCancelling}
            >
              <Text style={{ color: colors.white, fontWeight: '700' }}>
                {isCancelling ? t('common.loading') : t('pro_space.refuse_btn')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Pending actions */}
      {isPending && !showCancelForm && (
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtnSecondary, isUpdating && { opacity: 0.5 }]}
            onPress={() => setShowCancelForm(true)}
            disabled={isUpdating}
          >
            <Icon name="close" size={18} color={colors.error} />
            <Text style={[styles.actionBtnText, { color: colors.error }]}>{t('pro_space.refuse_btn')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtnPrimary, isUpdating && { opacity: 0.5 }]}
            onPress={handleAccept}
            disabled={isUpdating}
          >
            <Icon name="check" size={18} color={colors.white} />
            <Text style={[styles.actionBtnText, { color: colors.white }]}>
              {isUpdating ? t('common.loading') : t('pro_space.accept_btn')}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Accepted — start navigation */}
      {isAccepted && (
        <View>
          <TouchableOpacity
            style={[styles.actionBtnNavigation, { marginBottom: spacing.sm }, isEnRouteLoading && { opacity: 0.5 }]}
            onPress={handleEnRoute}
            disabled={isEnRouteLoading}
          >
            <Icon name="navigation" size={20} color={colors.white} />
            <Text style={[styles.actionBtnText, { color: colors.white, fontSize: 15 }]}>
              {isEnRouteLoading ? t('common.loading') : t('pro_navigation.start_route')}
            </Text>
          </TouchableOpacity>
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.actionBtnSecondary, { flex: 1 }, isCancelling && { opacity: 0.5 }]}
              onPress={() => setShowCancelForm(true)}
              disabled={isCancelling}
            >
              <Icon name="close" size={18} color={colors.error} />
              <Text style={[styles.actionBtnText, { color: colors.error }]}>{t('booking.cancel_btn')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* En route — arrived + tracking */}
      {isEnRoute && (
        <View>
          <TouchableOpacity
            style={[styles.actionBtnTrack, { marginBottom: spacing.sm }]}
            onPress={() => navigation.navigate('BookingTracking', { bookingId, role: 'pro' })}
          >
            <Icon name="map-marker-path" size={18} color={colors.white} />
            <Text style={[styles.actionBtnText, { color: colors.white }]}>{t('booking_tracking.title')}</Text>
          </TouchableOpacity>
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.actionBtnSecondary, { flex: 1 }, isCancelling && { opacity: 0.5 }]}
              onPress={() => setShowCancelForm(true)}
              disabled={isCancelling}
            >
              <Icon name="close" size={18} color={colors.error} />
              <Text style={[styles.actionBtnText, { color: colors.error }]}>{t('booking.cancel_btn')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtnPrimary, { flex: 2 }, isArrivedLoading && { opacity: 0.5 }]}
              onPress={handleArrived}
              disabled={isArrivedLoading}
            >
              <Icon name="map-marker-check" size={18} color={colors.white} />
              <Text style={[styles.actionBtnText, { color: colors.white }]}>
                {isArrivedLoading ? t('common.loading') : t('pro_navigation.arrived')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Arrived — start work */}
      {isArrived && (
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtnSecondary, { flex: 1 }, isCancelling && { opacity: 0.5 }]}
            onPress={() => setShowCancelForm(true)}
            disabled={isCancelling}
          >
            <Icon name="close" size={18} color={colors.error} />
            <Text style={[styles.actionBtnText, { color: colors.error }]}>{t('booking.cancel_btn')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtnPrimary, { flex: 2 }, isStartedLoading && { opacity: 0.5 }]}
            onPress={handleStartWork}
            disabled={isStartedLoading}
          >
            <Icon name="progress-wrench" size={18} color={colors.white} />
            <Text style={[styles.actionBtnText, { color: colors.white }]}>
              {isStartedLoading ? t('common.loading') : t('pro_space.start_work_btn')}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Bouton de confirmation */}
      {(isInProgress || status === 'completed') && !(booking as any).proConfirmedCompletion && (
        <TouchableOpacity
          style={[styles.actionBtnPrimary, { marginTop: spacing.sm }, isConfirming && { opacity: 0.5 }]}
          onPress={handleConfirmCompletion}
          disabled={isConfirming}
        >
          <Icon name="check-all" size={20} color={colors.white} />
          <Text style={[styles.actionBtnText, { color: colors.white, fontSize: 15 }]}>
            {isConfirming
              ? t('common.loading')
              : status === 'completed'
                ? t('booking.confirm_completion_btn')
                : t('pro_space.finish_work_btn')}
          </Text>
        </TouchableOpacity>
      )}

      {/* Bannière d'attente : pro confirmé, en attente du client */}
      {isInProgress && (booking as any).proConfirmedCompletion && (
        <View style={[styles.card, { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm }]}>
          <Icon name="clock-outline" size={20} color={colors.warning} />
          <Text style={{ color: colors.warning, fontWeight: '700', fontSize: 14, flex: 1 }}>
            {t('booking.waiting_client_confirm')}
          </Text>
        </View>
      )}

      {/* Modal saisie montant cash */}
      <Modal visible={showCashModal} transparent animationType="fade" onRequestClose={() => setShowCashModal(false)}>
        <View style={styles.cashModalOverlay}>
          <View style={styles.cashModalBox}>
            <Text style={styles.cashModalTitle}>{t('booking.cash_amount_title')}</Text>
            <Text style={styles.cashModalMsg}>{t('booking.cash_amount_msg_pro')}</Text>
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
    backgroundColor: colors.white, borderRadius: 14, padding: spacing.md,
    marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  cardTitle: {
    fontSize: 12, fontWeight: '700', color: colors.gray,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm,
  },

  clientRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  clientAvatar: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: colors.primary + '20', alignItems: 'center', justifyContent: 'center',
  },
  clientAvatarLetter: { fontSize: 18, fontWeight: '700', color: colors.primary },
  clientName: { fontSize: 15, fontWeight: '700', color: colors.dark },
  clientPhone: { fontSize: 12, color: colors.gray, marginTop: 2 },

  detailRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 5 },
  detailText: { fontSize: 14, color: colors.dark, flex: 1 },

  photosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  photoThumbnail: {
    width: 70, height: 70, borderRadius: 8,
    overflow: 'hidden', borderWidth: 1, borderColor: colors.border,
  },
  thumbnailImage: { width: '100%', height: '100%', resizeMode: 'cover' },

  escrowCard: { borderColor: colors.primary + '40' },
  escrowStatus: { fontSize: 15, fontWeight: '700', marginBottom: 4 },

  cancelForm: {
    backgroundColor: colors.white, borderRadius: 14, padding: spacing.md,
    marginBottom: spacing.md, borderWidth: 1, borderColor: colors.error + '60',
  },
  cancelFormTitle: { fontSize: 14, fontWeight: '600', color: colors.dark, marginBottom: spacing.sm },
  cancelFormActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  cancelAbortBtn: {
    flex: 1, borderRadius: 10, paddingVertical: 12,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center',
  },
  cancelConfirmBtn: {
    flex: 2, borderRadius: 10, paddingVertical: 12,
    backgroundColor: colors.error, alignItems: 'center',
  },

  actionsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  actionBtnPrimary: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14,
  },
  actionBtnSecondary: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, borderRadius: 12, paddingVertical: 14,
    borderWidth: 1.5, borderColor: colors.error,
  },
  actionBtnNavigation: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 16,
  },
  actionBtnTrack: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, backgroundColor: '#6366F1', borderRadius: 12, paddingVertical: 12,
  },
  actionBtnText: { fontSize: 14, fontWeight: '700' },

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
