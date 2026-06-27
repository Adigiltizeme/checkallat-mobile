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
import { useAppTheme } from '../../theme/ThemeProvider';
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
  const { tokens } = useAppTheme();


  const styles = useMemo(() => StyleSheet.create({
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
  tabActive: { backgroundColor: tokens.primary },
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
  dateModeBtnActive: { backgroundColor: `${tokens.primary}20`, borderColor: tokens.primary },
  dateModeBtnText: { fontSize: 12, color: colors.gray },
  dateModeBtnTextActive: { color: tokens.primary, fontWeight: '600' },

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
    backgroundColor: tokens.primary + '15',
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
  }), [tokens]);

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

    return result;
  }, [bookings, temporalFilter, search, dateMode, dateSingle, dateStart, dateEnd, todayStr]);

  // TODO: restore renderItem and JSX return
  return null;
};
