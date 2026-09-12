import React, { useRef, useEffect } from 'react';
import { View, Animated, Easing } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface PulsingStatusDotProps {
  color: string;
  size?: number;
  icon?: string;
}

/**
 * Composant réutilisable : anneau expansif + dot pulsant.
 * Utilisé pour le statut actif dans StatusTimeline et BookingTrackingScreen.
 */
export const PulsingStatusDot: React.FC<PulsingStatusDotProps> = ({
  color,
  size = 32,
  icon,
}) => {
  const scale = useRef(new Animated.Value(1)).current;
  const ringOpacity = useRef(new Animated.Value(0.6)).current;
  const ringScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale, {
            toValue: 1.12,
            duration: 700,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1,
            duration: 700,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.parallel([
            Animated.timing(ringScale, {
              toValue: 1.6,
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
            Animated.timing(ringOpacity, { toValue: 0.6, duration: 0, useNativeDriver: true }),
          ]),
        ]),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  const radius = size / 2;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Anneau expansif */}
      <Animated.View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: color,
          opacity: ringOpacity,
          transform: [{ scale: ringScale }],
        }}
      />
      {/* Dot principal pulsant */}
      <Animated.View
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: color,
          justifyContent: 'center',
          alignItems: 'center',
          transform: [{ scale }],
        }}
      >
        {icon && <Icon name={icon} size={size * 0.6} color="#FFFFFF" />}
      </Animated.View>
    </View>
  );
};
