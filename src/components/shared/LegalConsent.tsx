import React from 'react';
import { View, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Checkbox, Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '../../theme/ThemeProvider';
import { LEGAL_URLS } from '../../config/api';
import { colors } from '../../theme/colors';

/** Phrase « J'accepte les CGU et la politique de confidentialité » avec liens cliquables */
export const LegalConsentText = ({ prefixKey = 'legal.accept_prefix' }: { prefixKey?: string }) => {
  const { t } = useTranslation();
  const { tokens } = useAppTheme();
  const link = { color: tokens.primary, fontWeight: '600' as const, textDecorationLine: 'underline' as const };
  return (
    <Text style={{ flex: 1, color: tokens.text.primary, fontSize: 13, lineHeight: 20 }}>
      {t(prefixKey)}{' '}
      <Text style={link} onPress={() => Linking.openURL(LEGAL_URLS.terms)} accessibilityRole="link">
        {t('legal.terms_link')}
      </Text>
      {` ${t('legal.and')} `}
      <Text style={link} onPress={() => Linking.openURL(LEGAL_URLS.privacy)} accessibilityRole="link">
        {t('legal.privacy_link')}
      </Text>
      {t('legal.accept_suffix')}
    </Text>
  );
};

interface Props {
  checked: boolean;
  onToggle: () => void;
  showError?: boolean;
}

/** Case à cocher obligatoire d'acceptation des documents légaux (inscription) */
export const LegalConsentCheckbox = ({ checked, onToggle, showError }: Props) => {
  const { t } = useTranslation();
  const { tokens } = useAppTheme();
  return (
    <View style={{ marginBottom: 8 }}>
      <TouchableOpacity
        onPress={onToggle}
        activeOpacity={0.8}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        style={[
          styles.row,
          { backgroundColor: tokens.backgroundAlt, borderColor: showError && !checked ? colors.error : tokens.border },
        ]}
      >
        <Checkbox.Android status={checked ? 'checked' : 'unchecked'} onPress={onToggle} color={tokens.primary} />
        <View style={{ flex: 1, paddingTop: 7 }}>
          <LegalConsentText />
        </View>
      </TouchableOpacity>
      {showError && !checked && (
        <Text style={{ color: colors.error, fontSize: 12, marginTop: 4 }}>{t('legal.accept_required')}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 6,
    paddingRight: 12,
  },
});
