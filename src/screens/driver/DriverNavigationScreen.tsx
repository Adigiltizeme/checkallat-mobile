import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, Linking } from 'react-native';
import { Text, Button, Card } from 'react-native-paper';
import { StackScreenProps } from '@react-navigation/stack';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import { colors } from '../../theme/colors';
import { useAppTheme } from '../../theme/ThemeProvider';
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
  const { tokens } = useAppTheme();


  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    map: { flex: 1 },
    driverMarker: {
      width: 40, height: 40, backgroundColor: tokens.primary, borderRadius: 20,
      justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: colors.white,
    },
    driverMarkerGo: {
      width: 36, height: 36, backgroundColor: tokens.primary, borderRadius: 18,
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
    externalNavButton: { backgroundColor: tokens.primary, borderRadius: 12 },
    externalNavLabel: { fontSize: 16 },
    backButton: { backgroundColor: colors.white, borderRadius: 12 },
    backButtonLabel: { color: tokens.primary, fontSize: 16 },
  }), [tokens]);

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

  // TODO: restore return JSX
  return null;
};
