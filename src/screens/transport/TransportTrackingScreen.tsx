import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Linking } from 'react-native';
import { Text, Card, Button, Avatar, ActivityIndicator, IconButton } from 'react-native-paper';
import Mapbox from '@rnmapbox/maps';
import { StackScreenProps } from '@react-navigation/stack';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { useGetTrackingInfoQuery, useGetTransportRequestQuery } from '../../store/api/transportApi';
import { useTranslation } from 'react-i18next';
import { STATUS_COLORS, TransportStatus } from '../../types/transport';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

type Props = StackScreenProps<any, 'TransportTracking'>;

const { width, height } = Dimensions.get('window');

export const TransportTrackingScreen = ({ route, navigation }: Props) => {
  const { t, i18n } = useTranslation();
  const { requestId } = route.params as { requestId: string };
  const cameraRef = useRef<Mapbox.Camera>(null);

  const { data: request, isLoading: requestLoading } = useGetTransportRequestQuery(requestId);
  const { data: trackingInfo } = useGetTrackingInfoQuery(requestId, {
    pollingInterval: 10000,
  });

  useEffect(() => {
    if (!request || !cameraRef.current) return;

    const lngs = [request.pickup.lng, request.delivery.lng];
    const lats = [request.pickup.lat, request.delivery.lat];

    if (trackingInfo?.driverLat && trackingInfo?.driverLng) {
      lngs.push(trackingInfo.driverLng);
      lats.push(trackingInfo.driverLat);
    }

    const ne: [number, number] = [Math.max(...lngs), Math.max(...lats)];
    const sw: [number, number] = [Math.min(...lngs), Math.min(...lats)];

    cameraRef.current.fitBounds(ne, sw, [100, 50, 300, 50], 500);
  }, [request, trackingInfo]);

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  if (requestLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!request) {
    return (
      <View style={styles.error}>
        <Text variant="titleLarge">{t('transport.request_not_found')}</Text>
        <Button mode="outlined" onPress={() => navigation.goBack()} style={styles.errorButton}>
          {t('common.back')}
        </Button>
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
    geometry: {
      type: 'LineString' as const,
      coordinates: [pickupCoord, deliveryCoord],
    },
    properties: {},
  };

  return (
    <View style={styles.container}>
      <Mapbox.MapView style={styles.map}>
        <Mapbox.Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: pickupCoord,
            zoomLevel: 10,
          }}
        />

        {/* Marker Pickup */}
        <Mapbox.PointAnnotation id="pickup" coordinate={pickupCoord}>
          <View style={[styles.markerContainer, { backgroundColor: colors.success }]}>
            <Text style={styles.markerText}>📍</Text>
          </View>
          <Mapbox.Callout title={t('transport.loading_point')} />
        </Mapbox.PointAnnotation>

        {/* Marker Delivery */}
        <Mapbox.PointAnnotation id="delivery" coordinate={deliveryCoord}>
          <View style={[styles.markerContainer, { backgroundColor: colors.error }]}>
            <Text style={styles.markerText}>🏁</Text>
          </View>
          <Mapbox.Callout title={t('transport.delivery_point')} />
        </Mapbox.PointAnnotation>

        {/* Marker Driver */}
        {driverCoord && (
          <Mapbox.PointAnnotation
            id="driver"
            coordinate={driverCoord}
          >
            <View style={[styles.markerContainer, { backgroundColor: colors.primary }]}>
              <Text style={styles.markerText}>🚚</Text>
            </View>
            <Mapbox.Callout title={trackingInfo?.driverName || 'Driver'} />
          </Mapbox.PointAnnotation>
        )}

        {/* Route polyline */}
        <Mapbox.ShapeSource id="routeSource" shape={routeShape}>
          <Mapbox.LineLayer
            id="routeLine"
            style={{
              lineColor: colors.primary,
              lineWidth: 3,
              lineDasharray: [2, 2],
            }}
          />
        </Mapbox.ShapeSource>
      </Mapbox.MapView>

      {/* Bottom Sheet */}
      <Card style={styles.bottomSheet}>
        <Card.Content>
          {/* Statut */}
          <View style={[styles.statusBanner, { backgroundColor: statusColor }]}>
            <Text variant="titleMedium" style={styles.statusBannerText}>
              {t('status.' + request.status)}
            </Text>
            {trackingInfo?.estimatedArrival && (
              <Text variant="bodyMedium" style={styles.etaText}>
                ⏱️ {t('transport.eta_label')}{' '}
                {new Date(trackingInfo.estimatedArrival).toLocaleDateString(i18n.language, {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            )}
          </View>

          {/* Info Chauffeur */}
          {trackingInfo?.driverName && (
            <View style={styles.driverSection}>
              <View style={styles.driverHeader}>
                <Avatar.Icon size={60} icon="account" style={styles.driverAvatar} />
                <View style={styles.driverInfo}>
                  <Text variant="titleMedium" style={styles.driverName}>
                    {trackingInfo.driverName}
                  </Text>
                  {trackingInfo.driverPhone && (
                    <Text variant="bodySmall" style={styles.driverDetails}>
                      📞 {trackingInfo.driverPhone}
                    </Text>
                  )}
                </View>
                {trackingInfo.driverPhone && (
                  <IconButton
                    icon="phone"
                    size={24}
                    iconColor={colors.white}
                    containerColor={colors.success}
                    onPress={() => handleCall(trackingInfo.driverPhone!)}
                  />
                )}
              </View>
            </View>
          )}

          {/* Pas de position GPS */}
          {!hasDriverLocation && request.driverId && (
            <Card style={styles.infoCard}>
              <Card.Content>
                <View style={styles.infoContent}>
                  <Icon name="map-marker-off" size={40} color={colors.warning} />
                  <Text variant="titleMedium" style={styles.infoTitle}>
                    {t('transport.position_unavailable')}
                  </Text>
                  <Text variant="bodyMedium" style={styles.infoText}>
                    {t('transport.position_unavailable_message')}
                  </Text>
                </View>
              </Card.Content>
            </Card>
          )}

          {/* Position GPS active */}
          {hasDriverLocation && trackingInfo!.lastUpdate && (
            <View style={styles.locationInfo}>
              <Icon name="map-marker-check" size={20} color={colors.success} />
              <Text variant="bodySmall" style={styles.locationText}>
                {t('transport.position_updated')}:{' '}
                {new Date(trackingInfo!.lastUpdate).toLocaleTimeString(i18n.language, {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          )}

          {/* Itinéraire */}
          <View style={styles.routeSection}>
            <Text variant="labelLarge" style={styles.sectionTitle}>
              📍 {t('transport.itinerary')}
            </Text>
            <View style={styles.routeItem}>
              <Icon name="circle" size={16} color={colors.success} />
              <View style={styles.routeContent}>
                <Text variant="bodySmall" style={styles.routeLabel}>
                  {t('transport.loading_point')}
                </Text>
                <Text variant="bodyMedium" style={styles.routeAddress}>
                  {request.pickup.address}
                </Text>
              </View>
            </View>
            <View style={styles.routeDivider}>
              <Icon name="dots-vertical" size={20} color={colors.gray} />
            </View>
            <View style={styles.routeItem}>
              <Icon name="circle" size={16} color={colors.error} />
              <View style={styles.routeContent}>
                <Text variant="bodySmall" style={styles.routeLabel}>
                  {t('transport.delivery_point')}
                </Text>
                <Text variant="bodyMedium" style={styles.routeAddress}>
                  {request.delivery.address}
                </Text>
              </View>
            </View>
          </View>

          <Button
            mode="outlined"
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            icon="arrow-left"
          >
            {t('transport.back_to_details')}
          </Button>
        </Card.Content>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  error: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorButton: {
    marginTop: spacing.lg,
  },
  map: {
    width,
    height,
  },
  markerContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.white,
    elevation: 5,
  },
  markerText: {
    fontSize: 20,
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: height * 0.6,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 10,
  },
  statusBanner: {
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  statusBannerText: {
    color: colors.white,
    fontWeight: '700',
  },
  etaText: {
    color: colors.white,
    marginTop: 4,
  },
  driverSection: {
    marginBottom: spacing.md,
  },
  driverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  driverAvatar: {
    backgroundColor: colors.primary,
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    color: colors.dark,
    fontWeight: '600',
  },
  driverDetails: {
    color: colors.gray,
    marginTop: 2,
  },
  infoCard: {
    backgroundColor: '#FFF3CD',
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  infoContent: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  infoTitle: {
    color: colors.dark,
    fontWeight: '600',
    textAlign: 'center',
  },
  infoText: {
    color: colors.dark,
    textAlign: 'center',
    lineHeight: 20,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    backgroundColor: `${colors.success}10`,
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  locationText: {
    color: colors.success,
    fontWeight: '500',
  },
  routeSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sectionTitle: {
    color: colors.dark,
    marginBottom: spacing.md,
  },
  routeItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  routeContent: {
    flex: 1,
  },
  routeLabel: {
    color: colors.gray,
    textTransform: 'uppercase',
    fontSize: 11,
    fontWeight: '600',
  },
  routeAddress: {
    color: colors.dark,
    marginTop: 2,
  },
  routeDivider: {
    paddingLeft: spacing.xs,
    marginVertical: 4,
  },
  backButton: {
    marginTop: spacing.lg,
  },
});
