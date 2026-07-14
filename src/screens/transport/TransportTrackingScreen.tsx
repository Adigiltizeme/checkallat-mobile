import React, { useEffect, useRef, useState, useMemo } from 'react';
import { View, StyleSheet, Dimensions, Linking, Share, TouchableOpacity, Animated } from 'react-native';
import { Text, Avatar, ActivityIndicator, IconButton } from 'react-native-paper';
import Constants from 'expo-constants';
import { StackScreenProps } from '@react-navigation/stack';
import { colors } from '../../theme/colors';
import { useAppTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/spacing';
import { useGetTrackingInfoQuery, useGetTransportRequestQuery } from '../../store/api/transportApi';
import { useGetCallRelayNumberQuery } from '../../store/api/communicationApi';
import { useTranslation } from 'react-i18next';
import { STATUS_COLORS, TransportStatus } from '../../types/transport';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const isExpoGo = Constants.appOwnership === 'expo';

import RNMapView, { Marker, Polyline } from 'react-native-maps';
const Mapbox = isExpoGo ? null : require('@rnmapbox/maps').default;

type Props = StackScreenProps<any, 'TransportTracking'>;

const { width, height } = Dimensions.get('window');
const PANEL_FULL   = height * 0.52;
const PANEL_MINI   = 72; // hauteur réduite : handle + statut uniquement

export const TransportTrackingScreen = ({ route, navigation }: Props) => {
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
  driverMarker: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: tokens.primary,
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

  handleRow: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  handle: {
    width: 40, height: 4,
    borderRadius: 2,
    backgroundColor: tokens.border,
  },
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

  driverHeader: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  driverAvatar: { backgroundColor: tokens.primary },
  driverInfo: { flex: 1 },
  driverName: { color: tokens.text.primary, fontWeight: '600' },
  driverDetails: { color: tokens.text.secondary, marginTop: 2 },
  trackingContactBtns: { flexDirection: 'row', gap: 8, marginLeft: 4 },
  trackingCallBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: colors.success,
    alignItems: 'center', justifyContent: 'center',
  },
  trackingMsgBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: `${tokens.primary}20`,
    borderWidth: 1, borderColor: tokens.primary,
    alignItems: 'center', justifyContent: 'center',
  },

  infoCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
    backgroundColor: '#FFF3CD', borderRadius: 8,
    padding: spacing.sm, marginBottom: spacing.sm,
  },
  infoText: { flex: 1, color: tokens.text.primary, lineHeight: 18 },

  locationInfo: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    padding: spacing.xs,
    backgroundColor: `${colors.success}12`,
    borderRadius: 6, marginBottom: spacing.sm,
  },
  locationText: { color: colors.success, fontWeight: '500', fontSize: 12 },

  routeSection: {
    borderTopWidth: 1, borderTopColor: tokens.border,
    paddingTop: spacing.sm,
  },
  routeItem: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginVertical: 2 },
  routeContent: { flex: 1 },
  routeLabel: { color: tokens.text.secondary, fontSize: 10, textTransform: 'uppercase', fontWeight: '600' },
  routeAddress: { color: tokens.text.primary, fontSize: 13, marginTop: 1 },
  routeDivider: { paddingLeft: 6, marginVertical: 2 },
  }), [tokens]);

  const { t, i18n } = useTranslation();
  const { requestId } = route.params as { requestId: string };
  const cameraRef = useRef<any>(null);
  const panelAnim = useRef(new Animated.Value(PANEL_FULL)).current;
  const [collapsed, setCollapsed] = useState(false);

  const { data: request, isLoading: requestLoading } = useGetTransportRequestQuery(requestId, {
    pollingInterval: 5000,
    refetchOnMountOrArgChange: true,
  });
  const { data: trackingInfo } = useGetTrackingInfoQuery(requestId, {
    pollingInterval: 10000,
  });

  // Rediriger vers TransportCompletion quand livraison terminée
  useEffect(() => {
    if (request?.status === 'completed' && !request?.clientConfirmedCompletion) {
      navigation.replace('TransportCompletion', { requestId });
    }
  }, [request?.status]);

  useEffect(() => {
    if (!request || isExpoGo) return;
    if (!cameraRef.current) return;
    const lngs = [request.pickup.lng, request.delivery.lng];
    const lats = [request.pickup.lat, request.delivery.lat];
    if (trackingInfo?.driverLat && trackingInfo?.driverLng) {
      lngs.push(trackingInfo.driverLng);
      lats.push(trackingInfo.driverLat);
    }
    const ne: [number, number] = [Math.max(...lngs), Math.max(...lats)];
    const sw: [number, number] = [Math.min(...lngs), Math.min(...lats)];
    cameraRef.current.fitBounds(ne, sw, [100, 50, collapsed ? 120 : 300, 50], 500);
  }, [request, trackingInfo, collapsed]);

  const togglePanel = () => {
    const toValue = collapsed ? PANEL_FULL : PANEL_MINI;
    Animated.spring(panelAnim, { toValue, useNativeDriver: false, bounciness: 4 }).start();
    setCollapsed(!collapsed);
  };

  const CONTACT_STATUSES = ['driver_assigned', 'driver_en_route_pickup', 'arrived_pickup', 'in_transit'];
  const canContact = !!(request && CONTACT_STATUSES.includes(request.status) && request.driverId);
  const driverName = trackingInfo?.driverName || '';
  const { data: callRelay } = useGetCallRelayNumberQuery(
    { entityType: 'transport', entityId: requestId },
    { skip: !canContact },
  );

  const handleShare = async () => {
    if (!request) return;
    const driver = trackingInfo?.driverName || t('transport.assigned_driver');
    const status = t('status.' + request.status);
    const webUrl = process.env.EXPO_PUBLIC_WEB_URL || '';
    const trackingLink = `${webUrl}/track/${requestId}`;
    const message =
      t('transport.share_tracking_message', {
        pickup: request.pickup.address,
        delivery: request.delivery.address,
        driver,
        status,
      }) + `\n\n🔗 ${trackingLink}`;
    await Share.share({ message });
  };

  if (requestLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={tokens.primary} />
      </View>
    );
  }

  if (!request) {
    return (
      <View style={styles.error}>
        <Text variant="titleLarge">{t('transport.request_not_found')}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.errorButton}>
          <Text style={{ color: tokens.primary }}>{t('common.back')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const hasDriverLocation = !!(trackingInfo?.driverLat && trackingInfo?.driverLng);
  const statusColor = STATUS_COLORS[request.status as TransportStatus];
  const pickupCoord: [number, number] = [request.pickup.lng, request.pickup.lat];
  const deliveryCoord: [number, number] = [request.delivery.lng, request.delivery.lat];
  const driverCoord: [number, number] | null = hasDriverLocation
    ? [trackingInfo!.driverLng!, trackingInfo!.driverLat!]
    : null;

  const routeShape = {
    type: 'Feature' as const,
    geometry: { type: 'LineString' as const, coordinates: [pickupCoord, deliveryCoord] },
    properties: {},
  };

  const renderMap = () => {
    if (isExpoGo) {
      const region = {
        latitude: (request.pickup.lat + request.delivery.lat) / 2,
        longitude: (request.pickup.lng + request.delivery.lng) / 2,
        latitudeDelta: Math.abs(request.pickup.lat - request.delivery.lat) * 2 + 0.02,
        longitudeDelta: Math.abs(request.pickup.lng - request.delivery.lng) * 2 + 0.02,
      };
      return (
        <RNMapView style={StyleSheet.absoluteFill} initialRegion={region}>
          <Marker coordinate={{ latitude: request.pickup.lat, longitude: request.pickup.lng }}
            title={t('transport.loading_point')} description={request.pickup.address} pinColor="green" />
          <Marker coordinate={{ latitude: request.delivery.lat, longitude: request.delivery.lng }}
            title={t('transport.delivery_point')} description={request.delivery.address} pinColor="red" />
          {driverCoord && (
            <Marker coordinate={{ latitude: driverCoord[1], longitude: driverCoord[0] }}
              title={trackingInfo?.driverName || 'Chauffeur'}>
              <View style={styles.driverMarker}><Text style={styles.markerText}>🚚</Text></View>
            </Marker>
          )}
          <Polyline
            coordinates={[
              { latitude: request.pickup.lat, longitude: request.pickup.lng },
              { latitude: request.delivery.lat, longitude: request.delivery.lng },
            ]}
            strokeColor={tokens.primary} strokeWidth={3} lineDashPattern={[8, 4]}
          />
        </RNMapView>
      );
    }

    return (
      <Mapbox.MapView style={StyleSheet.absoluteFill}>
        <Mapbox.Camera ref={cameraRef}
          defaultSettings={{ centerCoordinate: pickupCoord, zoomLevel: 10 }} />
        <Mapbox.PointAnnotation id="pickup" coordinate={pickupCoord}>
          <View style={[styles.markerContainer, { backgroundColor: colors.success }]}>
            <Text style={styles.markerText}>📍</Text>
          </View>
          <Mapbox.Callout title={t('transport.loading_point')} />
        </Mapbox.PointAnnotation>
        <Mapbox.PointAnnotation id="delivery" coordinate={deliveryCoord}>
          <View style={[styles.markerContainer, { backgroundColor: colors.error }]}>
            <Text style={styles.markerText}>🏁</Text>
          </View>
          <Mapbox.Callout title={t('transport.delivery_point')} />
        </Mapbox.PointAnnotation>
        {driverCoord && (
          <Mapbox.PointAnnotation id="driver" coordinate={driverCoord}>
            <View style={[styles.markerContainer, { backgroundColor: tokens.primary }]}>
              <Text style={styles.markerText}>🚚</Text>
            </View>
            <Mapbox.Callout title={trackingInfo?.driverName || 'Driver'} />
          </Mapbox.PointAnnotation>
        )}
        <Mapbox.ShapeSource id="routeSource" shape={routeShape}>
          <Mapbox.LineLayer id="routeLine"
            style={{ lineColor: tokens.primary, lineWidth: 3, lineDasharray: [2, 2] }} />
        </Mapbox.ShapeSource>
      </Mapbox.MapView>
    );
  };

  return (
    <View style={styles.container}>
      {/* Carte plein écran */}
      {renderMap()}

      {/* Boutons flottants haut-droite */}
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
            {t('status.' + request.status)}
          </Text>
          {trackingInfo?.estimatedArrival && (
            <Text variant="bodySmall" style={styles.etaText}>
              ⏱️ {t('transport.eta_label')}{' '}
              {new Date(trackingInfo.estimatedArrival).toLocaleDateString(i18n.language, {
                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
              })}
            </Text>
          )}
        </View>

        {/* Contenu étendu */}
        {!collapsed && (
          <View style={styles.panelContent}>
            {trackingInfo?.driverName && (
              <View style={styles.driverHeader}>
                <Avatar.Icon size={48} icon="account" style={styles.driverAvatar} />
                <View style={styles.driverInfo}>
                  <Text variant="titleMedium" style={styles.driverName}>{trackingInfo.driverName}</Text>
                </View>
                {canContact && (
                  <View style={styles.trackingContactBtns}>
                    <TouchableOpacity
                      style={styles.trackingCallBtn}
                      onPress={() => { if (callRelay?.relayNumber) Linking.openURL(`tel:${callRelay.relayNumber}`); }}
                    >
                      <Icon name="phone" size={18} color={colors.white} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.trackingMsgBtn}
                      onPress={() => navigation.navigate('BookingChat', { entityType: 'transport', entityId: requestId, otherPartyName: driverName })}
                    >
                      <Icon name="message-text" size={18} color={tokens.primary} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {!hasDriverLocation && request.driverId && (
              <View style={styles.infoCard}>
                <Icon name="map-marker-off" size={24} color={colors.warning} />
                <Text variant="bodySmall" style={styles.infoText}>
                  {t('transport.position_unavailable_message')}
                </Text>
              </View>
            )}

            {hasDriverLocation && trackingInfo!.lastUpdate && (
              <View style={styles.locationInfo}>
                <Icon name="map-marker-check" size={16} color={colors.success} />
                <Text variant="bodySmall" style={styles.locationText}>
                  {t('transport.position_updated')}:{' '}
                  {new Date(trackingInfo!.lastUpdate).toLocaleTimeString(i18n.language, {
                    hour: '2-digit', minute: '2-digit',
                  })}
                </Text>
              </View>
            )}

            <View style={styles.routeSection}>
              <View style={styles.routeItem}>
                <Icon name="circle" size={14} color={colors.success} />
                <View style={styles.routeContent}>
                  <Text variant="bodySmall" style={styles.routeLabel}>{t('transport.loading_point')}</Text>
                  <Text variant="bodySmall" style={styles.routeAddress} numberOfLines={1}>
                    {request.pickup.address}
                  </Text>
                </View>
              </View>
              <View style={styles.routeDivider}>
                <Icon name="dots-vertical" size={16} color={tokens.text.secondary} />
              </View>
              <View style={styles.routeItem}>
                <Icon name="circle" size={14} color={colors.error} />
                <View style={styles.routeContent}>
                  <Text variant="bodySmall" style={styles.routeLabel}>{t('transport.delivery_point')}</Text>
                  <Text variant="bodySmall" style={styles.routeAddress} numberOfLines={1}>
                    {request.delivery.address}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </Animated.View>
    </View>
  );
};
