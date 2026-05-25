import React, { useState, useLayoutEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Text, Button, Card, Avatar, ActivityIndicator } from 'react-native-paper';
import { StackScreenProps } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import Constants from 'expo-constants';
import RNMapView, { Marker } from 'react-native-maps';
import { HomeStackParamList } from '../../navigation/types';
import { BookingStep4Data, AssignmentType } from '../../types/booking';
import { ModePickerCard } from '../../components/shared/ModePickerCard';
import { useSearchProsQuery } from '../../store/api/prosApi';
import { useRefetchOnFocus } from '../../hooks/useRefetchOnFocus';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

type Props = StackScreenProps<HomeStackParamList, 'BookingRequestStep4'>;

const isExpoGo = Constants.appOwnership === 'expo';
const Mapbox = isExpoGo ? null : require('@rnmapbox/maps').default;

const { height } = Dimensions.get('window');

const DISTANCE_OPTIONS = [
  { km: 10,  icon: '📍', labelKey: 'booking_request.radius_10' },
  { km: 20,  icon: '🔍', labelKey: 'booking_request.radius_20' },
  { km: 50,  icon: '🗺️',  labelKey: 'booking_request.radius_50' },
  { km: 100, icon: '🌐', labelKey: 'booking_request.radius_100' },
];

/** Unwrap ScoredPro → flat object with distanceKm */
const flattenPro = (item: any) => ({
  ...(item.pro ?? item),
  distanceKm: item.distance ?? item.distanceKm,
  lat: (item.pro ?? item).currentLat ?? (item.pro ?? item).serviceAreaCenterLat,
  lng: (item.pro ?? item).currentLng ?? (item.pro ?? item).serviceAreaCenterLng,
});

