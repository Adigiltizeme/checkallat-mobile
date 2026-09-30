import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
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
  Image,
} from 'react-native';
import { Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useSelector, useDispatch } from 'react-redux';
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
import { useAppTheme } from '../../theme/ThemeProvider';
import { useServiceCategories, ServiceCategoryItem } from '../../hooks/useServiceCategories';
import { CategoryIcon } from '../../components/shared/CategoryIcon';
import { useGetPublicSettingsQuery } from '../../store/api/settingsApi';
import { CountrySelectorRow } from '../../components/shared/CountrySelectorRow';
import { BandGradient } from '../../components/shared/BandGradient';
import { useFocusEffect } from '@react-navigation/native';
import { restoreSelectedCountry, setActiveCurrency } from '../../store/slices/locationSlice';
import { getCountryInfo } from '../../config/countries';
import { setCurrencyConfig } from '../../config/currency';
import { useRefetchOnFocus } from '../../hooks/useRefetchOnFocus';
import { getLocalizedName } from '../../utils/localize';
import { useGetPublicStatsQuery } from '../../store/api/settingsApi';
import { useGetUnreadNotificationsCountQuery } from '../../store/api/notificationsApi';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.72;

// ─── Data ───────────────────────────────────────────────────────────────────

// Couleurs et icônes de fallback par slug (si l'admin n'a pas renseigné une image)
const SECTOR_BG: Record<string, [string, string]> = {
  transport: ['#F8B400', '#E09E00'],
  checkallpack: ['#00B8A9', '#008F82'],
  services: ['#10B981', '#0D9E6E'],
  marketplace: ['#8B5CF6', '#7340DB'],
};
const SECTOR_ICON: Record<string, string> = {
  transport: 'truck-fast',
  checkallpack: 'moped',
  services: 'hammer-wrench',
  marketplace: 'shopping',
};
// Slides statiques de secours (si aucun secteur activé depuis le backend)
const HERO_SLIDES_FALLBACK = [
  { id: 'fb1', gradient: ['#00B8A9', '#008F82'] as [string, string], icon: 'home-city', titleKey: 'home.slide1_title', subtitleKey: 'home.slide1_sub' },
  { id: 'fb2', gradient: ['#F8B400', '#E09E00'] as [string, string], icon: 'truck-fast', titleKey: 'home.slide2_title', subtitleKey: 'home.slide2_sub' },
  { id: 'fb3', gradient: ['#FF6B6B', '#D95757'] as [string, string], icon: 'shopping', titleKey: 'home.slide3_title', subtitleKey: 'home.slide3_sub' },
];

/** Vignettes des secteurs (affichées selon les secteurs activés dans le web-admin) */
const SECTOR_CHIPS = [
  { slug: 'transport', icon: 'truck-fast', color: '#F8B400', labelKey: 'home.service_transport' },
  { slug: 'checkallpack', icon: 'moped', color: '#00B8A9', labelKey: 'home.service_checkallpack' },
  { slug: 'marketplace', icon: 'store', color: '#8B5CF6', labelKey: 'home.service_market' },
];

/** Vignette « Nos services » : secteur (icône fixe) ou catégorie de service (réglée dans le web-admin) */
interface ServiceChipItem {
  slug: string;
  label: string;
  icon?: string;
  color?: string;
  category?: ServiceCategoryItem;
}


const FEATURES = [
  { icon: 'shield-check', color: '#27AE60', titleKey: 'home.feat1_title', descKey: 'home.feat1_desc' },
  { icon: 'cash-lock', color: '#3498DB', titleKey: 'home.feat2_title', descKey: 'home.feat2_desc' },
  { icon: 'star-circle', color: '#F8B400', titleKey: 'home.feat3_title', descKey: 'home.feat3_desc' },
  // { icon: 'map-marker-radius', color: '#FF6B6B', titleKey: 'home.feat4_title', descKey: 'home.feat4_desc' },
];

/** Une note moyenne n'est affichée qu'à partir de ce nombre d'avis */
const MIN_REVIEWS_FOR_RATING = 5;

// ─── Sub-components ─────────────────────────────────────────────────────────

