import React, { useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { StackScreenProps } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { useGetProReviewsQuery } from '../../store/api/reviewsApi';
import { ReviewCard } from '../../components/ReviewCard';
import { ProStackParamList } from '../../navigation/types';
import { RootState } from '../../store';

type Props = StackScreenProps<ProStackParamList, 'ProReviews'>;

const PRO_GREEN = '#10B981';

export const ProReviewsScreen = ({ route }: Props) => {
  const { t } = useTranslation();
  const currentPro = useSelector((state: RootState) => (state.auth.user as any)?.pro);
  const paramProId = (route.params as any)?.proId;
  const proId: string = paramProId || currentPro?.id || '';

  const [page, setPage] = useState(1);
  const { data, isLoading, isFetching, refetch } = useGetProReviewsQuery(
    { proId, page, limit: 10 },
    { skip: !proId },
  );

  const handleRefresh = () => { setPage(1); refetch(); };
  const handleLoadMore = () => {
    if (data?.pagination && page < data.pagination.totalPages) setPage(p => p + 1);
  };

  if (!proId) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{t('common.error')}</Text>
      </View>
    );
  }

  if (isLoading && page === 1) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={PRO_GREEN} /></View>;
  }

  if (!data || data.reviews.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{t('driver.no_reviews_yet')}</Text>
        <Text style={styles.emptySubtext}>{t('driver.no_reviews_hint')}</Text>
      </View>
    );
  }

  const avgRating = data.reviews.length > 0
    ? (data.reviews.reduce((sum, r) => sum + r.rating, 0) / data.reviews.length).toFixed(1)
    : '5.0';

  return (
    <View style={styles.container}>
      <View style={styles.statsHeader}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{data.pagination.total}</Text>
          <Text style={styles.statLabel}>{t('driver.reviews_count_label')}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{avgRating}</Text>
          <Text style={styles.statLabel}>{t('driver.stats_rating')}</Text>
        </View>
      </View>

      <FlatList
        data={data.reviews}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ReviewCard review={item} />}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={isFetching && page === 1} onRefresh={handleRefresh} colors={[PRO_GREEN]} />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isFetching && page > 1 ? (
            <View style={styles.footerLoader}><ActivityIndicator size="small" color={PRO_GREEN} /></View>
          ) : null
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.light },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  emptyText: { fontSize: 18, fontWeight: '600', color: colors.text.primary, textAlign: 'center', marginBottom: spacing.sm },
  emptySubtext: { fontSize: 14, color: colors.text.secondary, textAlign: 'center' },
  statsHeader: { flexDirection: 'row', backgroundColor: colors.white, padding: spacing.lg, elevation: 2, marginBottom: spacing.md },
  statBox: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, backgroundColor: colors.border, marginHorizontal: spacing.md },
  statValue: { fontSize: 32, fontWeight: 'bold', color: '#10B981' },
  statLabel: { fontSize: 14, color: colors.text.secondary, marginTop: spacing.xs },
  list: { padding: spacing.lg },
  footerLoader: { paddingVertical: spacing.lg, alignItems: 'center' },
});
