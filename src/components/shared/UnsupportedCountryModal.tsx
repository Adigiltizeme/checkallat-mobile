import React from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Text, Button } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { SUPPORTED_COUNTRIES, SupportedCountry } from '../../config/countries';
import { selectCountry } from '../../store/slices/locationSlice';

interface Props {
  visible: boolean;
  detectedCountryCode: string | null;
  onCountrySelected: (country: SupportedCountry) => void;
  onDismiss: () => void;
  /** 'unsupported' = pays détecté non pris en charge (défaut) | 'change' = choix manuel de pays */
  mode?: 'unsupported' | 'change';
}

export const UnsupportedCountryModal = ({
  visible,
  detectedCountryCode,
  onCountrySelected,
  onDismiss,
  mode = 'unsupported',
}: Props) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const handleSelect = (country: SupportedCountry) => {
    dispatch(selectCountry(country.code));
    onCountrySelected(country);
  };

  const isChangeMode = mode === 'change';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onDismiss}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text variant="headlineSmall" style={styles.title}>
            🌍 {isChangeMode ? t('location.change_country_title') : t('location.unsupported_title')}
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            {isChangeMode
              ? t('location.change_country_msg')
              : detectedCountryCode
                ? t('location.unsupported_msg_with_country', {
                    country: detectedCountryCode.toUpperCase(),
                  })
                : t('location.unsupported_msg')}
          </Text>
        </View>

        {/* Liste des pays supportés */}
        <Text variant="titleMedium" style={styles.sectionTitle}>
          {t('location.supported_countries_title')}
        </Text>

        <ScrollView contentContainerStyle={styles.list}>
          {SUPPORTED_COUNTRIES.map((country) => (
            <TouchableOpacity
              key={country.code}
              style={styles.countryItem}
              onPress={() => handleSelect(country)}
            >
              <Text style={styles.flag}>{country.flag}</Text>
              <View style={styles.countryInfo}>
                <Text variant="titleSmall" style={styles.countryName}>
                  {t(`country.${country.nameKey}`)}
                </Text>
                <Text variant="bodySmall" style={styles.countryCode}>
                  {country.currency}
                </Text>
              </View>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Bouton retour */}
        <View style={styles.footer}>
          <Button
            mode="outlined"
            onPress={onDismiss}
            style={styles.dismissButton}
          >
            {t('common.cancel')}
          </Button>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: spacing.sm,
    color: colors.primary,
  },
  subtitle: {
    color: colors.gray,
    lineHeight: 20,
  },
  sectionTitle: {
    fontWeight: '700',
    margin: spacing.md,
    marginBottom: spacing.sm,
    color: '#111827',
  },
  list: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  flag: {
    fontSize: 32,
    marginRight: spacing.md,
  },
  countryInfo: {
    flex: 1,
  },
  countryName: {
    fontWeight: '700',
    color: '#111827',
  },
  countryCode: {
    color: colors.gray,
    marginTop: 2,
  },
  arrow: {
    fontSize: 22,
    color: colors.gray,
  },
  footer: {
    padding: spacing.md,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  dismissButton: {
    borderRadius: 8,
  },
});
