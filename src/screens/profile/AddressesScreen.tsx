import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Alert,
  TouchableOpacity,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  TextInput as RNTextInput,
} from 'react-native';
import { Text, ActivityIndicator, FAB } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import {
  useGetAddressesQuery,
  useCreateAddressMutation,
  useUpdateAddressMutation,
  useDeleteAddressMutation,
} from '../../store/api/authApi';
import { colors } from '../../theme/colors';
import { useAppTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/spacing';
import { MapboxService } from '../../services/mapbox.service';
import { GooglePlacesService } from '../../services/googlePlaces.service';
import { RootState } from '../../store';

// LABEL_OPTIONS built inside component

interface AddressForm {
  label: string;
  address: string;
  lat: string;
  lng: string;
  floor: string;
  hasElevator: boolean;
  instructions: string;
  isDefault: boolean;
}

const emptyForm = (): AddressForm => ({
  label: 'Maison',
  address: '',
  lat: '0',
  lng: '0',
  floor: '0',
  hasElevator: false,
  instructions: '',
  isDefault: false,
});

export const AddressesScreen = () => {
  const { t, i18n } = useTranslation();
    const { tokens } = useAppTheme();

  const styles = useMemo(() => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  emptyContainer: {
    flex: 1,
  },
  emptyContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    color: tokens.text.primary,
    marginBottom: 8,
  },
  emptyHint: {
    color: tokens.text.secondary,
    textAlign: 'center',
  },
  card: {
    backgroundColor: tokens.card,
    borderRadius: 12,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  cardIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: tokens.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIcon: {
    fontSize: 18,
  },
  cardBody: {
    flex: 1,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  cardLabel: {
    color: tokens.text.primary,
    fontWeight: '600',
  },
  defaultBadge: {
    backgroundColor: tokens.primary,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  defaultBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '600',
  },
  cardAddress: {
    color: tokens.text.primary,
  },
  cardDetail: {
    color: tokens.text.secondary,
    marginTop: 2,
  },
  cardInstructions: {
    color: tokens.text.secondary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 4,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: tokens.backgroundAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    fontSize: 16,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.xl,
    backgroundColor: tokens.primary,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: tokens.modal,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
    maxHeight: '90%',
  },
  modalTitle: {
    color: tokens.text.primary,
    fontWeight: '700',
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  label: {
    color: tokens.text.primary,
    marginBottom: 4,
    marginTop: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: tokens.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 15,
    color: tokens.text.primary,
    backgroundColor: tokens.backgroundAlt,
  },
  radioGroup: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  radioBtn: {
    borderWidth: 1,
    borderColor: tokens.border,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
  },
  radioBtnActive: {
    borderColor: tokens.primary,
    backgroundColor: tokens.primary + '15',
  },
  radioBtnText: {
    color: tokens.text.secondary,
    fontSize: 14,
  },
  radioBtnTextActive: {
    color: tokens.primary,
    fontWeight: '600',
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: tokens.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: tokens.primary,
    borderColor: tokens.primary,
  },
  checkboxMark: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  checkLabel: {
    color: tokens.text.primary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: tokens.border,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: tokens.text.secondary,
    fontSize: 15,
    fontWeight: '600',
  },
  confirmBtn: {
    flex: 2,
    backgroundColor: tokens.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  confirmBtnText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
  suggestionsBox: {
    borderWidth: 1,
    borderColor: tokens.border,
    borderRadius: 8,
    backgroundColor: tokens.card,
    marginTop: 2,
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tokens.border,
  },
  suggestionText: {
    fontSize: 13,
    color: tokens.text.primary,
    flex: 1,
  },
  }), [tokens]);
const LABEL_OPTIONS = [t('addresses.home'), t('addresses.office'), t('addresses.other')];

  const activeCountryCode = useSelector((s: RootState) =>
    s.location.selectedCountryCode ?? s.location.detectedCountryCode ?? undefined,
  );

  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const placesSessionRef = useRef<string>(GooglePlacesService.generateSessionToken?.() ?? '');

  const geocodeAddress = async (query: string) => {
    if (!query.trim() || query.trim().length < 3) { setSuggestions([]); return; }
    setIsGeocoding(true);
    const mapboxFallback = async () => {
      const results = await MapboxService.geocodeAddress(query.trim(), {
        country: activeCountryCode,
        language: i18n.language,
      });
      setSuggestions(results.slice(0, 5));
    };
    try {
      if (GooglePlacesService.isConfigured()) {
        const results = await GooglePlacesService.suggest(query.trim(), {
          countryCode: activeCountryCode,
          language: i18n.language,
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
    setForm(f => ({ ...f, address: text, lat: '0', lng: '0' }));
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
        placesSessionRef.current = GooglePlacesService.generateSessionToken?.() ?? '';
        if (details) {
          const readableAddress = suggestion.name
            ? [suggestion.name, suggestion.subtitle].filter(Boolean).join(', ')
            : details.fullAddress;
          setForm(f => ({ ...f, address: readableAddress || details.fullAddress, lat: String(details.lat), lng: String(details.lng) }));
        }
      } catch { /* ignore */ } finally { setIsGeocoding(false); }
    } else {
      setForm(f => ({
        ...f,
        address: suggestion.placeName ?? suggestion.name ?? f.address,
        lat: String(suggestion.lat ?? 0),
        lng: String(suggestion.lng ?? 0),
      }));
    }
  };

  const { data: addresses = [], isLoading, refetch } = useGetAddressesQuery(undefined);
  const [createAddress, { isLoading: creating }] = useCreateAddressMutation();
  const [updateAddress, { isLoading: updating }] = useUpdateAddressMutation();
  const [deleteAddress] = useDeleteAddressMutation();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AddressForm>(emptyForm());
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setForm(emptyForm());
    setEditingId(null);
    setSuggestions([]);
    setModalVisible(true);
  };

  const openEdit = (item: any) => {
    setForm({
      label: item.label ?? 'Maison',
      address: item.address ?? '',
      lat: String(item.lat ?? 0),
      lng: String(item.lng ?? 0),
      floor: String(item.floor ?? 0),
      hasElevator: item.hasElevator ?? false,
      instructions: item.instructions ?? '',
      isDefault: item.isDefault ?? false,
    });
    setEditingId(item.id);
    setSuggestions([]);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.address.trim()) {
      Alert.alert(t('common.error'), t('addresses.address') + ' ' + t('common.required'));
      return;
    }
    setSaving(true);
    try {
      const payload = {
        label: form.label,
        address: form.address.trim(),
        lat: parseFloat(form.lat) || 0,
        lng: parseFloat(form.lng) || 0,
        floor: parseInt(form.floor, 10) || 0,
        hasElevator: form.hasElevator,
        instructions: form.instructions.trim() || undefined,
        isDefault: form.isDefault,
      };

      if (editingId) {
        await updateAddress({ id: editingId, ...payload }).unwrap();
      } else {
        await createAddress(payload).unwrap();
      }
      setModalVisible(false);
    } catch {
      Alert.alert(t('common.error'), t('addresses.save_error'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (item: any) => {
    Alert.alert(
      t('addresses.delete_title'),
      t('addresses.delete_confirm', { label: item.label }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAddress(item.id).unwrap();
            } catch {
              Alert.alert(t('common.error'), t('addresses.delete_error'));
            }
          },
        },
      ],
    );
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardLeft}>
        <View style={styles.cardIconWrapper}>
          <Text style={styles.cardIcon}>
            {item.label === 'Maison' ? '🏠' : item.label === 'Bureau' ? '🏢' : '📍'}
          </Text>
        </View>
        <View style={styles.cardBody}>
          <View style={styles.cardTitleRow}>
            <Text variant="titleSmall" style={styles.cardLabel}>{item.label}</Text>
            {item.isDefault && (
              <View style={styles.defaultBadge}>
                <Text style={styles.defaultBadgeText}>{t('addresses.default_badge')}</Text>
              </View>
            )}
          </View>
          <Text variant="bodySmall" style={styles.cardAddress} numberOfLines={2}>
            {item.address}
          </Text>
          {item.floor > 0 && (
            <Text variant="bodySmall" style={styles.cardDetail}>
              {t('addresses.floor')} {item.floor}{item.hasElevator ? ` · ${t('addresses.elevator')}` : ''}
            </Text>
          )}
          {item.instructions ? (
            <Text variant="bodySmall" style={styles.cardInstructions} numberOfLines={1}>
              {item.instructions}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity onPress={() => openEdit(item)} style={styles.actionBtn}>
          <Text style={styles.actionBtnText}>✏️</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDelete(item)} style={styles.actionBtn}>
          <Text style={styles.actionBtnText}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={tokens.primary} />
        </View>
      ) : (
        <FlatList
          data={addresses}
          keyExtractor={(item: any) => item.id}
          renderItem={renderItem}
          contentContainerStyle={
            addresses.length === 0 ? styles.emptyContainer : styles.listContent
          }
          ListEmptyComponent={
            <View style={styles.emptyContent}>
              <Text style={styles.emptyIcon}>📍</Text>
              <Text variant="titleMedium" style={styles.emptyTitle}>
                {t('addresses.empty')}
              </Text>
              <Text variant="bodySmall" style={styles.emptyHint}>
                {t('addresses.empty_hint')}
              </Text>
            </View>
          }
        />
      )}

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={openCreate}
        color={colors.white}
      />

      {/* Modal ajout / édition */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView behavior="padding" style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text variant="titleMedium" style={styles.modalTitle}>
                {editingId ? t('addresses.edit') : t('addresses.add')}
              </Text>

              {/* Label */}
              <Text variant="labelMedium" style={styles.label}>{t('addresses.label')}</Text>
              <View style={styles.radioGroup}>
                {LABEL_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.radioBtn, form.label === opt && styles.radioBtnActive]}
                    onPress={() => setForm((f) => ({ ...f, label: opt }))}
                  >
                    <Text
                      style={[
                        styles.radioBtnText,
                        form.label === opt && styles.radioBtnTextActive,
                      ]}
                    >
                      {opt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Adresse */}
              <Text variant="labelMedium" style={styles.label}>{t('addresses.address')} *</Text>
              <RNTextInput
                style={styles.input}
                value={form.address}
                onChangeText={handleAddressChange}
                placeholder={t('addresses.address_placeholder')}
                placeholderTextColor={tokens.text.secondary}
              />
              {isGeocoding && (
                <ActivityIndicator size="small" color={tokens.primary} style={{ marginTop: 4 }} />
              )}
              {suggestions.length > 0 && (
                <View style={styles.suggestionsBox}>
                  {suggestions.map((s, i) => (
                    <TouchableOpacity
                      key={i}
                      style={styles.suggestionItem}
                      onPress={() => selectSuggestion(s)}
                    >
                      <Text style={styles.suggestionText} numberOfLines={2}>
                        {s.name ?? s.placeName ?? s.fullAddress ?? ''}
                        {s.subtitle ? `\n${s.subtitle}` : ''}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Étage */}
              <Text variant="labelMedium" style={styles.label}>{t('addresses.floor')}</Text>
              <RNTextInput
                style={styles.input}
                value={form.floor}
                onChangeText={(v) => setForm((f) => ({ ...f, floor: v }))}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={tokens.text.secondary}
              />

              {/* Ascenseur */}
              <TouchableOpacity
                style={styles.checkRow}
                onPress={() => setForm((f) => ({ ...f, hasElevator: !f.hasElevator }))}
              >
                <View style={[styles.checkbox, form.hasElevator && styles.checkboxChecked]}>
                  {form.hasElevator && <Text style={styles.checkboxMark}>✓</Text>}
                </View>
                <Text variant="bodyMedium" style={styles.checkLabel}>{t('addresses.elevator')}</Text>
              </TouchableOpacity>

              {/* Instructions */}
              <Text variant="labelMedium" style={styles.label}>{t('addresses.instructions')} ({t('common.optional')})</Text>
              <RNTextInput
                style={[styles.input, { height: 72 }]}
                value={form.instructions}
                onChangeText={(v) => setForm((f) => ({ ...f, instructions: v }))}
                placeholder={t('addresses.instructions_placeholder')}
                placeholderTextColor={tokens.text.secondary}
                multiline
              />

              {/* Défaut */}
              <TouchableOpacity
                style={styles.checkRow}
                onPress={() => setForm((f) => ({ ...f, isDefault: !f.isDefault }))}
              >
                <View style={[styles.checkbox, form.isDefault && styles.checkboxChecked]}>
                  {form.isDefault && <Text style={styles.checkboxMark}>✓</Text>}
                </View>
                <Text variant="bodyMedium" style={styles.checkLabel}>{t('addresses.is_default')}</Text>
              </TouchableOpacity>

              {/* Actions */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmBtn, saving && styles.saveBtnDisabled]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color={colors.white} size="small" />
                  ) : (
                    <Text style={styles.confirmBtnText}>{t('common.save')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};
