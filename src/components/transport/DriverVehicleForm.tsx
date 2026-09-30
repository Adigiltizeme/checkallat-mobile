import React, { useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, TextInput, Checkbox } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { PhotoPickerGrid } from '../shared/PhotoPickerGrid';
import { InsulatedBagSwitch } from '../shared/InsulatedBagSwitch';
import { useCourierLimits, useCourierSettings } from '../../hooks/useCourierLimits';
import {
  DRIVER_VEHICLE_TYPES,
  MOTORBIKE_CLASSES,
  DriverVehicleType,
  MotorbikeClass,
  VehicleRequirements,
  vehicleRequirements,
} from '../../utils/vehicleRequirements';
import { colors } from '../../theme/colors';
import { useAppTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/spacing';

export interface DriverVehicleFormState {
  vehicleType: DriverVehicleType;
  motorbikeClass: MotorbikeClass | null;
  vehiclePlate: string;
  vehicleCapacity: string;
  vehiclePhotos: string[];
  licensePhotos: string[];
  /** Carte grise (motorisés) ou justificatif du vélo — stocké dans `vehicleInsurance` */
  vehicleDocPhotos: string[];
}

/** État du formulaire véhicule + exigences calculées selon le véhicule et le pays du compte */
export const useDriverVehicleForm = (initial: Partial<DriverVehicleFormState> = {}) => {
  const [state, setState] = useState<DriverVehicleFormState>({
    vehicleType: 'van',
    motorbikeClass: null,
    vehiclePlate: '',
    vehicleCapacity: '',
    vehiclePhotos: [],
    licensePhotos: [],
    vehicleDocPhotos: [],
    ...initial,
  });
  const settings = useCourierSettings();
  const user = useSelector((s: RootState) => s.auth.user);
  const countryCode = user?.activeCountryId ?? user?.homeCountryId ?? null;
  const requirements = vehicleRequirements(settings, state.vehicleType, state.motorbikeClass, countryCode);

  const capacity = parseFloat(state.vehicleCapacity.replace(',', '.'));
  const isValid =
    (state.vehicleType !== 'motorbike' || !!state.motorbikeClass) &&
    (!requirements.plate || state.vehiclePlate.trim().length >= 3) &&
    (requirements.fixedCapacity != null || (!isNaN(capacity) && capacity > 0)) &&
    state.vehiclePhotos.length >= 2 &&
    (requirements.license !== 'required' || state.licensePhotos.length === 1) &&
    state.vehicleDocPhotos.length === 1;

  const set = (patch: Partial<DriverVehicleFormState>) => setState((prev) => ({ ...prev, ...patch }));
  const effectiveCapacity = requirements.fixedCapacity ?? capacity;

  return { state, set, requirements, isValid, effectiveCapacity };
};

interface Props {
  state: DriverVehicleFormState;
  onChange: (patch: Partial<DriverVehicleFormState>) => void;
  requirements: VehicleRequirements;
  /** Sac isotherme (2 roues) — géré par l'écran parent */
  insulatedBag?: { value: boolean; onValueChange: (v: boolean) => void; disabled?: boolean };
}

/**
 * Formulaire véhicule partagé : candidature livreur et gestion « Mon véhicule & mes documents ».
 * Les pièces demandées s'adaptent au véhicule (vélo, cyclomoteur, moto, utilitaire).
 */
export const DriverVehicleForm = ({ state, onChange, requirements, insulatedBag }: Props) => {
  const { t } = useTranslation();
  const { tokens } = useAppTheme();
  const courierLimits = useCourierLimits();
  const courierSettings = useCourierSettings();

  const styles = useMemo(() => StyleSheet.create({
    label: { color: tokens.text.primary, marginBottom: spacing.sm, marginTop: spacing.md },
    sectionLabel: { color: tokens.text.primary, marginBottom: spacing.sm, marginTop: spacing.lg },
    hint: { color: tokens.text.secondary, marginBottom: spacing.sm, lineHeight: 18 },
    errorHint: { color: colors.error, marginTop: 4 },
    radioGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
    radioBtn: { borderWidth: 1, borderColor: tokens.border, borderRadius: 8, paddingVertical: 8, paddingHorizontal: spacing.md },
    radioBtnActive: { borderColor: tokens.primary, backgroundColor: tokens.primary + '15' },
    radioBtnText: { color: tokens.text.secondary, fontSize: 14 },
    radioBtnTextActive: { color: tokens.primary, fontWeight: '600' },
    classCard: {
      flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
      borderWidth: 1, borderColor: tokens.border, borderRadius: 10, padding: spacing.md, marginBottom: spacing.sm,
    },
    classTitle: { color: tokens.text.primary, fontWeight: '600' },
    classDesc: { color: tokens.text.secondary, fontSize: 12, marginTop: 2, lineHeight: 16 },
    infoCard: {
      backgroundColor: tokens.primary + '15', borderRadius: 10, padding: spacing.md,
      marginBottom: spacing.md, borderWidth: 1, borderColor: tokens.primary,
    },
    infoText: { color: tokens.primary, fontWeight: '600' },
    noticeCard: {
      flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start',
      backgroundColor: tokens.card, borderRadius: 10, padding: spacing.md,
      marginBottom: spacing.md, borderWidth: 1, borderColor: tokens.border,
    },
    noticeText: { flex: 1, color: tokens.text.secondary, fontSize: 12, lineHeight: 18 },
    input: { backgroundColor: tokens.backgroundAlt, marginBottom: spacing.sm },
  }), [tokens]);

  const isBicycle = state.vehicleType === 'bicycle';
  const isMotorbike = state.vehicleType === 'motorbike';
  const isCourier = isBicycle || isMotorbike;
  const limits = isBicycle ? courierLimits.bicycle : courierLimits.motorbike;

  const photosHintKey = isBicycle
    ? 'driver_apply.vehicle_photos_hint_bicycle'
    : isMotorbike ? 'driver_apply.vehicle_photos_hint_motorbike' : 'driver_apply.vehicle_photos_hint';
  const isBikeProof = requirements.vehicleDocument === 'bike_proof';

  return (
    <View>
      {/* Type de véhicule */}
      <Text variant="labelLarge" style={styles.label}>{t('profile.vehicle_type')} *</Text>
      <View style={styles.radioGroup}>
        {DRIVER_VEHICLE_TYPES.map((type) => {
          const active = state.vehicleType === type;
          return (
            <TouchableOpacity
              key={type}
              style={[styles.radioBtn, active && styles.radioBtnActive]}
              onPress={() => onChange({ vehicleType: type, ...(type !== 'motorbike' && { motorbikeClass: null }) })}
              activeOpacity={0.8}
            >
              <Text style={[styles.radioBtnText, active && styles.radioBtnTextActive]}>
                {t(`transport.vehicle_${type}`)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Catégorie du deux-roues motorisé : conditionne l'exigence du permis */}
      {isMotorbike && (
        <>
          <Text variant="labelLarge" style={styles.label}>{t('driver_apply.motorbike_class_title')} *</Text>
          {MOTORBIKE_CLASSES.map((cls) => {
            const active = state.motorbikeClass === cls;
            return (
              <TouchableOpacity
                key={cls}
                style={[styles.classCard, active && styles.radioBtnActive]}
                onPress={() => onChange({ motorbikeClass: cls })}
                activeOpacity={0.8}
              >
                <Icon name={active ? 'radiobox-marked' : 'radiobox-blank'} size={22} color={active ? tokens.primary : tokens.text.secondary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.classTitle}>{t(`driver_apply.motorbike_class_${cls}`)}</Text>
                  <Text style={styles.classDesc}>{t(`driver_apply.motorbike_class_${cls}_desc`)}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
          {!state.motorbikeClass && (
            <Text variant="bodySmall" style={styles.errorHint}>{t('driver_apply.motorbike_class_required')}</Text>
          )}
        </>
      )}

      {/* Limites de livraison 2 roues */}
      {isCourier && (
        <View style={styles.infoCard}>
          <Text variant="bodySmall" style={styles.infoText}>
            {t(isBicycle ? 'driver_apply.courier_info_bicycle' : 'driver_apply.courier_info_motorbike', {
              weight: limits.maxWeightKg,
              distance: limits.maxDistanceKm,
              volume: Math.round((requirements.fixedCapacity ?? 0) * 1000),
            })}
          </Text>
        </View>
      )}

      {/* Vélo : ce qui est accepté, et contrôle de vitesse annoncé (dissuasif) */}
      {isBicycle && (
        <View style={styles.noticeCard}>
          <Icon name="shield-alert-outline" size={20} color={tokens.primary} />
          <Text style={styles.noticeText}>
            {t('driver_apply.bicycle_rules', { speed: courierSettings.bicycleMaxSpeedKmh })}
          </Text>
        </View>
      )}

      {isCourier && insulatedBag && (
        <InsulatedBagSwitch value={insulatedBag.value} onValueChange={insulatedBag.onValueChange} disabled={insulatedBag.disabled} />
      )}

      {/* Immatriculation — tous les véhicules motorisés */}
      {requirements.plate && (
        <>
          <Text variant="labelLarge" style={styles.label}>{t('profile.license_plate')} *</Text>
          <TextInput mode="outlined" value={state.vehiclePlate} onChangeText={(v) => onChange({ vehiclePlate: v })}
            placeholder={t('profile.plate_placeholder')} autoCapitalize="characters"
            outlineColor={tokens.border} activeOutlineColor={tokens.primary} style={styles.input} />
          {state.vehiclePlate.trim().length < 3 && (
            <Text variant="bodySmall" style={styles.errorHint}>{t('driver_apply.plate_required')}</Text>
          )}
        </>
      )}

      {/* Capacité — saisie uniquement pour les utilitaires (fixée pour les 2 roues) */}
      {requirements.fixedCapacity == null && (
        <>
          <Text variant="labelLarge" style={styles.label}>{t('driver_apply.vehicle_capacity')} *</Text>
          <TextInput mode="outlined" value={state.vehicleCapacity} onChangeText={(v) => onChange({ vehicleCapacity: v })}
            keyboardType="decimal-pad" placeholder="Ex: 10" right={<TextInput.Affix text="m³" />}
            outlineColor={tokens.border} activeOutlineColor={tokens.primary} style={styles.input} />
        </>
      )}

      {/* Photos du véhicule */}
      <Text variant="labelLarge" style={styles.sectionLabel}>{t('driver_apply.vehicle_photos_label')} *</Text>
      <Text variant="bodySmall" style={styles.hint}>{t(photosHintKey)}</Text>
      <PhotoPickerGrid photos={state.vehiclePhotos} onPhotosChange={(p) => onChange({ vehiclePhotos: p })} maxPhotos={5} />
      {state.vehiclePhotos.length < 2 && (
        <Text variant="bodySmall" style={styles.errorHint}>{t('driver_apply.vehicle_photos_min')}</Text>
      )}

      {/* Permis — obligatoire, facultatif (cyclomoteur selon le pays) ou sans objet (vélo) */}
      {requirements.license !== 'none' && (
        <>
          <Text variant="labelLarge" style={styles.sectionLabel}>
            {t('driver_apply.license_label')}{requirements.license === 'required' ? ' *' : ` ${t('driver_apply.optional_suffix')}`}
          </Text>
          <Text variant="bodySmall" style={styles.hint}>
            {t(requirements.license === 'optional' ? 'driver_apply.moped_license_optional_hint' : 'driver_apply.license_hint')}
          </Text>
          <PhotoPickerGrid photos={state.licensePhotos} onPhotosChange={(p) => onChange({ licensePhotos: p })} maxPhotos={1} />
          {requirements.license === 'required' && state.licensePhotos.length === 0 && (
            <Text variant="bodySmall" style={styles.errorHint}>{t('driver_apply.license_required')}</Text>
          )}
        </>
      )}

      {/* Document du véhicule : carte grise, ou justificatif du vélo */}
      <Text variant="labelLarge" style={styles.sectionLabel}>
        {t(isBikeProof ? 'driver_apply.bike_proof_label' : 'driver_apply.insurance_label')} *
      </Text>
      <Text variant="bodySmall" style={styles.hint}>
        {t(isBikeProof ? 'driver_apply.bike_proof_hint' : 'driver_apply.insurance_hint')}
      </Text>
      <PhotoPickerGrid photos={state.vehicleDocPhotos} onPhotosChange={(p) => onChange({ vehicleDocPhotos: p })} maxPhotos={1} />
      {state.vehicleDocPhotos.length === 0 && (
        <Text variant="bodySmall" style={styles.errorHint}>
          {t(isBikeProof ? 'driver_apply.bike_proof_required' : 'driver_apply.insurance_required')}
        </Text>
      )}
    </View>
  );
};

/** Engagement du livreur à n'utiliser que le véhicule déclaré (exigé par le backend) */
export const VehicleDeclaration = ({ checked, onToggle }: { checked: boolean; onToggle: () => void }) => {
  const { t } = useTranslation();
  const { tokens } = useAppTheme();
  return (
    <TouchableOpacity
      onPress={onToggle}
      activeOpacity={0.8}
      style={{
        flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs, marginTop: spacing.lg,
        backgroundColor: tokens.card, borderRadius: 10, padding: spacing.sm,
        borderWidth: 1, borderColor: checked ? tokens.primary : tokens.border,
      }}
    >
      <Checkbox status={checked ? 'checked' : 'unchecked'} onPress={onToggle} color={tokens.primary} />
      <Text style={{ flex: 1, color: tokens.text.primary, fontSize: 13, lineHeight: 19, paddingTop: 8 }}>
        {t('driver_apply.declaration_label')}
      </Text>
    </TouchableOpacity>
  );
};