/** Point du carrousel : touche pour afficher le secteur correspondant */
const PulsingDot = ({
  active,
  onPress,
  label,
}: {
  active: boolean;
  onPress: () => void;
  label: string;
}) => {
  const { tokens } = useAppTheme();
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
    <TouchableOpacity
      onPress={onPress}
      // Zone de toucher élargie : le point reste petit à l'écran
      hitSlop={{ top: 12, bottom: 12, left: 4, right: 4 }}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
    >
      <Animated.View
        style={[
          styles.dot,
          active ? { backgroundColor: tokens.primary, width: 20, borderRadius: 4 } : { backgroundColor: tokens.border },
          style,
        ]}
      />
    </TouchableOpacity>
  );
};

/** Délai entre deux secteurs en défilement automatique */
const HERO_AUTOPLAY_MS = 4000;

/** Opacité du voile coloré (dégradé du secteur) posé sur son image de fond */
const HERO_IMAGE_OVERLAY_OPACITY = 0.65;

interface HeroSlideData {
  id: string;
  gradient: [string, string];
  icon: string;
  title: string;
  subtitle: string;
  backgroundImage?: string | null;
  /** Secteur créé depuis le back-office, sans parcours dans l'app */
  comingSoon?: boolean;
  comingSoonLabel?: string;
}

const HeroSlide = ({ item, index }: { item: HeroSlideData; index: number }) => {
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
      {/* Fond : dégradé du secteur, ou image recouverte du dégradé à 65 % (image visible, texte lisible) */}
      {item.backgroundImage ? (
        <>
          <Image source={{ uri: item.backgroundImage }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          <BandGradient from={item.gradient[0]} to={item.gradient[1]} style={{ opacity: HERO_IMAGE_OVERLAY_OPACITY }} />
        </>
      ) : (
        <BandGradient from={item.gradient[0]} to={item.gradient[1]} />
      )}
      {/* Cercles décoratifs */}
      <View style={[styles.heroCircle, styles.heroCircle1, { backgroundColor: item.gradient[1] + '60' }]} />
      <View style={[styles.heroCircle, styles.heroCircle2, { backgroundColor: '#ffffff15' }]} />

      <Animated.View style={[styles.heroIconWrap, iconStyle]}>
        <View style={[styles.heroIconBg, { backgroundColor: '#ffffff25' }]}>
          <Icon name={item.icon} size={72} color="#fff" />
        </View>
      </Animated.View>

      {item.comingSoon && (
        <View style={styles.heroSoonBadge}>
          <Text style={styles.heroSoonText}>{item.comingSoonLabel}</Text>
        </View>
      )}
      <Text style={styles.heroTitle} numberOfLines={2}>{item.title}</Text>
      <Text style={styles.heroSubtitle} numberOfLines={3}>{item.subtitle}</Text>
    </View>
  );
};

const CHIP_WIDTH = 88;
const CHIP_MARGIN = 10;
const CHIP_FULL = CHIP_WIDTH + CHIP_MARGIN * 2;

const ServiceChip = ({ item, onPress }: { item: ServiceChipItem; onPress: () => void }) => {
  const { tokens: scTokens } = useAppTheme();
  const scale = useSharedValue(1);
  const handlePress = () => {
    scale.value = withSequence(withTiming(0.92, { duration: 80 }), withTiming(1, { duration: 120 }));
    onPress();
  };
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={[styles.serviceChipWrap, style]}>
      <TouchableOpacity onPress={handlePress} activeOpacity={0.85}>
        <View style={[styles.serviceChip, { backgroundColor: scTokens.card }]}>
          {item.category ? (
            <View style={styles.serviceChipIconSpacing}>
              <CategoryIcon category={item.category} size={26} box={48} />
            </View>
          ) : (
            <View style={[styles.serviceChipIcon, { backgroundColor: item.color + '20' }]}>
              <Icon name={item.icon!} size={26} color={item.color} />
            </View>
          )}
          <Text style={[styles.serviceChipLabel, { color: scTokens.text.primary }]} numberOfLines={2}>{item.label}</Text>
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
  onPress,
}: {
  items: ServiceChipItem[];
  copyWidth: number;
  direction: 1 | -1; // 1 = scroll left, -1 = scroll right
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
          <ServiceChip key={`${item.slug}-${i}`} item={item} onPress={() => onPress(item.slug)} />
        ))}
      </Animated.View>
    </View>
  );
};

