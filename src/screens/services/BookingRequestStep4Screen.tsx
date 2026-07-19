import React, { useState, useLayoutEffect, useRef, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Modal,
  Image,
  SafeAreaView,
  PanResponder,
  TextInput,
} from 'react-native';
import { Text, Card, Avatar, ActivityIndicator } from 'react-native-paper';
import { ChocolateButton } from '../../components/shared/ChocolateButton';
import { StackScreenProps } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import RNMapView, { Marker, Circle } from 'react-native-maps';
import { HomeStackParamList } from '../../navigation/types';
import { BookingStep4Data, AssignmentType } from '../../types/booking';
import { ModePickerCard } from '../../components/shared/ModePickerCard';
import { useSelector } from 'react-redux';
import { useSearchProsQuery } from '../../store/api/prosApi';
import { useGetCategoriesQuery } from '../../store/api/servicesApi';
import { CURRENCY_CONFIG } from '../../config/currency';
import type { RootState } from '../../store';
import { colors } from '../../theme/colors';
import { useAppTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/spacing';

type Props = StackScreenProps<HomeStackParamList, 'BookingRequestStep4'>;

const { height } = Dimensions.get('window');

const RADIUS_MIN = 5;
const RADIUS_MAX = 100;
const RADIUS_STEP = 5;

const SLIDER_GRADUATIONS = [
  { km: 10, icon: '📍' },
  { km: 20, icon: '🔍' },
  { km: 50, icon: '🗺️' },
  { km: 100, icon: '🌐' },
];

/** Unwrap ScoredPro → flat object with distanceKm */
const flattenPro = (item: any) => ({
  ...(item.pro ?? item),
  distanceKm: item.distance ?? item.distanceKm,
  lat: (item.pro ?? item).currentLat ?? (item.pro ?? item).serviceAreaCenterLat,
  lng: (item.pro ?? item).currentLng ?? (item.pro ?? item).serviceAreaCenterLng,
});


const calcProPrice = (pro: any, basePrice: number): number => {
  const offering = pro.serviceOfferings?.[0];
  const includedExtras = (offering?.extras ?? []).filter((e: any) => !e.isOptional);
  const extrasSum = includedExtras.reduce((s: number, e: any) => s + (e.price ?? 0), 0);
  return basePrice + extrasSum;
};

const ProCard = ({ pro, selected, onSelect, onViewShowcase, basePrice, currency, t }: any) => {
  const { tokens: pcTokens } = useAppTheme();
  const pcStyles = useMemo(() => StyleSheet.create({
    proCard: { borderRadius: 12, borderWidth: 2, borderColor: 'transparent', elevation: 1 },
    proCardContent: { flexDirection: 'row', alignItems: 'center' },
    proAvatar: { marginRight: spacing.sm },
    proInfo: { flex: 1 },
    proName: { fontSize: 15, fontWeight: '700', color: pcTokens.text.primary },
    proMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 2, flexWrap: 'wrap' },
    proRating: { fontSize: 13, color: pcTokens.text.secondary },
    proDistance: { fontSize: 13, color: pcTokens.text.secondary },
    proBadge: { fontSize: 13, color: '#F59E0B' },
    proPriceRange: { fontSize: 12, marginTop: 2 },
    selectedCheckText: { fontSize: 16, color: colors.white, fontWeight: '700' },
    selectedCheck: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    showcaseBtn: { marginTop: 4 },
    showcaseBtnText: { fontSize: 12, fontWeight: '600', color: pcTokens.primary },
  }), [pcTokens]);
  return (

    <Card style={[pcStyles.proCard, selected && { borderColor: pcTokens.primary }]} onPress={onSelect}>
      <Card.Content style={pcStyles.proCardContent}>
        <Avatar.Image
          size={48}
          source={{ uri: pro.user?.profilePicture ?? 'https://via.placeholder.com/48' }}
          style={pcStyles.proAvatar}
        />
        <View style={pcStyles.proInfo}>
          <Text style={pcStyles.proName}>{pro.user?.firstName} {pro.user?.lastName}</Text>
          <View style={pcStyles.proMeta}>
            <Text style={pcStyles.proRating}>⭐ {(pro.averageRating || 5).toFixed(1)}</Text>
            {pro.distanceKm != null && (
              <Text style={pcStyles.proDistance}> · {pro.distanceKm.toFixed(1)} km</Text>
            )}
            {pro.isStudyltizemeGraduate && (
              <Text style={pcStyles.proBadge}> · ✦</Text>
            )}
          </View>
          {basePrice != null ? (
            <Text style={[pcStyles.proPriceRange, { color: pcTokens.primary }]}>
              {t('booking_request.price_from', { price: calcProPrice(pro, basePrice), currency })}
            </Text>
          ) : null}
          <TouchableOpacity
            onPress={(e) => { e.stopPropagation?.(); onViewShowcase(); }}
            style={pcStyles.showcaseBtn}
            activeOpacity={0.7}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Text style={pcStyles.showcaseBtnText}>{t('booking_request.pro_view_showcase')} →</Text>
          </TouchableOpacity>
        </View>
        {selected && <View style={[pcStyles.selectedCheck, { backgroundColor: pcTokens.primary }]}><Text style={pcStyles.selectedCheckText}>✓</Text></View>}
      </Card.Content>
    </Card>
  );
};
const TRACK_H = 4;

