import React, { useState, useMemo, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Switch,
  TextInput,
  ScrollView,
} from 'react-native';
import { Text, Card, Chip, ActivityIndicator, FAB } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { StackScreenProps } from '@react-navigation/stack';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { formatCurrency } from '../../config/currency';
import { DriverStackParamList } from '../../navigation/types';
import {
  useGetMyDeliveriesQuery,
  useGetAvailableRequestsQuery,
  useUpdateDriverAvailabilityMutation,
} from '../../store/api/transportApi';
import { useRefetchOnFocus } from '../../hooks/useRefetchOnFocus';
import { useBeatSound } from '../../hooks/useBeatSound';
import { TransportRequest, STATUS_COLORS, TransportStatus } from '../../types/transport';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';

type Props = StackScreenProps<DriverStackParamList, 'DriverHome'>;
type TemporalFilter = 'all' | 'today' | 'upcoming' | 'history';
type DateMode = 'range' | 'single';

const toDay = (d: string) => d ? new Date(d).toLocaleDateString('en-CA') : '';

export const DriverHomeScreen = ({ navigation }: Props) => {
  const { t, i18n } = useTranslation();
  const { data: deliveries, isLoading, isFetching, refetch } = useGetMyDeliveriesQuery(undefined, {
    pollingInterval: 8000,
    refetchOnMountOrArgChange: true,
  });
  const { data: availableRequests = [], refetch: refetchAvailable } = useGetAvailableRequestsQuery(undefined, {
    pollingInterval: 8000,
    refetchOnMountOrArgChange: true,
  });
  // Délai 450 ms pour laisser la transition de navigation se terminer avant
  // de déclencher des re-renders (évite le clignotement au retour arrière).
  useRefetchOnFocus(refetch, 450);
  useRefetchOnFocus(refetchAvailable, 450);
  const [updateAvailability] = useUpdateDriverAvailabilityMutation();
  const driverProfile = useSelector((state: any) => state.auth.user?.driver);
  const [isAvailable, setIsAvailable] = useState<boolean>(driverProfile?.isAvailable ?? true);
  const [refreshing, setRefreshing] = useState(false);
  const [temporalFilter, setTemporalFilter] = useState<TemporalFilter>('all');
  const [search, setSearch] = useState('');
  const [dateMode, setDateMode] = useState<DateMode>('range');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [dateSingle, setDateSingle] = useState('');

  // Son percussif synchronisé avec l'animation (600 ms/beat)
  useBeatSound(availableRequests.length > 0);

  // Animation percussive du banner (1 beat ≈ 600 ms, ~100 BPM)
  const bannerScale = useSharedValue(1);
  useEffect(() => {
    if (availableRequests.length > 0) {
      bannerScale.value = withRepeat(
        withSequence(
          withTiming(1.03, { duration: 60, easing: Easing.out(Easing.quad) }),
          withTiming(1, { duration: 540, easing: Easing.in(Easing.quad) }),
        ),
        -1,
        false,
      );
    } else {
      bannerScale.value = 1;
    }
  }, [availableRequests.length, bannerScale]);
  const bannerAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bannerScale.value }],
  }));

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const toggleAvailability = async (value: boolean) => {
    setIsAvailable(value);
    try {
      await updateAvailability({ isAvailable: value }).unwrap();
    } catch (error) {
      console.error('Failed to update availability:', error);
      setIsAvailable(!value);
    }
  };

  const formatDate = (isoDate: string): string => {
    return new Date(isoDate).toLocaleDateString(i18n.language, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const todayStr = new Date().toLocaleDateString('en-CA');

  const globalStats = useMemo(() => {
    const all = deliveries || [];
    return {
      active: all.filter((d: TransportRequest) => d.status !== 'completed' && d.status !== 'cancelled' && d.status !== 'pending').length,
      pending: all.filter((d: TransportRequest) => d.status === 'pending').length,
      completed: all.filter((d: TransportRequest) => d.status === 'completed' || d.status === 'cancelled').length,
    };
  }, [deliveries]);

  const temporalCounts = useMemo(() => {
    const all = deliveries || [];
    return {
      all: all.length,
      today: all.filter((d: TransportRequest) => toDay(d.scheduledDate) === todayStr).length,
      upcoming: all.filter((d: TransportRequest) => toDay(d.scheduledDate) > todayStr && d.status !== 'completed' && d.status !== 'cancelled').length,
      history: all.filter((d: TransportRequest) => d.status === 'completed' || d.status === 'cancelled').length,
    };
  }, [deliveries, todayStr]);

  const filteredDeliveries = useMemo(() => {
    let result = [...(deliveries || [])];

    if (temporalFilter !== 'all') {
      result = result.filter((d: TransportRequest) => {
        const day = toDay(d.scheduledDate);
        switch (temporalFilter) {
          case 'today': return day === todayStr;
          case 'upcoming': return day > todayStr && d.status !== 'completed' && d.status !== 'cancelled';
          case 'history': return d.status === 'completed' || d.status === 'cancelled';
          default: return true;
        }
      });
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((d: TransportRequest) => {
        const client = (d as any).client;
        return (
          d.pickup?.address?.toLowerCase().includes(q) ||
          d.delivery?.address?.toLowerCase().includes(q) ||
          client?.firstName?.toLowerCase().includes(q) ||
          client?.lastName?.toLowerCase().includes(q) ||
          client?.phone?.includes(q)
        );
      });
    }

    const filterStart = dateMode === 'single' ? dateSingle : dateStart;
    const filterEnd = dateMode === 'single' ? dateSingle : dateEnd;
    if (filterStart) result = result.filter((d: TransportRequest) => toDay(d.scheduledDate) >= filterStart);
    if (filterEnd) result = result.filter((d: TransportRequest) => toDay(d.scheduledDate) <= filterEnd);

    return result;
  }, [deliveries, temporalFilter, search, dateMode, dateStart, dateEnd, dateSingle, todayStr]);

  const clearDates = () => { setDateStart(''); setDateEnd(''); setDateSingle(''); };
  const hasDateFilter = dateMode === 'single' ? !!dateSingle : !!(dateStart || dateEnd);
  const activeFiltersCount = (temporalFilter !== 'all' ? 1 : 0) + (search ? 1 : 0) + (hasDateFilter ? 1 : 0);

  const [statsOpen, setStatsOpen] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(true);

  const TABS: { key: TemporalFilter; label: string }[] = [
    { key: 'all', label: `${t('common.all')} (${temporalCounts.all})` },
    { key: 'today', label: `${t('common.today')} (${temporalCounts.today})` },
    { key: 'upcoming', label: `${t('common.upcoming')} (${temporalCounts.upcoming})` },
    { key: 'history', label: `${t('common.history')} (${temporalCounts.history})` },
  ];

  const renderDelivery = ({ item }: { item: TransportRequest }) => {
    const statusColor = STATUS_COLORS[item.status as TransportStatus];
    const isActive = item.status !== 'completed' && item.status !== 'cancelled' && item.status !== 'pending';
    const isNavigating = item.status === 'heading_to_pickup' || item.status === 'in_transit';

    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('DriverTransportDetails', { requestId: item.id })}
      >
        <Card style={[styles.deliveryCard, isActive && styles.activeCard]}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Text variant="titleMedium" style={styles.deliveryTitle}>
                {t('driver.delivery_title', { id: item.id.slice(0, 8) })}
              </Text>
              <Chip
                mode="flat"
                textStyle={{ fontSize: 12, lineHeight: 16, color: colors.white }}
                style={[styles.statusChip, { backgroundColor: statusColor }]}
              >
                {t('status.' + item.status)}
              </Chip>
            </View>

            <View style={styles.locationSection}>
              <View style={styles.locationRow}>
                <Icon name="map-marker" size={20} color={colors.primary} />
                <View style={styles.locationText}>
                  <Text variant="bodySmall" style={styles.locationLabel}>{t('driver.loading_point_label')}</Text>
                  <Text variant="bodyMedium" numberOfLines={1}>{item.pickup.address}</Text>
                </View>
              </View>
              <View style={styles.routeLine} />
              <View style={styles.locationRow}>
                <Icon name="map-marker-check" size={20} color={colors.success} />
                <View style={styles.locationText}>
                  <Text variant="bodySmall" style={styles.locationLabel}>{t('driver.delivery_point_label')}</Text>
                  <Text variant="bodyMedium" numberOfLines={1}>{item.delivery.address}</Text>
                </View>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Icon name="calendar" size={16} color={colors.gray} />
                <Text variant="bodySmall" style={styles.infoText}>{formatDate(item.scheduledDate)}</Text>
              </View>
              <View style={styles.infoItem}>
                <Icon name="cash" size={16} color={colors.gray} />
                <Text variant="bodySmall" style={styles.infoText}>
                  {(item as any).payment?.proNetAmount
                    ? formatCurrency((item as any).payment.proNetAmount)
                    : formatCurrency(item.price || 0)}
                  {(item as any).payment?.proNetAmount ? ` (${t('driver.net')})` : ''}
                </Text>
              </View>
            </View>

            {isNavigating && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => navigation.navigate('DriverNavigation', { requestId: item.id })}
              >
                <Icon name="navigation" size={20} color={colors.white} />
                <Text variant="labelLarge" style={styles.actionButtonText}>{t('driver.start_navigation')}</Text>
              </TouchableOpacity>
            )}
          </Card.Content>
        </Card>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const renderHeader = () => (
    <>
      {/* Availability Toggle */}
      <View style={styles.availabilityCard}>
        <View style={styles.availabilityContent}>
          <View>
            <Text variant="titleMedium" style={styles.availabilityTitle}>
              {isAvailable ? `✅ ${t('driver.available')}` : `⏸️ ${t('driver.unavailable')}`}
            </Text>
            <Text variant="bodySmall" style={styles.availabilitySubtitle}>
              {isAvailable ? t('driver.available_subtitle') : t('driver.unavailable_subtitle')}
            </Text>
          </View>
          <Switch
            value={isAvailable}
            onValueChange={toggleAvailability}
            trackColor={{ false: colors.gray, true: colors.primary }}
            thumbColor={colors.white}
          />
        </View>
      </View>

      {/* Bannière demandes disponibles */}
      {availableRequests.length > 0 && (
        <Animated.View style={bannerAnimStyle}>
          <TouchableOpacity
            style={styles.availableBanner}
            onPress={() => navigation.navigate('DriverAvailableRequests')}
            activeOpacity={0.85}
          >
            <View style={styles.availableBannerLeft}>
              <Icon name="bell-ring" size={22} color="#FFFFFF" />
              <View>
                <Text style={styles.availableBannerTitle}>
                  {t('driver.new_requests_available', { count: availableRequests.length })}
                </Text>
                <Text style={styles.availableBannerSub}>{t('driver.tap_to_see_requests')}</Text>
              </View>
            </View>
            <Icon name="chevron-right" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Global Stats — déroulable */}
      <View style={styles.collapsibleCard}>
        <TouchableOpacity style={styles.sectionHeader} onPress={() => setStatsOpen(o => !o)} activeOpacity={0.7}>
          <Text style={styles.sectionHeaderText}>{t('driver.stats')}</Text>
          <Text style={styles.chevron}>{statsOpen ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        {statsOpen && (
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text variant="headlineMedium" style={styles.statNumber}>{globalStats.active}</Text>
              <Text variant="bodySmall" style={styles.statLabel}>{t('driver.stats_active')}</Text>
            </View>
            <View style={styles.statCard}>
              <Text variant="headlineMedium" style={styles.statNumber}>{globalStats.pending}</Text>
              <Text variant="bodySmall" style={styles.statLabel}>{t('driver.stats_pending_count')}</Text>
            </View>
            <View style={styles.statCard}>
              <Text variant="headlineMedium" style={styles.statNumber}>{globalStats.completed}</Text>
              <Text variant="bodySmall" style={styles.statLabel}>{t('driver.stats_done')}</Text>
            </View>
          </View>
        )}
      </View>

      {/* Filters — déroulable */}
      <View style={styles.filtersContainer}>
        <TouchableOpacity style={styles.sectionHeader} onPress={() => setFiltersOpen(o => !o)} activeOpacity={0.7}>
          <Text style={styles.sectionHeaderText}>
            {t('common.filters')}
            {activeFiltersCount > 0 ? ` · ${activeFiltersCount} actif${activeFiltersCount > 1 ? 's' : ''}` : ''}
          </Text>
          <Text style={styles.chevron}>{filtersOpen ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {filtersOpen && (
          <View>
            {/* Search */}
            <View style={styles.searchRow}>
              <TextInput
                style={styles.searchInput}
                value={search}
                onChangeText={setSearch}
                placeholder={t('driver.search_placeholder')}
                placeholderTextColor={colors.gray}
                returnKeyType="search"
              />
              {!!search && (
                <TouchableOpacity onPress={() => setSearch('')} style={styles.searchClear}>
                  <Text style={styles.clearBtn}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Temporal tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
              {TABS.map(tab => (
                <TouchableOpacity
                  key={tab.key}
                  onPress={() => setTemporalFilter(tab.key)}
                  style={[styles.tab, temporalFilter === tab.key && styles.tabActive]}
                >
                  <Text style={[styles.tabText, temporalFilter === tab.key && styles.tabTextActive]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Date mode toggle */}
            <View style={styles.dateModeRow}>
              <TouchableOpacity
                onPress={() => { setDateMode('range'); clearDates(); }}
                style={[styles.dateModeBtn, dateMode === 'range' && styles.dateModeBtnActive]}
              >
                <Text style={[styles.dateModeBtnText, dateMode === 'range' && styles.dateModeBtnTextActive]}>{t('common.period')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { setDateMode('single'); clearDates(); }}
                style={[styles.dateModeBtn, dateMode === 'single' && styles.dateModeBtnActive]}
              >
                <Text style={[styles.dateModeBtnText, dateMode === 'single' && styles.dateModeBtnTextActive]}>{t('common.single_date')}</Text>
              </TouchableOpacity>
            </View>

            {/* Date inputs */}
            <View style={styles.dateRangeRow}>
              {dateMode === 'single' ? (
                <TextInput
                  style={[styles.dateInput, { flex: 1 }]}
                  value={dateSingle}
                  onChangeText={setDateSingle}
                  placeholder="AAAA-MM-JJ"
                  placeholderTextColor={colors.gray}
                  keyboardType="numeric"
                  maxLength={10}
                />
              ) : (
                <View style={styles.dateRangeInner}>
                  <Text style={styles.dateLabel}>{t('common.from')}</Text>
                  <TextInput
                    style={styles.dateInput}
                    value={dateStart}
                    onChangeText={setDateStart}
                    placeholder={t('common.date_placeholder')}
                    placeholderTextColor={colors.gray}
                    keyboardType="numeric"
                    maxLength={10}
                  />
                  <Text style={styles.dateLabel}>{t('common.to')}</Text>
                  <TextInput
                    style={styles.dateInput}
                    value={dateEnd}
                    onChangeText={setDateEnd}
                    placeholder={t('common.date_placeholder')}
                    placeholderTextColor={colors.gray}
                    keyboardType="numeric"
                    maxLength={10}
                  />
                </View>
              )}
              {hasDateFilter && (
                <TouchableOpacity onPress={clearDates}>
                  <Text style={styles.clearBtn}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            <Text style={styles.countText}>
              {t('driver.deliveries_count', { count: filteredDeliveries.length })}
              {filteredDeliveries.length !== (deliveries || []).length ? ` / ${(deliveries || []).length}` : ''}
            </Text>
          </View>
        )}
      </View>
    </>
  );

  return (
    <View style={styles.container}>
      {/* Header hors FlatList — appelé comme fonction pour éviter la perte de focus */}
      {renderHeader()}
      <FlatList
        data={filteredDeliveries}
        renderItem={renderDelivery}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="truck-fast-outline" size={80} color={colors.gray} />
            <Text variant="titleMedium" style={styles.emptyText}>{t('driver.no_deliveries')}</Text>
            <Text variant="bodyMedium" style={styles.emptySubtext}>
              {t('driver.no_deliveries_hint')}
            </Text>
          </View>
        }
      />

      <FAB
        icon="cash-multiple"
        style={styles.fab}
        onPress={() => navigation.navigate('DriverEarnings')}
        label={t('driver.earnings_title')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  availabilityCard: {
    backgroundColor: colors.white,
    padding: spacing.md,
    margin: spacing.md,
    borderRadius: 12,
    elevation: 2,
  },
  availabilityContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  availabilityTitle: { fontWeight: 'bold', marginBottom: spacing.xs },
  availabilitySubtitle: { color: colors.gray },
  statsContainer: { flexDirection: 'row', paddingHorizontal: spacing.md, marginBottom: spacing.md, gap: spacing.sm },
  statCard: { flex: 1, backgroundColor: colors.white, padding: spacing.md, borderRadius: 12, alignItems: 'center', elevation: 2 },
  statNumber: { fontWeight: 'bold', color: colors.primary },
  statLabel: { color: colors.gray, marginTop: spacing.xs },
  collapsibleCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    elevation: 1,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  sectionHeaderText: { fontSize: 14, fontWeight: '600', color: colors.dark },
  chevron: { fontSize: 12, color: colors.gray },
  filtersContainer: {
    backgroundColor: colors.white,
    borderRadius: 12,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    elevation: 1,
    overflow: 'hidden',
  },
  dateRangeInner: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.lightGray,
    paddingHorizontal: spacing.sm,
  },
  searchInput: { flex: 1, paddingVertical: 9, fontSize: 14, color: colors.dark },
  searchClear: { padding: spacing.xs },
  tabsRow: { paddingHorizontal: spacing.md, paddingTop: spacing.xs, paddingBottom: spacing.xs, gap: spacing.xs },
  tab: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: 20, backgroundColor: colors.lightGray, marginRight: spacing.xs },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 13, color: colors.gray, fontWeight: '500' },
  tabTextActive: { color: colors.white, fontWeight: '600' },
  dateModeRow: { flexDirection: 'row', paddingHorizontal: spacing.md, paddingTop: spacing.xs, gap: spacing.xs },
  dateModeBtn: { paddingHorizontal: spacing.md, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.lightGray },
  dateModeBtnActive: { backgroundColor: `${colors.primary}20`, borderColor: colors.primary },
  dateModeBtnText: { fontSize: 12, color: colors.gray },
  dateModeBtnTextActive: { color: colors.primary, fontWeight: '600' },
  dateRangeRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingTop: spacing.xs, gap: spacing.xs },
  dateLabel: { fontSize: 13, color: colors.gray },
  dateInput: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: spacing.sm, paddingVertical: 6, fontSize: 13, color: colors.dark, backgroundColor: colors.lightGray },
  clearBtn: { fontSize: 16, color: colors.gray, paddingHorizontal: spacing.xs },
  countText: { fontSize: 12, color: colors.gray, paddingHorizontal: spacing.md, paddingTop: spacing.xs },
  listContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl * 2 },
  deliveryCard: { marginBottom: spacing.md, backgroundColor: colors.white, elevation: 2 },
  activeCard: { borderLeftWidth: 4, borderLeftColor: colors.primary },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  deliveryTitle: { fontWeight: 'bold' },
  statusChip: {},
  locationSection: { marginBottom: spacing.md },
  locationRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  locationText: { flex: 1 },
  locationLabel: { color: colors.gray, marginBottom: 2 },
  routeLine: { width: 2, height: 20, backgroundColor: colors.border, marginLeft: 9, marginVertical: spacing.xs },
  infoRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  infoText: { color: colors.gray },
  clientRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm },
  clientText: { fontSize: 13, color: colors.gray, flex: 1 },
  actionButton: { backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: spacing.sm, borderRadius: 8, gap: spacing.xs, marginTop: spacing.sm },
  actionButtonText: { color: colors.white, fontWeight: 'bold' },
  emptyContainer: { alignItems: 'center', paddingTop: spacing.xl * 2, paddingHorizontal: spacing.xl },
  emptyText: { marginTop: spacing.md, fontWeight: 'bold' },
  emptySubtext: { marginTop: spacing.xs, color: colors.gray, textAlign: 'center' },
  fab: { position: 'absolute', bottom: spacing.md, right: spacing.md, backgroundColor: colors.success },

  availableBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: 12,
    padding: spacing.md,
    elevation: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  availableBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  availableBannerTitle: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  availableBannerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },
});
