import React, { useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { Text } from 'react-native-paper';
import { StackScreenProps } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { HomeStackParamList } from '../../navigation/types';
import { useSearchProsQuery } from '../../store/api/prosApi';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { useRefetchOnFocus } from '../../hooks/useRefetchOnFocus';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

type Props = StackScreenProps<HomeStackParamList, 'SearchPros'>;

const CATEGORY_META: Record<string, { icon: string; color: string }> = {
  transport:   { icon: 'truck-fast',      color: '#F8B400' },
  electric:    { icon: 'flash',           color: '#F39C12' },
  electricity: { icon: 'flash',           color: '#F39C12' },
  plumbing:    { icon: 'water-pump',      color: '#3498DB' },
  painting:    { icon: 'format-paint',    color: '#E74C3C' },
  cleaning:    { icon: 'broom',           color: '#27AE60' },
  handyman:    { icon: 'tools',           color: '#9B59B6' },
  bricolage:   { icon: 'tools',           color: '#9B59B6' },
};

const RATING_OPTIONS = [0, 3, 4, 4.5];
const DISTANCE_OPTIONS = [5, 10, 20, 50];

export const SearchProsScreen = ({ route, navigation }: Props) => {
  const { t } = useTranslation();
  const { category } = route.params;
  const { userLat, userLng } = useSelector((state: RootState) => state.location);

  const [showFilters, setShowFilters] = useState(false);
  const [minRating, setMinRating] = useState(0);
  const [maxDistance, setMaxDistance] = useState(20);
  const [segment, setSegment] = useState<'all' | 'standard' | 'premium'>('all');
  const [studyltizemeOnly, setStudyltizemeOnly] = useState(false);

  const { data, isLoading, refetch } = useSearchProsQuery(
    {
      category,
      userLat: userLat ?? undefined,
      userLng: userLng ?? undefined,
      minRating: minRating > 0 ? minRating : undefined,
      maxDistance,
      segment: segment === 'all' ? undefined : segment,
      studyltizemeOnly: studyltizemeOnly || undefined,
    },
    { pollingInterval: 8000, refetchOnMountOrArgChange: true },
  );
  useRefetchOnFocus(refetch);

  const pros: any[] = data?.pros ?? (Array.isArray(data) ? data : []);
  const meta = CATEGORY_META[category] ?? { icon: 'briefcase-outline', color: colors.primary };

  const renderPro = ({ item }: { item: any }) => {
    const pro = item.pro ?? item;
    const distance: number | undefined = item.distance;
    const name = pro.user
      ? `${pro.user.firstName} ${pro.user.lastName}`
      : pro.companyName ?? '—';
    const firstLetter = name.charAt(0).toUpperCase();

    return (
      <TouchableOpacity
        style={styles.proCard}
        onPress={() => navigation.navigate('ProDetail', { proId: pro.id })}
        activeOpacity={0.85}
      >
        {/* Avatar */}
        <View style={[styles.avatar, { backgroundColor: meta.color + '20' }]}>
          {pro.user?.profilePicture ? (
            <Icon name="account" size={30} color={meta.color} />
          ) : (
            <Text style={[styles.avatarLetter, { color: meta.color }]}>{firstLetter}</Text>
          )}
        </View>

        <View style={styles.proInfo}>
          <View style={styles.proNameRow}>
            <Text style={styles.proName} numberOfLines={1}>{name}</Text>
            <View style={styles.badgesRow}>
              {pro.isStudyltizemeGraduate && (
                <View style={styles.badgeStudy}>
                  <Text style={styles.badgeText}>✦ Studyltizeme</Text>
                </View>
              )}
              {pro.segment === 'premium' && (
                <View style={styles.badgePremium}>
                  <Text style={styles.badgeText}>★ Premium</Text>
                </View>
              )}
            </View>
          </View>

          {pro.companyName && (
            <Text style={styles.companyName} numberOfLines={1}>{pro.companyName}</Text>
          )}

          <View style={styles.statsRow}>
            {/* Rating */}
            <View style={styles.stat}>
              <Icon name="star" size={13} color="#F8B400" />
              <Text style={styles.statText}>
                {pro.totalReviews > 0 ? pro.averageRating.toFixed(1) : '5.0'}
              </Text>
              {pro.totalReviews > 0 && (
                <Text style={styles.statSub}>({pro.totalReviews})</Text>
              )}
            </View>

            {/* Distance */}
            {distance !== undefined && (
              <View style={styles.stat}>
                <Icon name="map-marker-outline" size={13} color={colors.gray} />
                <Text style={styles.statText}>{distance.toFixed(1)} km</Text>
              </View>
            )}

            {/* Price */}
            {pro.serviceOfferings?.length > 0 && (() => {
              const mins = pro.serviceOfferings.map((o: any) => o.priceMin).filter(Boolean);
              const minPrice = mins.length > 0 ? Math.min(...mins) : null;
              return minPrice !== null ? (
                <View style={styles.stat}>
                  <Icon name="tag-outline" size={13} color={colors.gray} />
                  <Text style={styles.statText}>{t('services.from_price', { price: minPrice, currency: 'EGP' })}</Text>
                </View>
              ) : null;
            })()}
          </View>
        </View>

        <Icon name="chevron-right" size={20} color={colors.border} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Filter bar */}
      <View style={styles.filterBar}>
        <View style={[styles.categoryPill, { backgroundColor: meta.color + '18' }]}>
          <Icon name={meta.icon} size={16} color={meta.color} />
          <Text style={[styles.categoryPillText, { color: meta.color }]}>
            {t(`home.service_${category}`, { defaultValue: category })}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.filterBtn, (minRating > 0 || studyltizemeOnly || segment !== 'all') && styles.filterBtnActive]}
          onPress={() => setShowFilters(true)}
        >
          <Icon
            name="tune-variant"
            size={18}
            color={(minRating > 0 || studyltizemeOnly || segment !== 'all') ? colors.primary : colors.gray}
          />
          <Text style={[styles.filterBtnText, (minRating > 0 || studyltizemeOnly || segment !== 'all') && styles.filterBtnTextActive]}>
            {t('common.filters')}
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>{t('common.loading')}</Text>
        </View>
      ) : pros.length === 0 ? (
        <View style={styles.centered}>
          <Icon name="account-search-outline" size={56} color={colors.border} style={{ marginBottom: spacing.md }} />
          <Text style={styles.emptyText}>{t('services.no_pros')}</Text>
          <Text style={styles.emptyHint}>{t('services.no_pros_hint')}</Text>
        </View>
      ) : (
        <FlatList
          data={pros}
          keyExtractor={(item) => (item.pro?.id ?? item.id)}
          renderItem={renderPro}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}

      {/* Filter Modal */}
      <Modal visible={showFilters} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowFilters(false)} activeOpacity={1}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{t('common.filters')}</Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Distance */}
              <Text style={styles.filterLabel}>{t('services.filter_distance')}</Text>
              <View style={styles.chipRow}>
                {DISTANCE_OPTIONS.map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.chip, maxDistance === d && styles.chipActive]}
                    onPress={() => setMaxDistance(d)}
                  >
                    <Text style={[styles.chipText, maxDistance === d && styles.chipTextActive]}>
                      {d} km
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Rating */}
              <Text style={styles.filterLabel}>{t('services.filter_rating')}</Text>
              <View style={styles.chipRow}>
                {RATING_OPTIONS.map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.chip, minRating === r && styles.chipActive]}
                    onPress={() => setMinRating(r)}
                  >
                    <Text style={[styles.chipText, minRating === r && styles.chipTextActive]}>
                      {r === 0 ? t('common.all') : `${r}★+`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Segment */}
              <Text style={styles.filterLabel}>{t('services.filter_segment')}</Text>
              <View style={styles.chipRow}>
                {(['all', 'standard', 'premium'] as const).map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.chip, segment === s && styles.chipActive]}
                    onPress={() => setSegment(s)}
                  >
                    <Text style={[styles.chipText, segment === s && styles.chipTextActive]}>
                      {t(`services.segment_${s}`)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Studyltizeme */}
              <TouchableOpacity
                style={styles.toggleRow}
                onPress={() => setStudyltizemeOnly(!studyltizemeOnly)}
                activeOpacity={0.8}
              >
                <Text style={styles.toggleLabel}>{t('services.studyltizeme_only')}</Text>
                <View style={[styles.toggle, studyltizemeOnly && styles.toggleOn]}>
                  <View style={[styles.toggleThumb, studyltizemeOnly && styles.toggleThumbOn]} />
                </View>
              </TouchableOpacity>
            </ScrollView>

            <TouchableOpacity style={styles.applyBtn} onPress={() => setShowFilters(false)}>
              <Text style={styles.applyBtnText}>{t('common.apply')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.light },

  filterBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.white, paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  categoryPill: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: 20,
  },
  categoryPillText: { fontSize: 13, fontWeight: '600' },
  filterBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.md, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: colors.border,
  },
  filterBtnActive: { borderColor: colors.primary, backgroundColor: colors.primary + '10' },
  filterBtnText: { fontSize: 13, color: colors.gray },
  filterBtnTextActive: { color: colors.primary, fontWeight: '600' },

  list: { padding: spacing.md },
  separator: { height: spacing.sm },

  proCard: {
    backgroundColor: colors.white, borderRadius: 16, padding: spacing.md,
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  avatar: {
    width: 52, height: 52, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarLetter: { fontSize: 22, fontWeight: '700' },
  proInfo: { flex: 1 },
  proNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  proName: { fontSize: 15, fontWeight: '700', color: colors.dark, flex: 1 },
  companyName: { fontSize: 12, color: colors.gray, marginTop: 1 },
  badgesRow: { flexDirection: 'row', gap: 4 },
  badgeStudy: { backgroundColor: '#F59E0B20', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  badgePremium: { backgroundColor: colors.primary + '20', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontWeight: '700', color: colors.dark },
  statsRow: { flexDirection: 'row', gap: spacing.md, marginTop: 6, flexWrap: 'wrap' },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  statText: { fontSize: 12, color: colors.gray },
  statSub: { fontSize: 11, color: colors.border },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyText: { fontSize: 15, fontWeight: '600', color: colors.dark, textAlign: 'center', marginBottom: spacing.xs },
  emptyHint: { fontSize: 13, color: colors.gray, textAlign: 'center' },

  // Filter modal
  modalOverlay: { flex: 1, backgroundColor: '#00000055', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: spacing.lg, paddingBottom: spacing.xl, maxHeight: '80%',
  },
  modalHandle: {
    width: 40, height: 4, backgroundColor: colors.border,
    borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.dark, marginBottom: spacing.lg },
  filterLabel: { fontSize: 13, fontWeight: '600', color: colors.dark, marginBottom: spacing.sm, marginTop: spacing.md },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white,
  },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.primary + '15' },
  chipText: { fontSize: 13, color: colors.gray },
  chipTextActive: { color: colors.primary, fontWeight: '600' },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: spacing.md, paddingVertical: spacing.sm,
  },
  toggleLabel: { fontSize: 14, color: colors.dark, fontWeight: '500' },
  toggle: {
    width: 44, height: 26, borderRadius: 13, backgroundColor: colors.border,
    justifyContent: 'center', padding: 2,
  },
  toggleOn: { backgroundColor: colors.primary },
  toggleThumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.white },
  toggleThumbOn: { alignSelf: 'flex-end' },
  applyBtn: {
    backgroundColor: colors.primary, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginTop: spacing.lg,
  },
  applyBtnText: { color: colors.white, fontSize: 15, fontWeight: '700' },
});
