import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { TextInput, Button, Text, IconButton, Switch, Card, Chip } from 'react-native-paper';
import { StackScreenProps } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { Step1Data, Step2Data, AddressData } from '../../types/transport';
import { MapboxService } from '../../services/mapbox.service';
import { GooglePlacesService } from '../../services/googlePlaces.service';
import { CountryDetectionService } from '../../services/countryDetection.service';
import { getCountryInfo } from '../../config/countries';
import { UnsupportedCountryModal } from '../../components/shared/UnsupportedCountryModal';
import {
  setDetecting,
  setDetectedCountry,
  setUnsupportedCountry,
  setDetectionDenied,
  selectCountry,
} from '../../store/slices/locationSlice';
import { RootState } from '../../store';

type Props = StackScreenProps<any, 'TransportRequestStep2'>;

/** Formate une distance en mètres → "650 m" ou "3,2 km" */
const formatDistance = (meters?: number): string | null => {
  if (!meters) return null;
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
};

/** Icône Material Community Icons selon les types Google Places ou Mapbox featureType */
const getSuggestionIcon = (types?: string[], featureType?: string): string => {
  const t = types ?? [];
  if (t.some(x => ['shopping_mall', 'store', 'supermarket', 'department_store'].includes(x))) return 'store';
  if (t.some(x => ['restaurant', 'cafe', 'food', 'bakery', 'bar'].includes(x))) return 'food';
  if (t.some(x => ['hospital', 'health', 'pharmacy', 'doctor'].includes(x))) return 'hospital-box';
  if (t.some(x => ['school', 'university', 'primary_school', 'secondary_school'].includes(x))) return 'school';
  if (t.some(x => ['mosque', 'church', 'synagogue', 'place_of_worship'].includes(x))) return 'dome-light';
  if (t.some(x => ['gas_station'].includes(x))) return 'gas-station';
  if (t.some(x => ['park', 'campground'].includes(x))) return 'tree';
  if (t.some(x => ['lodging', 'hotel'].includes(x))) return 'bed';
  if (t.some(x => ['airport'].includes(x))) return 'airplane';
  if (t.some(x => ['transit_station', 'subway_station', 'bus_station'].includes(x))) return 'train';
  if (t.some(x => ['street_address', 'route'].includes(x))) return 'road-variant';
  if (t.some(x => ['neighborhood', 'sublocality', 'locality'].includes(x))) return 'map-marker-radius';
  if (t.some(x => ['point_of_interest', 'establishment'].includes(x))) return 'map-marker-star';
  // Mapbox featureType fallback
  if (featureType === 'poi') return 'map-marker-star';
  if (featureType === 'address') return 'road-variant';
  if (featureType === 'place') return 'map-marker-radius';
  return 'map-marker-outline';
};

