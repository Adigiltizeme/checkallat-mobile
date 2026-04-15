import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, Linking } from 'react-native';
import { Text, Button, Card } from 'react-native-paper';
import { StackScreenProps } from '@react-navigation/stack';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
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

type Props = StackScreenProps<DriverStackParamList, 'DriverNavigation'>;

export const DriverNavigationScreen = ({ navigation, route }: Props) => {
  const { t, i18n } = useTranslation();
  const { requestId } = route.params;
  const { data: request, isLoading } = useGetTransportRequestQuery(requestId);
  const [updateLocation] = useUpdateDriverLocationMutation();

  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [heading, setHeading] = useState<number>(0);
  const mapRef = useRef<MapView>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    startLocationTracking();
    return () => {
      stopLocationTracking();
    };
  }, []);

  const startLocationTracking = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('transport.permission_denied'), t('transport.cannot_track_location'));
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setCurrentLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      setHeading(location.coords.heading || 0);

      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        (newLocation) => {
          const newCoords = {
            latitude: newLocation.coords.latitude,
            longitude: newLocation.coords.longitude,
          };
          setCurrentLocation(newCoords);
          setHeading(newLocation.coords.heading || 0);

          // Update backend
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
    if (currentLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      });
    }
  };

  const openExternalNavigation = () => {
    if (!request) return;

    const destination =
      request.status === 'driver_en_route_pickup' || request.status === 'arrived_pickup'
        ? request.pickup
        : request.delivery;

    const url = `https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lng}&travelmode=driving`;
    Linking.openURL(url);
  };

  // Vérifications complètes avant d'afficher la carte
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

  // Vérifier que les coordonnées pickup et delivery existent
  if (!request.pickup || !request.delivery ||
      typeof request.pickup.lat !== 'number' ||
      typeof request.pickup.lng !== 'number' ||
      typeof request.delivery.lat !== 'number' ||
      typeof request.delivery.lng !== 'number') {
    return (
      <View style={styles.loadingContainer}>
        <Text>{t('transport.invalid_destination_coordinates')}</Text>
        <Button mode="outlined" onPress={() => navigation.goBack()} style={{ marginTop: 16 }}>
          {t('common.back')}
        </Button>
      </View>
    );
  }

  const destination =
    request.status === 'driver_en_route_pickup' ||
    request.status === 'arrived_pickup' ||
    request.status === 'loading'
      ? request.pickup
      : request.delivery;

  const isGoingToPickup =
    request.status === 'driver_en_route_pickup' ||
    request.status === 'arrived_pickup' ||
    request.status === 'loading';

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        showsUserLocation
        showsMyLocationButton={false}
        followsUserLocation
      >
        {/* Current Location Marker */}
        <Marker
          coordinate={currentLocation}
          anchor={{ x: 0.5, y: 0.5 }}
          rotation={heading}
        >
          <View style={styles.driverMarker}>
            <Icon name="truck" size={24} color={colors.white} />
          </View>
        </Marker>

        {/* Pickup Marker */}
        <Marker
          coordinate={{
            latitude: request.pickup.lat,
            longitude: request.pickup.lng,
          }}
          title={t('transport.loading_point')}
          description={request.pickup.address}
          pinColor={isGoingToPickup ? colors.primary : colors.gray}
        />

        {/* Delivery Marker */}
        <Marker
          coordinate={{
            latitude: request.delivery.lat,
            longitude: request.delivery.lng,
          }}
          title={t('transport.delivery_point')}
          description={request.delivery.address}
          pinColor={!isGoingToPickup ? colors.success : colors.gray}
        />

        {/* Route Line */}
        {destination &&
         typeof destination.lat === 'number' &&
         typeof destination.lng === 'number' &&
         typeof currentLocation.latitude === 'number' &&
         typeof currentLocation.longitude === 'number' && (
          <Polyline
            coordinates={[
              currentLocation,
              { latitude: destination.lat, longitude: destination.lng }
            ]}
            strokeColor={isGoingToPickup ? colors.primary : colors.success}
            strokeWidth={4}
          />
        )}
      </MapView>

      {/* Top Info Card */}
      <Card style={styles.topCard}>
        <Card.Content style={styles.topCardContent}>
          <View style={styles.destinationInfo}>
            <Icon
              name={isGoingToPickup ? 'map-marker' : 'map-marker-check'}
              size={24}
              color={isGoingToPickup ? colors.primary : colors.success}
            />
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

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <TouchableOpacity style={styles.centerButton} onPress={handleCenterMap}>
          <Icon name="crosshairs-gps" size={28} color={colors.primary} />
        </TouchableOpacity>

        <Button
          mode="contained"
          icon="google-maps"
          onPress={openExternalNavigation}
          style={styles.externalNavButton}
          labelStyle={styles.externalNavLabel}
        >
          {t('driver.open_in_google_maps')}
        </Button>

        <Button
          mode="contained"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          labelStyle={styles.backButtonLabel}
        >
          {t('transport.back_to_details')}
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  map: {
    flex: 1,
  },
  driverMarker: {
    width: 40,
    height: 40,
    backgroundColor: colors.primary,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.white,
  },
  topCard: {
    position: 'absolute',
    top: 50,
    left: spacing.md,
    right: spacing.md,
    elevation: 4,
  },
  topCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  destinationInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  destinationText: {
    flex: 1,
  },
  destinationLabel: {
    color: colors.gray,
  },
  destinationAddress: {
    fontWeight: 'bold',
  },
  callButton: {
    backgroundColor: colors.success,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomActions: {
    position: 'absolute',
    bottom: spacing.md,
    left: spacing.md,
    right: spacing.md,
    gap: spacing.sm,
  },
  centerButton: {
    alignSelf: 'flex-end',
    backgroundColor: colors.white,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    marginBottom: spacing.sm,
  },
  externalNavButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
  },
  externalNavLabel: {
    fontSize: 16,
  },
  backButton: {
    backgroundColor: colors.white,
    borderRadius: 12,
  },
  backButtonLabel: {
    color: colors.primary,
    fontSize: 16,
  },
});
