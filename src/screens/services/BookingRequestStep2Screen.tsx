import React, { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
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
import { TextInput, Text, IconButton, Switch, Chip, Card } from 'react-native-paper';
import { ChocolateButton } from '../../components/shared/ChocolateButton';
import { useAppTheme } from '../../theme/ThemeProvider';
import { StackScreenProps } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { HomeStackParamList } from '../../navigation/types';
import { BookingStep2Data, BookingAddressData } from '../../types/booking';
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

type Props = StackScreenProps<HomeStackParamList, 'BookingRequestStep2'>;

const getSuggestionIcon = (types?: string[], featureType?: string): string => {
  const ty = types ?? [];
  if (ty.some(x => ['shopping_mall','store','supermarket','department_store'].includes(x))) return 'store';
  if (ty.some(x => ['restaurant','cafe','food','bakery','bar'].includes(x))) return 'food';
  if (ty.some(x => ['hospital','health','pharmacy','doctor'].includes(x))) return 'hospital-box';
  if (ty.some(x => ['school','university','primary_school','secondary_school'].includes(x))) return 'school';
  if (ty.some(x => ['mosque','church','synagogue','place_of_worship'].includes(x))) return 'dome-light';
  if (ty.some(x => ['street_address','route'].includes(x))) return 'road-variant';
  if (ty.some(x => ['neighborhood','sublocality','locality'].includes(x))) return 'map-marker-radius';
  if (featureType === 'poi') return 'map-marker-star';
  if (featureType === 'address') return 'road-variant';
  if (featureType === 'place') return 'map-marker-radius';
  return 'map-marker-outline';
};

const formatDistance = (meters?: number): string | null => {
  if (!meters) return null;
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
};

export const BookingRequestStep2Screen = ({ route, navigation }: Props) => {
  const { tokens } = useAppTheme();

  const styles = useMemo(() => StyleSheet.create({
  container: { flex: 1, backgroundColor: tokens.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  stepLabel: { fontSize: 12, color: tokens.text.secondary, marginBottom: spacing.sm },
  countryBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: tokens.backgroundAlt, borderRadius: 8, padding: spacing.sm, marginBottom: spacing.md },
  countryBadgeText: { fontSize: 14, color: tokens.text.primary },
  countryBadgeChange: { fontSize: 12, color: tokens.primary },
  card: { borderRadius: 12, marginBottom: spacing.md, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  cardTitle: { fontSize: 16, fontWeight: '600', color: tokens.text.primary },
  input: { backgroundColor: tokens.backgroundAlt, marginBottom: spacing.xs },
  suggestions: { backgroundColor: tokens.card, borderRadius: 8, borderWidth: 1, borderColor: tokens.border, marginBottom: spacing.xs },
  suggestionItem: { flexDirection: 'row', alignItems: 'center', paddingRight: spacing.sm, borderBottomWidth: 1, borderBottomColor: tokens.border },
  suggestionText: { flex: 1 },
  suggestionName: { fontSize: 14, color: tokens.text.primary },
  suggestionSub: { fontSize: 12, color: tokens.text.secondary },
  suggestionDist: { fontSize: 12, color: tokens.text.secondary },
  successChip: { backgroundColor: '#E8F5E9', marginTop: spacing.xs },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm },
  halfInput: { flex: 1, marginRight: spacing.sm },
  fieldLabel: { fontSize: 12, color: tokens.text.secondary, marginBottom: 4 },
  stepper: { flexDirection: 'row', alignItems: 'center' },
  stepperVal: { fontSize: 18, fontWeight: '600', color: tokens.text.primary, minWidth: 30, textAlign: 'center' },
  buttons: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  backWrap: { flex: 1 },
  nextWrap: { flex: 2 },
  }), [tokens]);
  const { t, i18n } = useTranslation();
  const { categorySlug, step1Data, step2Prefill } = route.params as any;
  const dispatch = useDispatch();
  const locationState = useSelector((state: RootState) => state.location);

  useLayoutEffect(() => {
    navigation.setOptions({ title: t('booking_request.step_of', { current: 2, total: 5 }) });
  }, []);

  const [address, setAddress] = useState<Partial<BookingAddressData>>(
    step2Prefill?.address
      ? { ...step2Prefill.address }
      : { address: '', lat: undefined, lng: undefined, floor: 0, hasElevator: false, instructions: '' },
  );
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showUnsupportedModal, setShowUnsupportedModal] = useState(false);
  const [countryModalMode, setCountryModalMode] = useState<'unsupported' | 'change'>('unsupported');

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const placesSessionRef = useRef<string>(GooglePlacesService.generateSessionToken());

  useEffect(() => {
    if (locationState.detectionStatus === 'idle') {
      (async () => {
        dispatch(setDetecting());
        const result = await CountryDetectionService.detect();
        if (result.status === 'supported') {
          dispatch(setDetectedCountry({ countryCode: result.countryCode, lat: result.lat, lng: result.lng }));
        } else if (result.status === 'unsupported') {
          dispatch(setUnsupportedCountry({ lat: result.lat, lng: result.lng, countryCode: result.countryCode }));
          setCountryModalMode('unsupported');
          setShowUnsupportedModal(true);
        } else {
          dispatch(setDetectionDenied());
        }
      })();
    } else if (locationState.detectionStatus === 'unsupported') {
      setCountryModalMode('unsupported');
      setShowUnsupportedModal(true);
    }
  }, []);

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  const activeCountryCode = locationState.selectedCountryCode;

  const geocodeAddress = async (query: string) => {
    if (!query.trim() || query.trim().length < 3) return;
    setIsGeocoding(true);
    const mapboxFallback = async () => {
      const results = await MapboxService.geocodeAddress(query.trim(), {
        country: activeCountryCode ?? undefined,
        language: i18n.language,
        ...(locationState.userLat && locationState.userLng
          ? { proximity: { lat: locationState.userLat, lng: locationState.userLng } }
          : {}),
      });
      setSuggestions(results.slice(0, 5));
    };
    try {
      if (GooglePlacesService.isConfigured()) {
        const results = await GooglePlacesService.suggest(query.trim(), {
          countryCode: activeCountryCode ?? undefined,
          language: i18n.language,
          ...(locationState.userLat && locationState.userLng
            ? { proximity: { lat: locationState.userLat, lng: locationState.userLng } }
            : {}),
          sessionToken: placesSessionRef.current,
        });
        setSuggestions(results);
      } else {
        await mapboxFallback();
      }
    } catch {
      try { await mapboxFallback(); } catch { setSuggestions([]); }
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleAddressChange = (text: string) => {
    setAddress(prev => ({ ...prev, address: text, lat: text !== prev.address ? undefined : prev.lat, lng: text !== prev.address ? undefined : prev.lng }));
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.length >= 3) {
      debounceRef.current = setTimeout(() => geocodeAddress(text), 300);
    } else {
      setSuggestions([]);
    }
  };

  const selectSuggestion = async (suggestion: any) => {
    setSuggestions([]);
    if (suggestion.placeId) {
      setIsGeocoding(true);
      try {
        const details = await GooglePlacesService.getDetails(suggestion.placeId, placesSessionRef.current, i18n.language);
        placesSessionRef.current = GooglePlacesService.generateSessionToken();
        if (details) {
          const readableAddress = suggestion.name
            ? [suggestion.name, suggestion.subtitle].filter(Boolean).join(', ')
            : details.fullAddress;
          setAddress(prev => ({ ...prev, address: readableAddress || details.fullAddress, lat: details.lat, lng: details.lng }));
        }
      } catch { /* ignore */ } finally {
        setIsGeocoding(false);
      }
    } else {
      setAddress(prev => ({
        ...prev,
        address: suggestion.placeName ?? suggestion.name,
        lat: suggestion.lat,
        lng: suggestion.lng,
      }));
    }
  };

  const useCurrentLocation = async () => {
    setIsGeocoding(true);
    try {
      const { status } = await require('expo-location').requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('common.error'), t('transport.location_permission_msg'));
        return;
      }
      const location = await require('expo-location').getCurrentPositionAsync({});
      const { latitude: lat, longitude: lng } = location.coords;
      dispatch(setDetectedCountry({
        countryCode: locationState.selectedCountryCode ?? locationState.detectedCountryCode ?? 'eg',
        lat, lng,
      }));
      const result = await MapboxService.reverseGeocode(lat, lng, { language: 'fr,ar,en' });
      if (!result) { Alert.alert(t('common.error'), t('transport.location_error')); return; }
      setAddress(prev => ({ ...prev, address: result.placeName, lat: result.lat, lng: result.lng }));
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message || t('transport.location_error'));
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleNext = () => {
    if (!address.address?.trim()) {
      Alert.alert(t('common.error'), t('booking_request.address_required'));
      return;
    }
    if (!address.lat || !address.lng) {
      Alert.alert(t('common.error'), t('transport.coordinates_missing_msg'));
      return;
    }
    const step2Data: BookingStep2Data = {
      address: address as BookingAddressData,
    };
    navigation.navigate('BookingRequestStep3', { categorySlug, step1Data, step2Data });
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={'padding'}>
      <UnsupportedCountryModal
        visible={showUnsupportedModal}
        detectedCountryCode={locationState.detectedCountryCode}
        mode={countryModalMode}
        onCountrySelected={(country) => { dispatch(selectCountry(country.code)); setShowUnsupportedModal(false); }}
        onDismiss={() => setShowUnsupportedModal(false)}
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.stepLabel}>{t('booking_request.step_of', { current: 2, total: 5 })}</Text>

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

        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>📍 {t('booking_request.address_label')}</Text>
              <IconButton icon="crosshairs-gps" size={20} iconColor={tokens.primary} onPress={useCurrentLocation} />
            </View>

            <TextInput
              mode="outlined"
              label={t('booking_request.address_label')}
              placeholder={t('booking_request.address_placeholder')}
              value={address.address}
              onChangeText={handleAddressChange}
              outlineColor={tokens.border}
              activeOutlineColor={tokens.primary}
              style={styles.input}
              right={isGeocoding ? <TextInput.Icon icon={() => <ActivityIndicator size={20} color={tokens.primary} />} /> : undefined}
            />

            {suggestions.length > 0 && (
              <View style={styles.suggestions}>
                {suggestions.map((s: any, i: number) => (
                  <TouchableOpacity key={i} style={styles.suggestionItem} onPress={() => selectSuggestion(s)}>
                    <IconButton icon={getSuggestionIcon(s.types, s.featureType)} size={20} iconColor={tokens.primary} />
                    <View style={styles.suggestionText}>
                      <Text style={styles.suggestionName}>{s.name ?? s.placeName}</Text>
                      {(s.subtitle || s.city) ? (
                        <Text style={styles.suggestionSub}>{s.subtitle || [s.city, s.country].filter(Boolean).join(', ')}</Text>
                      ) : null}
                    </View>
                    {formatDistance(s.distanceMeters) && (
                      <Text style={styles.suggestionDist}>{formatDistance(s.distanceMeters)}</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {address.lat && address.lng && suggestions.length === 0 && (
              <Chip icon="check-circle" style={styles.successChip} textStyle={{ color: colors.success }}>
                {t('transport.coordinates', { lat: address.lat.toFixed(4), lng: address.lng.toFixed(4) })}
              </Chip>
            )}

            {/* Étage */}
            <View style={styles.row}>
              <View style={styles.halfInput}>
                <Text style={styles.fieldLabel}>{t('booking_request.floor_label')}</Text>
                <View style={styles.stepper}>
                  <IconButton icon="minus" size={20} onPress={() => setAddress(prev => ({ ...prev, floor: Math.max(0, (prev.floor ?? 0) - 1) }))} />
                  <Text style={styles.stepperVal}>{address.floor ?? 0}</Text>
                  <IconButton icon="plus" size={20} onPress={() => setAddress(prev => ({ ...prev, floor: (prev.floor ?? 0) + 1 }))} />
                </View>
              </View>
              <View style={styles.halfInput}>
                <Text style={styles.fieldLabel}>{t('booking_request.elevator_label')}</Text>
                <Switch
                  value={address.hasElevator ?? false}
                  onValueChange={v => setAddress(prev => ({ ...prev, hasElevator: v }))}
                  color={tokens.primary}
                />
              </View>
            </View>

            {/* Instructions */}
            <TextInput
              mode="outlined"
              label={t('booking_request.instructions_label')}
              placeholder={t('booking_request.instructions_placeholder')}
              value={address.instructions ?? ''}
              onChangeText={v => setAddress(prev => ({ ...prev, instructions: v }))}
              outlineColor={tokens.border}
              activeOutlineColor={tokens.primary}
              style={[styles.input, { marginTop: spacing.sm }]}
            />
          </Card.Content>
        </Card>

        <View style={styles.buttons}>
          <View style={styles.backWrap}>
            <ChocolateButton variant="outline" onPress={() => navigation.goBack()}>
              {t('booking_request.back')}
            </ChocolateButton>
          </View>
          <View style={styles.nextWrap}>
            <ChocolateButton onPress={handleNext}>
              {t('booking_request.next')}
            </ChocolateButton>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
