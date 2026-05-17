import React, { useRef, useEffect, useState, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  FlatList,
  StatusBar,
  Alert,
  PanResponder,
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
  Easing,
  FadeInDown,
  FadeInRight,
  SlideInLeft,
} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { RootState } from '../../store';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { useGetCategoriesQuery } from '../../store/api/servicesApi';

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
  { id: 'transport',    slug: 'transport',    icon: 'truck-fast',      color: '#F8B400', bgKey: 'home.service_transport',    nameFr: 'Transport',       nameEn: 'Transport',       nameAr: 'النقل' },
  { id: 'electric',     slug: 'electricity',  icon: 'flash',           color: '#FFD700', bgKey: 'home.service_electric',     nameFr: 'Électricité',     nameEn: 'Electricity',     nameAr: 'كهرباء' },
  { id: 'plumbing',     slug: 'plumbing',     icon: 'water-pump',      color: '#3498DB', bgKey: 'home.service_plumbing',     nameFr: 'Plomberie',       nameEn: 'Plumbing',        nameAr: 'سباكة' },
  { id: 'painting',     slug: 'painting',     icon: 'format-paint',    color: '#E74C3C', bgKey: 'home.service_painting',     nameFr: 'Peinture',        nameEn: 'Painting',        nameAr: 'دهان' },
  { id: 'cleaning',     slug: 'cleaning',     icon: 'broom',           color: '#27AE60', bgKey: 'home.service_cleaning',     nameFr: 'Ménage',          nameEn: 'Cleaning',        nameAr: 'تنظيف' },
  { id: 'market',       slug: 'marketplace',  icon: 'store',           color: '#8B5CF6', bgKey: 'home.service_market',       nameFr: 'Marché',          nameEn: 'Market',          nameAr: 'السوق' },
  { id: 'handyman',     slug: 'handyman',     icon: 'hammer',          color: '#FF9500', bgKey: 'home.service_handyman',     nameFr: 'Bricolage',       nameEn: 'Handyman',        nameAr: 'أعمال يدوية' },
  { id: 'carpentry',    slug: 'carpentry',    icon: 'saw-blade',       color: '#8B4513', bgKey: 'home.service_carpentry',    nameFr: 'Menuiserie',      nameEn: 'Carpentry',       nameAr: 'نجارة' },
  { id: 'air_condition',slug: 'air_condition',icon: 'air-conditioner', color: '#00BCD4', bgKey: 'home.service_air_condition',nameFr: 'Climatisation',   nameEn: 'Air Conditioning',nameAr: 'تكييف' },
];

// Split into two rows for the marquee
const ROW1 = SERVICES.slice(0, 5);
const ROW2 = SERVICES.slice(5);
// Triple each row so we can loop seamlessly
const ROW1_LOOP = [...ROW1, ...ROW1, ...ROW1];
const ROW2_LOOP = [...ROW2, ...ROW2, ...ROW2];

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

const CHIP_WIDTH = 88;
const CHIP_MARGIN = 10;
const CHIP_FULL = CHIP_WIDTH + CHIP_MARGIN * 2;
// Width of one copy of a row in the loop
const ROW1_COPY_WIDTH = ROW1.length * CHIP_FULL;
const ROW2_COPY_WIDTH = ROW2.length * CHIP_FULL;

