import React, { useState, useLayoutEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Dimensions,
} from 'react-native';
import { Text, Button, Card, Avatar, Chip, ActivityIndicator } from 'react-native-paper';
import { StackScreenProps } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import Constants from 'expo-constants';
import RNMapView, { Marker } from 'react-native-maps';
import { HomeStackParamList } from '../../navigation/types';
import { BookingStep4Data, AssignmentType } from '../../types/booking';
import { ModePickerCard } from '../../components/shared/ModePickerCard';
import { useSearchProsQuery } from '../../store/api/prosApi';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

type Props = StackScreenProps<HomeStackParamList, 'BookingRequestStep4'>;

const isExpoGo = Constants.appOwnership === 'expo';
const Mapbox = isExpoGo ? null : require('@rnmapbox/maps').default;

const { height } = Dimensions.get('window');

export const BookingRequestStep4Screen = ({ route, navigation }: Props) => {
  const { t } = useTranslation();
  const { categorySlug, step1Data, step2Data, step3Data } = route.params;

  useLayoutEffect(() => {
    navigation.setOptions({ title: t('booking_request.step_of', { current: 4, total: 5 }) });
  }, []);

  const [assignMode, setAssignMode] = useState<AssignmentType>('auto');
  const [selectedProId, setSelectedProId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  const addressLat = step2Data.address.lat;
  const addressLng = step2Data.address.lng;

  const { data: prosData, isLoading } = useSearchProsQuery(
    {
      category: categorySlug,
      userLat: addressLat,
      userLng: addressLng,
      maxDistance: 20,
      availableOnly: true,
      limit: 20,
    },
    { skip: assignMode !== 'manual' },
  );

  const pros = prosData?.pros ?? [];

  const handleNext = () => {
    const selectedPro = pros.find((p: any) => p.id === selectedProId);
    const step4Data: BookingStep4Data = {
      assignmentType: assignMode,
      proId: assignMode === 'manual' ? selectedProId ?? undefined : undefined,
      proName: selectedPro
        ? `${selectedPro.user.firstName} ${selectedPro.user.lastName}`
        : undefined,
      serviceOfferingId: selectedPro?.serviceOfferings?.[0]?.id,
      estimatedPrice: selectedPro?.serviceOfferings?.[0]?.priceMin,
    };
    navigation.navigate('BookingRequestStep5', { categorySlug, step1Data, step2Data, step3Data, step4Data });
  };

  const canGoNext = assignMode === 'auto' || (assignMode === 'manual' && !!selectedProId);

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
            {/* Toggle liste/carte */}
            <View style={styles.viewToggle}>
              <Chip
                selected={viewMode === 'list'}
                onPress={() => setViewMode('list')}
                style={[styles.toggleChip, viewMode === 'list' && styles.toggleChipSelected]}
                textStyle={viewMode === 'list' ? styles.toggleChipTextSelected : undefined}
              >
                {t('booking_request.view_list')}
              </Chip>
              <Chip
                selected={viewMode === 'map'}
                onPress={() => setViewMode('map')}
                style={[styles.toggleChip, viewMode === 'map' && styles.toggleChipSelected]}
                textStyle={viewMode === 'map' ? styles.toggleChipTextSelected : undefined}
              >
                {t('booking_request.view_map')}
              </Chip>
            </View>

            {isLoading && (
              <View style={styles.loadingBox}>
                <ActivityIndicator color={colors.primary} />
              </View>
            )}

            {!isLoading && pros.length === 0 && (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>{t('booking_request.no_pros_found')}</Text>
                <Text style={styles.emptyHint}>{t('booking_request.no_pros_hint')}</Text>
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
                    {/* Marqueur adresse client */}
                    <Marker coordinate={{ latitude: addressLat, longitude: addressLng }} pinColor={colors.primary} />
                    {/* Marqueurs pros */}
                    {pros.map((pro: any) => pro.lat && pro.lng ? (
                      <Marker
                        key={pro.id}
                        coordinate={{ latitude: pro.lat, longitude: pro.lng }}
                        pinColor={selectedProId === pro.id ? colors.secondary : colors.proGreen}
                        title={`${pro.user.firstName} ${pro.user.lastName}`}
                        description={`⭐ ${(pro.averageRating ?? 0).toFixed(1)}`}
                        onPress={() => setSelectedProId(pro.id)}
                      />
                    ) : null)}
                  </RNMapView>
                ) : (
                  <Mapbox.MapView style={styles.map}>
                    <Mapbox.Camera
                      centerCoordinate={[addressLng, addressLat]}
                      zoomLevel={12}
                    />
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
                        <View style={[
                          styles.proMarker,
                          selectedProId === pro.id && styles.proMarkerSelected,
                        ]} />
                        <Mapbox.Callout title={`${pro.user.firstName} ${pro.user.lastName}`} />
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
        source={{ uri: pro.user.profilePicture ?? 'https://via.placeholder.com/48' }}
        style={styles.proAvatar}
      />
      <View style={styles.proInfo}>
        <Text style={styles.proName}>{pro.user.firstName} {pro.user.lastName}</Text>
        <View style={styles.proMeta}>
          <Text style={styles.proRating}>⭐ {(pro.averageRating ?? 0).toFixed(1)}</Text>
          {pro.distanceKm != null && (
            <Text style={styles.proDistance}> · {pro.distanceKm.toFixed(1)} km</Text>
          )}
        </View>
        {pro.serviceOfferings?.[0] && (
          <Text style={styles.proPriceRange}>
            {pro.serviceOfferings[0].priceMin}–{pro.serviceOfferings[0].priceMax}
          </Text>
        )}
      </View>
      {selected && <Text style={styles.selectedBadge}>✓</Text>}
    </Card.Content>
  </Card>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: 100 },
  stepLabel: { fontSize: 12, color: colors.gray, marginBottom: spacing.md },
  sectionLabel: { fontSize: 14, fontWeight: '600', color: colors.dark, marginBottom: spacing.sm },
  modeRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  viewToggle: { flexDirection: 'row', gap: 8, marginBottom: spacing.md },
  toggleChip: { backgroundColor: colors.lightGray },
  toggleChipSelected: { backgroundColor: colors.primary },
  toggleChipTextSelected: { color: colors.white },
  loadingBox: { alignItems: 'center', padding: spacing.xl },
  emptyBox: { alignItems: 'center', padding: spacing.xl },
  emptyText: { fontSize: 15, fontWeight: '600', color: colors.dark, marginBottom: 4 },
  emptyHint: { fontSize: 13, color: colors.gray, textAlign: 'center' },
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
  proMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  proRating: { fontSize: 13, color: colors.gray },
  proDistance: { fontSize: 13, color: colors.gray },
  proPriceRange: { fontSize: 12, color: colors.primary, marginTop: 2 },
  selectedBadge: { fontSize: 20, color: colors.primary },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', gap: spacing.sm, padding: spacing.md, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border },
  backBtn: { flex: 1, borderColor: colors.primary },
  nextBtn: { flex: 2, backgroundColor: colors.primary, borderRadius: 8 },
  nextBtnDisabled: { backgroundColor: colors.gray },
  nextBtnLabel: { fontSize: 16, paddingVertical: 4 },
});
