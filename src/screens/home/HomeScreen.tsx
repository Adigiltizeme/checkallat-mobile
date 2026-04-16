import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  FlatList,
  StatusBar,
  Image,
} from 'react-native';
import { Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  interpolate,
  Easing,
  FadeInDown,
  FadeInRight,
  SlideInLeft,
} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { RootState } from '../../store';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.72;

// ─── Data ───────────────────────────────────────────────────────────────────

const HERO_SLIDES = [
  {
    id: '1',
    gradient: ['#00B8A9', '#008F82'],
    icon: 'home-city',
    titleKey: 'home.slide1_title',
    subtitleKey: 'home.slide1_sub',
  },
  {
    id: '2',
    gradient: ['#F8B400', '#E09E00'],
    icon: 'truck-fast',
    titleKey: 'home.slide2_title',
    subtitleKey: 'home.slide2_sub',
  },
  {
    id: '3',
    gradient: ['#FF6B6B', '#D95757'],
    icon: 'shopping',
    titleKey: 'home.slide3_title',
    subtitleKey: 'home.slide3_sub',
  },
];

const SERVICES = [
  { id: 'transport', icon: 'truck-fast',       color: '#F8B400', bgKey: 'home.service_transport' },
  { id: 'electric',  icon: 'flash',            color: '#FFD700', bgKey: 'home.service_electric' },
  { id: 'plumbing',  icon: 'water-pump',       color: '#3498DB', bgKey: 'home.service_plumbing' },
  { id: 'painting',  icon: 'format-paint',     color: '#E74C3C', bgKey: 'home.service_painting' },
  { id: 'cleaning',  icon: 'broom',            color: '#27AE60', bgKey: 'home.service_cleaning' },
  { id: 'market',    icon: 'store',            color: '#8B5CF6', bgKey: 'home.service_market' },
];

const FEATURES = [
  { icon: 'shield-check',   color: '#27AE60', titleKey: 'home.feat1_title', descKey: 'home.feat1_desc' },
  { icon: 'cash-lock',      color: '#3498DB', titleKey: 'home.feat2_title', descKey: 'home.feat2_desc' },
  { icon: 'star-circle',    color: '#F8B400', titleKey: 'home.feat3_title', descKey: 'home.feat3_desc' },
  { icon: 'map-marker-radius', color: '#FF6B6B', titleKey: 'home.feat4_title', descKey: 'home.feat4_desc' },
];

const STATS = [
  { value: '500+', labelKey: 'home.stat_pros' },
  { value: '50+',  labelKey: 'home.stat_cities' },
  { value: '4.8★', labelKey: 'home.stat_rating' },
  { value: '24/7', labelKey: 'home.stat_support' },
];

// ─── Sub-components ─────────────────────────────────────────────────────────

const PulsingDot = ({ active }: { active: boolean }) => {
  const scale = useSharedValue(1);
  useEffect(() => {
    if (active) {
      scale.value = withRepeat(
        withSequence(withTiming(1.3, { duration: 600 }), withTiming(1, { duration: 600 })),
        -1,
        false,
      );
    } else {
      scale.value = withTiming(1);
    }
  }, [active]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View
      style={[
        styles.dot,
        active ? styles.dotActive : styles.dotInactive,
        style,
      ]}
    />
  );
};

const HeroSlide = ({ item, index, t }: { item: typeof HERO_SLIDES[0]; index: number; t: any }) => {
  const floatY = useSharedValue(0);
  useEffect(() => {
    floatY.value = withDelay(
      index * 200,
      withRepeat(
        withSequence(
          withTiming(-10, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      ),
    );
  }, []);
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ translateY: floatY.value }] }));

  return (
    <View style={[styles.heroSlide, { backgroundColor: item.gradient[0] }]}>
      {/* Decorative circles */}
      <View style={[styles.heroCircle, styles.heroCircle1, { backgroundColor: item.gradient[1] + '60' }]} />
      <View style={[styles.heroCircle, styles.heroCircle2, { backgroundColor: '#ffffff15' }]} />

      <Animated.View style={[styles.heroIconWrap, iconStyle]}>
        <View style={[styles.heroIconBg, { backgroundColor: '#ffffff25' }]}>
          <Icon name={item.icon} size={72} color="#fff" />
        </View>
      </Animated.View>

      <Text style={styles.heroTitle}>{t(item.titleKey)}</Text>
      <Text style={styles.heroSubtitle}>{t(item.subtitleKey)}</Text>
    </View>
  );
};