const ServiceChip = ({ item, t, onPress }: { item: typeof SERVICES[0]; t: any; onPress: () => void }) => {
  const scale = useSharedValue(1);
  const handlePress = () => {
    scale.value = withSequence(withTiming(0.92, { duration: 80 }), withTiming(1, { duration: 120 }));
    onPress();
  };
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={[styles.serviceChipWrap, style]}>
      <TouchableOpacity onPress={handlePress} activeOpacity={0.85}>
        <View style={styles.serviceChip}>
          <View style={[styles.serviceChipIcon, { backgroundColor: item.color + '20' }]}>
            <Icon name={item.icon} size={26} color={item.color} />
          </View>
          <Text style={styles.serviceChipLabel}>{t(item.bgKey)}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const SCROLL_SPEED = 38; // px per second

const MarqueeRow = ({
  items,
  copyWidth,
  direction,
  t,
  onPress,
}: {
  items: typeof SERVICES;
  copyWidth: number;
  direction: 1 | -1; // 1 = scroll left, -1 = scroll right
  t: any;
  onPress: (id: string) => void;
}) => {
  const offset = useSharedValue(direction === 1 ? 0 : -copyWidth);
  const dragDelta = useSharedValue(0);
  const isPaused = useRef(false);
  const rafRef = useRef<number | null>(null);
  const lastTimestamp = useRef<number | null>(null);

  useEffect(() => {
    const tick = (timestamp: number) => {
      if (!isPaused.current) {
        const dt = lastTimestamp.current !== null ? timestamp - lastTimestamp.current : 0;
        lastTimestamp.current = timestamp;
        const delta = (SCROLL_SPEED * dt) / 1000;
        offset.value = offset.value - direction * delta;
        // Wrap: for direction=1 (scrolling left), reset when we've scrolled one full copy width
        if (direction === 1 && offset.value <= -copyWidth) {
          offset.value += copyWidth;
        } else if (direction === -1 && offset.value >= 0) {
          offset.value -= copyWidth;
        }
      } else {
        lastTimestamp.current = null;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 6,
      onPanResponderGrant: () => {
        isPaused.current = true;
        dragDelta.value = 0;
      },
      onPanResponderMove: (_, g) => {
        const delta = g.dx - dragDelta.value;
        dragDelta.value = g.dx;
        offset.value = offset.value + delta;
        // wrap during drag too
        if (offset.value <= -copyWidth) offset.value += copyWidth;
        if (offset.value >= 0) offset.value -= copyWidth;
      },
      onPanResponderRelease: () => {
        isPaused.current = false;
      },
    })
  ).current;

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));

  return (
    <View style={styles.marqueeRow} {...panResponder.panHandlers}>
      <Animated.View style={[styles.marqueeInner, rowStyle]}>
        {items.map((item, i) => (
          <ServiceChip key={`${item.slug}-${i}`} item={item} t={t} onPress={() => onPress(item.slug)} />
        ))}
      </Animated.View>
    </View>
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

const KNOWN_SLUGS = new Set(SERVICES.map(s => s.slug));

export const HomeScreen = ({ navigation }: any) => {
  const { t, i18n } = useTranslation();
  const user = useSelector((state: RootState) => state.auth.user);
  const [activeSlide, setActiveSlide] = useState(0);

  const { data: dbCategories = [] } = useGetCategoriesQuery({ activeOnly: true });
  const newCategories = useMemo(
    () => dbCategories.filter((c: any) => !KNOWN_SLUGS.has(c.slug)),
    [dbCategories],
  );
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

  const handleTransportPress = () => {
    if (user?.driver?.status === 'active') {
      Alert.alert(
        t('common.access_denied'),
        t('home.driver_cannot_book_transport'),
      );
      return;
    }
    navigation.navigate('Transport');
  };

  const handleServicePress = (slug: string) => {
    if (slug === 'transport') {
      handleTransportPress();
      return;
    }

    if (slug === 'marketplace') {
      navigation.navigate('MarketplaceHome');
      return;
    }

    // Résoudre depuis la liste statique ou la liste DB
    const staticEntry = SERVICES.find((s) => s.slug === slug || s.id === slug);
    const dbEntry = dbCategories.find((c: any) => c.slug === slug);

    const resolvedSlug = staticEntry?.slug ?? dbEntry?.slug ?? slug;
    const resolvedNameFr = staticEntry?.nameFr ?? dbEntry?.nameFr ?? slug;
    const resolvedNameEn = staticEntry?.nameEn ?? dbEntry?.nameEn ?? slug;
    const resolvedNameAr = staticEntry?.nameAr ?? dbEntry?.nameAr ?? slug;

    const proSlugs: string[] = user?.pro?.serviceCategorySlugs ?? [];
    if (user?.pro?.status === 'active' && proSlugs.includes(resolvedSlug)) {
      Alert.alert(t('common.access_denied'), t('home.pro_cannot_book_own_category'));
      return;
    }

    navigation.navigate('BookingRequestStep1', {
      categorySlug: resolvedSlug,
      categoryNameFr: resolvedNameFr,
      categoryNameEn: resolvedNameEn,
      categoryNameAr: resolvedNameAr,
    });
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

        {/* ── Services marquee ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('home.services')}</Text>
          <MarqueeRow
            items={ROW1_LOOP}
            copyWidth={ROW1_COPY_WIDTH}
            direction={1}
            t={t}
            onPress={handleServicePress}
          />
          <View style={{ height: 10 }} />
          <MarqueeRow
            items={ROW2_LOOP}
            copyWidth={ROW2_COPY_WIDTH}
            direction={-1}
            t={t}
            onPress={handleServicePress}
          />
        </View>

        {/* ── Nouvelles catégories depuis l'admin (dynamique) ── */}
        {newCategories.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('home.new_services')}</Text>
            <View style={styles.newCatGrid}>
              {newCategories.map((cat: any) => {
                const name = i18n.language === 'ar' ? cat.nameAr
                  : i18n.language === 'en' ? cat.nameEn
                  : cat.nameFr;
                return (
                  <TouchableOpacity
                    key={cat.slug}
                    style={styles.newCatCard}
                    onPress={() => handleServicePress(cat.slug)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.newCatIcon}>{cat.icon}</Text>
                    <Text style={styles.newCatLabel} numberOfLines={2}>{name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* ── My bookings shortcut ── */}
        <TouchableOpacity
          style={styles.myBookingsBtn}
          onPress={() => navigation.navigate('MyBookings')}
          activeOpacity={0.85}
        >
          <Icon name="calendar-check" size={20} color={colors.primary} />
          <Text style={styles.myBookingsBtnText}>{t('booking.my_bookings')}</Text>
          <Icon name="chevron-right" size={20} color={colors.gray} />
        </TouchableOpacity>

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
              onPress={handleTransportPress}
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
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.dark,
    marginBottom: spacing.md,
  },

  /* Services marquee — pleine largeur, sort du padding horizontal de la section */
  marqueeRow: {
    overflow: 'hidden',
    width: SCREEN_WIDTH,
    marginHorizontal: -spacing.lg,
    paddingBottom: 6,   // laisse respirer l'ombre du bas des chips
  },
  marqueeInner: {
    flexDirection: 'row',
  },
  serviceChipWrap: {
    marginHorizontal: CHIP_MARGIN,
  },
  serviceChip: {
    width: CHIP_WIDTH,
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingVertical: spacing.md,
    paddingHorizontal: 6,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  serviceChipIcon: {
    width: 48,
    height: 48,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  serviceChipLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.dark,
    textAlign: 'center',
    lineHeight: 13,
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

  /* My bookings shortcut */
  myBookingsBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.white, marginHorizontal: spacing.lg,
    marginBottom: spacing.md, borderRadius: 14, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  myBookingsBtnText: {
    flex: 1, fontSize: 14, fontWeight: '600', color: colors.dark,
  },

  /* New categories grid */
  newCatGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingHorizontal: spacing.lg,
  },
  newCatCard: {
    width: 80, alignItems: 'center', padding: spacing.sm,
    backgroundColor: colors.white, borderRadius: 14,
    borderWidth: 1, borderColor: colors.border,
  },
  newCatIcon: {
    fontSize: 28, marginBottom: 4,
  },
  newCatLabel: {
    fontSize: 11, color: colors.dark, textAlign: 'center', fontWeight: '500',
  },
});
