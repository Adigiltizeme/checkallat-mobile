import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, Linking } from 'react-native';
import { Text, Button, Card } from 'react-native-paper';
import { StackScreenProps } from '@react-navigation/stack';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { DriverStackParamList } from '../../navigation/types';
import {
  useGetTransportRequestQuery,
  useUpdateDriverLocationMutation,
} from '../../store/api/transportApi';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';

import RNMapView, { Marker, Polyline } from 'react-native-maps';

const isExpoGo = Constants.appOwnership === 'expo';
const Mapbox = isExpoGo ? null : require('@rnmapbox/maps').default;

type Props = StackScreenProps<DriverStackParamList, 'DriverNavigation'>;

export const DriverNavigationScreen = ({ navigation, route }: Props) => {
  const { t } = useTranslation();
  const { requestId } = route.params;
  const { data: request } = useGetTransportRequestQuery(requestId);
  const [updateLocation] = useUpdateDriverLocationMutation();

  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [heading, setHeading] = useState<number>(0);
  const cameraRef = useRef<any>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    startLocationTracking();
    return () => { stopLocationTracking(); };
  }, []);

  const startLocationTracking = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('transport.permission_denied'), t('transport.cannot_track_location'));
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const initialCoords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      setCurrentLocation(initialCoords);
      setHeading(location.coords.heading || 0);

      if (!isExpoGo) {
        cameraRef.current?.setCamera({
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
          setHeading(newLocation.coords.heading || 0);

          if (!isExpoGo) {
            cameraRef.current?.setCamera({
              centerCoordinate: [newCoords.longitude, newCoords.latitude],
              zoomLevel: 15,
              heading: newLocation.coords.heading || 0,
              animationDuration: 1000,
            });
          }

          updateLocation({
            id: requestId,
            lat: newLocation.coords.latitude,
            lng: newLocation.coords.longitude,
          });
        }
      );
    } catch (error) {
      console.error('Error tracking location:', error);
    }
  };

  const stopLocationTracking = () => {
    if (locationSubscription.current) {
      locationSubscription.current.remove();
    }
  };

  const handleCenterMap = () => {
    if (!currentLocation || isExpoGo) return;
    cameraRef.current?.setCamera({
      centerCoordinate: [currentLocation.longitude, currentLocation.latitude],
      zoomLevel: 15,
      animationDuration: 500,
    });
  };

  const openExternalNavigation = () => {
    if (!request) return;
    const destination =
      request.status === 'driver_en_route_pickup' || request.status === 'arrived_pickup'
        ? request.pickup
        : request.delivery;
    Linking.openURL(
      `https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lng}&travelmode=driving`
    );
  };

  if (!request) {
    return (
      <View style={styles.loadingContainer}>
        <Text>{t('transport.loading_transport_data')}</Text>
      </View>
    );
  }

  if (!currentLocation) {
    return (
      <View style={styles.loadingContainer}>
        <Text>{t('transport.retrieving_gps_position')}</Text>
      </View>
    );
  }

  if (
    !request.pickup || !request.delivery ||
    typeof request.pickup.lat !== 'number' || typeof request.pickup.lng !== 'number' ||
    typeof request.delivery.lat !== 'number' || typeof request.delivery.lng !== 'number'
  ) {
    return (
      <View style={styles.loadingContainer}>
        <Text>{t('transport.invalid_destination_coordinates')}</Text>
        <Button mode="outlined" onPress={() => navigation.goBack()} style={{ marginTop: 16 }}>
          {t('common.back')}
        </Button>
      </View>
    );
  }

  const isGoingToPickup =
    request.status === 'driver_en_route_pickup' ||
    request.status === 'arrived_pickup' ||
    request.status === 'loading';

  const destination = isGoingToPickup ? request.pickup : request.delivery;

  const currentCoord: [number, number] = [currentLocation.longitude, currentLocation.latitude];
  const pickupCoord: [number, number] = [request.pickup.lng, request.pickup.lat];
  const deliveryCoord: [number, number] = [request.delivery.lng, request.delivery.lat];
  const destinationCoord: [number, number] = [destination.lng, destination.lat];

  const routeShape = {
    type: 'Feature' as const,
    geometry: { type: 'LineString' as const, coordinates: [currentCoord, destinationCoord] },
    properties: {},
  };

  const renderMap = () => {
    // --- Expo Go : react-native-maps ---
    if (isExpoGo) {
      const midLat = (currentLocation.latitude + destination.lat) / 2;
      const midLng = (currentLocation.longitude + destination.lng) / 2;
      const deltaLat = Math.abs(currentLocation.latitude - destination.lat) * 2 + 0.02;
      const deltaLng = Math.abs(currentLocation.longitude - destination.lng) * 2 + 0.02;

      return (
        <RNMapView
          style={styles.map}
          initialRegion={{ latitude: midLat, longitude: midLng, latitudeDelta: deltaLat, longitudeDelta: deltaLng }}
        >
          {/* Marqueur chauffeur */}
          <Marker coordinate={{ latitude: currentLocation.latitude, longitude: currentLocation.longitude }}
            title="Ma position">
            <View style={[styles.driverMarkerGo, { transform: [{ rotate: `${heading}deg` }] }]}>
              <Icon name="truck" size={20} color={colors.white} />
            </View>
          </Marker>

          {/* Marqueur pickup */}
          <Marker coordinate={{ latitude: request.pickup.lat, longitude: request.pickup.lng }}
            title={t('transport.loading_point')} description={request.pickup.address}
            pinColor={isGoingToPickup ? 'blue' : 'gray'} />

          {/* Marqueur livraison */}
          <Marker coordinate={{ latitude: request.delivery.lat, longitude: request.delivery.lng }}
            title={t('transport.delivery_point')} description={request.delivery.address}
            pinColor={!isGoingToPickup ? 'green' : 'gray'} />

          {/* Ligne vers destination */}
          <Polyline
            coordinates={[
              { latitude: currentLocation.latitude, longitude: currentLocation.longitude },
              { latitude: destination.lat, longitude: destination.lng },
            ]}
            strokeColor={isGoingToPickup ? colors.primary : colors.success}
            strokeWidth={4}
          />
        </RNMapView>
      );
    }

    // --- Production : @rnmapbox/maps ---
    return (
      <Mapbox.MapView style={styles.map}>
        <Mapbox.Camera ref={cameraRef}
          defaultSettings={{ centerCoordinate: currentCoord, zoomLevel: 15 }} />
        <Mapbox.PointAnnotation id="driver" coordinate={currentCoord}>
          <View style={[styles.driverMarker, { transform: [{ rotate: `${heading}deg` }] }]}>
            <Icon name="truck" size={24} color={colors.white} />
          </View>
        </Mapbox.PointAnnotation>
        <Mapbox.PointAnnotation id="pickup" coordinate={pickupCoord}>
          <View style={[styles.waypointMarker,
            { backgroundColor: isGoingToPickup ? colors.primary : colors.gray }]} />
          <Mapbox.Callout title={t('transport.loading_point')} />
        </Mapbox.PointAnnotation>
        <Mapbox.PointAnnotation id="delivery" coordinate={deliveryCoord}>
          <View style={[styles.waypointMarker,
            { backgroundColor: !isGoingToPickup ? colors.success : colors.gray }]} />
          <Mapbox.Callout title={t('transport.delivery_point')} />
        </Mapbox.PointAnnotation>
        <Mapbox.ShapeSource id="routeSource" shape={routeShape}>
          <Mapbox.LineLayer id="routeLine"
            style={{ lineColor: isGoingToPickup ? colors.primary : colors.success, lineWidth: 4 }} />
        </Mapbox.ShapeSource>
      </Mapbox.MapView>
    );
  };

  return (
    <View style={styles.container}>
      {renderMap()}

      <Card style={styles.topCard}>
        <Card.Content style={styles.topCardContent}>
          <View style={styles.destinationInfo}>
            <Icon name={isGoingToPickup ? 'map-marker' : 'map-marker-check'} size={24}
              color={isGoingToPickup ? colors.primary : colors.success} />
            <View style={styles.destinationText}>
              <Text variant="labelSmall" style={styles.destinationLabel}>
                {isGoingToPickup ? t('driver.loading_point_label') : t('driver.delivery_point_label')}
              </Text>
              <Text variant="bodyMedium" numberOfLines={1} style={styles.destinationAddress}>
                {destination.address}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.callButton} onPress={() => {}}>
            <Icon name="phone" size={24} color={colors.white} />
          </TouchableOpacity>
        </Card.Content>
      </Card>

      <View style={styles.bottomActions}>
        {!isExpoGo && (
          <TouchableOpacity style={styles.centerButton} onPress={handleCenterMap}>
            <Icon name="crosshairs-gps" size={28} color={colors.primary} />
          </TouchableOpacity>
        )}
        <Button mode="contained" icon="google-maps" onPress={openExternalNavigation}
          style={styles.externalNavButton} labelStyle={styles.externalNavLabel}>
          {t('driver.open_in_google_maps')}
        </Button>
        <Button mode="contained" onPress={() => navigation.goBack()}
          style={styles.backButton} labelStyle={styles.backButtonLabel}>
          {t('transport.back_to_details')}
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  map: { flex: 1 },
  driverMarker: {
    width: 40, height: 40, backgroundColor: colors.primary, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: colors.white,
  },
  driverMarkerGo: {
    width: 36, height: 36, backgroundColor: colors.primary, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: colors.white,
  },
  waypointMarker: { width: 20, height: 20, borderRadius: 10, borderWidth: 3, borderColor: colors.white },
  topCard: { position: 'absolute', top: 50, left: spacing.md, right: spacing.md, elevation: 4 },
  topCardContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  destinationInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  destinationText: { flex: 1 },
  destinationLabel: { color: colors.gray },
  destinationAddress: { fontWeight: 'bold' },
  callButton: {
    backgroundColor: colors.success, width: 48, height: 48, borderRadius: 24,
    justifyContent: 'center', alignItems: 'center',
  },
  bottomActions: { position: 'absolute', bottom: spacing.md, left: spacing.md, right: spacing.md, gap: spacing.sm },
  centerButton: {
    alignSelf: 'flex-end', backgroundColor: colors.white, width: 56, height: 56,
    borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 4, marginBottom: spacing.sm,
  },
  externalNavButton: { backgroundColor: colors.primary, borderRadius: 12 },
  externalNavLabel: { fontSize: 16 },
  backButton: { backgroundColor: colors.white, borderRadius: 12 },
  backButtonLabel: { color: colors.primary, fontSize: 16 },
});
