import React, { useState, useMemo } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, RefreshControl, TextInput, ScrollView } from 'react-native';
import { Text, Card, Chip, ActivityIndicator } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { useGetMyTransportRequestsQuery } from '../../store/api/transportApi';
import { STATUS_COLORS, TransportStatus } from '../../types/transport';
import { useRefetchOnFocus } from '../../hooks/useRefetchOnFocus';

type Props = any;
type TemporalFilter = 'all' | 'today' | 'upcoming' | 'history';
type DateMode = 'range' | 'single';

const toDay = (d: string) => d ? new Date(d).toLocaleDateString('en-CA') : '';

const ESCROW_COLORS: Record<string, string> = {
  pending: '#FF9800',
  captured: '#2196F3',
  held: '#4CAF50',
  released: '#00B8A9',
  refunded: '#F44336',
};

export const PaymentHistoryScreen = ({ navigation }: Props) => {
  const { t, i18n } = useTranslation();
  const { data: requests, isLoading, isFetching, refetch } = useGetMyTransportRequestsQuery(undefined, {
    pollingInterval: 8000,
    refetchOnMountOrArgChange: true,
  });
  useRefetchOnFocus(refetch);
  const [refreshing, setRefreshing] = useState(false);
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

  const formatDate = (isoDate: string) =>
    new Date(isoDate).toLocaleDateString(i18n.language, { day: '2-digit', month: 'short', year: 'numeric' });

  const clearDates = () => { setDateStart(''); setDateEnd(''); setDateSingle(''); };
  const hasDateFilter = dateMode === 'single' ? !!dateSingle : !!(dateStart || dateEnd);

  const temporalCounts = useMemo(() => {
    const all = requests || [];
    return {
      all: all.length,
      today: all.filter((r: any) => toDay(r.scheduledDate) === todayStr).length,
      upcoming: all.filter((r: any) => toDay(r.scheduledDate) > todayStr).length,
      history: all.filter((r: any) => r.status === 'completed' || r.status === 'cancelled').length,
    };
  }, [requests, todayStr]);

  const filtered = useMemo(() => {
    let result = [...(requests || [])];
    if (temporalFilter !== 'all') {
      result = result.filter((r: any) => {
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
      result = result.filter((r: any) =>
        r.description?.toLowerCase().includes(q) ||
        r.pickup?.address?.toLowerCase().includes(q) ||
        r.delivery?.address?.toLowerCase().includes(q)
      );
    }
    const filterStart = dateMode === 'single' ? dateSingle : dateStart;
    const filterEnd = dateMode === 'single' ? dateSingle : dateEnd;
    if (filterStart) result = result.filter((r: any) => toDay(r.scheduledDate) >= filterStart);
    if (filterEnd) result = result.filter((r: any) => toDay(r.scheduledDate) <= filterEnd);
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
      <TouchableOpacity style={styles.sectionHeader} onPress={() => setFiltersOpen(o => !o)} activeOpacity={0.7}>
        <Text style={styles.sectionHeaderText}>
          {t('common.filters')}{activeFiltersCount > 0 ? ` · ${activeFiltersCount}` : ''}
        </Text>
        <Text style={styles.chevron}>{filtersOpen ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {filtersOpen && (
        <View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
            {TABS.map(tab => (
              <TouchableOpacity key={tab.key} onPress={() => setTemporalFilter(tab.key)}
                style={[styles.tab, temporalFilter === tab.key && styles.tabActive]}>
                <Text style={[styles.tabText, temporalFilter === tab.key && styles.tabTextActive]}>{tab.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={styles.searchRow}>
            <TextInput style={styles.searchInput} value={search} onChangeText={setSearch}
              placeholder={t('transport.search_placeholder')} placeholderTextColor={colors.gray} />
            {!!search && <TouchableOpacity onPress={() => setSearch('')}><Text style={styles.clearBtn}>✕</Text></TouchableOpacity>}
          </View>
          <View style={styles.dateModeRow}>
            <TouchableOpacity onPress={() => { setDateMode('range'); clearDates(); }}
              style={[styles.dateModeBtn, dateMode === 'range' && styles.dateModeBtnActive]}>
              <Text style={[styles.dateModeBtnText, dateMode === 'range' && styles.dateModeBtnTextActive]}>{t('common.period')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setDateMode('single'); clearDates(); }}
              style={[styles.dateModeBtn, dateMode === 'single' && styles.dateModeBtnActive]}>
              <Text style={[styles.dateModeBtnText, dateMode === 'single' && styles.dateModeBtnTextActive]}>{t('common.single_date')}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.dateRangeRow}>
            {dateMode === 'single' ? (
              <TextInput style={[styles.dateInput, { flex: 1 }]} value={dateSingle} onChangeText={setDateSingle}
                placeholder={t('common.date_placeholder')} placeholderTextColor={colors.gray} keyboardType="numeric" maxLength={10} />
            ) : (
              <View style={styles.dateRangeInner}>
                <Text style={styles.dateLabel}>{t('common.from')}</Text>
                <TextInput style={styles.dateInput} value={dateStart} onChangeText={setDateStart}
                  placeholder={t('common.date_placeholder')} placeholderTextColor={colors.gray} keyboardType="numeric" maxLength={10} />
                <Text style={styles.dateLabel}>{t('common.to')}</Text>
                <TextInput style={styles.dateInput} value={dateEnd} onChangeText={setDateEnd}
                  placeholder={t('common.date_placeholder')} placeholderTextColor={colors.gray} keyboardType="numeric" maxLength={10} />
              </View>
            )}
            {hasDateFilter && <TouchableOpacity onPress={clearDates}><Text style={styles.clearBtn}>✕</Text></TouchableOpacity>}
          </View>
          <Text style={styles.countText}>{filtered.length} / {(requests || []).length}</Text>
        </View>
      )}
    </View>
  );

  const renderItem = ({ item }: { item: any }) => {
    const statusColor = STATUS_COLORS[item.status as TransportStatus] || colors.gray;
    const payment = (item as any).payment;
    const escrowStatus = payment?.escrowStatus;
    return (
      <TouchableOpacity onPress={() => {
        if (payment?.id) {
          navigation.navigate('PaymentDetails', { paymentId: payment.id });
        } else {
          navigation.navigate('PaymentDetails', { requestId: item.id });
        }
      }}>
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardHeader}>
              {/* <Chip mode="flat" textStyle={{ fontSize: 11 }} style={[styles.statusChip, { backgroundColor: statusColor }]}>
                {t('status.' + item.status)}
              </Chip> */}
              {payment && escrowStatus && (
                <Chip mode="flat" textStyle={{ fontSize: 11, lineHeight: 14, color: colors.white }}
                  style={[styles.statusChip, { backgroundColor: ESCROW_COLORS[escrowStatus] || colors.gray }]}>
                  {t('payment.escrow_' + escrowStatus)}
                </Chip>
              )}
            </View>
            <View style={styles.locationRow}>
              <Text variant="bodySmall" style={styles.locationLabel}>📍</Text>
              <Text variant="bodySmall" style={styles.locationText} numberOfLines={1}>{item.pickup?.address}</Text>
            </View>
            <View style={styles.locationRow}>
              <Text variant="bodySmall" style={styles.locationLabel}>🏁</Text>
              <Text variant="bodySmall" style={styles.locationText} numberOfLines={1}>{item.delivery?.address}</Text>
            </View>
            <View style={styles.cardFooter}>
              <Text variant="bodySmall" style={styles.dateText}>📅 {formatDate(item.scheduledDate)}</Text>
              <View style={{ alignItems: 'flex-end' }}>
                <Text variant="titleSmall" style={styles.amountText}>{item.price?.toFixed(2)} EGP</Text>
                {escrowStatus === 'refunded' && (
                  <Text variant="bodySmall" style={{ color: colors.error, fontSize: 11 }}>↩️ {t('payment.history_refunded')}</Text>
                )}
                <Text variant="bodySmall" style={{ color: colors.primary, fontSize: 11, marginTop: 2 }}>
                  {t('common.details')} →
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderFilters()}
      <FlatList
        data={filtered}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, filtered.length === 0 && styles.listEmpty]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} />}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text variant="bodyMedium" style={styles.empty}>{t('payment.history_empty')}</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.light },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  filtersContainer: { backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  sectionHeaderText: { fontSize: 14, fontWeight: '600', color: colors.dark },
  chevron: { fontSize: 12, color: colors.gray },
  tabsRow: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, gap: spacing.xs },
  tab: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: 20, backgroundColor: colors.lightGray, marginRight: spacing.xs },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 13, color: colors.gray, fontWeight: '500' },
  tabTextActive: { color: colors.white, fontWeight: '600' },
  searchRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: spacing.md, marginTop: spacing.xs, borderWidth: 1, borderColor: colors.border, borderRadius: 10, backgroundColor: colors.lightGray, paddingHorizontal: spacing.sm },
  searchInput: { flex: 1, paddingVertical: 9, fontSize: 14, color: colors.dark },
  dateModeRow: { flexDirection: 'row', paddingHorizontal: spacing.md, paddingTop: spacing.xs, gap: spacing.xs },
  dateModeBtn: { paddingHorizontal: spacing.md, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.lightGray },
  dateModeBtnActive: { backgroundColor: `${colors.primary}20`, borderColor: colors.primary },
  dateModeBtnText: { fontSize: 12, color: colors.gray },
  dateModeBtnTextActive: { color: colors.primary, fontWeight: '600' },
  dateRangeRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingTop: spacing.xs, paddingBottom: spacing.sm, gap: spacing.xs },
  dateRangeInner: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dateLabel: { fontSize: 13, color: colors.gray },
  dateInput: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: spacing.sm, paddingVertical: 6, fontSize: 13, color: colors.dark, backgroundColor: colors.lightGray },
  clearBtn: { fontSize: 16, color: colors.gray, paddingHorizontal: spacing.xs },
  countText: { fontSize: 12, color: colors.gray, paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  list: { padding: spacing.md },
  listEmpty: { flexGrow: 1 },
  card: { marginBottom: spacing.md, backgroundColor: colors.white },
  cardHeader: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap', marginBottom: spacing.xs },
  statusChip: {},
  locationRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: 2 },
  locationLabel: { width: 20, color: colors.gray },
  locationText: { flex: 1, color: colors.dark },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  dateText: { color: colors.gray },
  amountText: { color: colors.primary, fontWeight: '700' },
  empty: { color: colors.gray, textAlign: 'center' },
});
