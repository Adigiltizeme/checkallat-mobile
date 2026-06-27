/**
 * ChocolateChip — chip 3D tuile chocolat, même structure que ChocolateButton.
 * Variante non-sélectionnée : tuile crème soulevée.
 * Variante sélectionnée    : tuile chocolat enfoncée (confirmée).
 */
import React, { useState } from 'react';
import { Pressable, View, Text, StyleSheet, Platform } from 'react-native';
import type { ViewStyle, TextStyle } from 'react-native';
import { colors } from '../../theme/colors';
import { useAppTheme } from '../../theme/ThemeProvider';

interface ChocolateChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const T = {
  // Chocolat (sélectionné)
  groove:      '#C49B3C',
  surface:     '#6B3318',
  surfacePress:'#5A2510',
  hiTop:       '#B87040',
  hiSide:      '#9B5A2A',
  shadowBot:   '#1A0800',
  sheen:       'rgba(255,245,215,0.22)',
  // Crème (non sélectionné)
  cGroove:     '#D4B896',
  cSurface:    '#FFF8EE',
  cSurfaceP:   '#F0E4D0',
  cHiTop:      '#FFFFFF',
  cShadowBot:  '#A0724A',
  cSheen:      'rgba(255,255,255,0.6)',
};

export const ChocolateChip = ({
  label,
  selected,
  onPress,
  style,
  textStyle,
}: ChocolateChipProps) => {
  const { mode, tokens } = useAppTheme();
  const [pressed, setPressed] = useState(false);
  const isDown = pressed;

  // ── Rendu flat teal (thème original) ─────────────────────────────────
  if (mode === 'teal') {
    return (
      <Pressable
        onPress={onPress}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        style={[styles.wrapper, style]}
        accessible
        accessibilityRole="button"
        accessibilityState={{ selected }}
      >
        <View style={[styles.tealChip, selected && styles.tealChipSelected, pressed && { opacity: 0.8 }]}>
          {selected && <Text style={styles.tealCheck}>✓ </Text>}
          <Text style={[styles.label, selected ? styles.tealLabelSelected : styles.tealLabelNormal, textStyle]}>
            {label}
          </Text>
        </View>
      </Pressable>
    );
  }

  const grooveStyle: ViewStyle = {
    borderWidth: 1.5,
    borderColor: selected ? T.groove : T.cGroove,
    borderRadius: 22,
    ...Platform.select({
      ios: {
        shadowColor: selected ? T.shadowBot : '#8B6040',
        shadowOffset: { width: 0, height: isDown ? 1 : 4 },
        shadowOpacity: isDown ? 0.2 : (selected ? 0.5 : 0.2),
        shadowRadius: isDown ? 2 : 5,
      },
      android: { elevation: isDown ? 1 : selected ? 5 : 3 },
    }),
  };

  const surfaceStyle: ViewStyle = {
    margin: 1,
    borderRadius: 20,
    backgroundColor: isDown
      ? (selected ? T.surfacePress : T.cSurfaceP)
      : (selected ? T.surface : T.cSurface),

    ...(isDown ? {
      // Enfoncé
      borderTopWidth: 5, borderLeftWidth: 3,
      borderBottomWidth: 2, borderRightWidth: 2,
      borderTopColor: selected ? T.shadowBot : T.cShadowBot,
      borderLeftColor: selected ? T.shadowBot : T.cShadowBot,
      borderBottomColor: selected ? T.hiTop : T.cHiTop,
      borderRightColor: selected ? T.hiSide : T.cHiTop,
    } : {
      // Relevé
      borderTopWidth: 2, borderLeftWidth: 2,
      borderBottomWidth: selected ? 5 : 4, borderRightWidth: selected ? 4 : 3,
      borderTopColor: selected ? T.hiTop : T.cHiTop,
      borderLeftColor: selected ? T.hiSide : T.cHiTop,
      borderBottomColor: selected ? T.shadowBot : T.cShadowBot,
      borderRightColor: selected ? T.shadowBot : T.cShadowBot,
    }),
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[styles.wrapper, style]}
      accessible
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <View style={grooveStyle}>
        <View style={[styles.chip, surfaceStyle]}>
          {/* Sheen */}
          {!isDown && (
            <View style={[
              styles.sheen,
              { backgroundColor: selected ? T.sheen : T.cSheen },
            ]} />
          )}
          {selected && <Text style={[styles.check, { color: tokens.secondary }]}>✓ </Text>}
          <Text style={[
            styles.label,
            selected ? styles.labelSelected : { color: tokens.primary },
            textStyle,
          ]}>
            {label}
          </Text>
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  wrapper: { alignSelf: 'flex-start', marginBottom: 4 },
  tealChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 7, paddingHorizontal: 14,
    borderRadius: 20, borderWidth: 1.5,
    borderColor: '#B0DCDC', backgroundColor: '#F0FCFB',
  },
  tealChipSelected: { backgroundColor: '#00B8A9', borderColor: '#00B8A9' },
  tealLabelNormal: { color: '#00B8A9' },
  tealLabelSelected: { color: '#FFFFFF' },
  tealCheck: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 14,
    overflow: 'hidden',
  },
  sheen: {
    position: 'absolute',
    top: 3, left: 8, right: 8,
    height: 4,
    borderRadius: 2,
  },
  label: { fontSize: 13, fontWeight: '600' },
  labelSelected: { color: '#FFF8EE' },
  check: { fontSize: 12, fontWeight: '700' },
});
