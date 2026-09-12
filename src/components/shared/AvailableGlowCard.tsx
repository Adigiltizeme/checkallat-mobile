import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, StyleProp, ViewStyle } from 'react-native';

interface AvailableGlowCardProps {
  isAvailable: boolean;
  color: string;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

/**
 * Remplace le View conteneur de la carte de disponibilité.
 * Ajoute un fond pulsant (anneau expansif + lueur) identique à PulsingDot,
 * appliqué directement À L'INTÉRIEUR de la carte — pas de wrapper externe.
 */
export const AvailableGlowCard: React.FC<AvailableGlowCardProps> = ({
  isAvailable,
  color,
  style,
  children,
}) => {
  const bgOpacity = useRef(new Animated.Value(0)).current;
  const ringOpacity = useRef(new Animated.Value(0.5)).current;
  const ringScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isAvailable) {
      bgOpacity.stopAnimation();
      ringOpacity.stopAnimation();
      ringScale.stopAnimation();
      bgOpacity.setValue(0);
      ringOpacity.setValue(0);
      return;
    }

    const bgAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(bgOpacity, {
          toValue: 0.13,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(bgOpacity, {
          toValue: 0.03,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    const ringAnim = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(ringScale, {
            toValue: 1.06,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.timing(ringOpacity, {
            toValue: 0,
            duration: 900,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(ringScale, { toValue: 1, duration: 0, useNativeDriver: true }),
          Animated.timing(ringOpacity, { toValue: 0.5, duration: 0, useNativeDriver: true }),
        ]),
      ])
    );

    bgAnim.start();
    ringAnim.start();

    return () => {
      bgAnim.stop();
      ringAnim.stop();
    };
  }, [isAvailable]);

  const flat = StyleSheet.flatten(style) ?? {};
  const borderRadius = (flat as any).borderRadius ?? 12;

  return (
    <Animated.View style={style}>
      {isAvailable && (
        <>
          {/* Lueur de fond pulsante */}
          <Animated.View
            style={{
              ...StyleSheet.absoluteFillObject,
              borderRadius,
              backgroundColor: color,
              opacity: bgOpacity,
            }}
          />
          {/* Anneau expansif (se dilate légèrement et disparaît) */}
          <Animated.View
            style={{
              ...StyleSheet.absoluteFillObject,
              borderRadius,
              borderWidth: 1.5,
              borderColor: color,
              opacity: ringOpacity,
              transform: [{ scale: ringScale }],
            }}
          />
        </>
      )}
      {children}
    </Animated.View>
  );
};
