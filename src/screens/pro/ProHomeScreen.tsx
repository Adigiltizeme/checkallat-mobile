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
  Alert,
} from 'react-native';
import { Text, Card, Chip, ActivityIndicator, FAB } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { StackScreenProps } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { getLocalizedName } from '../../utils/localize';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { colors } from '../../theme/colors';
import { useAppTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/spacing';
import { CURRENCY_CONFIG, formatCurrency } from '../../config/currency';
import { ProStackParamList } from '../../navigation/types';
import { useGetProBookingsQuery } from '../../store/api/bookingsApi';
import { useGetProStatsQuery, useUpdateProAvailabilityMutation, usePayProCommissionMutation } from '../../store/api/prosApi';
import { useRefetchOnFocus } from '../../hooks/useRefetchOnFocus';
import { useBeatSound } from '../../hooks/useBeatSound';
import { useStripe } from '@stripe/stripe-react-native';
import { ChocolateButton } from '../../components/shared/ChocolateButton';
import { RootState } from '../../store';

type Props = StackScreenProps<ProStackParamList, 'ProHome'>;
type TemporalFilter = 'all' | 'today' | 'upcoming' | 'history';
type DateMode = 'range' | 'single';

const ACTIVE_STATUSES = ['accepted', 'en_route', 'arrived', 'in_progress'];

const STATUS_COLORS: Record<string, string> = {
  pending: '#F59E0B',
  accepted: '#3B82F6',
  en_route: '#4F46E5',
  arrived: '#7C3AED',
  in_progress: '#6366F1',
  completed: '#10B981',
  cancelled: '#EF4444',
  rejected: '#9CA3AF',
};

const toDay = (d: string) => (d ? new Date(d).toLocaleDateString('en-CA') : '');

export const ProHomeScreen = ({ navigation }: Props) => {
  const { tokens } = useAppTheme();

  const styles = useMemo(() => StyleSheet.create({
  container: { flex: 1, backgroundColor: tokens.background },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  availabilityCard: { backgroundColor: tokens.card, padding: spacing.md, margin: spacing.md, borderRadius: 12, elevation: 2 },
  availabilityContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  availabilityTitle: { fontWeight: 'bold', marginBottom: spacing.xs },
  availabilitySubtitle: { color: tokens.text.secondary },
  pendingBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: tokens.primary, marginHorizontal: spacing.md, marginBottom: spacing.md,
    borderRadius: 12, padding: spacing.md, elevation: 4,
    shadowColor: tokens.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4,
  },
  bannerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  bannerTitle: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  bannerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },
  collapsibleCard: { backgroundColor: tokens.card, borderRadius: 12, marginHorizontal: spacing.md, marginBottom: spacing.md, elevation: 1, overflow: 'hidden' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  sectionHeaderText: { fontSize: 14, fontWeight: '600', color: tokens.text.primary },
  chevron: { fontSize: 12, color: tokens.text.secondary },
  statsContainer: { flexDirection: 'row', paddingHorizontal: spacing.md, marginBottom: spacing.md, gap: spacing.sm },
  statCard: { flex: 1, backgroundColor: tokens.card, padding: spacing.md, borderRadius: 12, alignItems: 'center', elevation: 2 },
  statNumber: { fontWeight: 'bold', color: tokens.primary },
  statLabel: { color: tokens.text.secondary, marginTop: spacing.xs },
  filtersContainer: { backgroundColor: tokens.card, borderRadius: 12, marginHorizontal: spacing.md, marginBottom: spacing.md, elevation: 1, overflow: 'hidden' },
  searchRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: spacing.md, marginTop: spacing.xs, marginBottom: spacing.xs, borderWidth: 1, borderColor: tokens.border, borderRadius: 10, backgroundColor: tokens.backgroundAlt, paddingHorizontal: spacing.sm },
  searchInput: { flex: 1, paddingVertical: 9, fontSize: 14, color: tokens.text.primary },
  searchClear: { padding: spacing.xs },
  tabsRow: { paddingHorizontal: spacing.md, paddingTop: spacing.xs, paddingBottom: spacing.xs, gap: spacing.xs },
  tab: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: 20, backgroundColor: tokens.backgroundAlt, marginRight: spacing.xs },
  tabActive: { backgroundColor: tokens.primary },
  tabText: { fontSize: 13, color: tokens.text.secondary, fontWeight: '500' },
  tabTextActive: { color: colors.white, fontWeight: '600' },
  dateModeRow: { flexDirection: 'row', paddingHorizontal: spacing.md, paddingTop: spacing.xs, gap: spacing.xs },
  dateModeBtn: { paddingHorizontal: spacing.md, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: tokens.border, backgroundColor: tokens.backgroundAlt },
  dateModeBtnActive: { backgroundColor: `${tokens.primary}20`, borderColor: tokens.primary },
  dateModeBtnText: { fontSize: 12, color: tokens.text.secondary },
  dateModeBtnTextActive: { color: tokens.primary, fontWeight: '600' },
  dateRangeRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingTop: spacing.xs, gap: spacing.xs },
  dateRangeInner: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dateLabel: { fontSize: 13, color: tokens.text.secondary },
  dateInput: { flex: 1, borderWidth: 1, borderColor: tokens.border, borderRadius: 8, paddingHorizontal: spacing.sm, paddingVertical: 6, fontSize: 13, color: tokens.text.primary, backgroundColor: tokens.backgroundAlt },
  clearBtn: { fontSize: 16, color: tokens.text.secondary, paddingHorizontal: spacing.xs },
  countText: { fontSize: 12, color: tokens.text.secondary, paddingHorizontal: spacing.md, paddingTop: spacing.xs, paddingBottom: spacing.sm },
  listContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl * 2 },
  bookingCard: { marginBottom: spacing.md, backgroundColor: tokens.card, elevation: 2 },
  activeCard: { borderLeftWidth: 4, borderLeftColor: tokens.primary },
  confirmRequiredCard: { borderLeftWidth: 4, borderLeftColor: '#D97706' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm },
  cardTitle: { fontWeight: 'bold' },
  clientText: { color: tokens.text.secondary, marginTop: 2 },
  statusChip: {},
  infoRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', marginBottom: 2 },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 },
  infoText: { color: tokens.text.secondary, flexShrink: 1 },
  confirmBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: spacing.sm, paddingHorizontal: spacing.sm, paddingVertical: 4,
    backgroundColor: '#FEF3C7', borderRadius: 6, alignSelf: 'flex-start',
  },
  confirmBadgeText: { fontSize: 11, fontWeight: '600', color: '#D97706' },
  emptyContainer: { alignItems: 'center', paddingTop: spacing.xl * 2, paddingHorizontal: spacing.xl },
  emptyText: { marginTop: spacing.md, fontWeight: 'bold', textAlign: 'center' },
  emptySubtext: { marginTop: spacing.xs, color: tokens.text.secondary, textAlign: 'center' },
  fab: { position: 'absolute', bottom: spacing.md, right: spacing.md, backgroundColor: tokens.primary },
  commissionAlert: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
    backgroundColor: '#FFF8E1', borderRadius: 12, padding: spacing.md,
    margin: spacing.md, borderWidth: 1, borderColor: colors.warning,
  },
  commissionAlertTitle: { fontSize: 14, fontWeight: '700', color: '#7B5800', marginBottom: 2 },
  commissionAlertText: { fontSize: 13, color: '#7B5800', lineHeight: 18 },
  commissionPayButton: { marginTop: spacing.sm, alignSelf: 'flex-start' },
}), [tokens]);

  const { t, i18n } = useTranslation();
  const pro = useSelector((state: RootState) => (state.auth.user as any)?.pro);
  const proId: string = pro?.id ?? '';

  const { data, isLoading, refetch } = useGetProBookingsQuery(proId, {
    pollingInterval: 8000,
    refetchOnMountOrArgChange: true,
    skip: !proId,
  });
  useRefetchOnFocus(refetch, 450);

  const { data: stats, refetch: refetchStats } = useGetProStatsQuery(proId, {
    pollingInterval: 30_000,
    refetchOnMountOrArgChange: true,
    skip: !proId,
  });
  const [payProCommission, { isLoading: payingCommission }] = usePayProCommissionMutation();
  const [commissionPaid, setCommissionPaid] = useState(false);
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const pendingCashCommission = (stats as any)?.pendingCashCommission ?? 0;

  const handlePayCommissionOnline = async () => {
    try {
      const result = await payProCommission().unwrap();
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'CheckAll@t',
        paymentIntentClientSecret: result.clientSecret,
        allowsDelayedPaymentMethods: false,
      });
      if (initError) { Alert.alert(t('common.error'), initError.message); return; }
      const { error: payError } = await presentPaymentSheet();
      if (payError) {
        if (payError.code !== 'Canceled') Alert.alert(t('common.error'), payError.message);
        return;
      }
      setCommissionPaid(true);
      refetchStats();
      Alert.alert(t('payment.success_title'), t('pro_space.commission_paid_success_msg'), [{ text: t('common.ok') }]);
    } catch (error: any) {
      Alert.alert(t('common.error'), error?.data?.message || t('pro_space.commission_payment_error'));
    }
  };

  const [updateAvailability] = useUpdateProAvailabilityMutation();
  const [isAvailable, setIsAvailable] = useState<boolean>(pro?.isAvailable ?? true);
  const [refreshing, setRefreshing] = useState(false);
  const [temporalFilter, setTemporalFilter] = useState<TemporalFilter>('all');
  const [search, setSearch] = useState('');
  const [dateMode, setDateMode] = useState<DateMode>('range');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [dateSingle, setDateSingle] = useState('');
  const [statsOpen, setStatsOpen] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(true);

  const bookings: any[] = Array.isArray(data) ? data : ((data as any)?.bookings ?? []);
  const pendingBookings = bookings.filter((b) => b.status === 'pending');

  useBeatSound(pendingBookings.length > 0);

  const bannerScale = useSharedValue(1);
  useEffect(() => {
    if (pendingBookings.length > 0) {
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
  }, [pendingBookings.length, bannerScale]);
  const bannerAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: bannerScale.value }] }));

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const toggleAvailability = async (value: boolean) => {
    setIsAvailable(value);
    try {
      await updateAvailability({ id: proId, isAvailable: value }).unwrap();
    } catch {
      setIsAvailable(!value);
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(i18n.language, {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });

  const todayStr = new Date().toLocaleDateString('en-CA');

  const globalStats = useMemo(() => ({
    active: bookings.filter((b) => ACTIVE_STATUSES.includes(b.status)).length,
    pending: pendingBookings.length,
    completed: bookings.filter((b) => b.status === 'completed' || b.status === 'cancelled').length,
  }), [bookings, pendingBookings.length]);

  const temporalCounts = useMemo(() => ({
    all: bookings.length,
    today: bookings.filter((b) => toDay(b.scheduledAt ?? b.createdAt) === todayStr).length,
    upcoming: bookings.filter((b) => toDay(b.scheduledAt ?? '') > todayStr && b.status !== 'completed' && b.status !== 'cancelled').length,
    history: bookings.filter((b) => b.status === 'completed' || b.status === 'cancelled').length,
  }), [bookings, todayStr]);

  const filteredBookings = useMemo(() => {
    let result = [...bookings];
    if (temporalFilter !== 'all') {
      result = result.filter((b) => {
        const day = toDay(b.scheduledAt ?? b.createdAt);
        if (temporalFilter === 'today') return day === todayStr;
        if (temporalFilter === 'upcoming') return toDay(b.scheduledAt ?? '') > todayStr && b.status !== 'completed' && b.status !== 'cancelled';
        if (temporalFilter === 'history') return b.status === 'completed' || b.status === 'cancelled';
        return true;
      });
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((b) =>
        b.client?.firstName?.toLowerCase().includes(q) ||
        b.client?.lastName?.toLowerCase().includes(q) ||
        b.client?.phone?.includes(q) ||
        getLocalizedName(b.serviceOffering?.category, i18n.language).toLowerCase().includes(q),
      );
    }
    const fs = dateMode === 'single' ? dateSingle : dateStart;
    const fe = dateMode === 'single' ? dateSingle : dateEnd;
    if (fs) result = result.filter((b) => toDay(b.scheduledAt ?? b.createdAt) >= fs);
    if (fe) result = result.filter((b) => toDay(b.scheduledAt ?? b.createdAt) <= fe);
    return result;
  }, [bookings, temporalFilter, search, dateMode, dateStart, dateEnd, dateSingle, todayStr]);

  const clearDates = () => { setDateStart(''); setDateEnd(''); setDateSingle(''); };
  const hasDateFilter = dateMode === 'single' ? !!dateSingle : !!(dateStart || dateEnd);
  const activeFiltersCount = (temporalFilter !== 'all' ? 1 : 0) + (search ? 1 : 0) + (hasDateFilter ? 1 : 0);

  const TABS: { key: TemporalFilter; label: string }[] = [
    { key: 'all', label: `${t('common.all')} (${temporalCounts.all})` },
    { key: 'today', label: `${t('common.today')} (${temporalCounts.today})` },
    { key: 'upcoming', label: `${t('common.upcoming')} (${temporalCounts.upcoming})` },
    { key: 'history', label: `${t('common.history')} (${temporalCounts.history})` },
  ];

  const renderBooking = ({ item }: { item: any }) => {
    const isActive = ACTIVE_STATUSES.includes(item.status);
    const needsProConfirm = item.status === 'completed' && !item.proConfirmedCompletion;
    const clientName = item.client ? `${item.client.firstName} ${item.client.lastName}` : '—';
    const serviceName = getLocalizedName(item.serviceOffering?.category ?? item.category, i18n.language);
    const dateStr = item.scheduledAt ?? item.createdAt;

    return (
      <TouchableOpacity onPress={() => navigation.navigate('ProBookingDetails', { bookingId: item.id })}>
        <Card style={[
          styles.bookingCard,
          isActive && styles.activeCard,
          needsProConfirm && styles.confirmRequiredCard,
        ]}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1, marginRight: spacing.sm }}>
                <Text variant="titleMedium" style={styles.cardTitle} numberOfLines={1}>{serviceName}</Text>
                <Text variant="bodySmall" style={styles.clientText} numberOfLines={1}>
                  {clientName}
                </Text>
              </View>
              <Chip
                mode="flat"
                textStyle={{ fontSize: 11, lineHeight: 16, color: colors.white }}
                style={[styles.statusChip, { backgroundColor: STATUS_COLORS[item.status] ?? tokens.text.secondary }]}
              >
                {t('booking_status.' + item.status, { defaultValue: item.status })}
              </Chip>
            </View>

            {/* Date + Adresse */}
            <View style={styles.infoRow}>
              {!!dateStr && (
                <View style={styles.infoItem}>
                  <Icon name="calendar" size={13} color={tokens.text.secondary} />
                  <Text variant="bodySmall" style={styles.infoText} numberOfLines={1}>
                    {formatDate(dateStr)}
                  </Text>
                </View>
              )}
              {!!item.address && (
                <View style={styles.infoItem}>
                  <Icon name="map-marker-outline" size={13} color={tokens.text.secondary} />
                  <Text variant="bodySmall" style={styles.infoText} numberOfLines={1}>
                    {item.address}
                  </Text>
                </View>
              )}
            </View>

            {/* Prix */}
            {item.estimatedPrice > 0 && (
              <View style={[styles.infoItem, { marginTop: 2 }]}>
                <Icon name="cash" size={13} color={tokens.text.secondary} />
                <Text variant="bodySmall" style={styles.infoText}>
                  {item.finalPrice ? `${item.finalPrice} ${CURRENCY_CONFIG.code}` : `~${item.estimatedPrice} ${CURRENCY_CONFIG.code}`}
                </Text>
              </View>
            )}

            {/* Bandeau "Confirmation requise" */}
            {needsProConfirm && (
              <View style={styles.confirmBadge}>
                <Icon name="alert-circle-outline" size={13} color="#D97706" />
                <Text style={styles.confirmBadgeText}>{t('booking.confirm_required_banner')}</Text>
              </View>
            )}
          </Card.Content>
        </Card>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={tokens.primary} />
      </View>
    );
  }

  const renderHeader = () => (
    <>
      {pendingCashCommission > 0 && !commissionPaid ? (
        <View style={styles.commissionAlert}>
          <Icon name="alert-circle" size={20} color={colors.warning} style={{ marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.commissionAlertTitle}>{t('pro_space.cash_commission_due_title')}</Text>
            <Text style={styles.commissionAlertText}>
              {t('pro_space.cash_commission_due_msg', { amount: formatCurrency(pendingCashCommission) })}
            </Text>
            <ChocolateButton
              onPress={handlePayCommissionOnline}
              loading={payingCommission}
              disabled={payingCommission}
              style={styles.commissionPayButton}
              size="sm"
            >
              {t('pro_space.pay_commission_online')}
            </ChocolateButton>
          </View>
        </View>
      ) : (
        <View style={styles.availabilityCard}>
          <View style={styles.availabilityContent}>
            <View>
              <Text variant="titleMedium" style={styles.availabilityTitle}>
                {isAvailable ? `✅ ${t('pro_space.available')}` : `⏸️ ${t('pro_space.unavailable')}`}
              </Text>
              <Text variant="bodySmall" style={styles.availabilitySubtitle}>
                {isAvailable ? t('pro_space.available_subtitle') : t('pro_space.unavailable_subtitle')}
              </Text>
            </View>
            <Switch value={isAvailable} onValueChange={toggleAvailability} trackColor={{ false: tokens.border, true: tokens.primary }} thumbColor={colors.white} />
          </View>
        </View>
      )}

      {pendingBookings.length > 0 && (() => {
        const first = pendingBookings[0];
        const catName = getLocalizedName(first.serviceOffering?.category ?? first.category, i18n.language);
        const clientName = first.client ? `${first.client.firstName} ${first.client.lastName}` : null;
        const price = first.estimatedPrice > 0 ? `~${first.estimatedPrice} ${CURRENCY_CONFIG.code}` : null;
        const subParts = [catName, clientName, price].filter(Boolean);
        return (
          <Animated.View style={bannerAnimStyle}>
            <TouchableOpacity
              style={styles.pendingBanner}
              onPress={() => navigation.navigate('ProBookingDetails', { bookingId: first.id })}
              activeOpacity={0.85}
            >
              <View style={styles.bannerLeft}>
                <Icon name="bell-ring" size={22} color="#FFFFFF" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.bannerTitle}>{t('pro_space.new_bookings_count', { count: pendingBookings.length })}</Text>
                  {subParts.length > 0 && (
                    <Text style={styles.bannerSub} numberOfLines={1}>{subParts.join(' · ')}</Text>
                  )}
                </View>
              </View>
              <Icon name="chevron-right" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </Animated.View>
        );
      })()}

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

      <View style={styles.filtersContainer}>
        <TouchableOpacity style={styles.sectionHeader} onPress={() => setFiltersOpen(o => !o)} activeOpacity={0.7}>
          <Text style={styles.sectionHeaderText}>
            {t('common.filters')}{activeFiltersCount > 0 ? ` · ${activeFiltersCount} actif${activeFiltersCount > 1 ? 's' : ''}` : ''}
          </Text>
          <Text style={styles.chevron}>{filtersOpen ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        {filtersOpen && (
          <View>
            <View style={styles.searchRow}>
              <TextInput style={styles.searchInput} value={search} onChangeText={setSearch} placeholder={t('pro_space.search_placeholder')} placeholderTextColor={tokens.text.secondary} returnKeyType="search" />
              {!!search && <TouchableOpacity onPress={() => setSearch('')} style={styles.searchClear}><Text style={styles.clearBtn}>✕</Text></TouchableOpacity>}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
              {TABS.map(tab => (
                <TouchableOpacity key={tab.key} onPress={() => setTemporalFilter(tab.key)} style={[styles.tab, temporalFilter === tab.key && styles.tabActive]}>
                  <Text style={[styles.tabText, temporalFilter === tab.key && styles.tabTextActive]}>{tab.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.dateModeRow}>
              <TouchableOpacity onPress={() => { setDateMode('range'); clearDates(); }} style={[styles.dateModeBtn, dateMode === 'range' && styles.dateModeBtnActive]}>
                <Text style={[styles.dateModeBtnText, dateMode === 'range' && styles.dateModeBtnTextActive]}>{t('common.period')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setDateMode('single'); clearDates(); }} style={[styles.dateModeBtn, dateMode === 'single' && styles.dateModeBtnActive]}>
                <Text style={[styles.dateModeBtnText, dateMode === 'single' && styles.dateModeBtnTextActive]}>{t('common.single_date')}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.dateRangeRow}>
              {dateMode === 'single' ? (
                <TextInput style={[styles.dateInput, { flex: 1 }]} value={dateSingle} onChangeText={setDateSingle} placeholder="AAAA-MM-JJ" placeholderTextColor={tokens.text.secondary} keyboardType="numeric" maxLength={10} />
              ) : (
                <View style={styles.dateRangeInner}>
                  <Text style={styles.dateLabel}>{t('common.from')}</Text>
                  <TextInput style={styles.dateInput} value={dateStart} onChangeText={setDateStart} placeholder={t('common.date_placeholder')} placeholderTextColor={tokens.text.secondary} keyboardType="numeric" maxLength={10} />
                  <Text style={styles.dateLabel}>{t('common.to')}</Text>
                  <TextInput style={styles.dateInput} value={dateEnd} onChangeText={setDateEnd} placeholder={t('common.date_placeholder')} placeholderTextColor={tokens.text.secondary} keyboardType="numeric" maxLength={10} />
                </View>
              )}
              {hasDateFilter && <TouchableOpacity onPress={clearDates}><Text style={styles.clearBtn}>✕</Text></TouchableOpacity>}
            </View>
            <Text style={styles.countText}>
              {filteredBookings.length} mission{filteredBookings.length !== 1 ? 's' : ''}
              {filteredBookings.length !== bookings.length ? ` / ${bookings.length}` : ''}
            </Text>
          </View>
        )}
      </View>
    </>
  );

  return (
    <View style={styles.container}>
      {renderHeader()}
      <FlatList
        data={filteredBookings}
        renderItem={renderBooking}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[tokens.primary]} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="briefcase-search-outline" size={80} color={tokens.text.secondary} />
            <Text variant="titleMedium" style={styles.emptyText}>{t('pro_space.no_bookings')}</Text>
            <Text variant="bodyMedium" style={styles.emptySubtext}>{t('pro_space.no_bookings_hint')}</Text>
          </View>
        }
      />
      <FAB icon="cash-multiple" style={styles.fab} onPress={() => navigation.navigate('ProEarnings')} label={t('pro_space.earnings_title')} />
    </View>
  );
};


