import React, { useState, useMemo } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, RefreshControl, TextInput, ScrollView } from 'react-native';
import { Text, FAB, Card, Chip, ActivityIndicator } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { StackScreenProps } from '@react-navigation/stack';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { useGetMyTransportRequestsQuery } from '../../store/api/transportApi';
import { useRefetchOnFocus } from '../../hooks/useRefetchOnFocus';
import { TransportRequest, STATUS_COLORS, TransportStatus, TransportObjectType } from '../../types/transport';
import { formatCurrency } from '../../config/currency';

type Props = StackScreenProps<any, 'TransportList'>;
type TemporalFilter = 'all' | 'today' | 'upcoming' | 'history';
type DateMode = 'range' | 'single';

const toDay = (d: string) => d ? new Date(d).toLocaleDateString('en-CA') : '';

export const TransportListScreen = ({ navigation }: Props) => {
  const { t, i18n } = useTranslation();
  const { data: requests, isLoading, isFetching, refetch } = useGetMyTransportRequestsQuery(undefined, {
    pollingInterval: 8000,
    refetchOnMountOrArgChange: true,
  });
  useRefetchOnFocus(refetch);
  const [refreshing, setRefreshing] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [temporalFilter, setTemporalFilter] = useState<TemporalFilter>('all');
  const [search, setSearch] = useState('');
  const [dateMode, setDateMode] = useState<DateMode>('range');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [dateSingle, setDateSingle] = useState('');

  const todayStr = new Date().toLocaleDateString('en-CA');

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const formatDate = (isoDate: string): string => {
    return new Date(isoDate).toLocaleDateString(i18n.language, {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  };

  const clearDates = () => { setDateStart(''); setDateEnd(''); setDateSingle(''); };
  const hasDateFilter = dateMode === 'single' ? !!dateSingle : !!(dateStart || dateEnd);

  const temporalCounts = useMemo(() => {
    const all = requests || [];
    return {
      all: all.length,
      today: all.filter(r => toDay(r.scheduledDate) === todayStr).length,
      upcoming: all.filter(r => toDay(r.scheduledDate) > todayStr).length,
      history: all.filter(r => r.status === 'completed' || r.status === 'cancelled').length,
    };
  }, [requests, todayStr]);

  const filteredRequests = useMemo(() => {
    let result = [...(requests || [])];

    if (temporalFilter !== 'all') {
      result = result.filter(r => {
        const d = toDay(r.scheduledDate);
        switch (temporalFilter) {
          case 'today': return d === todayStr;
          case 'upcoming': return d > todayStr;
          case 'history': return r.status === 'completed' || r.status === 'cancelled';
          default: return true;
        }
      });
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(r => {
        const driver = (r as any).driver;
        return (
          r.description?.toLowerCase().includes(q) ||
          r.pickup?.address?.toLowerCase().includes(q) ||
          r.delivery?.address?.toLowerCase().includes(q) ||
          driver?.user?.firstName?.toLowerCase().includes(q) ||
          driver?.user?.lastName?.toLowerCase().includes(q) ||
          driver?.vehiclePlate?.toLowerCase().includes(q)
        );
      });
    }

    const filterStart = dateMode === 'single' ? dateSingle : dateStart;
    const filterEnd = dateMode === 'single' ? dateSingle : dateEnd;
    if (filterStart) result = result.filter(r => toDay(r.scheduledDate) >= filterStart);
    if (filterEnd) result = result.filter(r => toDay(r.scheduledDate) <= filterEnd);

    return result;
  }, [requests, temporalFilter, search, dateMode, dateStart, dateEnd, dateSingle, todayStr]);

  const TABS: { key: TemporalFilter; label: string }[] = [
    { key: 'all', label: `${t('common.all')} (${temporalCounts.all})` },
    { key: 'today', label: `${t('common.today')} (${temporalCounts.today})` },
    { key: 'upcoming', label: `${t('common.upcoming')} (${temporalCounts.upcoming})` },
    { key: 'history', label: `${t('common.history')} (${temporalCounts.history})` },
  ];

  const activeFiltersCount = (temporalFilter !== 'all' ? 1 : 0) + (search ? 1 : 0) + (hasDateFilter ? 1 : 0);

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

          {/* Search */}
          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder={t('transport.search_placeholder')}
              placeholderTextColor={colors.gray}
              returnKeyType="search"
            />
            {!!search && (
              <TouchableOpacity onPress={() => setSearch('')} style={styles.searchClear}>
                <Text style={styles.clearBtn}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

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
                placeholder={t('common.date_placeholder')}
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
            {t('transport.requests_count', { count: filteredRequests.length })}
            {filteredRequests.length !== (requests || []).length ? ` / ${(requests || []).length}` : ''}
          </Text>
        </View>
      )}
    </View>
  );

  const renderRequest = ({ item }: { item: TransportRequest }) => {
    const statusColor = STATUS_COLORS[item.status as TransportStatus];
    return (
      <TouchableOpacity onPress={() => navigation.navigate('TransportDetails', { requestId: item.id })}>
        <Card style={styles.requestCard}>
          <Card.Content>
            <Text variant="labelLarge" style={styles.sectionTitle}>📦 {t('transport.objects_section')}</Text>
            <View style={styles.statusContainer}>
              <Chip mode="flat" textStyle={{ fontSize: 12, lineHeight: 16 }} style={[styles.statusChip, { backgroundColor: statusColor }]}>
                {t('status.' + item.status)}
              </Chip>
            </View>
            <View style={styles.chipsContainer}>
              {(item as any).objectTypes && (item as any).objectTypes.length > 0 ? (
                (item as any).objectTypes.map((type: TransportObjectType, index: number) => (
                  <Chip key={index} mode="flat" style={styles.objectChip} textStyle={styles.objectChipText}>
                    {t('transport.obj_' + type)}
                  </Chip>
                ))
              ) : (
                <Chip mode="flat" style={styles.objectChip} textStyle={styles.objectChipText}>
                  {t('transport.obj_' + item.objectType)}
                </Chip>
              )}
            </View>
            <Text variant="bodyMedium" style={styles.requestDescription} numberOfLines={2}>
              {item.description}
            </Text>
            <View style={styles.requestDetails}>
              <View style={styles.detailRow}>
                <Text variant="bodySmall" style={styles.detailLabel}>📍 {t('common.from')}:</Text>
                <Text variant="bodySmall" style={styles.detailValue} numberOfLines={1}>{item.pickup.address}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text variant="bodySmall" style={styles.detailLabel}>🏁 {t('common.to')}:</Text>
                <Text variant="bodySmall" style={styles.detailValue} numberOfLines={1}>{item.delivery.address}</Text>
              </View>
            </View>
            <View style={styles.requestFooter}>
              <Text variant="bodySmall" style={styles.requestDate}>📅 {formatDate(item.scheduledDate)}</Text>
              <Text variant="titleSmall" style={styles.requestPrice}>{formatCurrency(item.price || 0)}</Text>
            </View>

          </Card.Content>
        </Card>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.empty}>
      <Text variant="displaySmall" style={styles.emptyIcon}>📦</Text>
      <Text variant="titleLarge" style={styles.emptyTitle}>{t('transport.empty')}</Text>
      <Text variant="bodyMedium" style={styles.emptyText}>
        {temporalFilter !== 'all' || search || hasDateFilter
          ? t('transport.empty_hint')
          : t('transport.empty_hint')}
      </Text>
    </View>
  );

  React.useEffect(() => {
    if (!isLoading && !isFetching) setHasLoadedOnce(true);
  }, [isLoading, isFetching]);

  React.useEffect(() => {
    if (isLoading && !hasLoadedOnce) {
      const timeout = setTimeout(() => setHasLoadedOnce(true), 2000);
      return () => clearTimeout(timeout);
    }
  }, [isLoading, hasLoadedOnce]);

  if (isLoading && !requests && !hasLoadedOnce) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderFilters()}
      <FlatList
        data={filteredRequests}
        renderItem={renderRequest}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, filteredRequests.length === 0 && styles.listEmpty]}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} />
        }
      />
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('TransportRequestStep1')}
        color={colors.white}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.light },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  loadingText: { color: colors.gray, marginTop: spacing.md },
  filtersContainer: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
    paddingTop: spacing.xs,
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
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 13, color: colors.gray, fontWeight: '500' },
  tabTextActive: { color: colors.white, fontWeight: '600' },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.lightGray,
    paddingHorizontal: spacing.sm,
  },
  searchInput: { flex: 1, paddingVertical: 9, fontSize: 14, color: colors.dark },
  searchClear: { padding: spacing.xs },
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
  dateModeBtnActive: { backgroundColor: `${colors.primary}20`, borderColor: colors.primary },
  dateModeBtnText: { fontSize: 12, color: colors.gray },
  dateModeBtnTextActive: { color: colors.primary, fontWeight: '600' },
  dateRangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  dateRangeInner: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dateLabel: { fontSize: 13, color: colors.gray },
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
  clearBtn: { fontSize: 16, color: colors.gray, paddingHorizontal: spacing.xs },
  countText: { fontSize: 12, color: colors.gray, paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  list: { padding: spacing.md },
  listEmpty: { flexGrow: 1 },
  requestCard: { marginBottom: spacing.md, backgroundColor: colors.white },
  sectionTitle: { color: colors.primary, marginBottom: spacing.sm },
  statusContainer: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: spacing.sm },
  statusChip: {},
  chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.sm },
  objectChip: { backgroundColor: `${colors.primary}20`, paddingHorizontal: 8, paddingVertical: 0, margin: 0 },
  objectChipText: { color: colors.primary, fontSize: 12, fontWeight: '600', lineHeight: 16 },
  requestDescription: { color: colors.gray, marginBottom: spacing.sm },
  requestDetails: { gap: 4, marginBottom: spacing.sm },
  detailRow: { flexDirection: 'row', gap: spacing.xs },
  detailLabel: { color: colors.gray, width: 40 },
  detailValue: { flex: 1, color: colors.dark },
  requestFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xs, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  requestDate: { color: colors.gray },
  requestPrice: { color: colors.primary, fontWeight: '700' },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.xs,
  },
  driverIcon: { fontSize: 16 },
  driverInfo: { flex: 1 },
  driverName: { fontSize: 13, fontWeight: '600', color: colors.dark },
  driverSub: { fontSize: 12, color: colors.gray },
  driverPending: { fontSize: 12, color: colors.gray, fontStyle: 'italic' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing.xl },
  emptyIcon: { fontSize: 80, marginBottom: spacing.lg },
  emptyTitle: { color: colors.dark, marginBottom: spacing.sm },
  emptyText: { color: colors.gray, textAlign: 'center', marginBottom: spacing.xs },
  fab: { position: 'absolute', right: spacing.lg, bottom: spacing.lg, backgroundColor: colors.primary },
});