export const BookingRequestStep4Screen = ({ route, navigation }: Props) => {
  const { t } = useTranslation();
  const { categorySlug, step1Data, step2Data, step3Data } = route.params;

  useLayoutEffect(() => {
    navigation.setOptions({ title: t('booking_request.step_of', { current: 4, total: 5 }) });
  }, []);

  const [assignMode, setAssignMode] = useState<AssignmentType>('auto');
  const [selectedProId, setSelectedProId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [maxDistance, setMaxDistance] = useState<number>(20);

  const addressLat = step2Data.address.lat;
  const addressLng = step2Data.address.lng;

  const { data: prosData, isLoading, isFetching, refetch } = useSearchProsQuery(
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
  useRefetchOnFocus(refetch);

  const rawPros: any[] = prosData?.pros ?? (Array.isArray(prosData) ? prosData : []);
  const pros = rawPros.map(flattenPro);

  const handleNext = () => {
    const selectedPro = pros.find((p: any) => p.id === selectedProId);
    const step4Data: BookingStep4Data = {
      assignmentType: assignMode,
      proId: assignMode === 'manual' ? selectedProId ?? undefined : undefined,
      proName: selectedPro
        ? `${selectedPro.user?.firstName} ${selectedPro.user?.lastName}`
        : undefined,
      serviceOfferingId: selectedPro?.serviceOfferings?.[0]?.id,
      estimatedPrice: selectedPro?.serviceOfferings?.[0]?.priceMin,
    };
    navigation.navigate('BookingRequestStep5', { categorySlug, step1Data, step2Data, step3Data, step4Data });
  };

  const canGoNext = assignMode === 'auto' || (assignMode === 'manual' && !!selectedProId);

  const activeDistIdx = DISTANCE_OPTIONS.findIndex(d => d.km === maxDistance);

  return (
    <View style={styles.container}>
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

        {/* Sélection manuelle */}
        {assignMode === 'manual' && (
          <>
            {/* ── Sélecteur de rayon redesigné ── */}
            <View style={styles.radiusSection}>
              <Text style={styles.radiusTitle}>{t('booking_request.radius_label')}</Text>

              {/* Track + stops */}
              <View style={styles.trackWrapper}>
                <View style={styles.trackBg} />
                <View
                  style={[
                    styles.trackFill,
                    { width: `${(activeDistIdx / (DISTANCE_OPTIONS.length - 1)) * 100}%` },
                  ]}
                />
                {DISTANCE_OPTIONS.map((opt, idx) => {
                  const active = maxDistance === opt.km;
                  const passed = idx <= activeDistIdx;
                  return (
                    <TouchableOpacity
                      key={opt.km}
                      style={[styles.stop, { left: `${(idx / (DISTANCE_OPTIONS.length - 1)) * 100}%` as any }]}
                      onPress={() => setMaxDistance(opt.km)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.stopDot, passed && styles.stopDotActive, active && styles.stopDotSelected]}>
                        {active && <View style={styles.stopDotInner} />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Labels */}
              <View style={styles.radiusLabels}>
                {DISTANCE_OPTIONS.map((opt, idx) => {
                  const active = maxDistance === opt.km;
                  return (
                    <TouchableOpacity
                      key={opt.km}
                      style={styles.radiusLabelItem}
                      onPress={() => setMaxDistance(opt.km)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.radiusIcon}>{opt.icon}</Text>
                      <Text style={[styles.radiusKm, active && styles.radiusKmActive]}>
                        {opt.km} km
                      </Text>
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

            {(isLoading || isFetching) && (
              <View style={styles.loadingBox}>
                <ActivityIndicator color={colors.primary} />
                <Text style={styles.loadingText}>{t('booking_request.searching_pros')}</Text>
              </View>
            )}

            {!isLoading && !isFetching && pros.length === 0 && (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyIcon}>🔍</Text>
                <Text style={styles.emptyText}>{t('booking_request.no_pros_found')}</Text>
                <Text style={styles.emptyHint}>{t('booking_request.no_pros_hint')}</Text>
                {activeDistIdx < DISTANCE_OPTIONS.length - 1 && (
                  <TouchableOpacity
                    style={styles.expandRadiusBtn}
                    onPress={() => setMaxDistance(DISTANCE_OPTIONS[activeDistIdx + 1].km)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.expandRadiusBtnText}>
                      {DISTANCE_OPTIONS[activeDistIdx + 1].icon}{' '}
                      {t('booking_request.expand_radius')} → {DISTANCE_OPTIONS[activeDistIdx + 1].km} km
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Vue carte */}
            {viewMode === 'map' && pros.length > 0 && (
              <View style={styles.mapContainer}>
                {isExpoGo || !Mapbox ? (
                  <RNMapView
                    style={styles.map}
                    initialRegion={{
                      latitude: addressLat,
                      longitude: addressLng,
                      latitudeDelta: 0.15,
                      longitudeDelta: 0.15,
                    }}
                  >
                    <Marker coordinate={{ latitude: addressLat, longitude: addressLng }} pinColor={colors.primary} />
                    {pros.map((pro: any) => pro.lat && pro.lng ? (
                      <Marker
                        key={pro.id}
                        coordinate={{ latitude: pro.lat, longitude: pro.lng }}
                        pinColor={selectedProId === pro.id ? colors.secondary : colors.proGreen}
                        title={`${pro.user?.firstName} ${pro.user?.lastName}`}
                        description={`⭐ ${(pro.averageRating ?? 0).toFixed(1)}`}
                        onPress={() => setSelectedProId(pro.id)}
                      />
                    ) : null)}
                  </RNMapView>
                ) : (
                  <Mapbox.MapView style={styles.map}>
                    <Mapbox.Camera centerCoordinate={[addressLng, addressLat]} zoomLevel={12} />
                    <Mapbox.PointAnnotation id="client" coordinate={[addressLng, addressLat]}>
                      <View style={styles.clientMarker} />
                      <Mapbox.Callout title={t('booking_request.address_label')} />
                    </Mapbox.PointAnnotation>
                    {pros.map((pro: any) => pro.lat && pro.lng ? (
                      <Mapbox.PointAnnotation
                        key={pro.id}
                        id={pro.id}
                        coordinate={[pro.lng, pro.lat]}
                        onSelected={() => setSelectedProId(pro.id)}
                      >
                        <View style={[styles.proMarker, selectedProId === pro.id && styles.proMarkerSelected]} />
                        <Mapbox.Callout title={`${pro.user?.firstName} ${pro.user?.lastName}`} />
                      </Mapbox.PointAnnotation>
                    ) : null)}
                  </Mapbox.MapView>
                )}
              </View>
            )}

            {/* Vue liste */}
            {viewMode === 'list' && pros.length > 0 && (
              <View style={styles.proList}>
                {pros.map((pro: any) => (
                  <ProCard
                    key={pro.id}
                    pro={pro}
                    selected={selectedProId === pro.id}
                    onSelect={() => setSelectedProId(pro.id === selectedProId ? null : pro.id)}
                    t={t}
                  />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button mode="outlined" onPress={() => navigation.goBack()} style={styles.backBtn}>
          {t('booking_request.back')}
        </Button>
        <Button
          mode="contained"
          onPress={handleNext}
          disabled={!canGoNext}
          style={[styles.nextBtn, !canGoNext && styles.nextBtnDisabled]}
          labelStyle={styles.nextBtnLabel}
        >
          {t('booking_request.next')}
        </Button>
      </View>
    </View>
  );
};

const ProCard = ({ pro, selected, onSelect, t }: any) => (
  <Card style={[styles.proCard, selected && styles.proCardSelected]} onPress={onSelect}>
    <Card.Content style={styles.proCardContent}>
      <Avatar.Image
        size={48}
        source={{ uri: pro.user?.profilePicture ?? 'https://via.placeholder.com/48' }}
        style={styles.proAvatar}
      />
      <View style={styles.proInfo}>
        <Text style={styles.proName}>{pro.user?.firstName} {pro.user?.lastName}</Text>
        <View style={styles.proMeta}>
          <Text style={styles.proRating}>⭐ {(pro.averageRating ?? 0).toFixed(1)}</Text>
          {pro.distanceKm != null && (
            <Text style={styles.proDistance}> · {pro.distanceKm.toFixed(1)} km</Text>
          )}
          {pro.isStudyltizemeGraduate && (
            <Text style={styles.proBadge}> · ✦</Text>
          )}
        </View>
        {pro.serviceOfferings?.[0] && (
          <Text style={styles.proPriceRange}>
            {pro.serviceOfferings[0].priceMin}–{pro.serviceOfferings[0].priceMax}
          </Text>
        )}
      </View>
      {selected && <View style={styles.selectedCheck}><Text style={styles.selectedCheckText}>✓</Text></View>}
    </Card.Content>
  </Card>
);

const TRACK_H = 4;
const DOT_SIZE = 18;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: 100 },
  stepLabel: { fontSize: 12, color: colors.gray, marginBottom: spacing.md },
  sectionLabel: { fontSize: 14, fontWeight: '600', color: colors.dark, marginBottom: spacing.sm },
  modeRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },

  // ── Radius redesign ──
  radiusSection: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  radiusTitle: { fontSize: 13, fontWeight: '600', color: colors.dark, marginBottom: 24 },
  trackWrapper: {
    height: DOT_SIZE,
    marginHorizontal: DOT_SIZE / 2,
    justifyContent: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  trackBg: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: TRACK_H,
    backgroundColor: colors.lightGray,
    borderRadius: TRACK_H / 2,
  },
  trackFill: {
    position: 'absolute',
    left: 0,
    height: TRACK_H,
    backgroundColor: colors.primary,
    borderRadius: TRACK_H / 2,
  },
  stop: {
    position: 'absolute',
    width: DOT_SIZE,
    height: DOT_SIZE,
    marginLeft: -(DOT_SIZE / 2),
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopDot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: colors.lightGray,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopDotActive: {
    backgroundColor: colors.primary + '40',
    borderColor: colors.primary,
  },
  stopDotSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    width: DOT_SIZE + 4,
    height: DOT_SIZE + 4,
    borderRadius: (DOT_SIZE + 4) / 2,
  },
  stopDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.white,
  },
  radiusLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  radiusLabelItem: { alignItems: 'center', flex: 1 },
  radiusIcon: { fontSize: 16, marginBottom: 2 },
  radiusKm: { fontSize: 11, color: colors.gray, fontWeight: '500' },
  radiusKmActive: { color: colors.primary, fontWeight: '700' },

  // ── View toggle ──
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: colors.lightGray,
    borderRadius: 10,
    padding: 3,
    marginBottom: spacing.md,
    gap: 3,
  },
  viewBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewBtnActive: {
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  viewBtnText: { fontSize: 13, color: colors.gray, fontWeight: '500' },
  viewBtnTextActive: { color: colors.dark, fontWeight: '600' },

  loadingBox: { alignItems: 'center', padding: spacing.xl, gap: 8 },
  loadingText: { fontSize: 13, color: colors.gray },

  emptyBox: { alignItems: 'center', padding: spacing.xl, gap: spacing.sm },
  emptyIcon: { fontSize: 40, marginBottom: 4 },
  emptyText: { fontSize: 15, fontWeight: '600', color: colors.dark },
  emptyHint: { fontSize: 13, color: colors.gray, textAlign: 'center' },
  expandRadiusBtn: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary + '15',
    borderRadius: 10,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  expandRadiusBtnText: { fontSize: 14, color: colors.primary, fontWeight: '600' },

  mapContainer: { height: height * 0.4, borderRadius: 12, overflow: 'hidden', marginBottom: spacing.md },
  map: { flex: 1 },
  clientMarker: { width: 16, height: 16, borderRadius: 8, backgroundColor: colors.primary, borderWidth: 2, borderColor: colors.white },
  proMarker: { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.proGreen, borderWidth: 2, borderColor: colors.white },
  proMarkerSelected: { backgroundColor: colors.secondary, width: 18, height: 18, borderRadius: 9 },

  proList: { gap: spacing.sm },
  proCard: { borderRadius: 12, borderWidth: 2, borderColor: 'transparent', elevation: 1 },
  proCardSelected: { borderColor: colors.primary },
  proCardContent: { flexDirection: 'row', alignItems: 'center' },
  proAvatar: { marginRight: spacing.sm },
  proInfo: { flex: 1 },
  proName: { fontSize: 15, fontWeight: '600', color: colors.dark },
  proMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 2, flexWrap: 'wrap' },
  proRating: { fontSize: 13, color: colors.gray },
  proDistance: { fontSize: 13, color: colors.gray },
  proBadge: { fontSize: 13, color: '#F59E0B' },
  proPriceRange: { fontSize: 12, color: colors.primary, marginTop: 2 },
  selectedCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedCheckText: { fontSize: 16, color: colors.white, fontWeight: '700' },

  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', gap: spacing.sm, padding: spacing.md, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border },
  backBtn: { flex: 1, borderColor: colors.primary },
  nextBtn: { flex: 2, backgroundColor: colors.primary, borderRadius: 8 },
  nextBtnDisabled: { backgroundColor: colors.gray },
  nextBtnLabel: { fontSize: 16, paddingVertical: 4 },
});