export const BookingRequestStep4Screen = ({ route, navigation }: Props) => {
  const { tokens } = useAppTheme();


  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: tokens.background },
    content: { padding: spacing.sm, paddingHorizontal: spacing.md, paddingBottom: 88 },
    stepLabel: { fontSize: 12, color: tokens.text.secondary, marginBottom: spacing.sm },
    sectionLabel: { fontSize: 14, fontWeight: '600', color: tokens.text.primary, marginBottom: spacing.xs },
    modeRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },

    // ── Radius redesign ──
    radiusSection: {
      backgroundColor: tokens.card,
      borderRadius: 16,
      padding: spacing.sm,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.sm,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
    },
    radiusHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    radiusTitle: { fontSize: 13, fontWeight: '600', color: tokens.text.primary },
    radiusValue: { fontSize: 15, fontWeight: '700', color: tokens.primary },
    sliderTrack: {
      height: 28,
      justifyContent: 'center',
      marginHorizontal: 10,
    },
    sliderRail: {
      position: 'absolute',
      left: 0,
      right: 0,
      height: TRACK_H,
      backgroundColor: tokens.backgroundAlt,
      borderRadius: TRACK_H / 2,
    },
    sliderFill: {
      position: 'absolute',
      left: 0,
      height: TRACK_H,
      backgroundColor: tokens.primary,
      borderRadius: TRACK_H / 2,
    },
    sliderThumb: {
      position: 'absolute',
      backgroundColor: tokens.card,
      borderWidth: 2.5,
      borderColor: tokens.primary,
      shadowColor: tokens.primary,
      shadowOpacity: 0.25,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
      elevation: 3,
    },
    graduationRow: {
      position: 'relative',
      height: 44,
      marginHorizontal: 10,
      marginTop: 0,
    },
    graduation: {
      position: 'absolute',
      alignItems: 'center',
      transform: [{ translateX: -16 }],
    },
    graduationTickSmall: {
      width: 1,
      height: 3,
      backgroundColor: tokens.border,
      borderRadius: 1,
      marginBottom: 2,
    },
    graduationTick: {
      width: 1.5,
      height: 6,
      backgroundColor: tokens.border,
      borderRadius: 1,
      marginBottom: 2,
    },
    graduationTickActive: { backgroundColor: tokens.primary },
    graduationIcon: { fontSize: 13 },
    graduationKm: { fontSize: 10, color: tokens.text.secondary, fontWeight: '500', marginTop: 1 },
    graduationKmActive: { color: tokens.primary, fontWeight: '700' },

    // ── View toggle ──
    viewToggle: {
      flexDirection: 'row',
      backgroundColor: tokens.backgroundAlt,
      borderRadius: 10,
      padding: 3,
      marginBottom: spacing.sm,
      gap: 3,
    },
    viewBtn: {
      flex: 1,
      paddingVertical: 6,
      borderRadius: 8,
      alignItems: 'center',
    },
    viewBtnActive: {
      backgroundColor: tokens.card,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    viewBtnText: { fontSize: 13, color: tokens.text.secondary, fontWeight: '500' },
    viewBtnTextActive: { color: tokens.text.primary, fontWeight: '600' },

    loadingBox: { alignItems: 'center', padding: spacing.lg, gap: 6 },
    loadingText: { fontSize: 13, color: tokens.text.secondary },

    emptyBox: { alignItems: 'center', padding: spacing.lg, gap: spacing.sm },
    emptyIcon: { fontSize: 32, marginBottom: 2 },
    emptyText: { fontSize: 15, fontWeight: '600', color: tokens.text.primary },
    emptyHint: { fontSize: 13, color: tokens.text.secondary, textAlign: 'center' },
    expandRadiusBtn: {
      marginTop: spacing.sm,
      backgroundColor: tokens.primary + '15',
      borderRadius: 10,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderWidth: 1,
      borderColor: tokens.primary + '40',
    },
    expandRadiusBtnText: { fontSize: 14, color: tokens.primary, fontWeight: '600' },

    mapContainer: { height: height * 0.4, borderRadius: 12, overflow: 'hidden', marginBottom: spacing.md },
    map: { flex: 1 },
    clientMarker: { width: 16, height: 16, borderRadius: 8, backgroundColor: tokens.primary, borderWidth: 2, borderColor: colors.white },
    proMarker: { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.proGreen, borderWidth: 2, borderColor: colors.white },
    proMarkerSelected: { backgroundColor: '#EF4444', width: 20, height: 20, borderRadius: 10, borderColor: '#fff', borderWidth: 2.5 },

    proList: { gap: spacing.sm },
    proCard: { borderRadius: 12, borderWidth: 2, borderColor: 'transparent', elevation: 1 },
    proCardSelected: { borderColor: tokens.primary },
    proCardContent: { flexDirection: 'row', alignItems: 'center' },
    proAvatar: { marginRight: spacing.sm },
    proInfo: { flex: 1 },
    proName: { fontSize: 15, fontWeight: '600', color: tokens.text.primary },
    proMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 2, flexWrap: 'wrap' },
    proRating: { fontSize: 13, color: tokens.text.secondary },
    proDistance: { fontSize: 13, color: tokens.text.secondary },
    proBadge: { fontSize: 13, color: '#F59E0B' },
    proPriceRange: { fontSize: 12, color: tokens.primary, marginTop: 2 },
    selectedCheck: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: tokens.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    selectedCheckText: { fontSize: 16, color: colors.white, fontWeight: '700' },

    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', gap: spacing.sm, padding: spacing.md, backgroundColor: tokens.background, borderTopWidth: 1, borderTopColor: tokens.border },
    backBtn: { flex: 1 },
    nextBtn: { flex: 2 },

    showcaseBtn: { marginTop: 4 },
    showcaseBtnText: { fontSize: 12, color: tokens.primary, fontWeight: '600' },

    basePriceInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: tokens.primary + '12',
      borderRadius: 10,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      marginBottom: spacing.sm,
      gap: 6,
      borderWidth: 1,
      borderColor: tokens.primary + '30',
    },
    basePriceInfoText: { fontSize: 13, color: tokens.primary, fontWeight: '600', flex: 1 },

    // ── Modal vitrine ──
    modalOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.45)',
    },
    modalSheet: {
      backgroundColor: tokens.modal,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      height: height * 0.65,
    },
    modalHandle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: tokens.border,
      alignSelf: 'center',
      marginTop: 10,
      marginBottom: 4,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: tokens.border,
    },
    modalProInfo: { flexDirection: 'row', alignItems: 'center' },
    modalProName: { fontSize: 15, fontWeight: '700', color: tokens.text.primary },
    modalProMeta: { fontSize: 13, color: tokens.text.secondary, marginTop: 2 },
    modalClose: { fontSize: 20, color: tokens.text.secondary, fontWeight: '600' },
    modalDisclaimer: {
      marginHorizontal: spacing.lg,
      marginTop: spacing.md,
      marginBottom: spacing.sm,
      backgroundColor: '#FFF3CD',
      borderLeftWidth: 3,
      borderLeftColor: '#F59E0B',
      borderRadius: 6,
      padding: spacing.sm,
    },
    modalDisclaimerText: { fontSize: 12, color: '#92400E', lineHeight: 18 },
    modalPhotos: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      paddingHorizontal: spacing.lg,
      marginBottom: spacing.md,
    },
    modalPhoto: {
      width: (Dimensions.get('window').width - spacing.lg * 2 - 16) / 3,
      height: (Dimensions.get('window').width - spacing.lg * 2 - 16) / 3,
      borderRadius: 8,
      backgroundColor: tokens.backgroundAlt,
    },
    modalBioBox: {
      paddingHorizontal: spacing.lg,
      marginBottom: spacing.md,
    },
    modalBioLabel: { fontSize: 13, fontWeight: '700', color: tokens.text.primary, marginBottom: 4 },
    modalBioText: { fontSize: 14, color: tokens.text.secondary, lineHeight: 22 },
    modalEmpty: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.xl,
      alignItems: 'center',
    },
    modalEmptyText: { fontSize: 14, color: tokens.text.secondary, textAlign: 'center' },
    modalFooter: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.md,
      borderTopWidth: 1,
      borderTopColor: tokens.border,
    },
    modalSelectBtn: {},

    mapProCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: tokens.card,
      borderRadius: 12,
      padding: spacing.md,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: tokens.border,
      elevation: 2,
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
      gap: spacing.sm,
    },
    mapProCardInfo: { flex: 1 },
    mapProSelectBtn: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1.5,
      borderColor: tokens.primary,
      alignItems: 'center',
      minWidth: 70,
    },
    mapProSelectBtnActive: { backgroundColor: tokens.primary },
    mapProSelectBtnText: { fontSize: 12, color: tokens.primary, fontWeight: '600' },
    mapProSelectBtnTextActive: { color: colors.white },

    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: tokens.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: tokens.border,
      paddingHorizontal: spacing.md,
      paddingVertical: 7,
      marginBottom: spacing.sm,
      gap: spacing.sm,
    },
    searchIcon: { fontSize: 16 },
    searchInput: {
      flex: 1,
      fontSize: 14,
      color: tokens.text.primary,
      padding: 0,
    },
    searchClear: { fontSize: 14, color: tokens.text.secondary, fontWeight: '600' },

    callout: { width: 200, padding: 8 },
    calloutTitle: { fontSize: 13, fontWeight: '700', color: tokens.text.primary, marginBottom: 2 },
    calloutDesc: { fontSize: 11, color: tokens.text.secondary, lineHeight: 16 },
    calloutPrice: { fontSize: 12, color: tokens.primary, fontWeight: '600', marginTop: 2 },
    calloutHint: { fontSize: 10, color: tokens.text.secondary, marginTop: 4, fontStyle: 'italic' },
  }), [tokens]);

  const { t, i18n } = useTranslation();
  const { categorySlug, step1Data, step2Data, step3Data } = route.params;

  const countryCode = useSelector((s: RootState) => s.location.selectedCountryCode ?? s.location.detectedCountryCode ?? undefined);
  const { data: allCategories = [] } = useGetCategoriesQuery({ activeOnly: true, countryCode: countryCode ?? undefined });
  const categoryMeta = (allCategories as any[]).find((c: any) => c.slug === categorySlug);
  const basePrice: number | null = categoryMeta?.basePrice ?? null;
  const baseCurrency: string = categoryMeta?.currency ?? CURRENCY_CONFIG.code;

  useLayoutEffect(() => {
    navigation.setOptions({ title: t('booking_request.step_of', { current: 4, total: 5 }) });
  }, []);

  const [assignMode, setAssignMode] = useState<AssignmentType>('auto');
  const [selectedProId, setSelectedProId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [maxDistance, setMaxDistance] = useState<number>(20);
  const [showcasePro, setShowcasePro] = useState<any | null>(null);

  const addressLat = step2Data.address.lat;
  const addressLng = step2Data.address.lng;

  const { data: prosData, isLoading, isFetching } = useSearchProsQuery(
    {
      category: categorySlug,
      userLat: addressLat,
      userLng: addressLng,
      maxDistance,
      availableOnly: true,
      limit: 30,
    },
    {
      skip: assignMode !== 'manual',
      refetchOnMountOrArgChange: true,
      pollingInterval: 8000,
    },
  );

  const [searchQuery, setSearchQuery] = useState('');

  const rawPros: any[] = prosData?.pros ?? (Array.isArray(prosData) ? prosData : []);
  const pros = rawPros.map(flattenPro);
  const filteredPros = searchQuery.trim()
    ? pros.filter((p: any) => {
      const name = `${p.user?.firstName ?? ''} ${p.user?.lastName ?? ''}`.toLowerCase();
      return name.includes(searchQuery.toLowerCase().trim());
    })
    : pros;

  const handleNext = () => {
    const selectedPro = pros.find((p: any) => p.id === selectedProId);
    const step4Data: BookingStep4Data = {
      assignmentType: assignMode,
      proId: assignMode === 'manual' ? selectedProId ?? undefined : undefined,
      proName: selectedPro
        ? `${selectedPro.user?.firstName} ${selectedPro.user?.lastName}`
        : undefined,
      serviceOfferingId: selectedPro?.serviceOfferings?.[0]?.id,
      estimatedPrice: selectedPro && basePrice != null
        ? calcProPrice(selectedPro, basePrice)
        : (basePrice ?? undefined),
      estimatedCurrency: baseCurrency,
    };
    navigation.navigate('BookingRequestStep5', { categorySlug, step1Data, step2Data, step3Data, step4Data });
  };

  const canGoNext = assignMode === 'auto' || (assignMode === 'manual' && !!selectedProId);

  // ── Slider rayon ──
  const sliderRef = useRef<View>(null);
  const sliderGeo = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const mapRef = useRef<any>(null);

  const panResponder = useRef(
    PanResponder.create({
      // Ne jamais intercepter la phase de démarrage → le ScrollView conserve la priorité
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      // Prendre la main uniquement si le geste est clairement horizontal
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > Math.abs(gs.dy) && Math.abs(gs.dx) > 4,
      onMoveShouldSetPanResponderCapture: (_, gs) =>
        Math.abs(gs.dx) > Math.abs(gs.dy) && Math.abs(gs.dx) > 4,
      onPanResponderGrant: (_, gs) => {
        const rel = gs.x0 - sliderGeo.current.x;
        const ratio = Math.max(0, Math.min(1, rel / sliderGeo.current.width));
        const km = Math.round((RADIUS_MIN + ratio * (RADIUS_MAX - RADIUS_MIN)) / RADIUS_STEP) * RADIUS_STEP;
        setMaxDistance(km);
      },
      onPanResponderMove: (_, gs) => {
        const { x, y, width, height } = sliderGeo.current;
        // Arrêt si le doigt sort de la zone verticale du slider (tolérance ±24 px)
        if (gs.moveY < y - 24 || gs.moveY > y + height + 24) return;
        const rel = gs.moveX - x;
        const ratio = Math.max(0, Math.min(1, rel / width));
        const km = Math.round((RADIUS_MIN + ratio * (RADIUS_MAX - RADIUS_MIN)) / RADIUS_STEP) * RADIUS_STEP;
        setMaxDistance(km);
      },
    })
  ).current;

  useEffect(() => {
    if (viewMode !== 'map') return;
    const delta = Math.max(0.05, (maxDistance * 2) / 111 * 1.6);
    mapRef.current?.animateToRegion(
      { latitude: addressLat, longitude: addressLng, latitudeDelta: delta, longitudeDelta: delta },
      400,
    );
  }, [maxDistance, viewMode]);

  return (
    <View style={styles.container}>
      {/* Modal vitrine prestataire */}
      <Modal
        visible={!!showcasePro}
        animationType="slide"
        transparent
        onRequestClose={() => setShowcasePro(null)}
      >
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            {/* Handle */}
            <View style={styles.modalHandle} />

            {/* En-tête */}
            <View style={styles.modalHeader}>
              <View style={styles.modalProInfo}>
                <Avatar.Image
                  size={44}
                  source={{ uri: showcasePro?.user?.profilePicture ?? 'https://via.placeholder.com/44' }}
                />
                <View style={{ marginLeft: spacing.sm }}>
                  <Text style={styles.modalProName}>
                    {showcasePro?.user?.firstName} {showcasePro?.user?.lastName}
                  </Text>
                  <Text style={styles.modalProMeta}>
                    ⭐ {(showcasePro?.averageRating || 5).toFixed(1)}
                    {showcasePro?.distanceKm != null ? `  ·  ${showcasePro.distanceKm.toFixed(1)} km` : ''}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowcasePro(null)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
              {/* Avertissement */}
              <View style={styles.modalDisclaimer}>
                <Text style={styles.modalDisclaimerText}>{t('profile.portfolio_disclaimer')}</Text>
              </View>

              {/* Photos portfolio */}
              {(showcasePro?.portfolioPhotos ?? []).length > 0 ? (
                <View style={styles.modalPhotos}>
                  {(showcasePro.portfolioPhotos as string[]).map((uri: string, idx: number) => (
                    <Image
                      key={idx}
                      source={{ uri }}
                      style={styles.modalPhoto}
                      resizeMode="cover"
                    />
                  ))}
                </View>
              ) : null}

              {/* Bio */}
              {showcasePro?.bio ? (
                <View style={styles.modalBioBox}>
                  <Text style={styles.modalBioLabel}>{t('profile.bio')}</Text>
                  <Text style={styles.modalBioText}>{showcasePro.bio}</Text>
                </View>
              ) : null}

              {/* Rien à afficher */}
              {!(showcasePro?.portfolioPhotos?.length) && !showcasePro?.bio && (
                <View style={styles.modalEmpty}>
                  <Text style={styles.modalEmptyText}>{t('booking_request.pro_no_showcase')}</Text>
                </View>
              )}
            </ScrollView>

            {/* Bouton sélectionner */}
            <View style={styles.modalFooter}>
              <ChocolateButton
                onPress={() => {
                  setSelectedProId(showcasePro.id === selectedProId ? null : showcasePro.id);
                  setShowcasePro(null);
                }}
                style={styles.modalSelectBtn}
              >
                {selectedProId === showcasePro?.id
                  ? t('booking_request.pro_selected')
                  : t('booking_request.pro_select')}
              </ChocolateButton>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.stepLabel}>{t('booking_request.step_of', { current: 4, total: 5 })}</Text>

        {/* Mode d'assignation */}
        <Text style={styles.sectionLabel}>{t('booking_request.assign_mode_label')}</Text>
        <View style={styles.modeRow}>
          <ModePickerCard
            icon="⚙️"
            title={t('booking_request.assign_auto')}
            hint={t('booking_request.assign_auto_desc')}
            selected={assignMode === 'auto'}
            onPress={() => setAssignMode('auto')}
          />
          <ModePickerCard
            icon="👤"
            title={t('booking_request.assign_manual')}
            selected={assignMode === 'manual'}
            onPress={() => setAssignMode('manual')}
          />
        </View>

        {/* Prix de base (mode auto) */}
        {assignMode === 'auto' && basePrice != null && (
          <View style={styles.basePriceInfo}>
            <Text style={{ fontSize: 16 }}>💰</Text>
            <Text style={styles.basePriceInfoText}>
              {t('booking_request.price_from', { price: basePrice, currency: baseCurrency })}
            </Text>
          </View>
        )}

        {/* Sélection manuelle */}
        {assignMode === 'manual' && (
          <>
            {/* ── Sélecteur de rayon (slider) ── */}
            <View style={styles.radiusSection}>
              <View style={styles.radiusHeader}>
                <Text style={styles.radiusTitle}>{t('booking_request.radius_label')}</Text>
                <Text style={styles.radiusValue}>{maxDistance} km</Text>
              </View>

              {/* Slider */}
              <View
                ref={sliderRef}
                style={styles.sliderTrack}
                onLayout={() =>
                  sliderRef.current?.measure((_fx, _fy, w, h, px, py) => {
                    sliderGeo.current = { x: px, y: py, width: w, height: h };
                  })
                }
                {...panResponder.panHandlers}
              >
                <View style={styles.sliderRail} />
                <View
                  style={[
                    styles.sliderFill,
                    { width: `${((maxDistance - RADIUS_MIN) / (RADIUS_MAX - RADIUS_MIN)) * 100}%` as any },
                  ]}
                />
                <View
                  style={[
                    styles.sliderThumb,
                    { left: `${((maxDistance - RADIUS_MIN) / (RADIUS_MAX - RADIUS_MIN)) * 100}%` as any },
                  ]}
                />
              </View>

              {/* Graduations */}
              <View style={styles.graduationRow}>
                {Array.from(
                  { length: (RADIUS_MAX - RADIUS_MIN) / RADIUS_STEP + 1 },
                  (_, i) => RADIUS_MIN + i * RADIUS_STEP,
                ).map((km) => {
                  const pct = ((km - RADIUS_MIN) / (RADIUS_MAX - RADIUS_MIN)) * 100;
                  const active = maxDistance >= km;
                  const exact = maxDistance === km;
                  const main = SLIDER_GRADUATIONS.find(g => g.km === km);
                  return (
                    <TouchableOpacity
                      key={km}
                      style={[styles.graduation, { left: `${pct}%` as any }]}
                      onPress={() => setMaxDistance(km)}
                      activeOpacity={0.7}
                    >
                      <View style={[
                        main ? styles.graduationTick : styles.graduationTickSmall,
                        active && styles.graduationTickActive,
                      ]} />
                      {main && <Text style={styles.graduationIcon}>{main.icon}</Text>}
                      {main && (
                        <Text style={[styles.graduationKm, exact && styles.graduationKmActive]}>
                          {km} km
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Toggle liste/carte */}
            <View style={styles.viewToggle}>
              <TouchableOpacity
                style={[styles.viewBtn, viewMode === 'list' && styles.viewBtnActive]}
                onPress={() => setViewMode('list')}
                activeOpacity={0.8}
              >
                <Text style={[styles.viewBtnText, viewMode === 'list' && styles.viewBtnTextActive]}>
                  📋 {t('booking_request.view_list')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.viewBtn, viewMode === 'map' && styles.viewBtnActive]}
                onPress={() => setViewMode('map')}
                activeOpacity={0.8}
              >
                <Text style={[styles.viewBtnText, viewMode === 'map' && styles.viewBtnTextActive]}>
                  🗺️ {t('booking_request.view_map')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Barre de recherche manuelle */}
            <View style={styles.searchBar}>
              <Text style={styles.searchIcon}>🔎</Text>
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={t('booking_request.pro_search_placeholder')}
                placeholderTextColor={tokens.text.secondary}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearchQuery('')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.searchClear}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            {(isLoading || isFetching) && (
              <View style={styles.loadingBox}>
                <ActivityIndicator color={tokens.primary} />
                <Text style={styles.loadingText}>{t('booking_request.searching_pros')}</Text>
              </View>
            )}

            {/* Aucun pro dans la zone */}
            {!isLoading && !isFetching && pros.length === 0 && (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyIcon}>🔍</Text>
                <Text style={styles.emptyText}>{t('booking_request.no_pros_found')}</Text>
                <Text style={styles.emptyHint}>{t('booking_request.no_pros_hint')}</Text>
                {maxDistance < RADIUS_MAX && (
                  <TouchableOpacity
                    style={styles.expandRadiusBtn}
                    onPress={() => setMaxDistance(prev => Math.min(RADIUS_MAX, prev + RADIUS_STEP))}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.expandRadiusBtnText}>
                      {t('booking_request.expand_radius')} → {Math.min(RADIUS_MAX, maxDistance + RADIUS_STEP)} km
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Aucun résultat pour la recherche */}
            {!isLoading && !isFetching && pros.length > 0 && filteredPros.length === 0 && (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyIcon}>🙅</Text>
                <Text style={styles.emptyText}>{t('booking_request.pro_search_no_result')}</Text>
                <TouchableOpacity
                  style={styles.expandRadiusBtn}
                  onPress={() => setSearchQuery('')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.expandRadiusBtnText}>✕ {t('common.cancel')}</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Vue carte + fiche pro (groupés pour affichage sans scroll) */}
            {viewMode === 'map' && (pros.length > 0 || filteredPros.length > 0) && (
              <View>
                <View style={styles.mapContainer}>
                  <RNMapView
                    ref={mapRef}
                    style={styles.map}
                    initialRegion={{
                      latitude: addressLat,
                      longitude: addressLng,
                      latitudeDelta: 0.18,
                      longitudeDelta: 0.18,
                    }}
                  >
                    {/* Cercle de rayon */}
                    <Circle
                      center={{ latitude: addressLat, longitude: addressLng }}
                      radius={maxDistance * 1000}
                      strokeColor={tokens.primary}
                      fillColor={tokens.primary + '18'}
                      strokeWidth={1.5}
                    />

                    {/* Marker client */}
                    <Marker
                      coordinate={{ latitude: addressLat, longitude: addressLng }}
                      pinColor={tokens.primary}
                      title={`📍 ${step2Data.address.address?.split(',')[0] ?? ''}`}
                      description={[
                        i18n.language === 'ar'
                          ? (step1Data.categoryNameAr ?? categorySlug)
                          : i18n.language === 'en'
                            ? (step1Data.categoryNameEn ?? categorySlug)
                            : (step1Data.categoryNameFr ?? categorySlug),
                        step3Data.scheduledAt
                          ? new Date(step3Data.scheduledAt).toLocaleDateString(i18n.language, { day: '2-digit', month: 'short' })
                          : null,
                      ].filter(Boolean).join(' · ')}
                    />

                    {/* Markers pros avec callout d'infos */}
                    {filteredPros.map((pro: any, idx: number) => {
                      const rawLat = pro.lat;
                      const rawLng = pro.lng;
                      const hasCoords = rawLat != null && rawLng != null &&
                        !(Math.abs(rawLat) < 0.001 && Math.abs(rawLng) < 0.001);
                      const lat = hasCoords ? rawLat : addressLat + (idx + 1) * 0.003;
                      const lng = hasCoords ? rawLng : addressLng + (idx + 1) * 0.004;
                      const proName = `${pro.user?.firstName ?? ''} ${pro.user?.lastName ?? ''}`.trim();
                      const priceText = basePrice != null
                        ? `≥ ${calcProPrice(pro, basePrice)} ${baseCurrency}`
                        : null;
                      return (
                        <Marker
                          key={pro.id}
                          coordinate={{ latitude: lat, longitude: lng }}
                          pinColor={selectedProId === pro.id ? '#EF4444' : (hasCoords ? colors.proGreen : '#F59E0B')}
                          title={`${proName}${pro.isStudyltizemeGraduate ? ' ✦' : ''}`}
                          description={[
                            `⭐ ${(pro.averageRating || 5).toFixed(1)}${pro.distanceKm != null ? ` · ${pro.distanceKm.toFixed(1)} km` : ''}`,
                            priceText,
                            !hasCoords ? `📍 ${t('booking_request.location_approx')}` : null,
                          ].filter(Boolean).join('  •  ')}
                          onPress={() => setSelectedProId(pro.id === selectedProId ? null : pro.id)}
                        />
                      );
                    })}
                  </RNMapView>
                </View>

                {/* Fiche pro sélectionné — immédiatement sous la carte, sans scroll */}
                {(() => {
                  const mapPro = pros.find((p: any) => p.id === selectedProId);
                  if (!mapPro) return null;
                  const mapProPrice = basePrice != null
                    ? `≥ ${calcProPrice(mapPro, basePrice)} ${baseCurrency}`
                    : null;
                  return (
                    <View style={styles.mapProCard}>
                      <Avatar.Image
                        size={44}
                        source={{ uri: mapPro.user?.profilePicture ?? 'https://via.placeholder.com/44' }}
                      />
                      <View style={styles.mapProCardInfo}>
                        <Text style={styles.proName} numberOfLines={1}>
                          {mapPro.user?.firstName} {mapPro.user?.lastName}
                          {mapPro.isStudyltizemeGraduate ? ' ✦' : ''}
                        </Text>
                        <View style={styles.proMeta}>
                          <Text style={styles.proRating}>⭐ {(mapPro.averageRating || 5).toFixed(1)}</Text>
                          {mapPro.distanceKm != null && (
                            <Text style={styles.proDistance}> · {mapPro.distanceKm.toFixed(1)} km</Text>
                          )}
                        </View>
                        {mapProPrice && (
                          <Text style={[styles.proPriceRange, { color: tokens.primary }]}>{mapProPrice}</Text>
                        )}
                        <TouchableOpacity
                          onPress={() => setShowcasePro(mapPro)}
                          style={styles.showcaseBtn}
                          activeOpacity={0.7}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          <Text style={[styles.showcaseBtnText, { color: tokens.primary }]}>
                            {t('booking_request.pro_view_showcase')} →
                          </Text>
                        </TouchableOpacity>
                      </View>
                      <TouchableOpacity
                        onPress={() => setSelectedProId(mapPro.id === selectedProId ? null : mapPro.id)}
                        style={[styles.mapProSelectBtn, selectedProId === mapPro.id && styles.mapProSelectBtnActive]}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.mapProSelectBtnText, selectedProId === mapPro.id && styles.mapProSelectBtnTextActive]}>
                          {selectedProId === mapPro.id ? '✓' : t('booking_request.pro_select')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })()}
              </View>
            )}

            {/* Vue liste */}
            {viewMode === 'list' && filteredPros.length > 0 && (
              <View style={styles.proList}>
                {filteredPros.map((pro: any) => (
                  <ProCard
                    key={pro.id}
                    pro={pro}
                    selected={selectedProId === pro.id}
                    onSelect={() => setSelectedProId(pro.id === selectedProId ? null : pro.id)}
                    onViewShowcase={() => setShowcasePro(pro)}
                    basePrice={basePrice}
                    currency={baseCurrency}
                    t={t}
                  />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <ChocolateButton variant="outline" onPress={() => navigation.goBack()} style={styles.backBtn}>
          {t('booking_request.back')}
        </ChocolateButton>
        <ChocolateButton
          onPress={handleNext}
          disabled={!canGoNext}
          style={styles.nextBtn}
        >
          {t('booking_request.next')}
        </ChocolateButton>
      </View>
    </View>
  );
};
