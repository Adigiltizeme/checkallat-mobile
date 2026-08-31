import React, { useCallback, useState, useMemo } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, RefreshControl, TextInput, ScrollView } from 'react-native';
import { Text, Card, Chip, ActivityIndicator } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { colors } from '../../theme/colors';
import { useAppTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/spacing';
import { useGetMyTransportRequestsQuery } from '../../store/api/transportApi';
import { useGetMyBookingsQuery } from '../../store/api/bookingsApi';
import { useRefetchOnFocus } from '../../hooks/useRefetchOnFocus';
import { CURRENCY_CONFIG } from '../../config/currency';
import { getLocalizedName } from '../../utils/localize';

type Props = any;
type TemporalFilter = 'all' | 'today' | 'upcoming' | 'history';
type SectorFilter = 'all' | 'transport' | 'service' | 'marketplace';
type DateMode = 'range' | 'single';

interface UnifiedOrder {
  id: string;
  type: 'transport' | 'service' | 'marketplace';
  status: string;
  amount: number;
  currency: string;
  date: string;
  escrowStatus?: string;
  paymentMethod?: string;
  // Transport
  pickupAddress?: string;
  deliveryAddress?: string;
  // Service
  serviceName?: string;
  proName?: string;
  address?: string;
}

const toDay = (d: string) => (d ? new Date(d).toLocaleDateString('en-CA') : '');

const ESCROW_COLORS: Record<string, string> = {
  pending: '#FF9800',
  captured: '#2196F3',
  held: '#4CAF50',
  released: '#00B8A9',
  refunded: '#F44336',
};

const SECTOR_ICON: Record<string, string> = {
  transport: '🚛',
  service: '🛠',
  marketplace: '🛒',
};

export const PaymentHistoryScreen = ({ navigation }: Props) => {
  const { tokens } = useAppTheme();
  const { t, i18n } = useTranslation();

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: tokens.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
    filtersContainer: { backgroundColor: tokens.card, borderBottomWidth: 1, borderBottomColor: tokens.border },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
    sectionHeaderText: { fontSize: 14, fontWeight: '600', color: tokens.text.primary },
    chevron: { fontSize: 12, color: tokens.text.secondary },
    sectorRow: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.xs, gap: spacing.xs },
    sectorChip: { paddingHorizontal: spacing.sm, paddingVertical: 5, borderRadius: 20, borderWidth: 1.5, borderColor: tokens.border, backgroundColor: tokens.backgroundAlt, marginRight: spacing.xs },
    sectorChipActive: { backgroundColor: tokens.primary, borderColor: tokens.primary },
    sectorChipDisabled: { opacity: 0.4 },
    sectorChipText: { fontSize: 13, color: tokens.text.secondary, fontWeight: '500' },
    sectorChipTextActive: { color: colors.white, fontWeight: '600' },
    tabsRow: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, gap: spacing.xs },
    tab: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: 20, backgroundColor: tokens.backgroundAlt, marginRight: spacing.xs },
    tabActive: { backgroundColor: tokens.primary },
    tabText: { fontSize: 13, color: tokens.text.secondary, fontWeight: '500' },
    tabTextActive: { color: colors.white, fontWeight: '600' },
    searchRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: spacing.md, marginTop: spacing.xs, borderWidth: 1, borderColor: tokens.border, borderRadius: 10, backgroundColor: tokens.backgroundAlt, paddingHorizontal: spacing.sm },
    searchInput: { flex: 1, paddingVertical: 9, fontSize: 14, color: tokens.text.primary },
    dateModeRow: { flexDirection: 'row', paddingHorizontal: spacing.md, paddingTop: spacing.xs, gap: spacing.xs },
    dateModeBtn: { paddingHorizontal: spacing.md, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: tokens.border, backgroundColor: tokens.backgroundAlt },
    dateModeBtnActive: { backgroundColor: `${tokens.primary}20`, borderColor: tokens.primary },
    dateModeBtnText: { fontSize: 12, color: tokens.text.secondary },
    dateModeBtnTextActive: { color: tokens.primary, fontWeight: '600' },
    dateRangeRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingTop: spacing.xs, paddingBottom: spacing.sm, gap: spacing.xs },
    dateRangeInner: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    dateLabel: { fontSize: 13, color: tokens.text.secondary },
    dateInput: { flex: 1, borderWidth: 1, borderColor: tokens.border, borderRadius: 8, paddingHorizontal: spacing.sm, paddingVertical: 6, fontSize: 13, color: tokens.text.primary, backgroundColor: tokens.backgroundAlt },
    clearBtn: { fontSize: 16, color: tokens.text.secondary, paddingHorizontal: spacing.xs },
    countText: { fontSize: 12, color: tokens.text.secondary, paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
    list: { padding: spacing.md },
    listEmpty: { flexGrow: 1 },
    card: { marginBottom: spacing.md, backgroundColor: tokens.card },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.xs },
    sectorBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    sectorBadgeText: { fontSize: 11, fontWeight: '600', color: tokens.text.secondary },
    statusChip: {},
    rowItem: { flexDirection: 'row', gap: spacing.xs, marginBottom: 2 },
    rowIcon: { width: 20, color: tokens.text.secondary, textAlign: 'center' },
    rowText: { flex: 1, color: tokens.text.primary, fontSize: 13 },
    proRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: 2 },
    proText: { fontSize: 13, color: tokens.text.secondary, fontStyle: 'italic' },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: tokens.border },
    dateText: { color: tokens.text.secondary, fontSize: 13 },
    amountText: { color: tokens.primary, fontWeight: '700' },
    methodBadge: { fontSize: 11, color: tokens.text.secondary, marginTop: 2 },
    detailsLink: { color: tokens.primary, fontSize: 11, marginTop: 2 },
    empty: { color: tokens.text.secondary, textAlign: 'center' },
  }), [tokens]);

  const {
    data: transportData,
    isLoading: tLoading,
    refetch: refetchTransport,
  } = useGetMyTransportRequestsQuery(undefined, { pollingInterval: 8000, refetchOnMountOrArgChange: true });

  const {
    data: bookingsData,
    isLoading: bLoading,
    refetch: refetchBookings,
  } = useGetMyBookingsQuery(undefined, { pollingInterval: 8000, refetchOnMountOrArgChange: true });

  const refetchAll = useCallback(() => {
    refetchTransport();
    refetchBookings();
  }, [refetchTransport, refetchBookings]);
  useRefetchOnFocus(refetchAll);

  const [refreshing, setRefreshing] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [sectorFilter, setSectorFilter] = useState<SectorFilter>('all');
  const [temporalFilter, setTemporalFilter] = useState<TemporalFilter>('all');
  const [search, setSearch] = useState('');
  const [dateMode, setDateMode] = useState<DateMode>('range');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [dateSingle, setDateSingle] = useState('');

  const todayStr = new Date().toLocaleDateString('en-CA');

  const handleRefresh = async () => {
    setRefreshing(true);
    refetchAll();
    setRefreshing(false);
  };

  const formatDate = (isoDate: string) =>
    isoDate
      ? new Date(isoDate).toLocaleDateString(i18n.language, { day: '2-digit', month: 'short', year: 'numeric' })
      : '—';

  const clearDates = () => { setDateStart(''); setDateEnd(''); setDateSingle(''); };
  const hasDateFilter = dateMode === 'single' ? !!dateSingle : !!(dateStart || dateEnd);

  const allOrders = useMemo((): UnifiedOrder[] => {
    const transport: UnifiedOrder[] = (transportData || []).map((r: any) => ({
      id: r.id,
      type: 'transport' as const,
      status: r.status,
      amount: r.price ?? 0,
      currency: r.currency ?? CURRENCY_CONFIG.code,
      date: r.scheduledDate ?? r.createdAt ?? '',
      escrowStatus: r.payment?.escrowStatus,
      paymentMethod: r.paymentMethod,
      pickupAddress: r.pickup?.address,
      deliveryAddress: r.delivery?.address,
    }));

    const services: UnifiedOrder[] = (bookingsData || []).map((b: any) => {
      const serviceName = b.category
        ? getLocalizedName(b.category, i18n.language)
        : b.categorySlug ?? '—';
      const pro = b.pro;
      const proName = pro?.user
        ? `${pro.user.firstName} ${pro.user.lastName}`.trim()
        : pro?.companyName ?? undefined;
      return {
        id: b.id,
        type: 'service' as const,
        status: b.status,
        amount: b.finalPrice ?? b.estimatedPrice ?? 0,
        currency: b.currency ?? CURRENCY_CONFIG.code,
        date: b.scheduledAt ?? b.createdAt ?? '',
        escrowStatus: b.payment?.escrowStatus,
        paymentMethod: b.paymentMethod,
        serviceName,
        proName,
        address: b.address,
      };
    });

    return [...transport, ...services].sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : 0;
      const db = b.date ? new Date(b.date).getTime() : 0;
      return db - da;
    });
  }, [transportData, bookingsData, i18n.language]);

  const sectorCounts = useMemo(() => ({
    all: allOrders.length,
    transport: allOrders.filter(o => o.type === 'transport').length,
    service: allOrders.filter(o => o.type === 'service').length,
    marketplace: 0,
  }), [allOrders]);

  const temporalCounts = useMemo(() => {
    const base = sectorFilter === 'all' ? allOrders : allOrders.filter(o => o.type === sectorFilter);
    return {
      all: base.length,
      today: base.filter(o => toDay(o.date) === todayStr).length,
      upcoming: base.filter(o => toDay(o.date) > todayStr).length,
      history: base.filter(o => o.status === 'completed' || o.status === 'cancelled').length,
    };
  }, [allOrders, sectorFilter, todayStr]);

  const filtered = useMemo(() => {
    let result = [...allOrders];
    if (sectorFilter !== 'all') result = result.filter(o => o.type === sectorFilter);
    if (temporalFilter !== 'all') {
      result = result.filter(o => {
        const d = toDay(o.date);
        switch (temporalFilter) {
          case 'today': return d === todayStr;
          case 'upcoming': return d > todayStr;
          case 'history': return o.status === 'completed' || o.status === 'cancelled';
          default: return true;
        }
      });
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(o =>
        o.pickupAddress?.toLowerCase().includes(q) ||
        o.deliveryAddress?.toLowerCase().includes(q) ||
        o.address?.toLowerCase().includes(q) ||
        o.serviceName?.toLowerCase().includes(q) ||
        o.proName?.toLowerCase().includes(q),
      );
    }
    const fs = dateMode === 'single' ? dateSingle : dateStart;
    const fe = dateMode === 'single' ? dateSingle : dateEnd;
    if (fs) result = result.filter(o => toDay(o.date) >= fs);
    if (fe) result = result.filter(o => toDay(o.date) <= fe);
    return result;
  }, [allOrders, sectorFilter, temporalFilter, search, dateMode, dateStart, dateEnd, dateSingle, todayStr]);

  const activeFiltersCount =
    (sectorFilter !== 'all' ? 1 : 0) +
    (temporalFilter !== 'all' ? 1 : 0) +
    (search ? 1 : 0) +
    (hasDateFilter ? 1 : 0);

  const SECTOR_CHIPS: { key: SectorFilter; label: string; count: number; disabled?: boolean }[] = [
    { key: 'all', label: `${t('common.all')} (${sectorCounts.all})`, count: sectorCounts.all },
    { key: 'transport', label: `🚛 ${t('payment.history_transport')} (${sectorCounts.transport})`, count: sectorCounts.transport },
    { key: 'service', label: `🛠 ${t('payment.sector_service')} (${sectorCounts.service})`, count: sectorCounts.service },
    { key: 'marketplace', label: `🛒 ${t('payment.history_marketplace')} (0)`, count: 0, disabled: true },
  ];

  const TEMPORAL_TABS: { key: TemporalFilter; label: string }[] = [
    { key: 'all', label: `${t('common.all')} (${temporalCounts.all})` },
    { key: 'today', label: `${t('common.today')} (${temporalCounts.today})` },
    { key: 'upcoming', label: `${t('common.upcoming')} (${temporalCounts.upcoming})` },
    { key: 'history', label: `${t('common.history')} (${temporalCounts.history})` },
  ];

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
          {/* Filtre secteur */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sectorRow}>
            {SECTOR_CHIPS.map(chip => (
              <TouchableOpacity
                key={chip.key}
                onPress={() => { if (!chip.disabled) setSectorFilter(chip.key); }}
                style={[styles.sectorChip, sectorFilter === chip.key && styles.sectorChipActive, chip.disabled && styles.sectorChipDisabled]}
                activeOpacity={chip.disabled ? 1 : 0.7}
              >
                <Text style={[styles.sectorChipText, sectorFilter === chip.key && styles.sectorChipTextActive]}>
                  {chip.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {/* Filtre temporel */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
            {TEMPORAL_TABS.map(tab => (
              <TouchableOpacity key={tab.key} onPress={() => setTemporalFilter(tab.key)}
                style={[styles.tab, temporalFilter === tab.key && styles.tabActive]}>
                <Text style={[styles.tabText, temporalFilter === tab.key && styles.tabTextActive]}>{tab.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={styles.searchRow}>
            <TextInput style={styles.searchInput} value={search} onChangeText={setSearch}
              placeholder={t('transport.search_placeholder')} placeholderTextColor={tokens.text.secondary} />
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
                placeholder={t('common.date_placeholder')} placeholderTextColor={tokens.text.secondary} keyboardType="numeric" maxLength={10} />
            ) : (
              <View style={styles.dateRangeInner}>
                <Text style={styles.dateLabel}>{t('common.from')}</Text>
                <TextInput style={styles.dateInput} value={dateStart} onChangeText={setDateStart}
                  placeholder={t('common.date_placeholder')} placeholderTextColor={tokens.text.secondary} keyboardType="numeric" maxLength={10} />
                <Text style={styles.dateLabel}>{t('common.to')}</Text>
                <TextInput style={styles.dateInput} value={dateEnd} onChangeText={setDateEnd}
                  placeholder={t('common.date_placeholder')} placeholderTextColor={tokens.text.secondary} keyboardType="numeric" maxLength={10} />
              </View>
            )}
            {hasDateFilter && <TouchableOpacity onPress={clearDates}><Text style={styles.clearBtn}>✕</Text></TouchableOpacity>}
          </View>
          <Text style={styles.countText}>{filtered.length} / {allOrders.length}</Text>
        </View>
      )}
    </View>
  );

  const renderItem = ({ item }: { item: UnifiedOrder }) => {
    const onPress = () => {
      if (item.type === 'transport') {
        navigation.navigate('TransportDetails', { requestId: item.id });
      } else if (item.type === 'service') {
        navigation.navigate('BookingDetails', { bookingId: item.id });
      }
    };

    return (
      <TouchableOpacity onPress={onPress}>
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardTop}>
              <View style={styles.sectorBadge}>
                <Text style={styles.sectorBadgeText}>
                  {SECTOR_ICON[item.type]}{' '}
                  {item.type === 'transport'
                    ? t('payment.history_transport')
                    : item.type === 'service'
                    ? t('payment.sector_service')
                    : t('payment.history_marketplace')}
                  {item.type === 'service' && item.serviceName ? ` · ${item.serviceName}` : ''}
                </Text>
              </View>
              {item.escrowStatus && (
                <Chip mode="flat" textStyle={{ fontSize: 10, lineHeight: 13, color: colors.white }}
                  style={[styles.statusChip, { backgroundColor: ESCROW_COLORS[item.escrowStatus] || tokens.border, height: 24 }]}>
                  {t('payment.escrow_' + item.escrowStatus)}
                </Chip>
              )}
            </View>

            {item.type === 'transport' ? (
              <>
                <View style={styles.rowItem}>
                  <Text style={styles.rowIcon}>📍</Text>
                  <Text style={styles.rowText} numberOfLines={1}>{item.pickupAddress ?? '—'}</Text>
                </View>
                <View style={styles.rowItem}>
                  <Text style={styles.rowIcon}>🏁</Text>
                  <Text style={styles.rowText} numberOfLines={1}>{item.deliveryAddress ?? '—'}</Text>
                </View>
              </>
            ) : (
              <>
                {item.address && (
                  <View style={styles.rowItem}>
                    <Text style={styles.rowIcon}>📍</Text>
                    <Text style={styles.rowText} numberOfLines={1}>{item.address}</Text>
                  </View>
                )}
                {item.proName && (
                  <Text style={styles.proText}>👤 {item.proName}</Text>
                )}
              </>
            )}

            <View style={styles.cardFooter}>
              <Text style={styles.dateText}>📅 {formatDate(item.date)}</Text>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.amountText}>{item.amount.toFixed(2)} {item.currency}</Text>
                {item.paymentMethod && (
                  <Text style={styles.methodBadge}>
                    {item.paymentMethod === 'cash' ? `💵 ${t('payment.cash')}` : `💳 ${t('payment.card')}`}
                  </Text>
                )}
                {item.escrowStatus === 'refunded' && (
                  <Text style={{ color: colors.error, fontSize: 11 }}>↩️ {t('payment.history_refunded')}</Text>
                )}
                <Text style={styles.detailsLink}>{t('common.details')} →</Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      </TouchableOpacity>
    );
  };

  if (tLoading || bLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={tokens.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderFilters()}
      <FlatList
        data={filtered}
        renderItem={renderItem}
        keyExtractor={item => `${item.type}-${item.id}`}
        contentContainerStyle={[styles.list, filtered.length === 0 && styles.listEmpty]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[tokens.primary]} />}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text variant="bodyMedium" style={styles.empty}>{t('payment.history_empty')}</Text>
          </View>
        }
      />
    </View>
  );
};
