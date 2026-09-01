/**
 * KybFranceSection — vérification légale France réutilisable
 *
 * Affiché uniquement si le pays actif de l'utilisateur est FR.
 * Utilisé par : ProApplicationScreen, DriverApplicationScreen,
 * SellerApplicationScreen, et tout futur module opérant en France.
 *
 * Le parent gère isFR et les états ; ce composant est purement controlled.
 * Exporter aussi useKybFranceState() pour simplifier l'usage dans les screens.
 */
import React, { useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { PhotoPickerGrid } from './PhotoPickerGrid';
import { useAppTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/spacing';
import { colors } from '../../theme/colors';

export type LegalStatus = 'auto_entrepreneur' | 'eurl' | 'sasu' | 'sarl' | 'sas' | 'other';

export const LEGAL_STATUSES: LegalStatus[] = [
  'auto_entrepreneur', 'eurl', 'sasu', 'sarl', 'sas', 'other',
];

export interface KybFranceState {
  legalStatus: string;
  siret: string;
  apeNafCode: string;
  rcPhotos: string[];
}

export interface KybFranceSectionProps extends KybFranceState {
  onLegalStatusChange: (status: string) => void;
  onSiretChange: (siret: string) => void;
  onApeNafCodeChange: (code: string) => void;
  onRcPhotosChange: (photos: string[]) => void;
  showErrors?: boolean;
}

/** Valeur initiale pour useKybFranceState() */
export const initialKybFranceState = (): KybFranceState => ({
  legalStatus: '',
  siret: '',
  apeNafCode: '',
  rcPhotos: [],
});

/** Retourne true si tous les champs KYB France sont valides */
export function isKybFranceValid(state: KybFranceState): boolean {
  return (
    state.legalStatus !== '' &&
    /^\d{14}$/.test(state.siret.replace(/\s/g, '')) &&
    state.apeNafCode.trim().length >= 4 &&
    state.rcPhotos.length > 0
  );
}

/**
 * Hook utilitaire — à appeler dans chaque screen de candidature.
 * Évite de déclarer 4 useState répétitifs dans chaque screen.
 */
export function useKybFranceState() {
  const [legalStatus, setLegalStatus] = useState('');
  const [siret, setSiret] = useState('');
  const [apeNafCode, setApeNafCode] = useState('');
  const [rcPhotos, setRcPhotos] = useState<string[]>([]);

  const state: KybFranceState = { legalStatus, siret, apeNafCode, rcPhotos };

  return {
    state,
    isValid: isKybFranceValid(state),
    props: {
      legalStatus,
      siret,
      apeNafCode,
      rcPhotos,
      onLegalStatusChange: setLegalStatus,
      onSiretChange: (text: string) => setSiret(text.replace(/[^0-9 ]/g, '')),
      onApeNafCodeChange: setApeNafCode,
      onRcPhotosChange: setRcPhotos,
    },
  };
}

export const KybFranceSection: React.FC<KybFranceSectionProps> = ({
  legalStatus,
  siret,
  apeNafCode,
  rcPhotos,
  onLegalStatusChange,
  onSiretChange,
  onApeNafCodeChange,
  onRcPhotosChange,
  showErrors = false,
}) => {
  const { t } = useTranslation();
  const { tokens } = useAppTheme();
  const siretClean = siret.replace(/\s/g, '');
  const siretInvalid = siret.length > 0 && !/^\d{14}$/.test(siretClean);

  return (
    <View>
      {/* Bannière France */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: spacing.xs,
          backgroundColor: '#FEF3C7',
          borderLeftWidth: 4,
          borderLeftColor: '#F59E0B',
          borderRadius: 8,
          padding: 14,
          marginTop: spacing.xl,
          marginBottom: spacing.md,
        }}
      >
        <Icon name="flag" size={16} color="#F59E0B" style={{ marginTop: 1 }} />
        <Text style={{ flex: 1, color: '#92400E', lineHeight: 20, fontSize: 13 }}>
          {t('kyb.france_notice')}
        </Text>
      </View>

      {/* Statut légal */}
      <Text variant="labelLarge" style={{ color: tokens.text.primary, marginBottom: spacing.sm }}>
        {t('kyb.legal_status')} *
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md }}>
        {LEGAL_STATUSES.map((status) => (
          <TouchableOpacity
            key={status}
            onPress={() => onLegalStatusChange(status)}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 20,
              borderWidth: 1.5,
              borderColor: legalStatus === status ? tokens.primary : tokens.border,
              backgroundColor: legalStatus === status ? tokens.primary + '15' : tokens.backgroundAlt,
            }}
            activeOpacity={0.8}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: '600',
                color: legalStatus === status ? tokens.primary : tokens.text.secondary,
              }}
            >
              {t(`kyb.status_${status}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {showErrors && legalStatus === '' && (
        <Text variant="bodySmall" style={{ color: colors.error, marginTop: -spacing.sm, marginBottom: spacing.sm }}>
          {t('kyb.legal_status_required')}
        </Text>
      )}

      {/* SIRET */}
      <TextInput
        label={t('kyb.siret') + ' *'}
        value={siret}
        onChangeText={onSiretChange}
        keyboardType="number-pad"
        maxLength={17}
        error={siretInvalid}
        style={{ backgroundColor: tokens.backgroundAlt, marginBottom: 4 }}
        mode="outlined"
        outlineColor={tokens.border}
        activeOutlineColor={tokens.primary}
        placeholder="123 456 789 12345"
      />
      {siretInvalid && (
        <Text variant="bodySmall" style={{ color: colors.error, marginBottom: spacing.sm }}>
          {t('kyb.siret_invalid')}
        </Text>
      )}

      {/* Code APE / NAF */}
      <TextInput
        label={t('kyb.ape_naf_code') + ' *'}
        value={apeNafCode}
        onChangeText={onApeNafCodeChange}
        autoCapitalize="characters"
        maxLength={6}
        style={{ backgroundColor: tokens.backgroundAlt, marginTop: spacing.sm, marginBottom: spacing.sm }}
        mode="outlined"
        outlineColor={tokens.border}
        activeOutlineColor={tokens.primary}
        placeholder="4321A"
      />

      {/* Attestation RC */}
      <Text variant="labelLarge" style={{ color: tokens.text.primary, marginBottom: 4, marginTop: spacing.sm }}>
        {t('kyb.rc_pro_insurance')} *
      </Text>
      <Text variant="bodySmall" style={{ color: tokens.text.secondary, marginBottom: spacing.sm }}>
        {t('kyb.rc_pro_hint')}
      </Text>
      <PhotoPickerGrid photos={rcPhotos} onPhotosChange={onRcPhotosChange} maxPhotos={1} />
      {showErrors && rcPhotos.length === 0 && (
        <Text variant="bodySmall" style={{ color: colors.error, marginTop: 4 }}>
          {t('kyb.rc_pro_required')}
        </Text>
      )}
    </View>
  );
};
