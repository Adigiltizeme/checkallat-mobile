import React, { useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { RootState } from '../../store';
import { useAppTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/spacing';
import { GooglePlacesService } from '../../services/googlePlaces.service';
import { MapboxService } from '../../services/mapbox.service';

export interface AddressValue {
  address: string;
  lat: number | null;
  lng: number | null;
}

interface Props {
  label: string;
  value: AddressValue;
  onChange: (value: AddressValue) => void;
}

/** Saisie d'adresse avec autocomplétion (Google Places, repli Mapbox) — même logique que les adresses enregistrées */
export const AddressAutocompleteInput = ({ label, value, onChange }: Props) => {
  const { tokens } = useAppTheme();
  const { t, i18n } = useTranslation();
  const countryCode = useSelector((s: RootState) => s.location.selectedCountryCode ?? s.location.detectedCountryCode ?? undefined);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionRef = useRef<string>(GooglePlacesService.generateSessionToken());

  const search = async (query: string) => {
    setLoading(true);
    const mapboxFallback = async () => {
      const results = await MapboxService.geocodeAddress(query, { country: countryCode, language: i18n.language });
      setSuggestions(results.slice(0, 5));
    };
    try {
      if (GooglePlacesService.isConfigured()) {
        setSuggestions(await GooglePlacesService.suggest(query, { countryCode, language: i18n.language, sessionToken: sessionRef.current }));
      } else {
        await mapboxFallback();
      }
    } catch {
      try { await mapboxFallback(); } catch { setSuggestions([]); }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (text: string) => {
    onChange({ address: text, lat: null, lng: null });
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.trim().length >= 3) {
      debounceRef.current = setTimeout(() => search(text.trim()), 300);
    } else {
      setSuggestions([]);
    }
  };

  const select = async (suggestion: any) => {
    setSuggestions([]);
    if (suggestion.placeId) {
      setLoading(true);
      try {
        const details = await GooglePlacesService.getDetails(suggestion.placeId, sessionRef.current, i18n.language);
        sessionRef.current = GooglePlacesService.generateSessionToken();
        if (details) {
          const readable = suggestion.name ? [suggestion.name, suggestion.subtitle].filter(Boolean).join(', ') : details.fullAddress;
          onChange({ address: readable || details.fullAddress, lat: details.lat, lng: details.lng });
        }
      } finally {
        setLoading(false);
      }
    } else {
      onChange({
        address: suggestion.placeName ?? suggestion.name ?? value.address,
        lat: suggestion.lat ?? null,
        lng: suggestion.lng ?? null,
      });
    }
  };

  const located = value.lat != null && value.lng != null;

  return (
    <View>
      <TextInput
        mode="outlined"
        label={label}
        value={value.address}
        onChangeText={handleChange}
        outlineColor={tokens.border}
        activeOutlineColor={tokens.primary}
        style={{ backgroundColor: tokens.backgroundAlt }}
        right={
          loading
            ? <TextInput.Icon icon={() => <ActivityIndicator size="small" color={tokens.primary} />} />
            : located
              ? <TextInput.Icon icon="map-marker-check" color={tokens.primary} />
              : undefined
        }
      />
      {!located && value.address.trim().length >= 3 && suggestions.length === 0 && !loading && (
        <Text style={[styles.hint, { color: tokens.text.secondary }]}>{t('marketplace.address_pick_suggestion')}</Text>
      )}
      {suggestions.length > 0 && (
        <View style={[styles.list, { borderColor: tokens.border, backgroundColor: tokens.card }]}>
          {suggestions.map((s, index) => (
            <TouchableOpacity
              key={s.placeId ?? s.id ?? index}
              style={[styles.item, { borderBottomColor: tokens.border }]}
              onPress={() => select(s)}
            >
              <Icon name="map-marker-outline" size={18} color={tokens.text.secondary} />
              <Text style={[styles.itemText, { color: tokens.text.primary }]} numberOfLines={2}>
                {s.name ? [s.name, s.subtitle].filter(Boolean).join(', ') : s.placeName}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  hint: { fontSize: 12, marginTop: 4 },
  list: { borderWidth: 1, borderRadius: 8, marginTop: 2, overflow: 'hidden' },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemText: { flex: 1, fontSize: 13 },
});
