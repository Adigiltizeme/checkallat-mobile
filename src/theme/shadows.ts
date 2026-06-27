import { Platform } from 'react-native';
import type { ViewStyle } from 'react-native';

// ── iOS shadow helper ──────────────────────────────────────────────────────
const ios = (color: string, offsetY: number, opacity: number, radius: number): ViewStyle =>
  Platform.OS === 'ios'
    ? { shadowColor: color, shadowOffset: { width: 1, height: offsetY }, shadowOpacity: opacity, shadowRadius: radius }
    : { elevation: Math.round(offsetY * 1.5) };

// ── 3D Tuile Chocolat (boutons primaires, tuiles actives) ──────────────────
export const chocolateTile: ViewStyle = {
  borderRadius: 12,
  borderTopWidth: 2,
  borderLeftWidth: 2,
  borderBottomWidth: 2,
  borderRightWidth: 2,
  borderTopColor: '#9B5A2A',
  borderLeftColor: '#9B5A2A',
  borderBottomColor: '#2A0E04',
  borderRightColor: '#2A0E04',
  backgroundColor: '#6B3318',
  ...ios('#1A0A02', 4, 0.55, 6),
};

// Même tuile en état "enfoncé" (pressed / selected)
export const chocolateTilePressed: ViewStyle = {
  borderRadius: 12,
  borderTopWidth: 2,
  borderLeftWidth: 2,
  borderBottomWidth: 2,
  borderRightWidth: 2,
  borderTopColor: '#2A0E04',
  borderLeftColor: '#2A0E04',
  borderBottomColor: '#9B5A2A',
  borderRightColor: '#9B5A2A',
  backgroundColor: '#5A2A10',
  ...ios('#1A0A02', 2, 0.3, 3),
};

// ── Tuile Crème (boutons secondaires, cartes neutres) ──────────────────────
export const creamTile: ViewStyle = {
  borderRadius: 12,
  borderTopWidth: 2,
  borderLeftWidth: 2,
  borderBottomWidth: 2,
  borderRightWidth: 2,
  borderTopColor: '#FFFFFF',
  borderLeftColor: '#FFFFFF',
  borderBottomColor: '#C4A07A',
  borderRightColor: '#C4A07A',
  backgroundColor: '#FFF8EE',
  ...ios('#6B3318', 3, 0.18, 5),
};

export const creamTilePressed: ViewStyle = {
  borderRadius: 12,
  borderTopWidth: 2,
  borderLeftWidth: 2,
  borderBottomWidth: 2,
  borderRightWidth: 2,
  borderTopColor: '#C4A07A',
  borderLeftColor: '#C4A07A',
  borderBottomColor: '#FFFFFF',
  borderRightColor: '#FFFFFF',
  backgroundColor: '#F0E4D0',
  ...ios('#6B3318', 1, 0.1, 3),
};

// ── Carte Contenu (fond blanc, ombre chocolat légère) ──────────────────────
export const chocolateCard: ViewStyle = {
  borderRadius: 12,
  borderTopWidth: 1,
  borderLeftWidth: 1,
  borderBottomWidth: 1,
  borderRightWidth: 1,
  borderTopColor: '#EAD9C4',
  borderLeftColor: '#EAD9C4',
  borderBottomColor: '#B8906A',
  borderRightColor: '#B8906A',
  backgroundColor: '#FFFFFF',
  ...ios('#6B3318', 3, 0.15, 8),
};
