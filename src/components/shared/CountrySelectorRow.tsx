import React, { useState } from 'react';
import { TouchableOpacity, View, StyleSheet, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { RootState } from '../../store';
import { selectCountry } from '../../store/slices/locationSlice';
import { getCountryInfo } from '../../config/countries';
import { CountrySelectionModal } from './CountrySelectionModal';
import { useAppTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/spacing';

interface Props {
  /**
   * pill  → badge compact sur fond primary (headers colorés)
   * row   → barre pleine largeur sur fond clair (corps de page)
   */
  variant?: 'pill' | 'row';
}

export const CountrySelectorRow = ({ variant = 'row' }: Props) => {
  const { tokens } = useAppTheme();
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const selectedCountryCode = useSelector((s: RootState) => s.location.selectedCountryCode);
  const detectedCountryCode = useSelector((s: RootState) => s.location.detectedCountryCode);
  const detectionStatus    = useSelector((s: RootState) => s.location.detectionStatus);

  const [showModal, setShowModal] = useState(false);

  const activeCountry = getCountryInfo(selectedCountryCode || detectedCountryCode || '');
  const isDetecting   = detectionStatus === 'detecting';
  const isPill        = variant === 'pill';

  const containerStyle = isPill
    ? styles.pill
    : [styles.row, { backgroundColor: tokens.card, borderBottomColor: tokens.border }];

  const textColor    = isPill ? '#fff'                   : tokens.text.primary;
  const subColor     = isPill ? 'rgba(255,255,255,0.75)' : tokens.text.secondary;
  const iconColor    = isPill ? 'rgba(255,255,255,0.80)' : tokens.text.secondary;

  const label = activeCountry
    ? `${activeCountry.flag}  ${t(`country.${activeCountry.nameKey}`)}`
    : t('country.select_country');

  return (
    <>
      <TouchableOpacity
        style={containerStyle}
        onPress={() => setShowModal(true)}
        activeOpacity={0.72}
      >
        {isDetecting ? (
          <ActivityIndicator size={14} color={iconColor} style={{ marginRight: 4 }} />
        ) : (
          <Icon name="earth" size={15} color={iconColor} />
        )}

        <View style={styles.labelWrap}>
          {!isPill && (
            <Text style={[styles.sublabel, { color: subColor }]}>
              {t('country.active_country')}
            </Text>
          )}
          <Text style={[styles.label, { color: textColor }, isPill && styles.labelPill]}>
            {label}
          </Text>
        </View>

        <Icon name="chevron-down" size={14} color={iconColor} />
      </TouchableOpacity>

      <CountrySelectionModal
        visible={showModal}
        selectedCode={selectedCountryCode}
        onSelect={(code) => dispatch(selectCountry(code))}
        onClose={() => setShowModal(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  /* variant pill — badge dans un header coloré */
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    marginTop: spacing.sm + 2,
  },

  /* variant row — barre plein écran sur fond clair */
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },

  labelWrap: {
    flex: 1,
  },
  sublabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  labelPill: {
    fontSize: 13,
  },
});
