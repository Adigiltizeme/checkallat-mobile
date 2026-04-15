import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  I18nManager,
} from 'react-native';
import { Text } from 'react-native-paper';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import * as Updates from 'expo-updates';
import { RootState } from '../../store';
import { setLanguage } from '../../store/slices/authSlice';
import { useUpdateProfileMutation } from '../../store/api/authApi';
import i18n, { isRTL, SUPPORTED_LANGUAGES } from '../../i18n';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

const LANG_LABELS: Record<string, { native: string; flag: string }> = {
  fr: { native: 'Français', flag: '🇫🇷' },
  en: { native: 'English', flag: '🇬🇧' },
  ar: { native: 'العربية', flag: '🇩🇿' },
};

export const LanguageScreen = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const currentLang = useSelector((state: RootState) => state.auth?.language ?? 'fr');
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const [updateProfile] = useUpdateProfileMutation();

  const handleSelect = async (lang: string) => {
    if (lang === currentLang) return;

    const needsRTLChange = isRTL(lang) !== isRTL(currentLang);

    // Change i18n language immediately (UI updates instantly for non-RTL changes)
    await i18n.changeLanguage(lang);
    dispatch(setLanguage(lang));

    // Sync with backend if logged in
    if (isAuthenticated) {
      updateProfile({ preferredLanguage: lang }).catch(() => {});
    }

    if (needsRTLChange) {
      // RTL changes require app restart
      I18nManager.allowRTL(isRTL(lang));
      I18nManager.forceRTL(isRTL(lang));

      Alert.alert(
        t('language.restart_needed'),
        t('language.restart_msg'),
        [
          { text: t('language.restart_later'), style: 'cancel' },
          {
            text: t('language.restart_now'),
            onPress: async () => {
              try {
                await Updates.reloadAsync();
              } catch {
                // In dev mode Updates.reloadAsync may not work — instruct user
                Alert.alert(
                  t('language.restart_needed'),
                  t('language.restart_rtl_fallback'),
                );
              }
            },
          },
        ],
      );
    }
  };

  return (
    <View style={styles.container}>
      <Text variant="bodyMedium" style={styles.subtitle}>
        {t('language.select')}
      </Text>

      <View style={styles.list}>
        {SUPPORTED_LANGUAGES.map((lang) => {
          const info = LANG_LABELS[lang];
          const isSelected = lang === currentLang;
          return (
            <TouchableOpacity
              key={lang}
              style={[styles.item, isSelected && styles.itemSelected]}
              onPress={() => handleSelect(lang)}
              activeOpacity={0.7}
            >
              <Text style={styles.flag}>{info.flag}</Text>
              <Text
                variant="titleMedium"
                style={[styles.langName, isSelected && styles.langNameSelected]}
              >
                {info.native}
              </Text>
              {isSelected && (
                <View style={styles.checkCircle}>
                  <Text style={styles.checkMark}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <Text variant="bodySmall" style={styles.hint}>
        {t('language.restart_msg')}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light,
    padding: spacing.lg,
  },
  subtitle: {
    color: colors.gray,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  list: {
    gap: spacing.sm,
  },
  item: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  itemSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '08',
  },
  flag: {
    fontSize: 28,
  },
  langName: {
    flex: 1,
    color: colors.dark,
  },
  langNameSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
  hint: {
    color: colors.gray,
    textAlign: 'center',
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
});