const ServiceChip = ({ item, t, onPress, index }: { item: typeof SERVICES[0]; t: any; onPress: () => void; index: number }) => {
  const scale = useSharedValue(1);
  const handlePress = () => {
    scale.value = withSequence(withTiming(0.92, { duration: 80 }), withTiming(1, { duration: 120 }));
    onPress();
  };
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).springify()} style={style}>
      <TouchableOpacity onPress={handlePress} activeOpacity={0.85}>
        <View style={styles.serviceChip}>
          <View style={[styles.serviceChipIcon, { backgroundColor: item.color + '20' }]}>
            <Icon name={item.icon} size={28} color={item.color} />
          </View>
          <Text style={styles.serviceChipLabel}>{t(item.bgKey)}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const FeatureCard = ({ item, t, index }: { item: typeof FEATURES[0]; t: any; index: number }) => (
  <Animated.View entering={FadeInRight.delay(index * 100).springify()} style={styles.featureCard}>
    <View style={[styles.featureIconBg, { backgroundColor: item.color + '18' }]}>
      <Icon name={item.icon} size={32} color={item.color} />
    </View>
    <Text style={styles.featureTitle}>{t(item.titleKey)}</Text>
    <Text style={styles.featureDesc}>{t(item.descKey)}</Text>
  </Animated.View>
);

const StatBadge = ({ value, labelKey, t, index }: { value: string; labelKey: string; t: any; index: number }) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);
  useEffect(() => {
    opacity.value = withDelay(index * 150, withTiming(1, { duration: 500 }));
    translateY.value = withDelay(index * 150, withTiming(0, { duration: 500 }));
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ translateY: translateY.value }] }));

  return (
    <Animated.View style={[styles.statBadge, style]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{t(labelKey)}</Text>
    </Animated.View>
  );
};

// ─── Main Screen ─────────────────────────────────────────────────────────────

