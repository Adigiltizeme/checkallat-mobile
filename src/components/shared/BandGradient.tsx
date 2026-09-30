import React, { useMemo } from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';

const toRgb = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6);
  const n = parseInt(full, 16);
  return Number.isNaN(n) ? [0, 0, 0] : [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const mix = (a: [number, number, number], b: [number, number, number], t: number) =>
  `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',')})`;

interface Props {
  from: string;
  to: string;
  /** Nombre de bandes : au-delà de ~24 le dégradé paraît continu */
  steps?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Dégradé vertical (haut → bas) sans module natif : bandes de couleurs interpolées.
 * Rendu identique à `linear-gradient(180deg, from, to)` côté web-admin.
 */
export const BandGradient = ({ from, to, steps = 28, style }: Props) => {
  const bands = useMemo(() => {
    const a = toRgb(from);
    const b = toRgb(to);
    // Couleur unie (même couleur en haut et en bas) : un seul aplat
    const count = from.toLowerCase() === to.toLowerCase() ? 1 : steps;
    return Array.from({ length: count }, (_, i) => mix(a, b, count === 1 ? 0 : i / (count - 1)));
  }, [from, to, steps]);

  return (
    <View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      {bands.map((color, i) => (
        <View key={i} style={{ flex: 1, backgroundColor: color }} />
      ))}
    </View>
  );
};
