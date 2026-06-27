import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAppTheme, type AppThemeMode } from '../../theme/ThemeProvider';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

interface ThemeOption {
  mode: AppThemeMode;
  icon: string;
  labelKey: string;
}

const OPTIONS: ThemeOption[] = [
  { mode: 'light',   icon: '☀️',  labelKey: 'settings.theme_light' },
  { mode: 'comfort', icon: '🌿',  labelKey: 'settings.theme_comfort' },
  { mode: 'dark',    icon: '🌙',  labelKey: 'settings.theme_dark' },
  { mode: 'system',  icon: '⚙️',  labelKey: 'settings.theme_system' },
];

export const ThemeSwitcher = () => {
  const { mode, setMode, tokens } = useAppTheme();

  const styles = useMemo(() => StyleSheet.create({
  container: { marginVertical: spacing.md },
  title: {
    fontSize: 14, fontWeight: '600',
    marginBottom: spacing.sm,
  },
  row: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  tile: {
    flex: 1,
    minWidth: 72,
    borderRadius: 12,
    borderWidth: 2,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  tileNormal: {
    borderTopWidth: 2, borderLeftWidth: 2,
    borderBottomWidth: 4, borderRightWidth: 3,
    borderTopColor: '#FFFFFF',
    borderLeftColor: '#FFFFFF',
    borderBottomColor: '#C4A07A',
    borderRightColor: '#C4A07A',
    ...Platform.select({
      ios: { shadowColor: '#6B3318', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 4 },
      android: { elevation: 3 },
    }),
  },
  tileActive: {
    borderTopWidth: 3, borderLeftWidth: 3,
    borderBottomWidth: 6, borderRightWidth: 4,
    borderTopColor: '#B87040',
    borderLeftColor: '#9B5A2A',
    borderBottomColor: '#1A0800',
    borderRightColor: '#1A0800',
    ...Platform.select({
      ios: { shadowColor: '#1A0800', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.5, shadowRadius: 6 },
      android: { elevation: 7 },
    }),
  },
  tilePressed: {
    borderTopWidth: 4, borderLeftWidth: 3,
    borderBottomWidth: 2, borderRightWidth: 2,
    borderTopColor: '#B8906A',
    borderLeftColor: '#B8906A',
    borderBottomColor: '#FFFFFF',
    borderRightColor: '#FFFFFF',
    ...Platform.select({ ios: { shadowOpacity: 0.05 }, android: { elevation: 1 } }),
  },
  icon: { fontSize: 22, marginBottom: 3 },
  label: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
  labelActive: { fontWeight: '700' },
  check: {
    position: 'absolute', top: 5, right: 5,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: tokens.secondary,
    alignItems: 'center', justifyContent: 'center',
  },
  checkIcon: { color: colors.dark, fontSize: 10, fontWeight: '700' },
  }), [tokens]);
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: tokens.text.primary }]}>
        {t('settings.theme_title')}
      </Text>
      <View style={styles.row}>
        {OPTIONS.map(opt => {
          const active = mode === opt.mode;
          return (
            <Pressable
              key={opt.mode}
              onPress={() => setMode(opt.mode)}
              style={({ pressed }) => [
                styles.tile,
                {
                  backgroundColor: active ? colors.tile : tokens.card,
                  borderColor: active ? colors.tileGroove : tokens.border,
                },
                active ? styles.tileActive : pressed ? styles.tilePressed : styles.tileNormal,
              ]}
            >
              <Text style={styles.icon}>{opt.icon}</Text>
              <Text style={[
                styles.label,
                { color: active ? '#FFF8EE' : tokens.text.secondary },
                active && styles.labelActive,
              ]}>
                {t(opt.labelKey)}
              </Text>
              {active && (
                <View style={styles.check}>
                  <Text style={styles.checkIcon}>✓</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

