import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { applyBrandColors } from './colors';

// ── Types ──────────────────────────────────────────────────────────────────
export type AppThemeMode = 'light' | 'comfort' | 'dark' | 'system' | 'teal';

export interface SurfaceTokens {
  background: string;
  backgroundAlt: string;    // fond secondaire (intérieur card, input)
  card: string;
  border: string;
  borderLight: string;
  tabBar: string;
  tabActive: string;        // couleur icône/label actif dans la tab bar
  tabInactive: string;      // couleur icône/label inactif
  header: string;
  headerTint: string;        // couleur du texte/icônes dans le header (toujours lisible sur header)
  modal: string;
  statusBar: 'light' | 'dark' | 'auto';
  primary: string;          // couleur principale de la marque (boutons, icônes, liens)
  secondary: string;        // couleur secondaire / accent
  text: {
    primary: string;
    secondary: string;
    disabled: string;
    inverse: string;
  };
  overlay: string;          // fond overlay modale / bottom-sheet
}

// ── Palettes par mode ──────────────────────────────────────────────────────
const TOKENS: Record<Exclude<AppThemeMode, 'system'>, SurfaceTokens> = {
  light: {
    background:    '#FFFFFF',
    backgroundAlt: '#F9F9F9',
    card:          '#FFFFFF',
    border:        '#D4B896',
    borderLight:   '#EDE0D0',
    tabBar:        '#2A1005',
    tabActive:     '#C49B3C',
    tabInactive:   '#9B7B6A',
    header:        '#4A2710',
    headerTint:    '#FFF8EE',
    modal:         '#FFFFFF',
    statusBar:     'auto',
    primary:       '#7B4F2E',
    secondary:     '#C49B3C',
    text: {
      primary:   '#1E0A02',
      secondary: '#7B5A48',
      disabled:  '#C4A896',
      inverse:   '#FFF8EE',
    },
    overlay: 'rgba(30,10,2,0.55)',
  },

  comfort: {
    background:    '#FFF8EE',
    backgroundAlt: '#FFF3E4',
    card:          '#FFFBF5',
    border:        '#D4B896',
    borderLight:   '#EDE0D0',
    tabBar:        '#2A1005',
    tabActive:     '#C49B3C',
    tabInactive:   '#9B7B6A',
    header:        '#4A2710',
    headerTint:    '#FFF8EE',
    modal:         '#FFF8EE',
    statusBar:     'auto',
    primary:       '#7B4F2E',
    secondary:     '#C49B3C',
    text: {
      primary:   '#1E0A02',
      secondary: '#7B5A48',
      disabled:  '#C4A896',
      inverse:   '#FFF8EE',
    },
    overlay: 'rgba(30,10,2,0.55)',
  },

  dark: {
    background:    '#160600',
    backgroundAlt: '#1F0A02',
    card:          '#2A1005',
    border:        '#4A2710',
    borderLight:   '#3A1808',
    tabBar:        '#0E0400',
    tabActive:     '#C49B3C',
    tabInactive:   '#7B5A48',
    header:        '#0E0400',
    headerTint:    '#FFF8EE',
    modal:         '#2A1005',
    statusBar:     'light',
    primary:       '#7B4F2E',
    secondary:     '#C49B3C',
    text: {
      primary:   '#FFF8EE',
      secondary: '#D4B896',
      disabled:  '#7B5A48',
      inverse:   '#1E0A02',
    },
    overlay: 'rgba(0,0,0,0.75)',
  },

  // Thème teal — restauration fidèle de la charte graphique originale
  teal: {
    background:    '#FFFFFF',
    backgroundAlt: '#F8F9FA',
    card:          '#FFFFFF',
    border:        '#E0E0E0',
    borderLight:   '#F0F0F0',
    tabBar:        '#FFFFFF',
    tabActive:     '#00B8A9',
    tabInactive:   '#7F8C9A',
    header:        '#00B8A9',
    headerTint:    '#FFFFFF',
    modal:         '#FFFFFF',
    statusBar:     'auto',
    primary:       '#00B8A9',
    secondary:     '#F8B400',
    text: {
      primary:   '#1A1A2E',
      secondary: '#7F8C9A',
      disabled:  '#C4C4C4',
      inverse:   '#FFFFFF',
    },
    overlay: 'rgba(26,26,46,0.55)',
  },
};

const STORAGE_KEY = 'checkallat_theme_mode';

// ── Context ────────────────────────────────────────────────────────────────
interface ThemeContextValue {
  mode: AppThemeMode;
  tokens: SurfaceTokens;
  setMode: (mode: AppThemeMode) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'light',
  tokens: TOKENS.light,
  setMode: () => {},
  isDark: false,
});

// ── Provider ───────────────────────────────────────────────────────────────
export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<AppThemeMode>('light');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(saved => {
      if (saved && ['light', 'comfort', 'dark', 'system', 'teal'].includes(saved)) {
        setModeState(saved as AppThemeMode);
      }
    });
  }, []);

  const setMode = useCallback((m: AppThemeMode) => {
    setModeState(m);
    AsyncStorage.setItem(STORAGE_KEY, m);
  }, []);

  const resolved: Exclude<AppThemeMode, 'system'> =
    mode === 'system'
      ? systemScheme === 'dark' ? 'dark' : 'comfort'
      : mode;

  // Met à jour colors.primary/secondary/etc. avant le rendu des enfants,
  // ce qui permet à tous les composants lisant colors.primary dans leurs props
  // d'obtenir la bonne valeur sans qu'il soit nécessaire de modifier chaque fichier.
  applyBrandColors(resolved === 'teal');

  const tokens = TOKENS[resolved];
  const isDark = resolved === 'dark';

  return (
    <ThemeContext.Provider value={{ mode, tokens, setMode, isDark }}>
      <StatusBar style={tokens.statusBar} />
      {children}
    </ThemeContext.Provider>
  );
};

// ── Hooks ──────────────────────────────────────────────────────────────────
export const useAppTheme = () => useContext(ThemeContext);
