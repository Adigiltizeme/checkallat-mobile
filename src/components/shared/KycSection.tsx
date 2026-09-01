/**
 * KycSection — vérification d'identité réutilisable
 *
 * Utilisé par : DriverApplicationScreen, ProApplicationScreen,
 * SellerApplicationScreen, et tout futur module nécessitant une identité vérifiée.
 *
 * Le parent garde ses propres useState ; ce composant est purement controlled.
 * Exporter aussi useKycState() pour éviter de déclarer 4 états dans chaque screen.
 */
import React, { useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { PhotoPickerGrid } from './PhotoPickerGrid';
import { useAppTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/spacing';
import { colors } from '../../theme/colors';

export type IdDocumentType = 'national_id' | 'passport' | 'residence_permit';

export interface KycState {
  idDocumentType: IdDocumentType;
  idFrontPhotos: string[];
  idBackPhotos: string[];
  selfiePhotos: string[];
}

export interface KycSectionProps extends KycState {
  onDocumentTypeChange: (type: IdDocumentType) => void;
  onIdFrontChange: (photos: string[]) => void;
  onIdBackChange: (photos: string[]) => void;
  onSelfieChange: (photos: string[]) => void;
  showErrors?: boolean;
}

/** Valeur initiale pour useKycState() */
export const initialKycState = (): KycState => ({
  idDocumentType: 'national_id',
  idFrontPhotos: [],
  idBackPhotos: [],
  selfiePhotos: [],
});

/** Retourne true si tous les champs KYC sont valides */
export function isKycValid(state: KycState): boolean {
  const isPassport = state.idDocumentType === 'passport';
  return (
    state.idFrontPhotos.length > 0 &&
    (isPassport || state.idBackPhotos.length > 0) &&
    state.selfiePhotos.length > 0
  );
}

/**
 * Hook utilitaire — à appeler dans chaque screen de candidature.
 * Évite de déclarer 4 useState répétitifs dans chaque screen.
 */
export function useKycState() {
  const [idDocumentType, setIdDocumentType] = useState<IdDocumentType>('national_id');
  const [idFrontPhotos, setIdFrontPhotos] = useState<string[]>([]);
  const [idBackPhotos, setIdBackPhotos] = useState<string[]>([]);
  const [selfiePhotos, setSelfiePhotos] = useState<string[]>([]);

  const state: KycState = { idDocumentType, idFrontPhotos, idBackPhotos, selfiePhotos };

  return {
    state,
    isValid: isKycValid(state),
    props: {
      idDocumentType,
      idFrontPhotos,
      idBackPhotos,
      selfiePhotos,
      onDocumentTypeChange: setIdDocumentType,
      onIdFrontChange: setIdFrontPhotos,
      onIdBackChange: setIdBackPhotos,
      onSelfieChange: setSelfiePhotos,
    },
  };
}

const DOC_TYPES: IdDocumentType[] = ['national_id', 'passport', 'residence_permit'];

export const KycSection: React.FC<KycSectionProps> = ({
  idDocumentType,
  idFrontPhotos,
  idBackPhotos,
  selfiePhotos,
  onDocumentTypeChange,
  onIdFrontChange,
  onIdBackChange,
  onSelfieChange,
  showErrors = false,
}) => {
  const { t } = useTranslation();
  const { tokens } = useAppTheme();
  const isPassport = idDocumentType === 'passport';

  return (
    <View>
      {/* Titre section */}
      <Text
        variant="titleSmall"
        style={{ color: tokens.primary, marginTop: spacing.xl, marginBottom: 4 }}
      >
        {t('kyc.section_title')}
      </Text>
      <Text variant="bodySmall" style={{ color: tokens.text.secondary, marginBottom: spacing.sm, lineHeight: 18 }}>
        {t('kyc.section_hint')}
      </Text>

      {/* Type de document */}
      <Text variant="labelLarge" style={{ color: tokens.text.primary, marginBottom: spacing.sm, marginTop: spacing.md }}>
        {t('kyc.document_type')} *
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm }}>
        {DOC_TYPES.map((type) => (
          <TouchableOpacity
            key={type}
            style={{
              borderWidth: 1.5,
              borderColor: idDocumentType === type ? tokens.primary : tokens.border,
              borderRadius: 20,
              paddingVertical: 6,
              paddingHorizontal: 14,
              backgroundColor: idDocumentType === type ? tokens.primary + '18' : 'transparent',
            }}
            onPress={() => onDocumentTypeChange(type)}
            activeOpacity={0.8}
          >
            <Text
              style={{
                color: idDocumentType === type ? tokens.primary : tokens.text.secondary,
                fontSize: 13,
                fontWeight: idDocumentType === type ? '600' : '400',
              }}
            >
              {t(`kyc.doc_${type}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Recto */}
      <Text variant="labelLarge" style={{ color: tokens.text.primary, marginBottom: 4, marginTop: spacing.md }}>
        {t('kyc.id_front')} *
      </Text>
      <Text variant="bodySmall" style={{ color: tokens.text.secondary, marginBottom: spacing.sm }}>
        {t('kyc.id_front_hint')}
      </Text>
      <PhotoPickerGrid photos={idFrontPhotos} onPhotosChange={onIdFrontChange} maxPhotos={1} />
      {showErrors && idFrontPhotos.length === 0 && (
        <Text variant="bodySmall" style={{ color: colors.error, marginTop: 4 }}>
          {t('kyc.id_front_required')}
        </Text>
      )}

      {/* Verso (masqué si passeport) */}
      {!isPassport && (
        <>
          <Text variant="labelLarge" style={{ color: tokens.text.primary, marginBottom: 4, marginTop: spacing.md }}>
            {t('kyc.id_back')} *
          </Text>
          <Text variant="bodySmall" style={{ color: tokens.text.secondary, marginBottom: spacing.sm }}>
            {t('kyc.id_back_hint')}
          </Text>
          <PhotoPickerGrid photos={idBackPhotos} onPhotosChange={onIdBackChange} maxPhotos={1} />
          {showErrors && idBackPhotos.length === 0 && (
            <Text variant="bodySmall" style={{ color: colors.error, marginTop: 4 }}>
              {t('kyc.id_back_required')}
            </Text>
          )}
        </>
      )}

      {/* Selfie */}
      <Text variant="labelLarge" style={{ color: tokens.text.primary, marginBottom: 4, marginTop: spacing.md }}>
        {t('kyc.selfie')} *
      </Text>
      <Text variant="bodySmall" style={{ color: tokens.text.secondary, marginBottom: spacing.sm }}>
        {t('kyc.selfie_hint')}
      </Text>
      <PhotoPickerGrid photos={selfiePhotos} onPhotosChange={onSelfieChange} maxPhotos={1} />
      {showErrors && selfiePhotos.length === 0 && (
        <Text variant="bodySmall" style={{ color: colors.error, marginTop: 4 }}>
          {t('kyc.selfie_required')}
        </Text>
      )}
    </View>
  );
};
