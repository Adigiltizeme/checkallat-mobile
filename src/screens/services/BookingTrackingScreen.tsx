import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Linking,
  Alert,
  Modal,
  Animated,
  Share,
} from 'react-native';
import { Text, Avatar, ActivityIndicator, IconButton, TextInput } from 'react-native-paper';
import Constants from 'expo-constants';
import { StackScreenProps } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { HomeStackParamList } from '../../navigation/types';
import { colors } from '../../theme/colors';
import { useAppTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/spacing';
import {
  useGetBookingTrackingQuery,
  useMarkEnRouteMutation,
  useMarkArrivedMutation,
  useUpdateProLocationMutation,
  useConfirmBookingCompletionMutation,
} from '../../store/api/bookingsApi';
import { useRefetchOnFocus } from '../../hooks/useRefetchOnFocus';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import RNMapView, { Marker } from 'react-native-maps';
const isExpoGo = Constants.appOwnership === 'expo';
const Mapbox = isExpoGo ? null : require('@rnmapbox/maps').default;

type Props = StackScreenProps<HomeStackParamList, 'BookingTracking'>;

const { height } = Dimensions.get('window');
const PANEL_FULL = height * 0.52;
const PANEL_MINI = 72;

const MILESTONES = [
  { key: 'accepted',    labelKey: 'milestone_accepted',    statusTrigger: 'accepted' },
  { key: 'en_route',   labelKey: 'milestone_en_route',    timestampField: 'enRouteAt' },
  { key: 'arrived',    labelKey: 'milestone_arrived',     timestampField: 'arrivedAt' },
  { key: 'in_progress',labelKey: 'milestone_in_progress', statusTrigger: 'in_progress' },
  { key: 'completed',  labelKey: 'milestone_completed',   statusTrigger: 'completed' },
] as const;

export const BookingTrackingScreen = ({ route, navigation }: Props) => {
  const { tokens } = useAppTheme();


  const styles = useMemo(() => StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  error: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  errorButton: { marginTop: spacing.lg },

  markerContainer: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: colors.white, elevation: 4,
  },
  proMarker: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.success,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: colors.white, elevation: 4,
  },
  markerText: { fontSize: 18 },

  topActions: {
    position: 'absolute',
    top: spacing.xl + 8,
    left: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  fab: {
    backgroundColor: tokens.card,
    borderRadius: 24,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },

  bottomSheet: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: tokens.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    overflow: 'hidden',
  },

  handleRow: { alignItems: 'center', paddingVertical: 10 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: tokens.border },
  chevronIcon: { marginTop: 2 },

  statusBanner: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.sm,
    borderRadius: 10,
    alignItems: 'center',
  },
  statusBannerText: { color: colors.white, fontWeight: '700' },
  etaText: { color: 'rgba(255,255,255,0.9)', marginTop: 2, fontSize: 12 },

  panelContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },

  proHeader: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  proAvatar: { backgroundColor: tokens.primary },
  proInfo: { flex: 1 },
  proName: { color: tokens.text.primary, fontWeight: '600' },
  proDetails: { color: tokens.text.secondary, marginTop: 2 },

  infoCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
    backgroundColor: '#FFF3CD', borderRadius: 8,
    padding: spacing.sm, marginBottom: spacing.sm,
  },
  infoText: { flex: 1, color: tokens.text.primary, lineHeight: 18 },

  milestoneSection: {
    borderTopWidth: 1, borderTopColor: tokens.border,
    paddingTop: spacing.sm, marginBottom: spacing.sm,
  },
  milestone: {
    flexDirection: 'row', alignItems: 'flex-start',
    marginBottom: 4,
  },
  milestoneLeft: { width: 20, alignItems: 'center', marginRight: spacing.sm },
  milestoneCircle: {
    width: 14, height: 14, borderRadius: 7,
    borderWidth: 2, borderColor: tokens.border, backgroundColor: tokens.card,
  },
  milestoneDone: { backgroundColor: tokens.primary, borderColor: tokens.primary },
  milestoneLine: { width: 2, flex: 1, backgroundColor: tokens.border, marginTop: 2, minHeight: 16 },
  milestoneLineDone: { backgroundColor: tokens.primary },
  milestoneRight: { flex: 1, paddingBottom: 8 },
  milestoneLabel: { fontSize: 13, color: tokens.text.secondary },
  milestoneLabelDone: { color: tokens.text.primary, fontWeight: '600' },
  milestoneTime: { fontSize: 11, color: tokens.text.secondary, marginTop: 1 },

  actionRow: { marginTop: spacing.xs },
  actionBtn: {
    backgroundColor: tokens.primary,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  actionBtnText: { color: colors.white, fontWeight: '700', fontSize: 15 },

  waitingBadge: {
    backgroundColor: '#FFF3CD',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  waitingText: { color: '#92400E', fontSize: 13, fontWeight: '500' },

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
  }), [tokens]);

  const { bookingId, role } = route.params;
  const { t, i18n } = useTranslation();
  const locationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cameraRef = useRef<any>(null);
  const panelAnim = useRef(new Animated.Value(PANEL_FULL)).current;
  const [collapsed, setCollapsed] = useState(false);
  const [showCashModal, setShowCashModal] = useState(false);
  const [cashAmountInput, setCashAmountInput] = useState('');

  const { data, isLoading, refetch } = useGetBookingTrackingQuery(bookingId, {
    pollingInterval: 5000,
    refetchOnMountOrArgChange: true,
  });
  useRefetchOnFocus(refetch);

  const [markEnRoute, { isLoading: isEnRouteLoading }] = useMarkEnRouteMutation();
  const [markArrived, { isLoading: isArrivedLoading }] = useMarkArrivedMutation();
  const [updateProLocation] = useUpdateProLocationMutation();
  const [confirmCompletion, { isLoading: isCompletingLoading }] = useConfirmBookingCompletionMutation();

  const booking = data?.booking;
  const proLocation = data?.pro;

  const startLocationSharing = useCallback(() => {
    if (locationIntervalRef.current) return;
    locationIntervalRef.current = setInterval(async () => {
      try {
        const expLoc = require('expo-location');
        const { status } = await expLoc.getForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const loc = await expLoc.getCurrentPositionAsync({});
        await updateProLocation({ id: bookingId, lat: loc.coords.latitude, lng: loc.coords.longitude });
      } catch { /* silent */ }
    }, 10_000);
  }, [bookingId, updateProLocation]);

  const stopLocationSharing = useCallback(() => {
    if (locationIntervalRef.current) {
      clearInterval(locationIntervalRef.current);
      locationIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (role === 'pro' && booking && ['accepted', 'en_route', 'arrived', 'in_progress'].includes(booking.status)) {
      startLocationSharing();
    } else {
      stopLocationSharing();
    }
    return () => stopLocationSharing();
  }, [role, booking?.status]);

  useEffect(() => {
    if (!booking || isExpoGo || !cameraRef.current) return;
    const clientLat = booking.addressLat;
    const clientLng = booking.addressLng;
    if (!clientLat || !clientLng) return;
    const lats = [clientLat];
    const lngs = [clientLng];
    if (proLocation?.currentLat && proLocation?.currentLng) {
      lats.push(proLocation.currentLat);
      lngs.push(proLocation.currentLng);
    }
    const ne: [number, number] = [Math.max(...lngs), Math.max(...lats)];
    const sw: [number, number] = [Math.min(...lngs), Math.min(...lats)];
    cameraRef.current.fitBounds(ne, sw, [100, 50, collapsed ? 120 : 300, 50], 500);
  }, [booking, proLocation, collapsed]);

  const togglePanel = () => {
    const toValue = collapsed ? PANEL_FULL : PANEL_MINI;
    Animated.spring(panelAnim, { toValue, useNativeDriver: false, bounciness: 4 }).start();
    setCollapsed(!collapsed);
  };

  const handleEnRoute = async () => {
    await markEnRoute(bookingId);
    startLocationSharing();
    refetch();
  };

  const handleArrived = async () => {
    await markArrived(bookingId);
    refetch();
  };

  const handleStartWork = () => {
    navigation.navigate('ProProofPhotos', { bookingId, type: 'before', nextAction: 'start' });
  };

  const isCash = (booking as any)?.paymentMethod === 'cash';

  const handleProComplete = () => {
    navigation.navigate('ProProofPhotos', { bookingId, type: 'after', nextAction: 'complete', isCash });
  };

  const handleClientConfirm = () => {
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
                await confirmCompletion({ id: bookingId, role }).unwrap();
                refetch();
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
        role,
        ...(isNaN(cashAmount) ? {} : { cashAmount }),
      }).unwrap();
      refetch();
    } catch {
      Alert.alert(t('common.error'), t('booking.error_confirm'));
    }
  };

  const callPhone = (phone?: string) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`);
  };

  const handleShare = async () => {
    if (!booking) return;
    const webUrl = process.env.EXPO_PUBLIC_WEB_URL || '';
    const trackingLink = `${webUrl}/track/booking/${bookingId}`;
    const serviceName = (booking as any).category?.nameFr ?? (booking as any).category?.nameEn ?? '';
    const assignedPro = proName ?? t('booking_tracking.waiting_pro');
    const message =
      t('booking.share_message', {
        service: serviceName,
        address: (booking as any).address ?? '',
        pro: assignedPro,
        status: t(`status.${booking.status}`),
      }) + `\n\n🔗 ${trackingLink}`;
    await Share.share({ message });
  };

  const getMilestoneState = (milestone: typeof MILESTONES[number]) => {
    if (!booking) return 'pending';
    if ('timestampField' in milestone) {
      return (booking as any)[milestone.timestampField] ? 'done' : 'pending';
    }
    const statusOrder = ['pending', 'accepted', 'en_route', 'arrived', 'in_progress', 'completed', 'cancelled'];
    const currentIdx = statusOrder.indexOf(booking.status);
    const triggerIdx = statusOrder.indexOf(milestone.statusTrigger);
    return currentIdx >= triggerIdx ? 'done' : 'pending';
  };

  const statusBannerKey =
    booking?.status === 'en_route'    ? 'pro_en_route' :
    booking?.status === 'arrived'     ? 'pro_arrived'  :
    booking?.status === 'in_progress' ? 'pro_working'  :
    booking?.status === 'completed'   ? 'completed'    :
    'waiting_pro';

  const statusColor =
    booking?.status === 'completed'   ? colors.success :
    booking?.status === 'in_progress' ? tokens.primary :
    booking?.status === 'cancelled'   ? colors.error   :
    '#F59E0B';

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={tokens.primary} />
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.error}>
        <Text variant="titleLarge">{t('booking_tracking.tracking_unavailable')}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.errorButton}>
          <Text style={{ color: tokens.primary }}>{t('common.back')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const clientLat = booking.addressLat;
  const clientLng = booking.addressLng;
  const proLat = proLocation?.currentLat;
  const proLng = proLocation?.currentLng;
  const hasProLocation = !!(proLat && proLng);

  const renderMap = () => {
    if (!clientLat || !clientLng) return <View style={StyleSheet.absoluteFill} />;

    if (isExpoGo) {
      return (
        <RNMapView
          style={StyleSheet.absoluteFill}
          initialRegion={{
            latitude: proLat ?? clientLat,
            longitude: proLng ?? clientLng,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
        >
          <Marker
            coordinate={{ latitude: clientLat, longitude: clientLng }}
            title={t('booking_tracking.your_address')}
            pinColor={tokens.primary}
          />
          {hasProLocation && (
            <Marker
              coordinate={{ latitude: proLat!, longitude: proLng! }}
              title={t('booking_tracking.pro_location')}
            >
              <View style={styles.proMarker}><Text style={styles.markerText}>🔧</Text></View>
            </Marker>
          )}
        </RNMapView>
      );
    }

    const clientCoord: [number, number] = [clientLng, clientLat];
    const proCoord: [number, number] | null = hasProLocation ? [proLng!, proLat!] : null;

    return (
      <Mapbox.MapView style={StyleSheet.absoluteFill}>
        <Mapbox.Camera
          ref={cameraRef}
          defaultSettings={{ centerCoordinate: clientCoord, zoomLevel: 13 }}
        />
        <Mapbox.PointAnnotation id="client" coordinate={clientCoord}>
          <View style={[styles.markerContainer, { backgroundColor: tokens.primary }]}>
            <Text style={styles.markerText}>📍</Text>
          </View>
          <Mapbox.Callout title={t('booking_tracking.your_address')} />
        </Mapbox.PointAnnotation>
        {proCoord && (
          <Mapbox.PointAnnotation id="pro" coordinate={proCoord}>
            <View style={[styles.markerContainer, { backgroundColor: colors.success }]}>
              <Text style={styles.markerText}>🔧</Text>
            </View>
            <Mapbox.Callout title={proLocation?.proName || t('booking_tracking.pro_location')} />
          </Mapbox.PointAnnotation>
        )}
      </Mapbox.MapView>
    );
  };

  const contactPhone = role === 'client' ? proLocation?.phone : booking.client?.phone;
  const contactLabel = role === 'client' ? t('booking_tracking.contact_pro') : t('booking_tracking.contact_client');
  const proName = proLocation?.proName || undefined;

  const clientConfirmed = !!(booking as any).clientConfirmedCompletion;
  const proConfirmed = !!(booking as any).proConfirmedCompletion;

  return (
    <View style={styles.container}>
      {/* Carte plein écran */}
      {renderMap()}

      {/* Boutons flottants */}
      <View style={styles.topActions}>
        <IconButton
          icon="arrow-left"
          size={22}
          iconColor={tokens.text.primary}
          style={styles.fab}
          onPress={() => navigation.goBack()}
        />
        <IconButton
          icon="share-variant"
          size={22}
          iconColor={tokens.text.primary}
          style={styles.fab}
          onPress={handleShare}
        />
      </View>

      {/* Panneau inférieur escamotable */}
      <Animated.View style={[styles.bottomSheet, { height: panelAnim }]}>
        {/* Poignée + toggle */}
        <TouchableOpacity style={styles.handleRow} onPress={togglePanel} activeOpacity={0.7}>
          <View style={styles.handle} />
          <Icon
            name={collapsed ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={tokens.text.secondary}
            style={styles.chevronIcon}
          />
        </TouchableOpacity>

        {/* Statut — toujours visible */}
        <View style={[styles.statusBanner, { backgroundColor: statusColor }]}>
          <Text variant="titleMedium" style={styles.statusBannerText}>
            {t(`booking_tracking.${statusBannerKey}`)}
          </Text>
          {proLocation?.lastLocationUpdate && (
            <Text variant="bodySmall" style={styles.etaText}>
              ⏱️{' '}
              {new Date(proLocation.lastLocationUpdate).toLocaleTimeString(i18n.language, {
                hour: '2-digit', minute: '2-digit',
              })}
            </Text>
          )}
        </View>

        {/* Contenu étendu */}
        {!collapsed && (
          <View style={styles.panelContent}>
            {/* Info pro avec bouton appel */}
            {(proName || contactPhone) && (
              <View style={styles.proHeader}>
                <Avatar.Icon size={48} icon="account-hard-hat" style={styles.proAvatar} />
                <View style={styles.proInfo}>
                  {proName && (
                    <Text variant="titleMedium" style={styles.proName}>{proName}</Text>
                  )}
                  {contactPhone && (
                    <Text variant="bodySmall" style={styles.proDetails}>📞 {contactPhone}</Text>
                  )}
                </View>
                {contactPhone && (
                  <IconButton
                    icon="phone"
                    size={22}
                    iconColor={colors.white}
                    containerColor={colors.success}
                    onPress={() => callPhone(contactPhone)}
                  />
                )}
              </View>
            )}

            {/* Localisation indisponible */}
            {!hasProLocation && booking.status !== 'accepted' && (
              <View style={styles.infoCard}>
                <Icon name="map-marker-off" size={24} color={colors.warning} />
                <Text variant="bodySmall" style={styles.infoText}>
                  {t('booking_tracking.pro_location_unavailable')}
                </Text>
              </View>
            )}

            {/* Timeline milestones */}
            <View style={styles.milestoneSection}>
              {MILESTONES.map((m, idx) => {
                const state = getMilestoneState(m);
                return (
                  <View key={m.key} style={styles.milestone}>
                    <View style={styles.milestoneLeft}>
                      <View style={[styles.milestoneCircle, state === 'done' && styles.milestoneDone]} />
                      {idx < MILESTONES.length - 1 && (
                        <View style={[styles.milestoneLine, state === 'done' && styles.milestoneLineDone]} />
                      )}
                    </View>
                    <View style={styles.milestoneRight}>
                      <Text style={[styles.milestoneLabel, state === 'done' && styles.milestoneLabelDone]}>
                        {t(`booking_tracking.${m.labelKey}`)}
                      </Text>
                      {'timestampField' in m && (booking as any)[m.timestampField] && (
                        <Text style={styles.milestoneTime}>
                          {new Date((booking as any)[m.timestampField]).toLocaleTimeString(i18n.language, {
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Boutons action pro */}
            {role === 'pro' && (
              <View style={styles.actionRow}>
                {booking.status === 'accepted' && (
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={handleEnRoute}
                    disabled={isEnRouteLoading}
                  >
                    {isEnRouteLoading
                      ? <ActivityIndicator size="small" color={colors.white} />
                      : <Text style={styles.actionBtnText}>{t('booking_tracking.btn_en_route')}</Text>
                    }
                  </TouchableOpacity>
                )}
                {booking.status === 'en_route' && (
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={handleArrived}
                    disabled={isArrivedLoading}
                  >
                    {isArrivedLoading
                      ? <ActivityIndicator size="small" color={colors.white} />
                      : <Text style={styles.actionBtnText}>{t('booking_tracking.btn_arrived')}</Text>
                    }
                  </TouchableOpacity>
                )}
                {booking.status === 'arrived' && (
                  <TouchableOpacity style={styles.actionBtn} onPress={handleStartWork}>
                    <Text style={styles.actionBtnText}>{t('booking_tracking.btn_start_work')}</Text>
                  </TouchableOpacity>
                )}
                {booking.status === 'in_progress' && !proConfirmed && (
                  <TouchableOpacity style={styles.actionBtn} onPress={handleProComplete}>
                    <Text style={styles.actionBtnText}>{t('booking_tracking.btn_complete')}</Text>
                  </TouchableOpacity>
                )}
                {booking.status === 'in_progress' && proConfirmed && (
                  <View style={styles.waitingBadge}>
                    <Text style={styles.waitingText}>{t('booking.waiting_client_confirm')}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Bouton confirmation client */}
            {role === 'client' && booking.status === 'in_progress' && (
              <View style={styles.actionRow}>
                {clientConfirmed ? (
                  <View style={styles.waitingBadge}>
                    <Text style={styles.waitingText}>⏳ {t('booking.waiting_pro_confirm')}</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={handleClientConfirm}
                    disabled={isCompletingLoading}
                  >
                    {isCompletingLoading
                      ? <ActivityIndicator size="small" color={colors.white} />
                      : <Text style={styles.actionBtnText}>{t('booking_tracking.btn_confirm_completion')}</Text>
                    }
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}
      </Animated.View>

      {/* Modal saisie montant cash */}
      <Modal visible={showCashModal} transparent animationType="fade" onRequestClose={() => setShowCashModal(false)}>
        <View style={styles.cashModalOverlay}>
          <View style={styles.cashModalBox}>
            <Text style={styles.cashModalTitle}>{t('booking.cash_amount_title')}</Text>
            <Text style={styles.cashModalMsg}>
              {role === 'client' ? t('booking.cash_amount_msg_client') : t('booking.cash_amount_msg_pro')}
            </Text>
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
              <TouchableOpacity style={styles.cashModalCancel} onPress={() => setShowCashModal(false)}>
                <Text style={{ color: tokens.text.secondary, fontWeight: '600' }}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.cashModalConfirm, isCompletingLoading && { opacity: 0.5 }]}
                onPress={submitCashConfirmation}
                disabled={isCompletingLoading}
              >
                <Text style={{ color: colors.white, fontWeight: '700' }}>
                  {isCompletingLoading ? t('common.loading') : t('common.confirm')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};
