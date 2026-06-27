// ── Palette par défaut : teal original (CheckAll@t v1) ──────────────────────
// C'est la palette de base. applyBrandColors(false) l'écrase temporairement
// quand l'utilisateur choisit un mode chocolat (light/comfort/dark).
export const colors = {
  primary: '#00B8A9',
  primaryDark: '#008F82',
  primaryLight: '#33C7BA',
  secondary: '#F8B400',
  secondaryDark: '#D49A00',
  accent: '#FF6B6B',

  dark: '#1A1A2E',
  gray: '#7F8C9A',
  light: '#F8F9FA',
  white: '#FFFFFF',

  success: '#27AE60',
  warning: '#F39C12',
  error: '#E74C3C',
  info: '#3498DB',

  background: '#FFFFFF',
  backgroundDark: '#1A1A2E',
  card: '#FFFFFF',
  border: '#E0E0E0',

  lightGray: '#F5F5F5',
  lightBlue: '#E3F2FD',
  proGreen: '#10B981',

  // Tokens 3D tuile — utilisés par ChocolateButton/ChocolateChip dans les modes chocolat
  tile: '#6B3318',
  tileHighlight: '#9B5A2A',
  tileShadow: '#2A0E04',
  tileGroove: '#C49B3C',

  text: {
    primary: '#1A1A2E',
    secondary: '#7F8C9A',
    disabled: '#C4C4C4',
    inverse: '#FFFFFF',
  },
};

// ── Palettes de marque ────────────────────────────────────────────────────────
// Appelé par ThemeProvider à chaque rendu (synchrone, avant les enfants).
// Tous les composants qui lisent colors.primary dans leurs props JSX obtiennent
// ainsi la bonne couleur sans qu'il soit nécessaire de modifier chaque fichier.

const _TEAL = {
  primary: '#00B8A9', primaryDark: '#008F82', primaryLight: '#33C7BA',
  secondary: '#F8B400', secondaryDark: '#D49A00', accent: '#FF6B6B',
  dark: '#1A1A2E', gray: '#7F8C9A', border: '#E0E0E0', lightGray: '#F5F5F5',
  text: { primary: '#1A1A2E', secondary: '#7F8C9A', disabled: '#C4C4C4', inverse: '#FFFFFF' },
};

const _CHOCOLATE = {
  primary: '#7B4F2E', primaryDark: '#4A2710', primaryLight: '#A0622A',
  secondary: '#C49B3C', secondaryDark: '#9B7A2A', accent: '#E8734A',
  dark: '#1E0A02', gray: '#9B7B6A', border: '#D4B896', lightGray: '#F5EDE0',
  text: { primary: '#1E0A02', secondary: '#7B5A48', disabled: '#C4A896', inverse: '#FFF8EE' },
};

export function applyBrandColors(teal: boolean) {
  const src = teal ? _TEAL : _CHOCOLATE;
  const { text, ...flat } = src;
  Object.assign(colors, flat);
  Object.assign(colors.text, text);
}