export const TransportRequestStep2Screen = ({ route, navigation }: Props) => {
  const { t, i18n } = useTranslation();
  const { step1Data } = route.params as { step1Data: Step1Data };
  const dispatch = useDispatch();
  const locationState = useSelector((state: RootState) => state.location);

  const [pickup, setPickup] = useState<Partial<AddressData>>({
    address: '',
    lat: undefined,
    lng: undefined,
    floor: 0,
    hasElevator: false,
    instructions: '',
  });

  const [delivery, setDelivery] = useState<Partial<AddressData>>({
    address: '',
    lat: undefined,
    lng: undefined,
    floor: 0,
    hasElevator: false,
    instructions: '',
  });

  const [isGeocodingPickup, setIsGeocodingPickup] = useState(false);
  const [isGeocodingDelivery, setIsGeocodingDelivery] = useState(false);
  const [isCalculatingDistance, setIsCalculatingDistance] = useState(false);
  const [showUnsupportedModal, setShowUnsupportedModal] = useState(false);
  const [countryModalMode, setCountryModalMode] = useState<'unsupported' | 'change'>('unsupported');

  // Suggestions de géocodage
  const [pickupSuggestions, setPickupSuggestions] = useState<any[]>([]);
  const [deliverySuggestions, setDeliverySuggestions] = useState<any[]>([]);

  // Refs pour les timeouts de debounce
  const pickupTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const deliveryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Détection du pays au montage (une seule fois par session)
  useEffect(() => {
    if (locationState.detectionStatus === 'idle') {
      (async () => {
        dispatch(setDetecting());
        const result = await CountryDetectionService.detect();

        if (result.status === 'supported') {
          dispatch(setDetectedCountry({
            countryCode: result.countryCode,
            lat: result.lat,
            lng: result.lng,
          }));
        } else if (result.status === 'unsupported') {
          dispatch(setUnsupportedCountry({ lat: result.lat, lng: result.lng, countryCode: result.countryCode }));
          setCountryModalMode('unsupported');
          setShowUnsupportedModal(true);
        } else {
          // GPS refusé ou erreur — pas de restriction, recherche mondiale
          dispatch(setDetectionDenied());
        }
      })();
    } else if (locationState.detectionStatus === 'unsupported') {
      setCountryModalMode('unsupported');
      setShowUnsupportedModal(true);
    }
  }, []);

  // Pays actif pour restreindre la recherche
  const activeCountryCode = locationState.selectedCountryCode;

  // Session token Google Places (grouper suggest + getDetails pour la facturation)
  const placesSessionRef = useRef<string>(GooglePlacesService.generateSessionToken());

  // Cleanup des timeouts au démontage
  useEffect(() => {
    return () => {
      if (pickupTimeoutRef.current) clearTimeout(pickupTimeoutRef.current);
      if (deliveryTimeoutRef.current) clearTimeout(deliveryTimeoutRef.current);
    };
  }, []);

  // Recherche d'adresses via Google Places Autocomplete (multilingue AR/FR/EN)
  // Fallback vers Mapbox SearchBox si Google Places n'est pas configuré
  const geocodeAddress = async (address: string, type: 'pickup' | 'delivery') => {
    if (!address.trim() || address.trim().length < 3) return;

    const setLoading = type === 'pickup' ? setIsGeocodingPickup : setIsGeocodingDelivery;
    const setSuggestions = type === 'pickup' ? setPickupSuggestions : setDeliverySuggestions;
    setLoading(true);

    try {
      if (GooglePlacesService.isConfigured()) {
        // Google Places — meilleure détection landmarks, noms bilingues arabe/anglais/français
        const suggestions = await GooglePlacesService.suggest(address.trim(), {
          countryCode: activeCountryCode ?? undefined,
          language: i18n.language,
          ...(locationState.userLat && locationState.userLng
            ? { proximity: { lat: locationState.userLat, lng: locationState.userLng } }
            : {}),
          sessionToken: placesSessionRef.current,
        });
        setSuggestions(suggestions);
      } else {
        // Fallback Mapbox SearchBox
        const results = await MapboxService.geocodeAddress(address.trim(), {
          country: activeCountryCode ?? undefined,
          language: 'fr,ar,en',
          ...(locationState.userLat && locationState.userLng
            ? { proximity: { lat: locationState.userLat, lng: locationState.userLng } }
            : {}),
        });
        setSuggestions(results.slice(0, 5));
      }
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  // Handler pour l'autocomplétion en temps réel (debounced)
  const handleAddressChange = (text: string, type: 'pickup' | 'delivery') => {
    // Mettre à jour l'adresse immédiatement
    if (type === 'pickup') {
      setPickup({
        ...pickup,
        address: text,
        // Réinitialiser les coordonnées si l'utilisateur modifie l'adresse
        lat: text !== pickup.address ? undefined : pickup.lat,
        lng: text !== pickup.address ? undefined : pickup.lng,
      });
    } else {
      setDelivery({
        ...delivery,
        address: text,
        // Réinitialiser les coordonnées si l'utilisateur modifie l'adresse
        lat: text !== delivery.address ? undefined : delivery.lat,
        lng: text !== delivery.address ? undefined : delivery.lng,
      });
    }

    // Récupérer le timeout ref approprié
    const timeoutRef = type === 'pickup' ? pickupTimeoutRef : deliveryTimeoutRef;
    const setSuggestions = type === 'pickup' ? setPickupSuggestions : setDeliverySuggestions;

    // Annuler le timeout précédent
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Déclencher la recherche après 300ms de délai (debounce)
    if (text.length >= 3) {
      timeoutRef.current = setTimeout(() => {
        geocodeAddress(text, type);
      }, 300);
    } else {
      // Effacer les suggestions si moins de 3 caractères
      setSuggestions([]);
    }
  };

  // Sélectionner une suggestion
  // — Google Places : résout le place_id en lat/lng via getDetails
  // — Mapbox fallback : lat/lng déjà présents dans la suggestion
  const selectSuggestion = async (suggestion: any, type: 'pickup' | 'delivery') => {
    const setLoading = type === 'pickup' ? setIsGeocodingPickup : setIsGeocodingDelivery;
    const setSuggestions = type === 'pickup' ? setPickupSuggestions : setDeliverySuggestions;
    const setAddress = type === 'pickup' ? setPickup : setDelivery;
    const currentAddress = type === 'pickup' ? pickup : delivery;

    // Fermer les suggestions immédiatement
    setSuggestions([]);

    if (suggestion.placeId) {
      // Flow Google Places : récupérer les coordonnées précises
      setLoading(true);
      try {
        const details = await GooglePlacesService.getDetails(
          suggestion.placeId,
          placesSessionRef.current,
          i18n.language,
        );
        // Renouveler le session token après getDetails (fin de session)
        placesSessionRef.current = GooglePlacesService.generateSessionToken();

        if (details) {
          // Construire une adresse lisible :
          // Si formatted_address contient un Plus Code (ex: "XCJG+PGC, New Cairo..."),
          // préférer "Nom du lieu — Sous-titre" pour un affichage clair dans l'itinéraire.
          const isPlusCode = /^[A-Z0-9]{4,}\+[A-Z0-9]{2,}/.test(details.fullAddress);
          const readableAddress = isPlusCode
            ? [suggestion.name, suggestion.subtitle].filter(Boolean).join(', ')
            : details.fullAddress;

          setAddress({
            ...currentAddress,
            address: readableAddress || details.fullAddress,
            lat: details.lat,
            lng: details.lng,
          });
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    } else {
      // Flow Mapbox fallback : lat/lng déjà dans la suggestion
      setAddress({
        ...currentAddress,
        address: suggestion.placeName ?? suggestion.name,
        lat: suggestion.lat,
        lng: suggestion.lng,
      });
    }
  };

  // Calculer distance et durée avec Mapbox Directions API
  const calculateDistanceAndDuration = async (): Promise<{
    distance: number;
    duration: number;
  } | null> => {
    if (!pickup.lat || !pickup.lng || !delivery.lat || !delivery.lng) {
      return null;
    }

    setIsCalculatingDistance(true);

    try {
      const result = await MapboxService.getDistanceAndDuration(
        { lat: pickup.lat, lng: pickup.lng },
        { lat: delivery.lat, lng: delivery.lng },
        'driving'
      );

      return result;
    } catch (error) {
      // Fallback déjà géré dans MapboxService
      return null;
    } finally {
      setIsCalculatingDistance(false);
    }
  };

  // Utiliser position actuelle GPS
  const useCurrentLocation = async (type: 'pickup' | 'delivery') => {
    const setLoading = type === 'pickup' ? setIsGeocodingPickup : setIsGeocodingDelivery;
    setLoading(true);

    try {
      const { status } = await require('expo-location').requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          t('transport.location_permission_title'),
          t('transport.location_permission_msg')
        );
        setLoading(false);
        return;
      }

      const location = await require('expo-location').getCurrentPositionAsync({});
      const { latitude: lat, longitude: lng } = location.coords;

      // Mettre à jour la position dans Redux (améliore le proximity bias)
      dispatch(setDetectedCountry({
        countryCode: locationState.selectedCountryCode ?? locationState.detectedCountryCode ?? 'eg',
        lat,
        lng,
      }));

      // Géocodage inverse avec Mapbox
      const result = await MapboxService.reverseGeocode(lat, lng, {
        language: 'fr,ar,en',
      });

      if (!result) {
        Alert.alert(t('common.error'), t('transport.location_error'));
        setLoading(false);
        return;
      }

      if (type === 'pickup') {
        setPickup({
          ...pickup,
          address: result.placeName,
          lat: result.lat,
          lng: result.lng,
        });
      } else {
        setDelivery({
          ...delivery,
          address: result.placeName,
          lat: result.lat,
          lng: result.lng,
        });
      }
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('transport.location_error'));
    } finally {
      setLoading(false);
    }
  };

  // Valider et passer au step 3
  const handleNext = async () => {
    if (!pickup.address || !delivery.address) {
      Alert.alert(t('transport.addresses_required'), t('transport.addresses_required_msg'));
      return;
    }

    if (!pickup.lat || !pickup.lng || !delivery.lat || !delivery.lng) {
      Alert.alert(
        t('transport.coordinates_missing'),
        t('transport.coordinates_missing_msg')
      );
      return;
    }

    // Calculer la distance et la durée avec Mapbox
    const result = await calculateDistanceAndDuration();

    if (!result || result.distance === 0) {
      Alert.alert(
        t('transport.coordinates_invalid'),
        t('transport.coordinates_invalid_msg')
      );
      return;
    }

    const step2Data: Step2Data = {
      pickup: pickup as AddressData,
      delivery: delivery as AddressData,
      distance: result.distance,
      estimatedDuration: result.duration,
    };

    navigation.navigate('TransportRequestStep3', { step1Data, step2Data });
  };

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Modal sélection de pays (pays non supporté ou changement manuel) */}
      <UnsupportedCountryModal
        visible={showUnsupportedModal}
        detectedCountryCode={locationState.detectedCountryCode}
        mode={countryModalMode}
        onCountrySelected={(country) => {
          dispatch(selectCountry(country.code));
          setShowUnsupportedModal(false);
        }}
        onDismiss={() => setShowUnsupportedModal(false)}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="headlineSmall" style={styles.title}>
          {t('transport.address_title')}
        </Text>

        {/* Indicateur pays actif + bouton changer */}
        {activeCountryCode && (
          <TouchableOpacity
            style={styles.countryBadge}
            onPress={() => { setCountryModalMode('change'); setShowUnsupportedModal(true); }}
          >
            <Text style={styles.countryBadgeText}>
              {getCountryInfo(activeCountryCode)?.flag ?? '🌍'}{' '}
              {t(`country.${getCountryInfo(activeCountryCode)?.nameKey ?? 'country_unknown'}`)}
            </Text>
            <Text style={styles.countryBadgeChange}>{t('location.change_country')}</Text>
          </TouchableOpacity>
        )}

        {/* Adresse Pickup */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Text variant="titleMedium" style={styles.cardTitle}>
                📍 {t('transport.pickup')}
              </Text>
              <IconButton
                icon="crosshairs-gps"
                size={20}
                iconColor={colors.primary}
                onPress={() => useCurrentLocation('pickup')}
              />
            </View>

            <View style={styles.addressInputContainer}>
              <TextInput
                mode="outlined"
                label={t('transport.pickup')}
                placeholder="Ex: 5 Tahrir Square, Cairo, Egypt"
                value={pickup.address}
                onChangeText={(text) => handleAddressChange(text, 'pickup')}
                outlineColor={colors.border}
                activeOutlineColor={colors.primary}
                style={styles.addressInput}
                right={
                  isGeocodingPickup ? (
                    <TextInput.Icon icon={() => <ActivityIndicator size={20} color={colors.primary} />} />
                  ) : undefined
                }
              />
            </View>

            {/* Suggestions de géocodage pour pickup */}
            {pickupSuggestions.length > 0 && (
              <View style={styles.suggestionsContainer}>
                <Text variant="labelMedium" style={styles.suggestionsTitle}>
                  {t('transport.select_address')}
                </Text>
                {pickupSuggestions.map((suggestion: any, index: number) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.suggestionItem}
                    onPress={() => selectSuggestion(suggestion, 'pickup')}
                  >
                    <IconButton
                      icon={getSuggestionIcon(suggestion.types, suggestion.featureType)}
                      size={20}
                      iconColor={colors.primary}
                    />
                    <View style={styles.suggestionText}>
                      <Text variant="bodyMedium" style={styles.suggestionName}>
                        {suggestion.name ?? suggestion.placeName}
                      </Text>
                      {(suggestion.subtitle || suggestion.city) ? (
                        <Text variant="bodySmall" style={styles.suggestionLocation}>
                          {suggestion.subtitle || [suggestion.city, suggestion.country].filter(Boolean).join(', ')}
                        </Text>
                      ) : null}
                    </View>
                    {formatDistance(suggestion.distanceMeters) && (
                      <Text variant="bodySmall" style={styles.suggestionDistance}>
                        {formatDistance(suggestion.distanceMeters)}
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {pickup.lat && pickup.lng && pickupSuggestions.length === 0 && (
              <Chip
                icon="check-circle"
                style={styles.successChip}
                textStyle={{ color: colors.success }}
              >
                {t('transport.coordinates', { lat: pickup.lat.toFixed(4), lng: pickup.lng.toFixed(4) })}
              </Chip>
            )}

            <View style={styles.row}>
              <View style={styles.halfInput}>
                <Text variant="labelMedium" style={styles.label}>
                  {t('addresses.floor')}
                </Text>
                <View style={styles.stepper}>
                  <IconButton
                    icon="minus"
                    size={20}
                    onPress={() =>
                      setPickup({ ...pickup, floor: Math.max(0, (pickup.floor || 0) - 1) })
                    }
                  />
                  <Text variant="titleMedium">{pickup.floor || 0}</Text>
                  <IconButton
                    icon="plus"
                    size={20}
                    onPress={() => setPickup({ ...pickup, floor: (pickup.floor || 0) + 1 })}
                  />
                </View>
              </View>

              <View style={styles.halfInput}>
                <Text variant="labelMedium" style={styles.label}>
                  {t('addresses.elevator')}
                </Text>
                <Switch
                  value={pickup.hasElevator}
                  onValueChange={(value) => setPickup({ ...pickup, hasElevator: value })}
                  color={colors.primary}
                />
              </View>
            </View>

            <TextInput
              mode="outlined"
              label={t('transport.instructions_optional')}
              placeholder="Ex: Sonner à l'interphone"
              value={pickup.instructions}
              onChangeText={(text) => setPickup({ ...pickup, instructions: text })}
              multiline
              numberOfLines={2}
              maxLength={200}
              outlineColor={colors.border}
              activeOutlineColor={colors.primary}
              style={styles.input}
            />
          </Card.Content>
        </Card>

        {/* Adresse Delivery */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Text variant="titleMedium" style={styles.cardTitle}>
                🏁 {t('transport.delivery')}
              </Text>
              <IconButton
                icon="crosshairs-gps"
                size={20}
                iconColor={colors.primary}
                onPress={() => useCurrentLocation('delivery')}
              />
            </View>

            <View style={styles.addressInputContainer}>
              <TextInput
                mode="outlined"
                label={t('transport.delivery')}
                placeholder="Ex: 10 El-Horreya Road, Alexandria, Egypt"
                value={delivery.address}
                onChangeText={(text) => handleAddressChange(text, 'delivery')}
                outlineColor={colors.border}
                activeOutlineColor={colors.primary}
                style={styles.addressInput}
                right={
                  isGeocodingDelivery ? (
                    <TextInput.Icon icon={() => <ActivityIndicator size={20} color={colors.primary} />} />
                  ) : undefined
                }
              />
            </View>

            {/* Suggestions de géocodage pour delivery */}
            {deliverySuggestions.length > 0 && (
              <View style={styles.suggestionsContainer}>
                <Text variant="labelMedium" style={styles.suggestionsTitle}>
                  {t('transport.select_address')}
                </Text>
                {deliverySuggestions.map((suggestion: any, index: number) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.suggestionItem}
                    onPress={() => selectSuggestion(suggestion, 'delivery')}
                  >
                    <IconButton
                      icon={getSuggestionIcon(suggestion.types, suggestion.featureType)}
                      size={20}
                      iconColor={colors.primary}
                    />
                    <View style={styles.suggestionText}>
                      <Text variant="bodyMedium" style={styles.suggestionName}>
                        {suggestion.name ?? suggestion.placeName}
                      </Text>
                      {(suggestion.subtitle || suggestion.city) ? (
                        <Text variant="bodySmall" style={styles.suggestionLocation}>
                          {suggestion.subtitle || [suggestion.city, suggestion.country].filter(Boolean).join(', ')}
                        </Text>
                      ) : null}
                    </View>
                    {formatDistance(suggestion.distanceMeters) && (
                      <Text variant="bodySmall" style={styles.suggestionDistance}>
                        {formatDistance(suggestion.distanceMeters)}
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {delivery.lat && delivery.lng && deliverySuggestions.length === 0 && (
              <Chip
                icon="check-circle"
                style={styles.successChip}
                textStyle={{ color: colors.success }}
              >
                {t('transport.coordinates', { lat: delivery.lat.toFixed(4), lng: delivery.lng.toFixed(4) })}
              </Chip>
            )}

            <View style={styles.row}>
              <View style={styles.halfInput}>
                <Text variant="labelMedium" style={styles.label}>
                  {t('addresses.floor')}
                </Text>
                <View style={styles.stepper}>
                  <IconButton
                    icon="minus"
                    size={20}
                    onPress={() =>
                      setDelivery({ ...delivery, floor: Math.max(0, (delivery.floor || 0) - 1) })
                    }
                  />
                  <Text variant="titleMedium">{delivery.floor || 0}</Text>
                  <IconButton
                    icon="plus"
                    size={20}
                    onPress={() => setDelivery({ ...delivery, floor: (delivery.floor || 0) + 1 })}
                  />
                </View>
              </View>

              <View style={styles.halfInput}>
                <Text variant="labelMedium" style={styles.label}>
                  {t('addresses.elevator')}
                </Text>
                <Switch
                  value={delivery.hasElevator}
                  onValueChange={(value) => setDelivery({ ...delivery, hasElevator: value })}
                  color={colors.primary}
                />
              </View>
            </View>

            <TextInput
              mode="outlined"
              label={t('transport.instructions_optional')}
              placeholder="Ex: Laisser devant la porte"
              value={delivery.instructions}
              onChangeText={(text) => setDelivery({ ...delivery, instructions: text })}
              multiline
              numberOfLines={2}
              maxLength={200}
              outlineColor={colors.border}
              activeOutlineColor={colors.primary}
              style={styles.input}
            />
          </Card.Content>
        </Card>

        {/* Distance & Duration - Calculé automatiquement */}
        {pickup.lat && pickup.lng && delivery.lat && delivery.lng && (
          <Card style={styles.infoCard}>
            <Card.Content>
              {isCalculatingDistance ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={colors.white} />
                  <Text style={styles.loadingText}>{t('transport.calculating_distance')}</Text>
                </View>
              ) : (
                <Text style={styles.infoText}>
                  {t('transport.distance_info')}
                </Text>
              )}
            </Card.Content>
          </Card>
        )}

        {/* Boutons navigation */}
        <View style={styles.actions}>
          <Button
            mode="outlined"
            onPress={handleBack}
            style={styles.backButton}
            textColor={colors.gray}
          >
            {t('common.back')}
          </Button>
          <Button
            mode="contained"
            onPress={handleNext}
            disabled={!pickup.address || !delivery.address}
            buttonColor={colors.primary}
            style={styles.nextButton}
          >
            {t('transport.next')}
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  title: {
    color: colors.dark,
    marginBottom: spacing.sm,
  },
  countryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  countryBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  countryBadgeChange: {
    fontSize: 12,
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  card: {
    marginBottom: spacing.md,
    backgroundColor: colors.white,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cardTitle: {
    color: colors.dark,
  },
  input: {
    marginBottom: spacing.md,
    backgroundColor: colors.white,
  },
  addressInputContainer: {
    marginBottom: spacing.md,
  },
  addressInput: {
    backgroundColor: colors.white,
  },
  successChip: {
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
    backgroundColor: '#E8F5E9',
  },
  suggestionsContainer: {
    marginVertical: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
  },
  suggestionsTitle: {
    color: colors.dark,
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  suggestionText: {
    flex: 1,
    marginLeft: spacing.xs,
  },
  suggestionName: {
    color: colors.dark,
    fontWeight: '500',
  },
  suggestionLocation: {
    color: colors.gray,
    marginTop: 2,
  },
  suggestionDistance: {
    color: colors.primary,
    fontWeight: '600',
    marginLeft: spacing.xs,
    minWidth: 44,
    textAlign: 'right',
  },
  label: {
    color: colors.dark,
    marginBottom: spacing.xs,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    color: colors.white,
  },
  infoText: {
    color: colors.white,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  halfInput: {
    flex: 1,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.white,
  },
  infoCard: {
    backgroundColor: colors.primary,
    marginBottom: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  backButton: {
    flex: 1,
    paddingVertical: spacing.sm,
  },
  nextButton: {
    flex: 2,
    paddingVertical: spacing.sm,
  },
});
