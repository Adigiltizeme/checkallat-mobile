/**
 * useThemeStyles — fournit des styles inline réactifs au thème.
 *
 * Usage dans n'importe quel écran :
 *   const ts = useThemeStyles();
 *   <View style={[styles.card, ts.card]}>
 *   <ScrollView style={[styles.container, ts.bg]}>
 *   <Text style={[styles.label, ts.textPrimary]}>
 */
import { useMemo } from 'react';
import type { ViewStyle, TextStyle } from 'react-native';
import { useAppTheme } from './ThemeProvider';

export interface ThemeStyles {
  bg:            ViewStyle;   // fond de page
  bgAlt:         ViewStyle;   // fond secondaire
  card:          ViewStyle;   // fond de carte / section
  border:        ViewStyle;   // borderColor seulement
  borderLight:   ViewStyle;
  textPrimary:   TextStyle;
  textSecondary: TextStyle;
  textDisabled:  TextStyle;
  textInverse:   TextStyle;
}

export const useThemeStyles = (): ThemeStyles => {
  const { tokens } = useAppTheme();

  return useMemo(() => ({
    bg:           { backgroundColor: tokens.background },
    bgAlt:        { backgroundColor: tokens.backgroundAlt },
    card:         { backgroundColor: tokens.card },
    border:       { borderColor: tokens.border },
    borderLight:  { borderColor: tokens.borderLight },
    textPrimary:  { color: tokens.text.primary },
    textSecondary:{ color: tokens.text.secondary },
    textDisabled: { color: tokens.text.disabled },
    textInverse:  { color: tokens.text.inverse },
  }), [tokens]);
};
