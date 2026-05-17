import React, { useState, useMemo } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { StackScreenProps } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { getLocalizedName } from '../../utils/localize';
import { HomeStackParamList } from '../../navigation/types';
import { useGetMyBookingsQuery } from '../../store/api/bookingsApi';
import { useRefetchOnFocus } from '../../hooks/useRefetchOnFocus';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

type Props = StackScreenProps<HomeStackParamList, 'MyBookings'>;
type TemporalFilter = 'all' | 'today' | 'upcoming' | 'history';
type DateMode = 'range' | 'single';

const toDay = (d: string) => (d ? new Date(d).toLocaleDateString('en-CA') : '');

const TERMINAL_STATUSES = new Set(['completed', 'cancelled', 'rejected']);

const STATUS_BADGE: Record<string, { color: string; bg: string }> = {
  pending:     { color: '#92400E', bg: '#FEF3C7' },
  accepted:    { color: '#1E40AF', bg: '#DBEAFE' },
  in_progress: { color: '#065F46', bg: '#D1FAE5' },
  completed:   { color: '#166534', bg: '#DCFCE7' },
  cancelled:   { color: '#7F1D1D', bg: '#FEE2E2' },
  rejected:    { color: '#7F1D1D', bg: '#FEE2E2' },
};

export const MyBookingsScreen = ({ navigation }: Props) => {
  const { t, i18n } = useTranslation();
  const todayStr = new Date().toLocaleDateString('en-CA');

  const { data = [], isLoading, isFetching, refetch } = useGetMyBookingsQuery(undefined, {
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

  const bookings: any[] = Array.isArray(data) ? data : [];

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const clearDates = () => { setDateStart(''); setDateEnd(''); setDateSingle(''); };
  const hasDateFilter = dateMode === 'single' ? !!dateSingle : !!(dateStart || dateEnd);

  const temporalCounts = useMemo(() => ({
    all: bookings.length,
    today: bookings.filter(b => toDay(b.scheduledAt) === todayStr).length,
    upcoming: bookings.filter(b => toDay(b.scheduledAt) > todayStr && !TERMINAL_STATUSES.has(b.status)).length,
    history: bookings.filter(b => TERMINAL_STATUSES.has(b.status)).length,
  }), [bookings, todayStr]);

  const filteredBookings = useMemo(() => {
    let result = [...bookings];

    if (temporalFilter !== 'all') {
      result = result.filter(b => {
        const d = toDay(b.scheduledAt);
        switch (temporalFilter) {
          case 'today':    return d === todayStr;
          case 'upcoming': return d > todayStr && !TERMINAL_STATUSES.has(b.status);
          case 'history':  return TERMINAL_STATUSES.has(b.status);
          default:         return true;
        }
      });
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(b => {
        const catName = b.category
          ? (b.category.nameFr ?? b.category.nameEn ?? b.category.nameAr ?? b.category.slug ?? '')
          : '';
        const pro = b.pro;
        const proName = pro?.user
          ? `${pro.user.firstName ?? ''} ${pro.user.lastName ?? ''}`.trim()
          : pro?.companyName ?? '';
        return (
          catName.toLowerCase().includes(q) ||
          proName.toLowerCase().includes(q) ||
          (b.address ?? '').toLowerCase().includes(q) ||
          (b.clientDescription ?? '').toLowerCase().includes(q)
        );
      });
    }

    const filterStart = dateMode === 'single' ? dateSingle : dateStart;
    const filterEnd   = dateMode === 'single' ? dateSingle : dateEnd;
    if (filterStart) result = result.filter(b => toDay(b.scheduledAt) >= filterStart);
    if (filterEnd)   result = result.filter(b => toDay(b.scheduledAt) <= filterEnd);

    return result;
  }, [bookings, temporalFilter, search, dateMode, dateStart, dateEnd, dateSingle, todayStr]);

  const TABS: { key: TemporalFilter; label: string }[] = [
    { key: 'all',      label: `${t('common.all')} (${temporalCounts.all})` },
    { key: 'today',    label: `${t('common.today')} (${temporalCounts.today})` },
    { key: 'upcoming', label: `${t('common.upcoming')} (${temporalCounts.upcoming})` },
    { key: 'history',  label: `${t('common.history')} (${temporalCounts.history})` },
  ];

  const activeFiltersCount =
    (temporalFilter !== 'all' ? 1 : 0) + (search ? 1 : 0) + (hasDateFilter ? 1 : 0);

  React.useEffect(() => {
    if (!isLoading && !isFetching) setHasLoadedOnce(true);
  }, [isLoading, isFetching]);

  if (isLoading && !hasLoadedOnce) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={() => setFiltersOpen(o => !o)}
        activeOpacity={0.7}
      >
        <Text style={styles.sectionHeaderText}>
          {t('common.filters')}{activeFiltersCount > 0 ? ` · ${activeFiltersCount}` : ''}
        </Text>
        <Text style={styles.chevron}>{filtersOpen ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {filtersOpen && (
        <View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsRow}
          >
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

          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder={t('booking.search_placeholder')}
              placeholderTextColor={colors.gray}
              returnKeyType="search"
            />
            {!!search && (
              <TouchableOpacity onPress={() => setSearch('')} style={styles.searchClear}>
                <Text style={styles.clearBtn}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.dateModeRow}>
            <TouchableOpacity
              onPress={() => { setDateMode('range'); clearDates(); }}
              style={[styles.dateModeBtn, dateMode === 'range' && styles.dateModeBtnActive]}
            >
              <Text style={[styles.dateModeBtnText, dateMode === 'range' && styles.dateModeBtnTextActive]}>
                {t('common.period')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { setDateMode('single'); clearDates(); }}
              style={[styles.dateModeBtn, dateMode === 'single' && styles.dateModeBtnActive]}
            >
              <Text style={[styles.dateModeBtnText, dateMode === 'single' && styles.dateModeBtnTextActive]}>
                {t('common.single_date')}
              </Text>
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
            {t('booking.bookings_count', { count: filteredBookings.length })}
            {filteredBookings.length !== bookings.length ? ` / ${bookings.length}` : ''}
          </Text>
        </View>
      )}
    </View>
  );

  const renderBooking = ({ item }: { item: any }) => {
    const status = item.status ?? 'pending';
    const badge = STATUS_BADGE[status] ?? STATUS_BADGE.pending;
    const pro = item.pro;
    const proName = pro?.user
      ? `${pro.user.firstName} ${pro.user.lastName}`
      : pro?.companyName ?? '—';
    const serviceName = item.category
      ? getLocalizedName(item.category, i18n.language)
      : item.category?.slug ?? '—';
    const scheduledAt = item.scheduledAt ? new Date(item.scheduledAt) : null;

    return (
      <TouchableOpacity
        style={styles.bookingCard}
        onPress={() => navigation.navigate('BookingDetails', { bookingId: item.id })}
        activeOpacity={0.85}
      >
        <View style={styles.cardTop}>
          <View style={styles.serviceIcon}>
            <Icon name="briefcase-outline" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.serviceName} numberOfLines={1}>{serviceName}</Text>
            <Text style={styles.proName} numberOfLines={1}>{proName}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.statusText, { color: badge.color }]}>
              {t(`booking_status.${status}`, { defaultValue: status })}
            </Text>
          </View>
        </View>

        {scheduledAt && (
          <View style={styles.cardBottom}>
            <Icon name="calendar-outline" size={14} color={colors.gray} />
            <Text style={styles.dateText}>
              {scheduledAt.toLocaleDateString(i18n.language, {
                day: 'numeric', month: 'long', year: 'numeric',
              })}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.centered}>
      <Icon name="calendar-blank-outline" size={56} color={colors.border} style={{ marginBottom: spacing.md }} />
      <Text style={styles.emptyTitle}>
        {temporalFilter !== 'all' || search || hasDateFilter
          ? t('booking.empty_filter')
          : t('booking.empty')}
      </Text>
      {temporalFilter === 'all' && !search && !hasDateFilter && (
        <Text style={styles.emptyHint}>{t('booking.empty_hint')}</Text>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {renderFilters()}
      <FlatList
        data={filteredBookings}
        keyExtractor={(item) => item.id}
        renderItem={renderBooking}
        contentContainerStyle={[styles.list, filteredBookings.length === 0 && styles.listEmpty]}
        ListEmptyComponent={renderEmpty}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} />
        }
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
    paddingVertical: spacing.xs,
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

  bookingCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  serviceIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: colors.primary + '15',
    alignItems: 'center', justifyContent: 'center',
  },
  serviceName: { fontSize: 14, fontWeight: '700', color: colors.dark },
  proName: { fontSize: 12, color: colors.gray, marginTop: 2 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '700' },

  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  dateText: { fontSize: 12, color: colors.gray },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: colors.dark, textAlign: 'center', marginBottom: spacing.xs },
  emptyHint: { fontSize: 13, color: colors.gray, textAlign: 'center' },
});
