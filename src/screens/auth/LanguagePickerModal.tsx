'use client';
import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import { Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager } from 'react-native';
import { setLanguage } from '../../store/slices/authSlice';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

export const LANGUAGE_PICKER_DISMISSED_KEY = 'languagePickerDismissed';

const SUPPORTED_LANGUAGES = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'en', label: 'English',  flag: '🇬🇧' },
  { code: 'ar', label: 'العربية',  flag: '🇸🇦' },
];

interface Props {
  visible: boolean;
  onDismiss: () => void;
}

export const LanguagePickerModal = ({ visible, onDismiss }: Props) => {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();

  const applyLanguage = async (code: string) => {
    await i18n.changeLanguage(code);
    const isRTL = code === 'ar';
    if (I18nManager.isRTL !== isRTL) {
      I18nManager.allowRTL(isRTL);
      I18nManager.forceRTL(isRTL);
    }
    dispatch(setLanguage(code));
  };

  const handleSelect = async (code: string) => {
    await applyLanguage(code);
    onDismiss();
  };

  const handleDismissForever = async (code: string) => {
    await applyLanguage(code);
    await AsyncStorage.setItem(LANGUAGE_PICKER_DISMISSED_KEY, 'true');
    onDismiss();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <Pressable style={styles.overlay} onPress={onDismiss}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text variant="titleMedium" style={styles.title}>
            {t('auth.choose_language')}
          </Text>
          <Text variant="bodySmall" style={styles.subtitle}>
            {t('auth.choose_language_hint')}
          </Text>

          <View style={styles.langList}>
            {SUPPORTED_LANGUAGES.map((lang) => {
              const isActive = i18n.language === lang.code;
              return (
                <TouchableOpacity
                  key={lang.code}
                  style={[styles.langRow, isActive && styles.langRowActive]}
                  onPress={() => handleSelect(lang.code)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.flag}>{lang.flag}</Text>
                  <Text style={[styles.langLabel, isActive && styles.langLabelActive]}>
                    {lang.label}
                  </Text>
                  {isActive && (
                    <View style={styles.activeDot} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={styles.dismissBtn}
            onPress={() => handleDismissForever(i18n.language)}
            activeOpacity={0.7}
          >
            <Text style={styles.dismissText}>{t('auth.language_dont_ask_again')}</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.xl,
    paddingBottom: spacing.xl + 8,
  },
  title: {
    fontWeight: 'bold',
    color: colors.dark,
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  langList: {
    gap: 8,
    marginBottom: spacing.lg,
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  langRowActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  flag: {
    fontSize: 24,
  },
  langLabel: {
    flex: 1,
    fontSize: 16,
    color: colors.dark,
  },
  langLabelActive: {
    fontWeight: '600',
    color: colors.primary,
  },
  activeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  dismissBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  dismissText: {
    fontSize: 13,
    color: '#9CA3AF',
    textDecorationLine: 'underline',
  },
});
