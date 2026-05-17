import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { Text, Card } from 'react-native-paper';
import { StackScreenProps } from '@react-navigation/stack';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { ProStackParamList } from '../../navigation/types';
import {
  useGetBookingTrackingQuery,
  useMarkEnRouteMutation,
  useMarkArrivedMutation,
  useUpdateProLocationMutation,
} from '../../store/api/bookingsApi';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';

import RNMapView, { Marker, Polyline } from 'react-native-maps';

const isExpoGo = Constants.appOwnership === 'expo';
const Mapbox = isExpoGo ? null : require('@rnmapbox/maps').default;

type Props = StackScreenProps<ProStackParamList, 'ProNavigation'>;

export const ProNavigationScreen = ({ navigation, route }: Props) => {
  const { t } = useTranslation();
  const { bookingId } = route.params;

  const { data: tracking, refetch } = useGetBookingTrackingQuery(bookingId, {
    pollingInterval: 8000,
    refetchOnMountOrArgChange: true,
  });

  const [markEnRoute, { isLoading: isEnRouteLoading }] = useMarkEnRouteMutation();
  const [markArrived, { isLoading: isArrivedLoading }] = useMarkArrivedMutation();
  const [updateLocation] = useUpdateProLocationMutation();

  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [heading, setHeading] = useState(0);
  const cameraRef = useRef<any>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);

  const booking = tracking?.booking;
  const clientPhone = (booking as any)?.client?.phone;

  useEffect(() => {
    startLocationTracking();
    return () => stopLocationTracking();
  }, []);

  const startLocationTracking = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('common.error'), t('transport.cannot_track_location'));
        return;
      }

      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const initialCoords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      setCurrentLocation(initialCoords);
      setHeading(location.coords.heading ?? 0);

      if (!isExpoGo && cameraRef.current) {
        cameraRef.current.setCamera({
          centerCoordinate: [initialCoords.longitude, initialCoords.latitude],
          zoomLevel: 15,
          animationDuration: 0,
        });
      }

      locationSubscription.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 5000, distanceInterval: 10 },
        (newLocation) => {
          const newCoords = {
            latitude: newLocation.coords.latitude,
            longitude: newLocation.coords.longitude,
          };
          setCurrentLocation(newCoords);
          setHeading(newLocation.coords.heading ?? 0);

          if (!isExpoGo && cameraRef.current) {
            cameraRef.current.setCamera({
              centerCoordinate: [newCoords.longitude, newCoords.latitude],
              zoomLevel: 15,
              heading: newLocation.coords.heading ?? 0,
              animationDuration: 1000,
            });
          }

          updateLocation({
            id: bookingId,
            lat: newLocation.coords.latitude,
            lng: newLocation.coords.longitude,
          });
        }
      );
    } catch (error) {
      console.error('ProNavigation location error:', error);
    }
  };

  const stopLocationTracking = () => {
    locationSubscription.current?.remove();
    locationSubscription.current = null;
  };

  const handleCenterMap = () => {
    if (!currentLocation || isExpoGo || !cameraRef.current) return;
    cameraRef.current.setCamera({
      centerCoordinate: [currentLocation.longitude, currentLocation.latitude],
      zoomLevel: 15,
      animationDuration: 500,
    });
  };

  const openGoogleMaps = () => {
    if (!booking?.addressLat || !booking?.addressLng) return;
    Linking.openURL(
      `https://www.google.com/maps/dir/?api=1&destination=${booking.addressLat},${booking.addressLng}&travelmode=driving`
    );
  };

  const handleEnRoute = async () => {
    try {
      await markEnRoute(bookingId).unwrap();
      refetch();
    } catch {
      Alert.alert(t('common.error'), t('pro_space.error_update'));
    }
  };

  const handleArrived = async () => {
    try {
      await markArrived(bookingId).unwrap();
      stopLocationTracking();
      navigation.goBack();
    } catch {
      Alert.alert(t('common.error'), t('pro_space.error_update'));
    }
  };

  const callClient = () => {
    if (!clientPhone) return;
    Linking.openURL(`tel:${clientPhone}`);
  };

  // Loading states
  if (!booking) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t('pro_navigation.loading')}</Text>
      </View>
    );
  }

  if (!booking.addressLat || !booking.addressLng) {
    return (
      <View style={styles.loadingContainer}>
        <Icon name="map-marker-off" size={48} color={colors.gray} />
        <Text style={styles.loadingText}>{t('pro_navigation.no_coords')}</Text>
        <TouchableOpacity style={styles.backBtnCenter} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnCenterText}>{t('common.back')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!currentLocation) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t('transport.retrieving_gps_position')}</Text>
      </View>
    );
  }

  const enRouteAt = (booking as any).enRouteAt;
  const arrivedAt = (booking as any).arrivedAt;

  const destination = {
    lat: booking.addressLat as number,
    lng: booking.addressLng as number,
    address: (booking as any).address as string,
  };

  const currentCoord: [number, number] = [currentLocation.longitude, currentLocation.latitude];
  const destinationCoord: [number, number] = [destination.lng, destination.lat];

  const routeShape = {
    type: 'Feature' as const,
    geometry: {
      type: 'LineString' as const,
      coordinates: [currentCoord, destinationCoord],
    },
    properties: {},
  };

  const renderMap = () => {
    // ── Expo Go : react-native-maps ──────────────────────────────────────────
    if (isExpoGo) {
      const midLat = (currentLocation.latitude + destination.lat) / 2;
      const midLng = (currentLocation.longitude + destination.lng) / 2;
      const deltaLat = Math.abs(currentLocation.latitude - destination.lat) * 2 + 0.02;
      const deltaLng = Math.abs(currentLocation.longitude - destination.lng) * 2 + 0.02;

      return (
        <RNMapView
          style={styles.map}
          initialRegion={{
            latitude: midLat,
            longitude: midLng,
            latitudeDelta: deltaLat,
            longitudeDelta: deltaLng,
          }}
        >
          {/* Marqueur pro */}
          <Marker
            coordinate={{ latitude: currentLocation.latitude, longitude: currentLocation.longitude }}
            title={t('pro_navigation.my_position')}
          >
            <View style={[styles.proMarkerGo, { transform: [{ rotate: `${heading}deg` }] }]}>
              <Icon name="briefcase" size={18} color={colors.white} />
            </View>
          </Marker>

          {/* Marqueur destination (adresse client) */}
          <Marker
            coordinate={{ latitude: destination.lat, longitude: destination.lng }}
            title={t('pro_navigation.client_address')}
            description={destination.address}
            pinColor={colors.primary}
          />

          {/* Ligne de route */}
          <Polyline
            coordinates={[
              { latitude: currentLocation.latitude, longitude: currentLocation.longitude },
              { latitude: destination.lat, longitude: destination.lng },
            ]}
            strokeColor={colors.primary}
            strokeWidth={4}
            lineDashPattern={[10, 5]}
          />
        </RNMapView>
      );
    }

    // ── Production : @rnmapbox/maps ──────────────────────────────────────────
    return (
      <Mapbox.MapView style={styles.map}>
        <Mapbox.Camera
          ref={cameraRef}
          defaultSettings={{ centerCoordinate: currentCoord, zoomLevel: 15 }}
        />

        {/* Marqueur pro avec orientation */}
        <Mapbox.PointAnnotation id="pro" coordinate={currentCoord}>
          <View style={[styles.proMarker, { transform: [{ rotate: `${heading}deg` }] }]}>
            <Icon name="briefcase" size={22} color={colors.white} />
          </View>
        </Mapbox.PointAnnotation>

        {/* Marqueur destination */}
        <Mapbox.PointAnnotation id="destination" coordinate={destinationCoord}>
          <View style={styles.destinationMarker}>
            <Icon name="home" size={14} color={colors.white} />
          </View>
          <Mapbox.Callout title={t('pro_navigation.client_address')} />
        </Mapbox.PointAnnotation>

        {/* Ligne de route en tirets */}
        <Mapbox.ShapeSource id="routeSource" shape={routeShape}>
          <Mapbox.LineLayer
            id="routeLine"
            style={{
              lineColor: colors.primary,
              lineWidth: 4,
              lineDasharray: [2, 1.5],
            }}
          />
        </Mapbox.ShapeSource>
      </Mapbox.MapView>
    );
  };

  return (
    <View style={styles.container}>
      {renderMap()}

      {/* Carte destination en haut */}
      <Card style={styles.topCard}>
        <Card.Content style={styles.topCardContent}>
          <View style={styles.destIconWrap}>
            <Icon
              name="map-marker"
              size={26}
              color={arrivedAt ? colors.success : colors.primary}
            />
          </View>
          <View style={styles.destTextWrap}>
            <Text style={styles.destLabel}>{t('pro_navigation.client_address')}</Text>
            <Text style={styles.destAddress} numberOfLines={2}>
              {destination.address}
            </Text>
          </View>
          {clientPhone && (
            <TouchableOpacity style={styles.callButton} onPress={callClient}>
              <Icon name="phone" size={22} color={colors.white} />
            </TouchableOpacity>
          )}
        </Card.Content>
      </Card>

      {/* Badge statut */}
      {enRouteAt && (
        <View style={[styles.statusBadge, arrivedAt && styles.statusBadgeArrived]}>
          <Icon
            name={arrivedAt ? 'map-marker-check' : 'car-arrow-right'}
            size={16}
            color={colors.white}
          />
          <Text style={styles.statusBadgeText}>
            {arrivedAt
              ? t('pro_navigation.status_arrived')
              : t('pro_navigation.status_en_route')}
          </Text>
        </View>
      )}

      {/* Bouton recentrer (Mapbox seulement) */}
      {!isExpoGo && (
        <TouchableOpacity style={styles.centerButton} onPress={handleCenterMap}>
          <Icon name="crosshairs-gps" size={28} color={colors.primary} />
        </TouchableOpacity>
      )}

      {/* Actions bas de page */}
      <View style={styles.bottomActions}>
        {/* Google Maps */}
        <TouchableOpacity style={styles.googleMapsBtn} onPress={openGoogleMaps}>
          <Icon name="google-maps" size={20} color={colors.white} />
          <Text style={styles.googleMapsBtnText}>{t('driver.open_in_google_maps')}</Text>
        </TouchableOpacity>

        {/* Démarrer le trajet (avant markEnRoute) */}
        {!enRouteAt && (
          <TouchableOpacity
            style={[styles.primaryBtn, isEnRouteLoading && styles.btnDisabled]}
            onPress={handleEnRoute}
            disabled={isEnRouteLoading}
          >
            {isEnRouteLoading ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Icon name="car-arrow-right" size={22} color={colors.white} />
            )}
            <Text style={styles.primaryBtnText}>
              {isEnRouteLoading ? t('common.loading') : t('pro_navigation.start_route')}
            </Text>
          </TouchableOpacity>
        )}

        {/* Je suis arrivé (après markEnRoute, avant markArrived) */}
        {enRouteAt && !arrivedAt && (
          <TouchableOpacity
            style={[styles.arrivedBtn, isArrivedLoading && styles.btnDisabled]}
            onPress={handleArrived}
            disabled={isArrivedLoading}
          >
            {isArrivedLoading ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Icon name="map-marker-check" size={22} color={colors.white} />
            )}
            <Text style={styles.primaryBtnText}>
              {isArrivedLoading ? t('common.loading') : t('pro_navigation.arrived')}
            </Text>
          </TouchableOpacity>
        )}

        {/* Retour aux détails */}
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>{t('transport.back_to_details')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  loadingText: { color: colors.gray, fontSize: 14, textAlign: 'center' },
  map: { flex: 1 },

  // Marqueurs
  proMarker: {
    width: 44, height: 44, backgroundColor: colors.primary, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: colors.white,
  },
  proMarkerGo: {
    width: 38, height: 38, backgroundColor: colors.primary, borderRadius: 19,
    justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: colors.white,
  },
  destinationMarker: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: colors.white,
  },

  // Carte destination (top)
  topCard: {
    position: 'absolute', top: 50, left: spacing.md, right: spacing.md,
    borderRadius: 14, elevation: 6,
  },
  topCardContent: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
  },
  destIconWrap: { width: 32, alignItems: 'center' },
  destTextWrap: { flex: 1 },
  destLabel: { fontSize: 11, color: colors.gray, textTransform: 'uppercase', letterSpacing: 0.5 },
  destAddress: { fontSize: 14, fontWeight: '700', color: colors.dark, marginTop: 2 },
  callButton: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.success,
    justifyContent: 'center', alignItems: 'center',
  },

  // Badge statut
  statusBadge: {
    position: 'absolute', top: 130, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.primary, borderRadius: 20,
    paddingHorizontal: spacing.md, paddingVertical: 6,
    elevation: 4,
  },
  statusBadgeArrived: { backgroundColor: colors.success },
  statusBadgeText: { color: colors.white, fontSize: 13, fontWeight: '700' },

  // Bouton recentrer
  centerButton: {
    position: 'absolute', bottom: 220, right: spacing.md,
    backgroundColor: colors.white, width: 52, height: 52, borderRadius: 26,
    justifyContent: 'center', alignItems: 'center', elevation: 4,
  },

  // Actions bas
  bottomActions: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    elevation: 8,
    gap: spacing.sm,
  },
  googleMapsBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: '#4285F4', borderRadius: 12, paddingVertical: 14,
  },
  googleMapsBtnText: { color: colors.white, fontSize: 15, fontWeight: '700' },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 16,
  },
  arrivedBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: colors.success, borderRadius: 12, paddingVertical: 16,
  },
  primaryBtnText: { color: colors.white, fontSize: 16, fontWeight: '700' },
  backBtn: {
    borderRadius: 12, paddingVertical: 12, alignItems: 'center',
    borderWidth: 1.5, borderColor: colors.border,
  },
  backBtnText: { fontSize: 14, color: colors.gray, fontWeight: '600' },
  btnDisabled: { opacity: 0.6 },
  backBtnCenter: {
    marginTop: spacing.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm,
    borderRadius: 8, borderWidth: 1, borderColor: colors.border,
  },
  backBtnCenterText: { color: colors.gray, fontSize: 14 },
});
