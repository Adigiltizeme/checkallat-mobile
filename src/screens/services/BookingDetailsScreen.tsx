import React, { useState, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  Modal,
  Dimensions,
  Linking,
} from 'react-native';
import { Text, TextInput, IconButton } from 'react-native-paper';
import { StackScreenProps } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { getLocalizedName } from '../../utils/localize';
import { CATEGORY_FIELDS, HAS_URGENCY, getCategoryOptionLabel } from '../../config/categoryFields';
import { HomeStackParamList } from '../../navigation/types';
import { CURRENCY_CONFIG } from '../../config/currency';
import {
  useGetBookingByIdQuery,
  useCancelBookingMutation,
  useConfirmBookingCompletionMutation,
  useGetBookingBidsQuery,
  useAcceptBidMutation,
} from '../../store/api/bookingsApi';
import { useGetCallRelayNumberQuery } from '../../store/api/communicationApi';
import { useRefetchOnFocus } from '../../hooks/useRefetchOnFocus';
import { colors } from '../../theme/colors';
import { useAppTheme } from '../../theme/ThemeProvider';
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
  const { tokens } = useAppTheme();


  const styles = useMemo(() => StyleSheet.create({
  container: { flex: 1, backgroundColor: tokens.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: tokens.text.secondary, fontSize: 14 },

  statusBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    borderRadius: 12, padding: spacing.md, marginBottom: spacing.md,
  },
  statusText: { fontSize: 15, fontWeight: '700' },

  card: {
    backgroundColor: tokens.card, borderRadius: 14,
    padding: spacing.md, marginBottom: spacing.md,
    borderWidth: 1, borderColor: tokens.border,
  },
  cardTitle: {
    fontSize: 13, fontWeight: '700', color: tokens.text.secondary,
    textTransform: 'uppercase', marginBottom: spacing.sm, letterSpacing: 0.5,
  },

  proRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  proAvatar: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: tokens.primary + '20', alignItems: 'center', justifyContent: 'center',
  },
  proAvatarLetter: { fontSize: 18, fontWeight: '700', color: tokens.primary },
  proName: { fontSize: 15, fontWeight: '700', color: tokens.text.primary },
  proRating: { fontSize: 12, color: tokens.text.secondary, marginTop: 2 },

  detailRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: 6,
  },
  detailText: { fontSize: 14, color: tokens.text.primary, flex: 1 },

  photosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  photoThumbnail: {
    width: 70, height: 70, borderRadius: 8,
    overflow: 'hidden', borderWidth: 1, borderColor: tokens.border,
  },
  thumbnailImage: { width: '100%', height: '100%', resizeMode: 'cover' },

  contactRow: {
    flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md,
  },
  contactBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderRadius: 12, paddingVertical: 12,
    backgroundColor: tokens.primary,
  },
  contactBtnMessage: {
    backgroundColor: tokens.card, borderWidth: 1.5, borderColor: tokens.primary,
  },
  contactBtnText: { fontSize: 14, fontWeight: '700', color: colors.white },
  contactBtnMessageText: { color: tokens.primary },

  escrowCard: { borderColor: tokens.primary + '40' },
  escrowStatus: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  escrowNote: { fontSize: 13, color: tokens.text.secondary, lineHeight: 18 },

  warningCard: { backgroundColor: '#FFF3CD', borderColor: '#F59E0B40' },
  warningText: { fontSize: 13, color: '#856404', lineHeight: 18, textAlign: 'center' },

  cancelForm: {
    backgroundColor: tokens.card, borderRadius: 14,
    padding: spacing.md, marginBottom: spacing.md,
    borderWidth: 1, borderColor: colors.error + '60',
  },
  cancelFormTitle: { fontSize: 14, fontWeight: '600', color: tokens.text.primary, marginBottom: spacing.sm },
  cancelFormActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  cancelFormAbort: {
    flex: 1, borderRadius: 10, paddingVertical: 12,
    borderWidth: 1, borderColor: tokens.border, alignItems: 'center',
  },
  cancelFormAbortText: { fontSize: 14, color: tokens.text.secondary, fontWeight: '600' },
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
    backgroundColor: tokens.primary, marginBottom: spacing.md,
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

  disputeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, borderRadius: 14, paddingVertical: 14,
    backgroundColor: `${colors.error}20`, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: `${colors.error}60`,
  },
  disputeBtnText: { fontSize: 14, fontWeight: '700', color: colors.error },

  renewBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, borderRadius: 14, paddingVertical: 14,
    backgroundColor: tokens.card, marginBottom: spacing.sm,
    borderWidth: 1.5, borderColor: tokens.primary,
  },
  renewBtnText: { fontSize: 14, fontWeight: '700', color: tokens.primary },

  backBtn: {
    alignItems: 'center', paddingVertical: 10, marginBottom: spacing.sm,
  },
  backBtnText: { fontSize: 14, color: tokens.text.secondary },

  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.xs },
  chip: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1,
    borderColor: tokens.primary + '60',
    backgroundColor: tokens.primary + '12',
  },
  chipText: { fontSize: 12, fontWeight: '600', color: tokens.primary },

  bidCard: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: spacing.sm, gap: spacing.md,
    borderBottomWidth: 1, borderBottomColor: tokens.border,
  },
  bidAvatar: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: tokens.primary + '20', alignItems: 'center', justifyContent: 'center',
  },
  bidAvatarLetter: { fontSize: 16, fontWeight: '700', color: tokens.primary },
  bidInfo: { flex: 1 },
  bidProName: { fontSize: 14, fontWeight: '700', color: tokens.text.primary },
  bidRating: { fontSize: 12, color: tokens.text.secondary, marginTop: 1 },
  bidPrice: { fontSize: 16, fontWeight: '800', color: tokens.primary },
  bidCurrency: { fontSize: 12, color: tokens.text.secondary },
  bidAcceptBtn: {
    paddingHorizontal: spacing.md, paddingVertical: 8,
    backgroundColor: tokens.primary, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  bidAcceptBtnText: { fontSize: 13, fontWeight: '700', color: colors.white },
  noBidsText: { fontSize: 13, color: tokens.text.secondary, textAlign: 'center', paddingVertical: spacing.sm, lineHeight: 18 },

  cashModalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', padding: spacing.lg,
  },
  cashModalBox: {
    backgroundColor: tokens.modal, borderRadius: 16,
    padding: spacing.lg, width: '100%', maxWidth: 400,
  },
  cashModalTitle: { fontSize: 17, fontWeight: '700', color: tokens.text.primary, marginBottom: spacing.xs },
  cashModalMsg: { fontSize: 14, color: tokens.text.secondary, lineHeight: 20 },
  cashModalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  cashModalCancel: {
    flex: 1, borderRadius: 10, paddingVertical: 12,
    borderWidth: 1, borderColor: tokens.border, alignItems: 'center',
  },
  cashModalConfirm: {
    flex: 2, borderRadius: 10, paddingVertical: 12,
    backgroundColor: tokens.primary, alignItems: 'center',
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
  }), [tokens]);

  const { t, i18n } = useTranslation();
  const { bookingId } = route.params;

  const { data: booking, isLoading, refetch } = useGetBookingByIdQuery(bookingId, {
    pollingInterval: 5000,
    refetchOnMountOrArgChange: true,
  });
  useRefetchOnFocus(refetch);

  const [cancelBooking, { isLoading: isCancelling }] = useCancelBookingMutation();
  const [confirmCompletion, { isLoading: isConfirming }] = useConfirmBookingCompletionMutation();
  const [acceptBid, { isLoading: isAcceptingBid }] = useAcceptBidMutation();

  const isAutoBidBooking = (booking as any)?.assignmentType === 'auto' && (booking as any)?.status === 'pending' && !(booking as any)?.proId;
  const { data: bookingBids } = useGetBookingBidsQuery(bookingId, {
    skip: !isAutoBidBooking,
    pollingInterval: 8000,
    refetchOnMountOrArgChange: true,
  });

  const CALL_ACTIVE_STATUSES = ['accepted', 'en_route', 'arrived', 'in_progress'];
  const bookingStatus = (booking as any)?.status ?? '';
  const canContact = CALL_ACTIVE_STATUSES.includes(bookingStatus) && !!(booking as any)?.proId;
  const { data: callRelay } = useGetCallRelayNumberQuery({ entityType: 'booking', entityId: bookingId }, { skip: !canContact });

  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showCashModal, setShowCashModal] = useState(false);
  const [cashAmountInput, setCashAmountInput] = useState('');
  const [viewerPhotos, setViewerPhotos] = useState<string[]>([]);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [photoModalVisible, setPhotoModalVisible] = useState(false);

  const openPhotoViewer = (photos: string[], index: number) => {
    setViewerPhotos(photos);
    setViewerIndex(index);
    setPhotoModalVisible(true);
  };

  const closePhotoViewer = () => {
    setPhotoModalVisible(false);
    setViewerIndex(null);
    setViewerPhotos([]);
  };

  const goToNextPhoto = () => {
    if (viewerIndex !== null && viewerIndex < viewerPhotos.length - 1) {
      setViewerIndex(viewerIndex + 1);
    }
  };

  const goToPreviousPhoto = () => {
    if (viewerIndex !== null && viewerIndex > 0) {
      setViewerIndex(viewerIndex - 1);
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
  const photosBeforeWork: string[] = (booking as any).photosBeforeWork ?? [];
  const photosAfterWork: string[] = (booking as any).photosAfterWork ?? [];
  const payment = (booking as any).payment;

  const categorySlug: string = (booking as any).category?.slug ?? '';
  const categoryData: Record<string, string | string[]> = (booking as any).categoryData ?? {};
  const categoryFieldDefs = CATEGORY_FIELDS[categorySlug] ?? [];
  const bookingType: string = (booking as any).bookingType ?? '';
  const timeSlot: string = (booking as any).timeSlot ?? '';
  const isRecurring: boolean = !!(booking as any).isRecurring;
  const recurringFrequency: string = (booking as any).recurringFrequency ?? '';
  const recurringEndDate = (booking as any).recurringEndDate
    ? new Date((booking as any).recurringEndDate)
    : null;

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      Alert.alert(t('common.error'), t('booking.cancel_reason_required'));
      return;
    }
    try {
      const res = await cancelBooking({ id: bookingId, role: 'client', reason: cancelReason.trim() }).unwrap();
      setShowCancelForm(false);
      setCancelReason('');
      const refundPct = (res as any)?.refundPct;
      const feeAmount = (res as any)?.feeAmount;
      if (feeAmount > 0) {
        Alert.alert(t('common.success'), t('booking.cancel_result_fee', { amount: feeAmount, currency: CURRENCY_CONFIG.code }));
      } else if (refundPct != null) {
        Alert.alert(t('common.success'), t('booking.cancel_result_refund', { pct: refundPct }));
      }
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

  const handleRenew = () => {
    const b = booking as any;
    const cat = b.category;
    if (!cat) return;

    navigation.navigate('BookingRequestStep1', {
      categorySlug:   cat.slug,
      categoryNameFr: cat.nameFr,
      categoryNameEn: cat.nameEn,
      categoryNameAr: cat.nameAr,
      prefill: {
        clientDescription: b.clientDescription ?? '',
        categoryData:      b.categoryData ?? {},
        urgency:           b.categoryData?.urgency ?? 'normal',
        // clientPhotos intentionally omitted — user must take new ones
      },
      step2Prefill: {
        address: {
          address:     b.address ?? '',
          lat:         b.addressLat ?? 0,
          lng:         b.addressLng ?? 0,
          floor:       b.addressFloor ?? 0,
          hasElevator: b.addressHasElevator ?? false,
          instructions: b.addressInstructions ?? '',
        },
      },
    });
  };

  const isTerminal = status === 'completed' || status === 'cancelled' || status === 'rejected';
  const hasPendingFee = !!(booking as any).cancellationFeeAmount && !(booking as any).cancellationFeePaid;

  const handleCancelPress = () => {
    if (status === 'arrived') {
      Alert.alert(
        t('booking.cancel_fee_title'),
        t('booking.cancel_arrived_warning'),
        [
          { text: t('common.back'), style: 'cancel' },
          { text: t('booking.cancel_anyway'), style: 'destructive', onPress: () => setShowCancelForm(true) },
        ],
      );
    } else if (status === 'en_route') {
      Alert.alert(
        t('booking.cancel_fee_title'),
        t('booking.cancel_en_route_warning'),
        [
          { text: t('common.back'), style: 'cancel' },
          { text: t('booking.cancel_anyway'), style: 'destructive', onPress: () => setShowCancelForm(true) },
        ],
      );
    } else {
      setShowCancelForm(true);
    }
  };

  const handleAcceptBid = (bid: any) => {
    const proName = bid.pro?.user
      ? `${bid.pro.user.firstName} ${bid.pro.user.lastName}`
      : '—';
    Alert.alert(
      t('booking.confirm_accept_bid_title'),
      t('booking.confirm_accept_bid_msg', {
        proName,
        price: `${bid.proposedPrice} ${CURRENCY_CONFIG.code}`,
      }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('booking.accept_bid'),
          onPress: async () => {
            try {
              await acceptBid({ bookingId, bidId: bid.id }).unwrap();
            } catch {
              Alert.alert(t('common.error'), t('booking.error_accept_bid'));
            }
          },
        },
      ],
    );
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

      {/* Boutons de contact masqués (numéros jamais affichés) */}
      {canContact && (
        <View style={styles.contactRow}>
          <TouchableOpacity
            style={styles.contactBtn}
            onPress={() => {
              if (callRelay?.relayNumber) {
                Linking.openURL(`tel:${callRelay.relayNumber}`);
              }
            }}
            activeOpacity={0.8}
          >
            <Icon name="phone" size={18} color={colors.white} />
            <Text style={styles.contactBtnText}>{t('booking.call_pro')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.contactBtn, styles.contactBtnMessage]}
            onPress={() => navigation.navigate('BookingChat', {
              entityType: 'booking',
              entityId: bookingId,
              otherPartyName: proName,
            })}
            activeOpacity={0.8}
          >
            <Icon name="message-text" size={18} color={tokens.primary} />
            <Text style={[styles.contactBtnText, styles.contactBtnMessageText]}>{t('booking.message_pro')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Service details */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('booking.select_service')}</Text>
        <View style={styles.detailRow}>
          <Icon name="briefcase-outline" size={18} color={tokens.text.secondary} />
          <Text style={styles.detailText}>{serviceName}</Text>
        </View>
        {((booking as any).serviceOffering?.priceMin || (booking as any).serviceOffering?.priceMax) && (
          <View style={styles.detailRow}>
            <Icon name="tag-outline" size={18} color={tokens.text.secondary} />
            <Text style={styles.detailText}>
              {(booking as any).serviceOffering.priceMax
                ? `${(booking as any).serviceOffering.priceMin} – ${(booking as any).serviceOffering.priceMax} EGP`
                : `${t('services.from_price', { price: (booking as any).serviceOffering.priceMin, currency: 'EGP' })}`}
            </Text>
          </View>
        )}

        {/* Chips des sélections spécifiques à la catégorie */}
        {categoryFieldDefs.map((field) => {
          const selected = categoryData[field.key];
          const values: string[] = Array.isArray(selected) ? selected : (selected ? [selected] : []);
          if (values.length === 0) return null;
          return (
            <View key={field.key} style={{ marginTop: spacing.xs }}>
              <Text style={[styles.cardTitle, { marginBottom: 4 }]}>{t(field.labelKey)}</Text>
              <View style={styles.chipsRow}>
                {values.map((v) => (
                  <View key={v} style={styles.chip}>
                    <Text style={styles.chipText}>
                      {getCategoryOptionLabel(categorySlug, field.key, v, i18n.language)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          );
        })}

        {/* Urgence */}
        {HAS_URGENCY.includes(categorySlug) && categoryData.urgency === 'urgent' && (
          <View style={[styles.chipsRow, { marginTop: spacing.xs }]}>
            <View style={[styles.chip, { borderColor: '#F59E0B80', backgroundColor: '#FEF3C7' }]}>
              <Text style={[styles.chipText, { color: '#92400E' }]}>
                ⚡ {t('booking_request.urgency_urgent', { pct: 30 })}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Booking details */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('common.details')}</Text>
        {/* Type de réservation */}
        {bookingType && (
          <View style={styles.detailRow}>
            <Icon name={bookingType === 'immediate' ? 'flash' : 'calendar-clock'} size={18} color={tokens.text.secondary} />
            <Text style={styles.detailText}>{t(`booking_request.${bookingType}`)}</Text>
          </View>
        )}
        {scheduledAt && (
          <View style={styles.detailRow}>
            <Icon name="calendar-outline" size={18} color={tokens.text.secondary} />
            <Text style={styles.detailText}>
              {scheduledAt.toLocaleDateString(i18n.language, {
                weekday: 'long', day: 'numeric', month: 'long',
              })}
              {timeSlot ? `  •  ${t(`booking_request.time_slot_${timeSlot}_short`)}` : ''}
            </Text>
          </View>
        )}
        {/* Récurrence */}
        {isRecurring && (
          <View style={styles.detailRow}>
            <Icon name="refresh" size={18} color={tokens.text.secondary} />
            <Text style={styles.detailText}>
              {t('booking_request.recurring_label')}
              {recurringFrequency ? `  •  ${t(`booking_request.freq_${recurringFrequency}`)}` : ''}
              {recurringEndDate ? `  •  ${t('booking_request.until_label', { date: recurringEndDate.toLocaleDateString(i18n.language, { day: 'numeric', month: 'long', year: 'numeric' }) })}` : ''}
            </Text>
          </View>
        )}
        {(booking as any).address ? (
          <View style={styles.detailRow}>
            <Icon name="map-marker-outline" size={18} color={tokens.text.secondary} />
            <Text style={styles.detailText}>{(booking as any).address}</Text>
          </View>
        ) : null}
        {(booking as any).paymentMethod && (
          <View style={styles.detailRow}>
            <Icon
              name={(booking as any).paymentMethod === 'cash' ? 'cash' : 'shield-check'}
              size={18}
              color={tokens.text.secondary}
            />
            <Text style={styles.detailText}>
              {t((booking as any).paymentMethod === 'cash' ? 'booking.payment_cash' : 'booking.payment_inapp')}
            </Text>
          </View>
        )}
        {(booking as any).clientDescription ? (
          <View style={[styles.detailRow, { alignItems: 'flex-start' }]}>
            <Icon name="text-box-outline" size={18} color={tokens.text.secondary} style={{ marginTop: 2 }} />
            <Text style={[styles.detailText, { flex: 1 }]}>{(booking as any).clientDescription}</Text>
          </View>
        ) : null}
        {(booking as any).finalPrice != null && (
          <View style={[styles.detailRow, { marginTop: 2 }]}>
            <Icon name="tag-check-outline" size={18} color={tokens.primary} />
            <Text style={[styles.detailText, { color: tokens.primary, fontWeight: '700' }]}>
              {t('booking.final_price_label')} : {(booking as any).finalPrice} {CURRENCY_CONFIG.code}
            </Text>
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
                onPress={() => openPhotoViewer(clientPhotos, index)}
              >
                <Image source={{ uri: photo }} style={styles.thumbnailImage} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Photos avant intervention (pro) */}
      {photosBeforeWork.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('booking.photos_before_work')}</Text>
          <View style={styles.photosGrid}>
            {photosBeforeWork.map((photo, index) => (
              <TouchableOpacity
                key={index}
                style={styles.photoThumbnail}
                onPress={() => openPhotoViewer(photosBeforeWork, index)}
              >
                <Image source={{ uri: photo }} style={styles.thumbnailImage} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Photos après intervention (pro) */}
      {photosAfterWork.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('booking.photos_after_work')}</Text>
          <View style={styles.photosGrid}>
            {photosAfterWork.map((photo, index) => (
              <TouchableOpacity
                key={index}
                style={styles.photoThumbnail}
                onPress={() => openPhotoViewer(photosAfterWork, index)}
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
              color={clientConfirmed ? colors.success : tokens.text.secondary}
            />
            <Text style={styles.detailText}>
              {t('booking.client_confirmed')}{' '}{clientConfirmed ? '✓' : '—'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Icon
              name={proConfirmed ? 'check-circle' : 'clock-outline'}
              size={18}
              color={proConfirmed ? colors.success : tokens.text.secondary}
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
                (booking as any).cashPaymentStatus === 'confirmed' ? colors.success : tokens.text.secondary
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
            outlineColor={tokens.border}
            activeOutlineColor={colors.error}
            style={{ backgroundColor: tokens.backgroundAlt }}
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

      {/* Section propositions reçues (mode auto — en attente) */}
      {isAutoBidBooking && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('booking.bids_section_title')}</Text>
          {!bookingBids || bookingBids.length === 0 ? (
            <Text style={styles.noBidsText}>{t('booking.no_bids_yet')}</Text>
          ) : (
            bookingBids.map((bid: any, idx: number) => {
              const proUser = bid.pro?.user;
              const proName = proUser ? `${proUser.firstName} ${proUser.lastName}` : '—';
              const proLetter = proName.charAt(0).toUpperCase();
              const rating = bid.pro?.averageRating;
              const missionCount = bid.pro?.totalCompletedBookings ?? 0;
              return (
                <View key={bid.id} style={[styles.bidCard, idx === bookingBids.length - 1 && { borderBottomWidth: 0 }]}>
                  <View style={styles.bidAvatar}>
                    <Text style={styles.bidAvatarLetter}>{proLetter}</Text>
                  </View>
                  <View style={styles.bidInfo}>
                    <Text style={styles.bidProName}>{proName}</Text>
                    {rating != null && rating > 0 && (
                      <Text style={styles.bidRating}>
                        {t('booking.bid_pro_rating', { rating: rating.toFixed(1), count: missionCount })}
                      </Text>
                    )}
                    {bid.message ? (
                      <Text style={{ fontSize: 12, color: tokens.text.secondary, marginTop: 2 }} numberOfLines={2}>
                        {bid.message}
                      </Text>
                    ) : null}
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <Text style={styles.bidPrice}>{bid.proposedPrice}</Text>
                    <Text style={styles.bidCurrency}>{CURRENCY_CONFIG.code}</Text>
                    <TouchableOpacity
                      style={[styles.bidAcceptBtn, isAcceptingBid && { opacity: 0.5 }]}
                      onPress={() => handleAcceptBid(bid)}
                      disabled={isAcceptingBid}
                    >
                      <Text style={styles.bidAcceptBtnText}>{t('booking.accept_bid')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>
      )}

      {/* Bannière frais d'annulation en attente */}
      {hasPendingFee && (
        <View style={[styles.card, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B60' }]}>
          <Text style={{ fontSize: 13, color: '#92400E', lineHeight: 18 }}>
            ⚠️ {t('booking.cancel_fee_pending', { amount: `${(booking as any).cancellationFeeAmount} ${CURRENCY_CONFIG.code}` })}
          </Text>
        </View>
      )}

      {/* Cancel button — visible avant le début du travail */}
      {['pending', 'accepted', 'en_route', 'arrived'].includes(status) && !showCancelForm && (
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={handleCancelPress}
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

      {/* Signaler un problème — visible dès que la réservation est acceptée */}
      {!isPending && (
        <TouchableOpacity
          style={styles.disputeBtn}
          onPress={() => navigation.navigate('BookingDispute', { bookingId })}
          activeOpacity={0.8}
        >
          <Icon name="flag" size={18} color={colors.error} />
          <Text style={styles.disputeBtnText}>{t('dispute.open_btn')}</Text>
        </TouchableOpacity>
      )}

      {isTerminal && !!(booking as any).category && (
        <TouchableOpacity
          style={styles.renewBtn}
          onPress={handleRenew}
          activeOpacity={0.8}
        >
          <Icon name="refresh" size={18} color={tokens.primary} />
          <Text style={styles.renewBtnText}>{t('booking.renew_order')}</Text>
        </TouchableOpacity>
      )}

      {isTerminal && (
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>{t('booking.back_to_list')}</Text>
        </TouchableOpacity>
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
              outlineColor={tokens.border}
              activeOutlineColor={tokens.primary}
              style={{ backgroundColor: tokens.backgroundAlt, marginTop: spacing.sm }}
              right={<TextInput.Affix text="EGP" />}
            />
            <View style={styles.cashModalActions}>
              <TouchableOpacity
                style={styles.cashModalCancel}
                onPress={() => setShowCashModal(false)}
              >
                <Text style={{ color: tokens.text.secondary, fontWeight: '600' }}>{t('common.cancel')}</Text>
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

      {/* Photo viewer modal (client + before/after) */}
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
                current: (viewerIndex ?? 0) + 1,
                total: viewerPhotos.length,
              })}
            </Text>
            <IconButton icon="close" iconColor={colors.white} size={24} onPress={closePhotoViewer} />
          </View>

          <View style={styles.modalImageContainer}>
            {viewerIndex !== null && viewerPhotos[viewerIndex] && (
              <Image
                source={{ uri: viewerPhotos[viewerIndex] }}
                style={styles.modalImage}
                resizeMode="contain"
              />
            )}
          </View>

          {viewerPhotos.length > 1 && (
            <View style={styles.modalNavigation}>
              <IconButton
                icon="chevron-left"
                iconColor={colors.white}
                size={40}
                onPress={goToPreviousPhoto}
                disabled={viewerIndex === 0}
                style={[styles.navButton, viewerIndex === 0 && styles.navButtonDisabled]}
              />
              <IconButton
                icon="chevron-right"
                iconColor={colors.white}
                size={40}
                onPress={goToNextPhoto}
                disabled={viewerIndex === viewerPhotos.length - 1}
                style={[styles.navButton, viewerIndex === viewerPhotos.length - 1 && styles.navButtonDisabled]}
              />
            </View>
          )}
        </View>
      </Modal>
    </ScrollView>
  );
};