export const HomeScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const user = useSelector((state: RootState) => state.auth.user);
  const [activeSlide, setActiveSlide] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const headerOpacity = useSharedValue(0);
  const headerY = useSharedValue(-20);

  useEffect(() => {
    headerOpacity.value = withTiming(1, { duration: 600 });
    headerY.value = withTiming(0, { duration: 600 });

    // Auto-scroll hero
    const interval = setInterval(() => {
      setActiveSlide((prev) => {
        const next = (prev + 1) % HERO_SLIDES.length;
        flatListRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerY.value }],
  }));

  const handleServicePress = (id: string) => {
    if (id === 'transport') navigation.navigate('Transport');
    else if (id === 'market') navigation.navigate('MarketplaceHome');
    else navigation.navigate('SearchPros', { category: id });
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Header greeting ── */}
        <Animated.View style={[styles.headerGreeting, headerStyle]}>
          <View>
            <Text style={styles.greetingSmall}>{t('home.greeting_label')}</Text>
            <Text style={styles.greetingName}>
              {user?.firstName ? `${t('home.hi')} ${user.firstName} 👋` : 'CheckAll@t 👋'}
            </Text>
          </View>
          <TouchableOpacity style={styles.notifBtn}>
            <Icon name="bell-outline" size={24} color={colors.white} />
          </TouchableOpacity>
        </Animated.View>

        {/* ── Hero carousel ── */}
        <FlatList
          ref={flatListRef}
          data={HERO_SLIDES}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
            setActiveSlide(index);
          }}
          renderItem={({ item, index }) => (
            <HeroSlide item={item} index={index} t={t} />
          )}
          scrollEnabled
        />

        {/* Dots */}
        <View style={styles.dotsRow}>
          {HERO_SLIDES.map((_, i) => (
            <PulsingDot key={i} active={i === activeSlide} />
          ))}
        </View>

        {/* ── Stats strip ── */}
        <Animated.View entering={SlideInLeft.springify()} style={styles.statsStrip}>
          {STATS.map((s, i) => (
            <StatBadge key={s.labelKey} value={s.value} labelKey={s.labelKey} t={t} index={i} />
          ))}
        </Animated.View>

        {/* ── Services grid ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('home.services')}</Text>
          <View style={styles.servicesGrid}>
            {SERVICES.map((item, index) => (
              <ServiceChip
                key={item.id}
                item={item}
                t={t}
                index={index}
                onPress={() => handleServicePress(item.id)}
              />
            ))}
          </View>
        </View>

        {/* ── Features ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('home.why_checkallat')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.featuresScroll}>
            {FEATURES.map((item, index) => (
              <FeatureCard key={item.titleKey} item={item} t={t} index={index} />
            ))}
          </ScrollView>
        </View>

        {/* ── CTA ── */}
        <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.ctaCard}>
          <View style={styles.ctaContent}>
            <Icon name="truck-fast" size={40} color={colors.white} style={{ marginBottom: spacing.sm }} />
            <Text style={styles.ctaTitle}>{t('home.cta_title')}</Text>
            <Text style={styles.ctaSubtitle}>{t('home.cta_sub')}</Text>
            <TouchableOpacity
              style={styles.ctaBtn}
              onPress={() => navigation.navigate('Transport')}
              activeOpacity={0.85}
            >
              <Text style={styles.ctaBtnText}>{t('home.cta_btn')}</Text>
              <Icon name="arrow-right" size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </Animated.View>

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.light,
  },
  scroll: {
    flex: 1,
  },

  /* Header */
  headerGreeting: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  greetingSmall: {
    color: '#ffffffAA',
    fontSize: 13,
    marginBottom: 2,
  },
  greetingName: {
    color: colors.white,
    fontSize: 22,
    fontWeight: 'bold',
  },
  notifBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#ffffff20',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Hero */
  heroSlide: {
    width: SCREEN_WIDTH,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    overflow: 'hidden',
  },
  heroCircle: {
    position: 'absolute',
    borderRadius: 999,
  },
  heroCircle1: {
    width: 200,
    height: 200,
    top: -60,
    right: -40,
  },
  heroCircle2: {
    width: 140,
    height: 140,
    bottom: -50,
    left: -30,
  },
  heroIconWrap: {
    marginBottom: spacing.md,
  },
  heroIconBg: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    color: colors.white,
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  heroSubtitle: {
    color: '#ffffffCC',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },

  /* Dots */
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  dotActive: {
    backgroundColor: colors.primary,
    width: 20,
    borderRadius: 4,
  },
  dotInactive: {
    backgroundColor: colors.border,
  },

  /* Stats */
  statsStrip: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statBadge: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  statLabel: {
    fontSize: 11,
    color: colors.gray,
    marginTop: 2,
    textAlign: 'center',
  },

  /* Section */
  section: {
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.dark,
    marginBottom: spacing.md,
  },

  /* Services grid */
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  serviceChip: {
    width: (SCREEN_WIDTH - spacing.lg * 2 - spacing.sm * 2) / 3,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  serviceChipIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  serviceChipLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.dark,
    textAlign: 'center',
    lineHeight: 14,
  },

  /* Features horizontal scroll */
  featuresScroll: {
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  featureCard: {
    width: CARD_WIDTH,
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: spacing.lg,
    marginRight: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  featureIconBg: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.dark,
    marginBottom: spacing.xs,
  },
  featureDesc: {
    fontSize: 13,
    color: colors.gray,
    lineHeight: 19,
  },

  /* CTA */
  ctaCard: {
    marginHorizontal: spacing.lg,
    borderRadius: 24,
    backgroundColor: colors.primary,
    overflow: 'hidden',
  },
  ctaContent: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  ctaTitle: {
    color: colors.white,
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  ctaSubtitle: {
    color: '#ffffffCC',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 18,
  },
  ctaBtn: {
    backgroundColor: colors.white,
    borderRadius: 50,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  ctaBtnText: {
    color: colors.primary,
    fontWeight: 'bold',
    fontSize: 14,
  },
});