const FeatureCard = ({ item, t, index }: { item: typeof FEATURES[0]; t: any; index: number }) => {
  const { tokens: fcTokens } = useAppTheme();
  return (
    <Animated.View entering={FadeInRight.delay(index * 100).springify()} style={[styles.featureCard, { backgroundColor: fcTokens.card }]}>
      <View style={[styles.featureIconBg, { backgroundColor: item.color + '18' }]}>
        <Icon name={item.icon} size={32} color={item.color} />
      </View>
      <Text style={[styles.featureTitle, { color: fcTokens.text.primary }]}>{t(item.titleKey)}</Text>
      <Text style={[styles.featureDesc, { color: fcTokens.text.secondary }]}>{t(item.descKey)}</Text>
    </Animated.View>
  );
};

const StatBadge = ({ value, labelKey, t, index }: { value: string; labelKey: string; t: any; index: number }) => {
  const { tokens } = useAppTheme();
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);
  useEffect(() => {
    opacity.value = withDelay(index * 150, withTiming(1, { duration: 500 }));
    translateY.value = withDelay(index * 150, withTiming(0, { duration: 500 }));
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ translateY: translateY.value }] }));

  return (
    <Animated.View style={[styles.statBadge, style]}>
      <Text style={[styles.statValue, { color: tokens.primary }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: tokens.text.secondary }]}>{t(labelKey)}</Text>
    </Animated.View>
  );
};

// ─── Main Screen ─────────────────────────────────────────────────────────────


