import React, { useState, useMemo } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, ActivityIndicator, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { Card, Text, Chip } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { formatCurrency } from '../../config/currency';
import { useGetMyTransportRequestsQuery, useGetMyDeliveriesQuery } from '../../store/api/transportApi';
import { useRefetchOnFocus } from '../../hooks/useRefetchOnFocus';
import { STATUS_COLORS, TransportStatus } from '../../types/transport';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';

const STATUS_COLORS_MAP: Record<string, string> = {
  pending: '#F39C12',
  accepted: '#3498DB',
  heading_to_pickup: '#5B21B6',
  arrived_at_pickup: '#9333EA',
  loading: '#F97316',
  in_transit: '#06B6D4',
  arrived_at_delivery: '#8B5CF6',
  unloading: '#EC4899',
  completed: colors.success,
  cancelled: colors.error,
};

type PeriodFilter = 'all' | 'week' | 'month';
type DateMode = 'range' | 'single';

const toDay = (d: string) => d?.split('T')[0] ?? '';

export const HistoryScreen = () => {
  const { t, i18n } = useTranslation();
  const isDriver = useSelector((state: RootState) => state.auth.isDriver);

  const STATUS_CONFIG = useMemo(() => ({
    pending: { label: t('status.pending'), color: STATUS_COLORS_MAP.pending },
    accepted: { label: t('status.accepted'), color: STATUS_COLORS_MAP.accepted },
    heading_to_pickup: { label: t('status.heading_to_pickup'), color: STATUS_COLORS_MAP.heading_to_pickup },
    arrived_at_pickup: { label: t('status.arrived_at_pickup'), color: STATUS_COLORS_MAP.arrived_at_pickup },
    loading: { label: t('status.loading'), color: STATUS_COLORS_MAP.loading },
    in_transit: { label: t('status.in_transit'), color: STATUS_COLORS_MAP.in_transit },
    arrived_at_delivery: { label: t('status.arrived_at_delivery'), color: STATUS_COLORS_MAP.arrived_at_delivery },
    unloading: { label: t('status.unloading'), color: STATUS_COLORS_MAP.unloading },
    completed: { label: t('status.completed'), color: STATUS_COLORS_MAP.completed },
    cancelled: { label: t('status.cancelled'), color: STATUS_COLORS_MAP.cancelled },
  }), [t]);

  const POLL_OPTS = { pollingInterval: 8000, refetchOnMountOrArgChange: true as const };
  const { data: transports, isLoading, isFetching, refetch } = isDriver
    ? useGetMyDeliveriesQuery(undefined, POLL_OPTS)
    : useGetMyTransportRequestsQuery(undefined, POLL_OPTS);
  useRefetchOnFocus(refetch);

  const [refreshing, setRefreshing] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  const [dateMode, setDateMode] = useState<DateMode>('range');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [dateSingle, setDateSingle] = useState('');

  const clearDates = () => { setDateStart(''); setDateEnd(''); setDateSingle(''); };
  const hasDateFilter = dateMode === 'single' ? !!dateSingle : !!(dateStart || dateEnd);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const todayStr = new Date().toLocaleDateString('en-CA');

  const getWeekRange = () => {
    const now = new Date();
    const day = now.getDay();
    const diffToMon = day === 0 ? -6 : 1 - day;
    const mon = new Date(now); mon.setDate(now.getDate() + diffToMon);
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
    return { start: mon.toLocaleDateString('en-CA'), end: sun.toLocaleDateString('en-CA') };
  };

  const thisMonthPrefix = todayStr.slice(0, 7);

  // All completed/cancelled
  const baseItems = useMemo(() =>
    (transports || []).filter((item: any) => item.status === 'completed' || item.status === 'cancelled'),
    [transports]
  );

  const periodCounts = useMemo(() => {
    const week = getWeekRange();
    const getDate = (item: any) => toDay(item.completedAt || item.updatedAt || item.createdAt);
    return {
      all: baseItems.length,
      week: baseItems.filter(item => { const d = getDate(item); return d >= week.start && d <= week.end; }).length,
      month: baseItems.filter(item => getDate(item).startsWith(thisMonthPrefix)).length,
    };
  }, [baseItems, thisMonthPrefix]);

  const filteredItems = useMemo(() => {
    const week = getWeekRange();
    const getDate = (item: any) => toDay(item.completedAt || item.updatedAt || item.createdAt);

    let result = [...baseItems];

    if (periodFilter !== 'all') {
      result = result.filter(item => {
        const d = getDate(item);
        if (periodFilter === 'week') return d >= week.start && d <= week.end;
        if (periodFilter === 'month') return d.startsWith(thisMonthPrefix);
        return true;
      });
    }

    const filterStart = dateMode === 'single' ? dateSingle : dateStart;
    const filterEnd = dateMode === 'single' ? dateSingle : dateEnd;
    if (filterStart) result = result.filter(item => getDate(item) >= filterStart);
    if (filterEnd) result = result.filter(item => getDate(item) <= filterEnd);

    return result;
  }, [baseItems, periodFilter, dateMode, dateStart, dateEnd, dateSingle, thisMonthPrefix]);

  const TABS: { key: PeriodFilter; label: string }[] = [
    { key: 'all', label: `${t('history.all_tab')} (${periodCounts.all})` },
    { key: 'week', label: `${t('history.week_tab')} (${periodCounts.week})` },
    { key: 'month', label: `${t('history.month_tab')} (${periodCounts.month})` },
  ];

  const activeFiltersCount = (periodFilter !== 'all' ? 1 : 0) + (hasDateFilter ? 1 : 0);

  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      {/* Toggle header */}
      <TouchableOpacity style={styles.sectionHeader} onPress={() => setFiltersOpen(o => !o)} activeOpacity={0.7}>
        <Text style={styles.sectionHeaderText}>
          {t('common.filters')}
          {activeFiltersCount > 0 ? ` · ${activeFiltersCount}` : ''}
        </Text>
        <Text style={styles.chevron}>{filtersOpen ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {filtersOpen && (
        <View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
            {TABS.map(tab => (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setPeriodFilter(tab.key)}
                style={[styles.tab, periodFilter === tab.key && styles.tabActive]}
              >
                <Text style={[styles.tabText, periodFilter === tab.key && styles.tabTextActive]}>
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

      <View style={styles.dateRangeRow}>
        {dateMode === 'single' ? (
          <TextInput
            style={[styles.dateInput, { flex: 1 }]}
            value={dateSingle}
            onChangeText={setDateSingle}
            placeholder={t('common.date_placeholder')}
            placeholderTextColor={colors.gray}
            keyboardType="numeric"
            maxLength={10}
          />
        ) : (
          <>
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
          </>
        )}
        {hasDateFilter && (
          <TouchableOpacity onPress={clearDates}>
            <Text style={styles.clearBtn}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

          <Text style={styles.countText}>
            {t('history.entries_count', { count: filteredItems.length })}
            {filteredItems.length !== baseItems.length ? ` / ${baseItems.length}` : ''}
          </Text>
        </View>
      )}
    </View>
  );

  const renderItem = ({ item }: any) => {
    const statusConfig = STATUS_CONFIG[item.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;

    return (
      <Card style={styles.card} mode="elevated">
        <Card.Content style={styles.cardContent}>
          <View style={styles.iconContainer}>
            <Icon name="truck-fast" size={24} color={colors.primary} />
          </View>
          <View style={styles.infoContainer}>
            <Text variant="titleMedium" style={styles.title}>
              {t('transport.request_title', { id: item.id.slice(0, 8) })}
            </Text>
            <Text variant="bodySmall" style={styles.date} numberOfLines={1}>
              {item.pickupAddress || t('driver.pickup_address')}
            </Text>
            <Text variant="bodySmall" style={styles.date} numberOfLines={1}>
              → {item.deliveryAddress || t('driver.delivery_address')}
            </Text>
            <Text variant="bodySmall" style={styles.date}>
              {new Date(item.createdAt).toLocaleDateString(i18n.language, {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </Text>
          </View>
          <View style={styles.rightContainer}>
            <Text variant="titleSmall" style={styles.amount}>
              {formatCurrency(item.totalPrice || 0)}
            </Text>
            <Chip
              mode="flat"
              style={[styles.statusChip, { backgroundColor: `${statusConfig.color}20` }]}
              textStyle={{ color: statusConfig.color, fontSize: 11 }}
            >
              {statusConfig.label}
            </Chip>
          </View>
        </Card.Content>
      </Card>
    );
  };

  if (isLoading && !transports) {
    return (
      <View style={[styles.container, styles.centerContainer]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.headerTitle}>
          {t('history.title')}
        </Text>
        <Text variant="bodyMedium" style={styles.headerSubtitle}>
          {isDriver ? t('history.subtitle_driver') : t('history.subtitle_client')}
        </Text>
      </View>

      {/* Filtres hors FlatList pour éviter la perte de focus sur les TextInput */}
      {renderFilters()}
      <FlatList
        data={filteredItems}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="history" size={64} color={colors.gray} />
            <Text variant="titleMedium" style={styles.emptyText}>
              {t('history.empty')}
            </Text>
            <Text variant="bodySmall" style={styles.emptySubtext}>
              {periodFilter !== 'all' || hasDateFilter
                ? t('history.empty_filter')
                : isDriver
                  ? t('history.empty_driver')
                  : t('history.empty_client')}
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light,
  },
  centerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  headerTitle: {
    color: colors.dark,
    fontWeight: '600',
    marginBottom: 4,
  },
  headerSubtitle: {
    color: colors.gray,
  },
  filtersContainer: {
    backgroundColor: colors.white,
    marginBottom: spacing.sm,
    borderRadius: 12,
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
  tabsRow: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    gap: spacing.xs,
  },
  tab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    backgroundColor: colors.lightGray,
    marginRight: spacing.xs,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 13,
    color: colors.gray,
    fontWeight: '500',
  },
  tabTextActive: {
    color: colors.white,
    fontWeight: '600',
  },
  dateModeRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    gap: spacing.xs,
  },
  dateModeBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.lightGray,
  },
  dateModeBtnActive: {
    backgroundColor: `${colors.primary}20`,
    borderColor: colors.primary,
  },
  dateModeBtnText: {
    fontSize: 12,
    color: colors.gray,
  },
  dateModeBtnTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  dateRangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    gap: spacing.xs,
  },
  dateLabel: {
    fontSize: 13,
    color: colors.gray,
  },
  dateInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    fontSize: 13,
    color: colors.dark,
    backgroundColor: colors.lightGray,
  },
  clearBtn: {
    fontSize: 16,
    color: colors.gray,
    paddingHorizontal: spacing.xs,
  },
  countText: {
    fontSize: 12,
    color: colors.gray,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
  list: {
    padding: spacing.md,
  },
  card: {
    marginBottom: spacing.md,
    backgroundColor: colors.white,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${colors.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  infoContainer: {
    flex: 1,
  },
  title: {
    color: colors.dark,
    fontWeight: '600',
    marginBottom: 4,
  },
  date: {
    color: colors.gray,
  },
  rightContainer: {
    alignItems: 'flex-end',
    paddingBottom: 4,
  },
  amount: {
    color: colors.dark,
    fontWeight: '600',
    marginBottom: 4,
  },
  statusChip: {},
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  emptyText: {
    color: colors.dark,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    color: colors.gray,
  },
});
