import React, { useEffect, useRef, useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { Text, Card, Button, Chip, TextInput } from 'react-native-paper';
import { StackScreenProps } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { HomeStackParamList } from '../../navigation/types';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import {
  useGetBookingTrackingQuery,
  useMarkEnRouteMutation,
  useMarkArrivedMutation,
  useUpdateProLocationMutation,
  useConfirmBookingCompletionMutation,
} from '../../store/api/bookingsApi';
import { useRefetchOnFocus } from '../../hooks/useRefetchOnFocus';

type Props = StackScreenProps<HomeStackParamList, 'BookingTracking'>;

const MILESTONES = [
  { key: 'accepted',    labelKey: 'milestone_accepted',    statusTrigger: 'accepted' },
  { key: 'en_route',   labelKey: 'milestone_en_route',    timestampField: 'enRouteAt' },
  { key: 'arrived',    labelKey: 'milestone_arrived',     timestampField: 'arrivedAt' },
  { key: 'in_progress',labelKey: 'milestone_in_progress', statusTrigger: 'in_progress' },
  { key: 'completed',  labelKey: 'milestone_completed',   statusTrigger: 'completed' },
] as const;

const isExpoGo = () => {
  try {
    return !!require('expo-constants').default?.executionEnvironment &&
      require('expo-constants').default.executionEnvironment === 'storeClient';
  } catch {
    return false;
  }
};

export const BookingTrackingScreen = ({ route, navigation }: Props) => {
  const { bookingId, role } = route.params;
  const { t, i18n } = useTranslation();
  const locationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
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

  const renderMap = () => {
    const clientLat = booking?.addressLat;
    const clientLng = booking?.addressLng;
    const proLat = proLocation?.currentLat;
    const proLng = proLocation?.currentLng;

    if (!clientLat || !clientLng) return null;

    if (isExpoGo()) {
      const MapView = require('react-native-maps').default;
      const { Marker } = require('react-native-maps');
      return (
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: proLat ?? clientLat,
            longitude: proLng ?? clientLng,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
        >
          <Marker coordinate={{ latitude: clientLat, longitude: clientLng }} title={t('booking_tracking.your_address')} pinColor={colors.primary} />
          {proLat && proLng && (
            <Marker coordinate={{ latitude: proLat, longitude: proLng }} title={t('booking_tracking.pro_location')} pinColor={colors.success ?? '#4CAF50'} />
          )}
        </MapView>
      );
    }

    const Mapbox = require('@rnmapbox/maps').default;
    const MapboxCamera = require('@rnmapbox/maps').Camera;
    const MapboxPointAnnotation = require('@rnmapbox/maps').PointAnnotation;
    return (
      <Mapbox.MapView style={styles.map}>
        <MapboxCamera
          centerCoordinate={[proLng ?? clientLng, proLat ?? clientLat]}
          zoomLevel={13}
          animationMode="flyTo"
        />
        <MapboxPointAnnotation id="client" coordinate={[clientLng, clientLat]}>
          <View style={styles.markerClient} />
        </MapboxPointAnnotation>
        {proLat && proLng && (
          <MapboxPointAnnotation id="pro" coordinate={[proLng, proLat]}>
            <View style={styles.markerPro} />
          </MapboxPointAnnotation>
        )}
      </Mapbox.MapView>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.centered}>
        <Text>{t('booking_tracking.tracking_unavailable')}</Text>
      </View>
    );
  }

  const statusBannerKey =
    booking.status === 'en_route'    ? 'pro_en_route' :
    booking.status === 'arrived'     ? 'pro_arrived'  :
    booking.status === 'in_progress' ? 'pro_working'  :
    booking.status === 'completed'   ? 'completed'    :
    'waiting_pro';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Status banner */}
      <Card style={[styles.bannerCard, { backgroundColor: booking.status === 'completed' ? '#E8F5E9' : colors.lightBlue ?? '#EBF4FF' }]}>
        <Card.Content>
          <Text style={styles.bannerText}>{t(`booking_tracking.${statusBannerKey}`)}</Text>
          {proLocation?.lastLocationUpdate && (
            <Text style={styles.lastUpdate}>
              {t('booking_tracking.last_update', {
                time: new Date(proLocation.lastLocationUpdate).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' }),
              })}
            </Text>
          )}
        </Card.Content>
      </Card>

      {/* Map */}
      {renderMap()}

      {/* Milestone timeline */}
      <Card style={styles.card}>
        <Card.Content>
          {MILESTONES.map((m, idx) => {
            const state = getMilestoneState(m);
            return (
              <View key={m.key} style={styles.milestone}>
                <View style={[styles.milestoneCircle, state === 'done' && styles.milestoneDone]} />
                {idx < MILESTONES.length - 1 && (
                  <View style={[styles.milestoneLine, state === 'done' && styles.milestoneLineDone]} />
                )}
                <Text style={[styles.milestoneLabel, state === 'done' && styles.milestoneLabelDone]}>
                  {t(`booking_tracking.${m.labelKey}`)}
                </Text>
                {'timestampField' in m && (booking as any)[m.timestampField] && (
                  <Text style={styles.milestoneTime}>
                    {new Date((booking as any)[m.timestampField]).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                )}
              </View>
            );
          })}
        </Card.Content>
      </Card>

      {/* Pro action buttons (role = pro) */}
      {role === 'pro' && (
        <Card style={styles.card}>
          <Card.Content style={styles.actionRow}>
            {booking.status === 'accepted' && (
              <Button mode="contained" onPress={handleEnRoute} loading={isEnRouteLoading} style={styles.actionBtn}>
                {t('booking_tracking.btn_en_route')}
              </Button>
            )}
            {booking.status === 'en_route' && (
              <Button mode="contained" onPress={handleArrived} loading={isArrivedLoading} style={styles.actionBtn}>
                {t('booking_tracking.btn_arrived')}
              </Button>
            )}
            {booking.status === 'arrived' && (
              <Button mode="contained" onPress={handleStartWork} style={styles.actionBtn}>
                {t('booking_tracking.btn_start_work')}
              </Button>
            )}
            {booking.status === 'in_progress' && !(booking as any).proConfirmedCompletion && (
              <Button mode="contained" onPress={handleProComplete} style={styles.actionBtn}>
                {t('booking_tracking.btn_complete')}
              </Button>
            )}
            {booking.status === 'in_progress' && !!(booking as any).proConfirmedCompletion && (
              <Text style={{ fontSize: 13, color: colors.gray, textAlign: 'center', flex: 1 }}>
                {t('booking.waiting_client_confirm')}
              </Text>
            )}
          </Card.Content>
        </Card>
      )}

      {/* Client confirm completion */}
      {role === 'client' && booking.status === 'in_progress' && (() => {
        const clientConfirmed = !!(booking as any).clientConfirmedCompletion;
        if (clientConfirmed) {
          return (
            <Card style={[styles.card, { borderColor: '#F59E0B40' }]}>
              <Card.Content style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 16 }}>⏳</Text>
                <Text style={{ fontSize: 13, color: '#92400E', flex: 1 }}>{t('booking.waiting_pro_confirm')}</Text>
              </Card.Content>
            </Card>
          );
        }
        return (
          <Card style={styles.card}>
            <Card.Content>
              <Button mode="contained" onPress={handleClientConfirm} loading={isCompletingLoading} style={styles.actionBtn}>
                {t('booking_tracking.btn_confirm_completion')}
              </Button>
            </Card.Content>
          </Card>
        );
      })()}

      {/* Contact card */}
      {(proLocation?.phone || booking.client?.phone) && (
        <Card style={styles.card}>
          <Card.Content>
            <TouchableOpacity
              style={styles.contactRow}
              onPress={() => callPhone(role === 'client' ? proLocation?.phone : booking.client?.phone)}
            >
              <Text style={styles.contactLabel}>
                {role === 'client' ? t('booking_tracking.contact_pro') : t('booking_tracking.contact_client')}
              </Text>
              <Chip icon="phone" style={styles.phoneChip}>
                {role === 'client' ? proLocation?.phone : booking.client?.phone}
              </Chip>
            </TouchableOpacity>
          </Card.Content>
        </Card>
      )}
      {/* Modal saisie montant cash (client + pro) */}
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
              outlineColor={colors.border}
              activeOutlineColor={colors.primary}
              style={{ backgroundColor: colors.white, marginTop: spacing.sm }}
              right={<TextInput.Affix text="EGP" />}
            />
            <View style={styles.cashModalActions}>
              <TouchableOpacity style={styles.cashModalCancel} onPress={() => setShowCashModal(false)}>
                <Text style={{ color: colors.gray, fontWeight: '600' }}>{t('common.cancel')}</Text>
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

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  bannerCard: { borderRadius: 12, marginBottom: spacing.sm },
  bannerText: { fontSize: 16, fontWeight: '700', color: colors.dark, textAlign: 'center' },
  lastUpdate: { fontSize: 11, color: colors.gray, textAlign: 'center', marginTop: 4 },
  map: { height: 220, borderRadius: 12, marginBottom: spacing.sm, overflow: 'hidden' },
  markerClient: { width: 16, height: 16, borderRadius: 8, backgroundColor: colors.primary, borderWidth: 2, borderColor: colors.white },
  markerPro: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#4CAF50', borderWidth: 2, borderColor: colors.white },
  card: { borderRadius: 12, marginBottom: spacing.sm, elevation: 2 },
  milestone: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs, position: 'relative' },
  milestoneCircle: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.white, marginRight: spacing.sm },
  milestoneDone: { backgroundColor: colors.primary, borderColor: colors.primary },
  milestoneLine: { position: 'absolute', left: 7, top: 16, width: 2, height: 20, backgroundColor: colors.border },
  milestoneLineDone: { backgroundColor: colors.primary },
  milestoneLabel: { flex: 1, fontSize: 14, color: colors.gray },
  milestoneLabelDone: { color: colors.dark, fontWeight: '600' },
  milestoneTime: { fontSize: 12, color: colors.gray },
  actionRow: { gap: spacing.sm },
  actionBtn: { backgroundColor: colors.primary, borderRadius: 8 },
  contactRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  contactLabel: { fontSize: 14, color: colors.dark },
  phoneChip: { backgroundColor: colors.lightBlue ?? '#EBF4FF' },
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
});