// Durée pendant laquelle une nouvelle catégorie est affichée dans "Nouveaux Services"
// avant de passer dans "Nos Services"
const NEW_CATEGORY_DURATION_DAYS = 30;

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
    flexDirection: 'column',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  notifBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: '#E53935',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
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
    // Ombre légère : lisibilité sur une image de fond
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heroSubtitle: {
    color: '#ffffffE6',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  heroSoonBadge: {
    alignSelf: 'center',
    backgroundColor: '#ffffffE6',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: spacing.xs,
  },
  heroSoonText: {
    color: '#1F2937',
    fontSize: 11,
    fontWeight: '700',
  },

  /* Dots */
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
    gap: 4,
  },
  dotsList: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  carouselBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
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
  serviceChipIconSpacing: { marginBottom: spacing.xs },
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

  /* Become provider */
  becomeSection: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    alignItems: 'flex-end',
  },
  becomeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.dark,
    marginBottom: spacing.sm,
  },
  becomeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  becomeIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  becomeTextWrap: {
    flex: 1,
  },
  becomeCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.dark,
    marginBottom: 2,
  },
  becomeCardDesc: {
    fontSize: 12,
    color: colors.gray,
    lineHeight: 16,
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

  /* New categories grid */
  newCatGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingHorizontal: spacing.lg,
  },
  newCatCard: {
    width: 80, alignItems: 'center', padding: spacing.sm,
    backgroundColor: colors.white, borderRadius: 14,
    borderWidth: 1, borderColor: colors.border,
  },
  newCatIconWrap: {
    width: 48, height: 48, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  newCatLabel: {
    fontSize: 11, color: colors.dark, textAlign: 'center', fontWeight: '500',
  },
});
export const HomeScreen = ({ navigation }: any) => {
  const { tokens } = useAppTheme();


  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const detectedCountryCode = useSelector((state: RootState) => state.location.detectedCountryCode);
  const [activeSlide, setActiveSlide] = useState(0);
  // Défilement automatique des secteurs : l'utilisateur peut le mettre en pause
  const [autoPlay, setAutoPlay] = useState(true);

  // Au retour sur HomeScreen, effacer tout override de pays de commande
  // et restaurer la devise du pays GPS détecté
  useFocusEffect(useCallback(() => {
    dispatch(restoreSelectedCountry(null));
    const gpsCountry = getCountryInfo(detectedCountryCode ?? '');
    if (gpsCountry) {
      dispatch(setActiveCurrency(gpsCountry.currency));
      setCurrencyConfig(gpsCountry.currency);
    }
  }, [detectedCountryCode]));

  // Notifications non lues (cloche) : mises à jour régulièrement et au retour sur l'accueil
  const { data: unreadData, refetch: refetchUnread } = useGetUnreadNotificationsCountQuery(undefined, {
    pollingInterval: 30_000,
    refetchOnMountOrArgChange: true,
  });
  useRefetchOnFocus(refetchUnread);
  const unreadNotifications = unreadData?.count ?? 0;

  // Catégories réglées dans le web-admin et proposées dans le pays de l'utilisateur (ordre, icône, couleur)
  const { categories: dbCategories, refetch: refetchCategories, countryCode: statsCountry } = useServiceCategories();

  // Chiffres réels (jamais de valeurs inventées) ; chaque chiffre nul est masqué
  const { data: publicStats } = useGetPublicStatsQuery(statsCountry, { pollingInterval: 5 * 60_000 });
  const homeStats = useMemo(() => {
    if (!publicStats) return [];
    const format = (n: number) => n.toLocaleString(i18n.language);
    return [
      publicStats.activeProviders > 0 && { value: format(publicStats.activeProviders), labelKey: 'home.stat_providers' },
      publicStats.completedJobs > 0 && { value: format(publicStats.completedJobs), labelKey: 'home.stat_jobs' },
      publicStats.averageRating != null && publicStats.reviewCount >= MIN_REVIEWS_FOR_RATING && {
        value: `${publicStats.averageRating.toLocaleString(i18n.language)}★`,
        labelKey: 'home.stat_rating',
      },
      publicStats.countries > 0 && { value: format(publicStats.countries), labelKey: 'home.stat_countries' },
    ].filter(Boolean) as { value: string; labelKey: string }[];
  }, [publicStats, i18n.language]);
  const { data: publicSettings, refetch: refetchPublicSettings } = useGetPublicSettingsQuery(undefined, {
    pollingInterval: 60_000,
    refetchOnMountOrArgChange: true,
  });
  const refetchHome = useCallback(() => {
    refetchCategories();
    refetchPublicSettings();
  }, [refetchCategories, refetchPublicSettings]);
  useRefetchOnFocus(refetchHome);
  // Secteurs actifs et proposés dans le pays courant (liste vide côté admin = tous les pays)
  const sectorCountry = (user?.activeCountryId ?? detectedCountryCode ?? '').toUpperCase();
  const activeSectors = useMemo(() =>
    (publicSettings?.sectors ?? [])
      .filter(s => s.enabled)
      .filter(s => !s.countries?.length || !sectorCountry || s.countries.includes(sectorCountry))
      .sort((a, b) => a.order - b.order),
    [publicSettings?.sectors, sectorCountry]
  );
  const isSectorVisible = useCallback(
    (slug: string) => activeSectors.length === 0 || activeSectors.some((s) => s.slug === slug),
    [activeSectors],
  );

  // Vignettes "Nos Services" : CheckAllPack et Marketplace masqués si leur secteur est désactivé
  // (ou non proposé dans le pays) depuis l'admin
  const marqueeRows = useMemo(() => {
    const sectors: ServiceChipItem[] = SECTOR_CHIPS.filter((c) => isSectorVisible(c.slug)).map((c) => ({
      slug: c.slug,
      icon: c.icon,
      color: c.color,
      label: t(c.labelKey),
    }));
    const categories: ServiceChipItem[] = dbCategories.map((c) => ({
      slug: c.slug,
      label: getLocalizedName(c, i18n.language),
      category: c,
    }));
    const visible = [...sectors, ...categories];
    // Deux lignes équilibrées
    const half = Math.ceil(visible.length / 2);
    const row1 = visible.slice(0, half);
    const row2 = visible.slice(half);
    return {
      row1Loop: [...row1, ...row1, ...row1],
      row2Loop: [...row2, ...row2, ...row2],
      row1Width: row1.length * CHIP_FULL,
      row2Width: row2.length * CHIP_FULL,
    };
  }, [isSectorVisible, dbCategories, i18n.language, t]);

  // Slides du Hero : construits depuis les secteurs activés (dynamique) ou fallback statique
  const heroSlides = useMemo<HeroSlideData[]>(() => {
    if (activeSectors.length === 0) {
      return HERO_SLIDES_FALLBACK.map(fb => ({
        id: fb.id,
        gradient: fb.gradient,
        icon: fb.icon,
        title: t(fb.titleKey),
        subtitle: t(fb.subtitleKey),
      }));
    }
    return activeSectors.map(sector => {
      const lang = i18n.language;
      const localized = (fr?: string, en?: string, ar?: string) =>
        (lang === 'ar' ? ar : lang === 'en' ? en : fr) || fr || '';
      const [defFrom, defTo] = SECTOR_BG[sector.slug] ?? ['#00B8A9', '#008F82'];
      const comingSoon = sector.builtIn === false;
      return {
        id: sector.slug,
        gradient: [sector.gradientFrom || defFrom, sector.gradientTo || defTo] as [string, string],
        icon: sector.icon && /^[a-z]/.test(sector.icon) ? sector.icon : SECTOR_ICON[sector.slug] ?? 'apps',
        title: localized(sector.nameFr, sector.nameEn, sector.nameAr),
        // Sous-titre défini dans l'admin, sinon texte par défaut de l'app
        subtitle:
          localized(sector.descriptionFr, sector.descriptionEn, sector.descriptionAr) ||
          t(`home.sector_desc_${sector.slug}`, { defaultValue: comingSoon ? t('home.sector_coming_soon_desc') : '' }),
        backgroundImage: sector.backgroundImage,
        comingSoon,
        comingSoonLabel: t('home.sector_coming_soon'),
      };
    });
  }, [activeSectors, i18n.language, t]);

  // Catégories dynamiques (hors statiques connues), réparties selon leur ancienneté
  const recentCategories = useMemo(() => {
    const threshold = NEW_CATEGORY_DURATION_DAYS * 24 * 60 * 60 * 1000;
    const now = Date.now();
    return dbCategories.filter((c) => now - new Date(c.createdAt).getTime() < threshold);
  }, [dbCategories]);
  const flatListRef = useRef<FlatList>(null);
  const headerOpacity = useSharedValue(0);
  const headerY = useSharedValue(-20);
  const slideCount = heroSlides.length;

  /** Affiche un secteur ; les bornes bouclent (dernier ↔ premier) */
  const goToSlide = useCallback((index: number, animated = true) => {
    if (slideCount === 0) return;
    const target = ((index % slideCount) + slideCount) % slideCount;
    flatListRef.current?.scrollToIndex({ index: target, animated });
    setActiveSlide(target);
  }, [slideCount]);

  // Liste des secteurs modifiée (admin, pays) : rester dans les bornes
  useEffect(() => {
    if (slideCount > 0 && activeSlide >= slideCount) goToSlide(0, false);
  }, [slideCount, activeSlide, goToSlide]);

  useEffect(() => {
    headerOpacity.value = withTiming(1, { duration: 600 });
    headerY.value = withTiming(0, { duration: 600 });
  }, []);

  // Défilement automatique : le délai repart après chaque changement (auto ou manuel)
  useEffect(() => {
    if (!autoPlay || slideCount < 2) return;
    const timer = setTimeout(() => goToSlide(activeSlide + 1), HERO_AUTOPLAY_MS);
    return () => clearTimeout(timer);
  }, [autoPlay, activeSlide, slideCount, goToSlide]);

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
    navigation.navigate('TransportRequestStep1');
  };

  const handleSectorPress = (slug: string) => {
    if (slug === 'transport') {
      handleTransportPress();
      return;
    }
    if (slug === 'checkallpack') {
      if (user?.driver?.status === 'active') {
        Alert.alert(t('common.access_denied'), t('home.driver_cannot_book_transport'));
        return;
      }
      navigation.navigate('TransportRequestStep1', { vehicleCategory: 'courier' });
      return;
    }
    if (slug === 'marketplace') {
      navigation.navigate('MarketplaceHome');
      return;
    }
    // Secteur créé depuis le back-office, sans parcours dans l'app
    const sector = activeSectors.find((s) => s.slug === slug);
    if (sector && sector.builtIn === false) {
      Alert.alert(t('home.sector_coming_soon'), t('home.sector_coming_soon_desc'));
    }
    // Pour les autres slugs (services, etc.) : ne rien faire ou scroller
  };

  const handleServicePress = (slug: string) => {
    if (slug === 'transport' || slug === 'checkallpack') {
      handleSectorPress(slug);
      return;
    }

    if (slug === 'marketplace') {
      navigation.navigate('MarketplaceHome');
      return;
    }

    // Noms tels que réglés dans le web-admin
    const dbEntry = dbCategories.find((c) => c.slug === slug);

    const resolvedSlug = dbEntry?.slug ?? slug;
    const resolvedNameFr = dbEntry?.nameFr ?? slug;
    const resolvedNameEn = dbEntry?.nameEn ?? slug;
    const resolvedNameAr = dbEntry?.nameAr ?? slug;

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
    <View style={[styles.root, { backgroundColor: tokens.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={tokens.header} />
      <ScrollView style={[styles.scroll, { backgroundColor: tokens.background }]} showsVerticalScrollIndicator={false}>

        {/* ── Header greeting ── */}
        <Animated.View style={[styles.headerGreeting, { backgroundColor: tokens.primary }, headerStyle]}>
          {/* Ligne 1 : salutation + cloche */}
          <View style={styles.headerTopRow}>
            <View>
              <Text style={styles.greetingSmall}>{t('home.greeting_label')}</Text>
              <Text style={styles.greetingName}>
                {user?.firstName ? `${t('home.hi')} ${user.firstName} 👋` : 'CheckAll@t 👋'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.notifBtn}
              onPress={() => navigation.navigate('Notifications')}
              accessibilityRole="button"
              accessibilityLabel={t('notifications.title')}
            >
              <Icon name={unreadNotifications > 0 ? 'bell-ring-outline' : 'bell-outline'} size={24} color={colors.white} />
              {unreadNotifications > 0 && (
                <View style={styles.notifBadge}>
                  <Text style={styles.notifBadgeText}>{unreadNotifications > 9 ? '9+' : unreadNotifications}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
          {/* Ligne 2 : sélecteur de pays */}
          <CountrySelectorRow variant="pill" />
        </Animated.View>

        {/* ── Hero carousel ── */}
        <FlatList
          ref={flatListRef}
          data={heroSlides}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          getItemLayout={(_, index) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index })}
          onScrollToIndexFailed={({ index }) => {
            setTimeout(() => flatListRef.current?.scrollToIndex({ index, animated: false }), 100);
          }}
          onMomentumScrollEnd={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
            setActiveSlide(index);
          }}
          renderItem={({ item, index }) => (
            <TouchableOpacity activeOpacity={0.92} onPress={() => handleSectorPress(item.id)}>
              <HeroSlide item={item} index={index} />
            </TouchableOpacity>
          )}
          scrollEnabled
        />

        {/* Contrôles du carrousel : précédent / points numérotés / suivant / pause-lecture */}
        {slideCount > 1 && (
          <View style={[styles.dotsRow, { backgroundColor: tokens.card }]}>
            <TouchableOpacity
              style={styles.carouselBtn}
              onPress={() => goToSlide(activeSlide - 1)}
              accessibilityRole="button"
              accessibilityLabel={t('home.carousel_prev')}
            >
              <Icon name="chevron-left" size={22} color={tokens.text.secondary} />
            </TouchableOpacity>
            <View style={styles.dotsList}>
              {heroSlides.map((slide, i) => (
                <PulsingDot
                  key={slide.id}
                  active={i === activeSlide}
                  onPress={() => goToSlide(i)}
                  label={t('home.carousel_go_to', { number: i + 1, title: slide.title })}
                />
              ))}
            </View>
            <TouchableOpacity
              style={styles.carouselBtn}
              onPress={() => goToSlide(activeSlide + 1)}
              accessibilityRole="button"
              accessibilityLabel={t('home.carousel_next')}
            >
              <Icon name="chevron-right" size={22} color={tokens.text.secondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.carouselBtn, { backgroundColor: tokens.primary + '18' }]}
              onPress={() => setAutoPlay((v) => !v)}
              accessibilityRole="button"
              accessibilityLabel={t(autoPlay ? 'home.carousel_pause' : 'home.carousel_play')}
            >
              <Icon name={autoPlay ? 'pause' : 'play'} size={16} color={tokens.primary} />
            </TouchableOpacity>
          </View>
        )}

        {/* ── Chiffres réels de la plateforme (pays de l'utilisateur) ── */}
        {homeStats.length >= 2 && (
          <Animated.View entering={SlideInLeft.springify()} style={[styles.statsStrip, { backgroundColor: tokens.card, borderBottomColor: tokens.border }]}>
            {homeStats.map((s, i) => (
              <StatBadge key={s.labelKey} value={s.value} labelKey={s.labelKey} t={t} index={i} />
            ))}
          </Animated.View>
        )}

        {/* ── Devenir prestataire ── */}
        {(!user?.pro || !user?.driver) ? (
          <View style={[styles.becomeSection]}>
            <TouchableOpacity
              style={[styles.becomeCard, { backgroundColor: tokens.card, borderColor: tokens.border, width: '80%', padding: spacing.sm, marginBottom: 0 }]}
              onPress={() => navigation.navigate('Profile', { screen: 'AddActivity' })}
              activeOpacity={0.8}
            >
              <View style={[styles.becomeIconWrap, { backgroundColor: colors.primary + '18', width: 36, height: 36, borderRadius: 10 }]}>
                <Icon name="briefcase-plus" size={18} color={colors.primary} />
              </View>
              <View style={styles.becomeTextWrap}>
                <Text style={[styles.becomeCardTitle, { color: tokens.text.primary, fontSize: 12 }]}>{t('home.become_provider_title')}</Text>
                <Text style={[styles.becomeCardDesc, { color: tokens.text.secondary, fontSize: 10 }]}>{t('activity.my_activities_desc')}</Text>
              </View>
              <Icon name="chevron-right" size={20} color={tokens.text.secondary} />
            </TouchableOpacity>
          </View>
        ) : null}

        {/* ── Services marquee ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: tokens.text.primary }]}>{t('home.services')}</Text>
          <MarqueeRow
            key={`row1-${marqueeRows.row1Width}`}
            items={marqueeRows.row1Loop}
            copyWidth={marqueeRows.row1Width}
            direction={1}
            onPress={handleServicePress}
          />
          <View style={{ height: 10 }} />
          <MarqueeRow
            key={`row2-${marqueeRows.row2Width}`}
            items={marqueeRows.row2Loop}
            copyWidth={marqueeRows.row2Width}
            direction={-1}
            onPress={handleServicePress}
          />

        </View>

        {/* ── Nouvelles catégories depuis l'admin (dynamique) ── */}
        {recentCategories.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: tokens.text.primary }]}>{t('home.new_services')}</Text>
            <View style={styles.newCatGrid}>
              {recentCategories.map((cat) => {
                const name = getLocalizedName(cat, i18n.language);
                return (
                  <TouchableOpacity
                    key={cat.slug}
                    style={[styles.newCatCard, { backgroundColor: tokens.card, borderColor: tokens.border }]}
                    onPress={() => handleServicePress(cat.slug)}
                    activeOpacity={0.8}
                  >
                    <CategoryIcon category={cat} size={26} box={48} />
                    <Text style={[styles.newCatLabel, { color: tokens.text.primary }]} numberOfLines={2}>{name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* ── Features ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: tokens.text.primary }]}>{t('home.why_checkallat')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.featuresScroll}>
            {FEATURES.map((item, index) => (
              <FeatureCard key={item.titleKey} item={item} t={t} index={index} />
            ))}
          </ScrollView>
        </View>

        {/* ── CTA ── */}
        <Animated.View entering={FadeInDown.delay(300).springify()} style={[styles.ctaCard, { backgroundColor: tokens.primary }]}>
          <View style={styles.ctaContent}>
            <Icon name="truck-fast" size={40} color={colors.white} style={{ marginBottom: spacing.sm }} />
            <Text style={styles.ctaTitle}>{t('home.cta_title')}</Text>
            <Text style={styles.ctaSubtitle}>{t('home.cta_sub')}</Text>
            <TouchableOpacity
              style={styles.ctaBtn}
              onPress={handleTransportPress}
              activeOpacity={0.85}
            >
              <Text style={[styles.ctaBtnText, { color: tokens.primary }]}>{t('home.cta_btn')}</Text>
              <Icon name="arrow-right" size={18} color={tokens.primary} />
            </TouchableOpacity>
          </View>
        </Animated.View>

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

