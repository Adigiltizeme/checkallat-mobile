import React, { useRef, useState } from 'react';
import {
  View, StyleSheet, FlatList, TouchableOpacity,
  Dimensions, NativeScrollEvent, NativeSyntheticEvent,
} from 'react-native';
import { Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

export const ONBOARDING_DONE_KEY = '@onboarding_done';

const { width } = Dimensions.get('window');

interface Slide {
  key: string;
  emoji: string;
  titleKey: string;
  subtitleKey: string;
  bg: string;
}

const SLIDES: Slide[] = [
  {
    key: 'welcome',
    emoji: '👋',
    titleKey: 'onboarding.slide1_title',
    subtitleKey: 'onboarding.slide1_sub',
    bg: '#EFF6FF',
  },
  {
    key: 'services',
    emoji: '💼',
    titleKey: 'onboarding.slide2_title',
    subtitleKey: 'onboarding.slide2_sub',
    bg: '#F0FDF4',
  },
  {
    key: 'transport',
    emoji: '🚚',
    titleKey: 'onboarding.slide3_title',
    subtitleKey: 'onboarding.slide3_sub',
    bg: '#FFF7ED',
  },
];

interface Props {
  onDone: () => void;
}

export const OnboardingScreen = ({ onDone }: Props) => {
  const { t } = useTranslation();
  const flatRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const finish = async () => {
    await AsyncStorage.setItem(ONBOARDING_DONE_KEY, 'true');
    onDone();
  };

  const next = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      finish();
    }
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    setCurrentIndex(idx);
  };

  const isLast = currentIndex === SLIDES.length - 1;

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.skip} onPress={finish}>
        <Text style={styles.skipText}>{t('common.skip', { defaultValue: 'Passer' })}</Text>
      </TouchableOpacity>

      <FlatList
        ref={flatRef}
        data={SLIDES}
        keyExtractor={(s) => s.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width, backgroundColor: item.bg }]}>
            <Text style={styles.emoji}>{item.emoji}</Text>
            <Text style={styles.title}>{t(item.titleKey)}</Text>
            <Text style={styles.subtitle}>{t(item.subtitleKey)}</Text>
          </View>
        )}
      />

      {/* Dots */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[styles.dot, i === currentIndex && styles.dotActive]} />
        ))}
      </View>

      <TouchableOpacity style={styles.btn} onPress={next}>
        <Text style={styles.btnText}>
          {isLast ? t('onboarding.get_started') : t('onboarding.next')}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  skip: { position: 'absolute', top: 56, right: spacing.lg, zIndex: 10 },
  skipText: { color: colors.gray, fontSize: 14, fontWeight: '500' },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: 80,
    paddingBottom: 160,
  },
  emoji: { fontSize: 80, marginBottom: spacing.xl },
  title: { fontSize: 26, fontWeight: '800', color: '#111827', textAlign: 'center', marginBottom: spacing.md },
  subtitle: { fontSize: 16, color: '#6B7280', textAlign: 'center', lineHeight: 24 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: spacing.lg },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#D1D5DB' },
  dotActive: { backgroundColor: colors.primary, width: 24 },
  btn: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl * 2,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  btnText: { color: colors.white, fontSize: 16, fontWeight: '700' },
});
