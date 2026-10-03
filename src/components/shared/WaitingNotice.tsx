import React, { useEffect, useMemo, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Text } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { spacing } from '../../theme/spacing';
import { useAppTheme } from '../../theme/ThemeProvider';

interface Props {
  message: string;
  style?: StyleProp<ViewStyle>;
}

/** Attente d'une action de l'autre partie : sablier animé (onde qui pulse), sans détailler la raison */
export const WaitingNotice: React.FC<Props> = ({ message, style }) => {
  const { tokens } = useAppTheme();
  const pulse = useRef(new Animated.Value(0)).current;
  const flip = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let loops: Animated.CompositeAnimation[] = [];
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (reduce || cancelled) return;
      loops = [
        Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 1600, easing: Easing.out(Easing.ease), useNativeDriver: true })),
        Animated.loop(
          Animated.sequence([
            Animated.delay(900),
            Animated.timing(flip, { toValue: 1, duration: 500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            Animated.timing(flip, { toValue: 0, duration: 0, useNativeDriver: true }),
          ]),
        ),
      ];
      loops.forEach((l) => l.start());
    });
    return () => {
      cancelled = true;
      loops.forEach((l) => l.stop());
    };
  }, [pulse, flip]);

  const styles = useMemo(() => StyleSheet.create({
    box: {
      flexDirection: 'row', alignItems: 'center', gap: spacing.md,
      backgroundColor: tokens.card, borderRadius: 14, padding: spacing.md,
      marginBottom: spacing.md, borderWidth: 1, borderColor: tokens.primary + '40',
    },
    iconWrap: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    ring: {
      position: 'absolute', width: 40, height: 40, borderRadius: 20,
      backgroundColor: tokens.primary + '33',
    },
    text: { flex: 1, color: tokens.text.primary, fontSize: 14, lineHeight: 20 },
  }), [tokens]);

  return (
    <View style={[styles.box, style]} accessibilityRole="text" accessibilityLiveRegion="polite">
      <View style={styles.iconWrap}>
        <Animated.View
          style={[
            styles.ring,
            {
              opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.8, 0] }),
              transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.4] }) }],
            },
          ]}
        />
        <Animated.View style={{ transform: [{ rotate: flip.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) }] }}>
          <Icon name="timer-sand" size={22} color={tokens.primary} />
        </Animated.View>
      </View>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
};
