import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Text } from 'react-native-paper';
import { StackScreenProps } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { getLocalizedName } from '../../utils/localize';
import { HomeStackParamList } from '../../navigation/types';
import { useGetProByIdQuery } from '../../store/api/prosApi';
import { useGetProOfferingsQuery } from '../../store/api/servicesApi';
import { useRefetchOnFocus } from '../../hooks/useRefetchOnFocus';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

type Props = StackScreenProps<HomeStackParamList, 'ProDetail'>;

const StarRow = ({ rating }: { rating: number }) => {
  const stars = [1, 2, 3, 4, 5];
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {stars.map((s) => (
        <Icon
          key={s}
          name={s <= Math.round(rating) ? 'star' : 'star-outline'}
          size={14}
          color="#F8B400"
        />
      ))}
    </View>
  );
};

export const ProDetailScreen = ({ route, navigation }: Props) => {
  const { t, i18n } = useTranslation();
  const { proId } = route.params;

  const { data: pro, isLoading, refetch } = useGetProByIdQuery(proId, {
    pollingInterval: 8000,
    refetchOnMountOrArgChange: true,
  });
  const { data: offerings = [] } = useGetProOfferingsQuery(proId, {
    refetchOnMountOrArgChange: true,
  });
  useRefetchOnFocus(refetch);

  if (isLoading || !pro) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  const name = pro.user
    ? `${pro.user.firstName} ${pro.user.lastName}`
    : pro.companyName ?? '—';
  const firstLetter = name.charAt(0).toUpperCase();
  const availableOfferings: any[] = offerings.filter((o: any) => o.isAvailable !== false);

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatarWrap}>
            <Text style={styles.avatarLetter}>{firstLetter}</Text>
          </View>
          <Text style={styles.proName}>{name}</Text>
          {pro.companyName && name !== pro.companyName && (
            <Text style={styles.companyName}>{pro.companyName}</Text>
          )}

          {/* Rating + badges */}
          <View style={styles.ratingRow}>
            <StarRow rating={pro.totalReviews > 0 ? (pro.averageRating ?? 0) : 5} />
            <Text style={styles.ratingText}>
              {pro.totalReviews > 0 ? pro.averageRating.toFixed(1) : '5.0'}
            </Text>
            {pro.totalReviews > 0 && (
              <Text style={styles.reviewsCount}>
                {t('services.reviews_count', { count: pro.totalReviews })}
              </Text>
            )}
          </View>

          <View style={styles.badgesRow}>
            {pro.isStudyltizemeGraduate && (
              <View style={styles.badgeStudy}>
                <Text style={styles.badgeText}>✦ {t('pros.graduated')}</Text>
              </View>
            )}
            {pro.segment === 'premium' && (
              <View style={styles.badgePremium}>
                <Text style={styles.badgePremiumText}>★ {t('pros.segment_premium')}</Text>
              </View>
            )}
          </View>
        </View>

        {/* About */}
        {pro.bio ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('pros.about')}</Text>
            <Text style={styles.bioText}>{pro.bio}</Text>
          </View>
        ) : null}

        {/* Zone + stats */}
        <View style={styles.statsGrid}>
          {pro.serviceAreaRadius && (
            <View style={styles.statCard}>
              <Icon name="map-marker-radius" size={22} color={colors.primary} />
              <Text style={styles.statValue}>{pro.serviceAreaRadius} km</Text>
              <Text style={styles.statLabel}>{t('pros.service_area')}</Text>
            </View>
          )}
          {pro.acceptanceRate !== undefined && (
            <View style={styles.statCard}>
              <Icon name="check-circle-outline" size={22} color={colors.success} />
              <Text style={styles.statValue}>{Math.round(pro.acceptanceRate)}%</Text>
              <Text style={styles.statLabel}>{t('pros.acceptance_rate', { rate: Math.round(pro.acceptanceRate) })}</Text>
            </View>
          )}
          {pro.totalReviews > 0 && (
            <View style={styles.statCard}>
              <Icon name="briefcase-check-outline" size={22} color={colors.info} />
              <Text style={styles.statValue}>{pro.totalReviews}</Text>
              <Text style={styles.statLabel}>{t('pros.completed_jobs', { count: pro.totalReviews })}</Text>
            </View>
          )}
        </View>

        {/* Services */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('pros.services_offered')}</Text>
          {availableOfferings.length === 0 ? (
            <Text style={styles.emptyText}>{t('pros.no_offerings')}</Text>
          ) : (
            availableOfferings.map((offering: any) => (
              <TouchableOpacity
                key={offering.id}
                style={styles.offeringCard}
                onPress={() => navigation.navigate('CreateBooking', { proId, offeringId: offering.id })}
                activeOpacity={0.85}
              >
                <View style={styles.offeringInfo}>
                  <Text style={styles.offeringName}>
                    {getLocalizedName(offering.category, i18n.language)}
                  </Text>
                  {offering.description ? (
                    <Text style={styles.offeringDesc} numberOfLines={2}>{offering.description}</Text>
                  ) : null}
                </View>
                <View style={styles.offeringPriceWrap}>
                  <Text style={styles.offeringPrice}>
                    {offering.priceMin
                      ? offering.priceMax
                        ? `${offering.priceMin}–${offering.priceMax}`
                        : `${offering.priceMin}+`
                      : t('pros.price_on_quote')}
                  </Text>
                  {offering.priceMin && (
                    <Text style={styles.offeringCurrency}>EGP</Text>
                  )}
                  <Icon name="chevron-right" size={18} color={colors.border} style={{ marginLeft: 4 }} />
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Reviews */}
        {pro.reviews?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('pros.reviews')}</Text>
            {pro.reviews.slice(0, 3).map((review: any) => (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewerName}>
                    {review.client?.firstName ?? '?'}
                  </Text>
                  <StarRow rating={review.rating} />
                </View>
                {review.comment ? (
                  <Text style={styles.reviewComment}>{review.comment}</Text>
                ) : null}
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Sticky CTA */}
      {availableOfferings.length > 0 && (
        <View style={styles.ctaBar}>
          <TouchableOpacity
            style={styles.ctaBtn}
            onPress={() => navigation.navigate('CreateBooking', { proId })}
            activeOpacity={0.85}
          >
            <Icon name="calendar-plus" size={20} color={colors.white} />
            <Text style={styles.ctaBtnText}>{t('pros.book_cta')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.light },
  content: { paddingBottom: spacing.xl },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: colors.gray, fontSize: 14 },

  // Header
  header: {
    backgroundColor: colors.white, alignItems: 'center',
    paddingTop: spacing.xl, paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  avatarWrap: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: colors.primary + '20',
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm,
  },
  avatarLetter: { fontSize: 30, fontWeight: '700', color: colors.primary },
  proName: { fontSize: 20, fontWeight: '700', color: colors.dark, textAlign: 'center' },
  companyName: { fontSize: 13, color: colors.gray, marginTop: 2, textAlign: 'center' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm },
  ratingText: { fontSize: 14, fontWeight: '600', color: colors.dark },
  reviewsCount: { fontSize: 12, color: colors.gray },
  badgesRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, flexWrap: 'wrap', justifyContent: 'center' },
  badgeStudy: { backgroundColor: '#FEF3C7', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontWeight: '700', color: '#92400E' },
  badgePremium: { backgroundColor: colors.primary + '20', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  badgePremiumText: { fontSize: 12, fontWeight: '700', color: colors.primary },

  // Section
  section: { padding: spacing.lg },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.dark, marginBottom: spacing.md },
  bioText: { fontSize: 14, color: colors.gray, lineHeight: 22 },
  emptyText: { fontSize: 13, color: colors.gray, fontStyle: 'italic' },

  // Stats grid
  statsGrid: {
    flexDirection: 'row', padding: spacing.lg, gap: spacing.md,
    backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.border,
  },
  statCard: {
    flex: 1, alignItems: 'center', backgroundColor: colors.light,
    borderRadius: 12, padding: spacing.md,
  },
  statValue: { fontSize: 16, fontWeight: '700', color: colors.dark, marginTop: 4 },
  statLabel: { fontSize: 11, color: colors.gray, textAlign: 'center', marginTop: 2 },

  // Offerings
  offeringCard: {
    backgroundColor: colors.white, borderRadius: 12, padding: spacing.md,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border,
  },
  offeringInfo: { flex: 1, marginRight: spacing.sm },
  offeringName: { fontSize: 14, fontWeight: '600', color: colors.dark },
  offeringDesc: { fontSize: 12, color: colors.gray, marginTop: 2 },
  offeringPriceWrap: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  offeringPrice: { fontSize: 15, fontWeight: '700', color: colors.primary },
  offeringCurrency: { fontSize: 11, color: colors.gray },

  // Reviews
  reviewCard: {
    backgroundColor: colors.white, borderRadius: 12, padding: spacing.md,
    marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border,
  },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs },
  reviewerName: { fontSize: 13, fontWeight: '600', color: colors.dark },
  reviewComment: { fontSize: 13, color: colors.gray, lineHeight: 20 },

  // CTA
  ctaBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: colors.white, padding: spacing.md,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  ctaBtn: {
    backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
  },
  ctaBtnText: { color: colors.white, fontSize: 16, fontWeight: '700' },
});
