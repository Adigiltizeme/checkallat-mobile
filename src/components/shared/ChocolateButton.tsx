/**
 * ChocolateButton — bouton 3D tuile chocolat, fidèle au logo CheckAll@t.
 *
 * Structure de rendu (3 couches) :
 *   [groove wrapper]  ← fine bordure or (#C49B3C) comme les rainures du logo
 *     [surface bevel] ← fond chocolat avec arêtes asymétriques (lumière haut-gauche, ombre bas-droite)
 *       [sheen strip] ← reflet brillant au sommet (simulé par un View semi-transparent)
 *       [label / spinner]
 *
 * Press : inversion des arêtes + décalage de l'ombre → effet "enfoncé".
 */
import React, { useState } from 'react';
import {
  Pressable,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import type { ViewStyle, TextStyle } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { useAppTheme } from '../../theme/ThemeProvider';

export type ChocolateButtonVariant = 'primary' | 'outline' | 'ghost';

interface ChocolateButtonProps {
  children: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: ChocolateButtonVariant;
  style?: ViewStyle;
  labelStyle?: TextStyle;
  size?: 'sm' | 'md' | 'lg';
}

// ── Palette tuile (tokens internes) ──────────────────────────────────────
const T = {
  groove:      '#C49B3C',   // rainure or
  surface:     '#6B3318',   // chocolat moyen (face de la tuile)
  surfacePress:'#5A2510',   // chocolat foncé pressé
  hiTop:       '#9B5A2A',   // arête supérieure/gauche (lumière)
  hiTopBright: '#B87040',   // arête supérieure vive
  shadowBot:   '#1A0800',   // arête inférieure/droite (ombre profonde)
  sheen:       'rgba(255,245,215,0.22)', // reflet brillant

  // outline (tuile crème)
  cSurface:    '#FFF8EE',
  cSurfaceP:   '#F0E4D0',
  cHiTop:      '#FFFFFF',
  cShadowBot:  '#A0724A',
  cGroove:     '#D4B896',
  cSheen:      'rgba(255,255,255,0.6)',
};

export const ChocolateButton = ({
  children,
  onPress,
  disabled,
  loading,
  variant = 'primary',
  style,
  labelStyle,
  size = 'md',
}: ChocolateButtonProps) => {
  const { mode, tokens } = useAppTheme();
  const [pressed, setPressed] = useState(false);
  const isDisabled = disabled || loading;
  const isDown = pressed && !isDisabled;

  const isPrimary = variant === 'primary';
  const isOutline = variant === 'outline';
  const isGhost   = variant === 'ghost';

  // ── Rendu flat teal (thème original) ───────────────────────────────────
  if (mode === 'teal') {
    return (
      <Pressable
        onPress={isDisabled ? undefined : onPress}
        onPressIn={() => !isDisabled && setPressed(true)}
        onPressOut={() => setPressed(false)}
        style={[styles.wrapper, style]}
        accessible
        accessibilityRole="button"
        accessibilityState={{ disabled: !!isDisabled }}
      >
        <View style={[
          styles.tealSurface,
          SIZE_PADDING[size],
          isPrimary && { backgroundColor: isDown ? '#008F82' : '#00B8A9' },
          isOutline && { borderWidth: 1.5, borderColor: '#00B8A9', backgroundColor: 'transparent' },
          isGhost   && { backgroundColor: 'transparent' },
          isDisabled && { opacity: 0.5 },
        ]}>
          {loading ? (
            <ActivityIndicator size="small" color={isPrimary ? '#FFFFFF' : '#00B8A9'} />
          ) : (
            <Text style={[
              styles.label,
              SIZE_LABEL[size],
              isPrimary  && { color: '#FFFFFF' },
              isOutline  && { color: '#00B8A9', fontWeight: '600' as const },
              isGhost    && { color: '#00B8A9', fontWeight: '600' as const },
              isDisabled && styles.labelDisabled,
              labelStyle,
            ]}>
              {children}
            </Text>
          )}
        </View>
      </Pressable>
    );
  }

  // ── Groove wrapper ──────────────────────────────────────────────────────
  const grooveStyle: ViewStyle = isGhost ? {} : {
    borderWidth: 2,
    borderColor: isPrimary ? T.groove : T.cGroove,
    borderRadius: RADIUS[size] + 2,
    ...Platform.select({
      ios: {
        shadowColor: isPrimary ? T.shadowBot : '#8B6040',
        shadowOffset: { width: 0, height: isDown ? 2 : 6 },
        shadowOpacity: isDown ? 0.3 : 0.55,
        shadowRadius: isDown ? 3 : 7,
      },
      android: { elevation: isDown ? 2 : 8 },
    }),
  };

  // ── Surface bevel ───────────────────────────────────────────────────────
  const surfaceStyle: ViewStyle = isGhost ? {} : {
    margin: 1,
    borderRadius: RADIUS[size],
    backgroundColor: isDisabled
      ? (isPrimary ? '#C4B0A0' : '#EDE0D0')
      : isDown
        ? (isPrimary ? T.surfacePress : T.cSurfaceP)
        : (isPrimary ? T.surface : T.cSurface),

    // Arêtes asymétriques : épaisses en bas-droite (ombre), fines en haut-gauche (lumière)
    ...(isDisabled ? {
      borderTopWidth: 2, borderLeftWidth: 2, borderBottomWidth: 4, borderRightWidth: 3,
      borderTopColor: '#D4C4B4', borderLeftColor: '#D4C4B4',
      borderBottomColor: '#A09080', borderRightColor: '#A09080',
    } : isDown ? {
      // Enfoncé : inversion (lumière en bas, ombre en haut)
      borderTopWidth: 6, borderLeftWidth: 4,
      borderBottomWidth: 2, borderRightWidth: 2,
      borderTopColor: isPrimary ? T.shadowBot : T.cShadowBot,
      borderLeftColor: isPrimary ? T.shadowBot : T.cShadowBot,
      borderBottomColor: isPrimary ? T.hiTopBright : T.cHiTop,
      borderRightColor: isPrimary ? T.hiTop : T.cHiTop,
    } : {
      // Relevé : lumière en haut-gauche, ombre épaisse en bas-droite
      borderTopWidth: 3, borderLeftWidth: 3,
      borderBottomWidth: 7, borderRightWidth: 5,
      borderTopColor: isPrimary ? T.hiTopBright : T.cHiTop,
      borderLeftColor: isPrimary ? T.hiTop : T.cHiTop,
      borderBottomColor: isPrimary ? T.shadowBot : T.cShadowBot,
      borderRightColor: isPrimary ? T.shadowBot : T.cShadowBot,
    }),
  };

  return (
    <Pressable
      onPress={isDisabled ? undefined : onPress}
      onPressIn={() => !isDisabled && setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[styles.wrapper, style]}
      accessible
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled }}
    >
      <View style={grooveStyle}>
        <View style={[styles.surface, surfaceStyle, SIZE_PADDING[size]]}>
          {/* Reflet brillant (sheen) */}
          {!isGhost && !isDisabled && (
            <View style={[
              styles.sheen,
              { backgroundColor: isPrimary ? T.sheen : T.cSheen },
              isDown && styles.sheenHidden,
            ]} />
          )}

          {loading ? (
            <ActivityIndicator
              size="small"
              color={isPrimary ? colors.light : colors.primary}
            />
          ) : (
            <Text style={[
              styles.label,
              SIZE_LABEL[size],
              isPrimary ? styles.labelPrimary : { color: tokens.primary, fontWeight: '600' as const },
              isDisabled && styles.labelDisabled,
              labelStyle,
            ]}>
              {children}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
};

// ── Constantes dimensionnelles ─────────────────────────────────────────────
const RADIUS: Record<string, number> = { sm: 10, md: 12, lg: 14 };

const SIZE_PADDING: Record<string, ViewStyle> = {
  sm: { paddingVertical: spacing.xs + 3, paddingHorizontal: spacing.md },
  md: { paddingVertical: spacing.sm + 4, paddingHorizontal: spacing.lg },
  lg: { paddingVertical: spacing.md,     paddingHorizontal: spacing.xl },
};

const SIZE_LABEL: Record<string, TextStyle> = {
  sm: { fontSize: 13 },
  md: { fontSize: 15 },
  lg: { fontSize: 17 },
};

// ── Styles statiques ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
  wrapper: { alignSelf: 'stretch' },
  tealSurface: { alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  surface: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  sheen: {
    position: 'absolute',
    top: 4, left: 12, right: 12,
    height: 5,
    borderRadius: 3,
  },
  sheenHidden: { opacity: 0 },
  label: { textAlign: 'center', fontWeight: '700', letterSpacing: 0.3 },
  labelPrimary: { color: '#FFF8EE' },
  labelDisabled: { opacity: 0.55 },
});
