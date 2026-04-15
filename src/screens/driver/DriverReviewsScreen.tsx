import React, { useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { StackScreenProps } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { useGetDriverReviewsQuery } from '../../store/api/reviewsApi';
import { ReviewCard } from '../../components/ReviewCard';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';

type Props = StackScreenProps<any, 'DriverReviews'>;

export const DriverReviewsScreen = ({ route, navigation }: Props) => {
  const { t } = useTranslation();
  const { driverId } = route.params as { driverId?: string };
  const currentUserDriverId = useSelector((state: RootState) => state.auth.driverId);

  // Utiliser le driverId passé en paramètre ou celui de l'utilisateur connecté
  const targetDriverId = driverId || currentUserDriverId;

  const [page, setPage] = useState(1);
  const { data, isLoading, isFetching, refetch } = useGetDriverReviewsQuery(
    { driverId: targetDriverId || '', page, limit: 10 },
    { skip: !targetDriverId }
  );

  const handleRefresh = () => {
    setPage(1);
    refetch();
  };

  const handleLoadMore = () => {
    if (data?.pagination && page < data.pagination.totalPages) {
      setPage(page + 1);
    }
  };

  if (!targetDriverId) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{t('driver.no_driver_found')}</Text>
      </View>
    );
  }

  if (isLoading && page === 1) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!data || data.reviews.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{t('driver.no_reviews_yet')}</Text>
        <Text style={styles.emptySubtext}>
          {t('driver.no_reviews_hint')}
        </Text>
      </View>
    );
  }

  const renderFooter = () => {
    if (!isFetching || page === 1) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Stats Header */}
      <View style={styles.statsHeader}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{data.pagination.total}</Text>
          <Text style={styles.statLabel}>{t('driver.reviews_count_label')}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statValue}>
            {data.reviews.length > 0
              ? (
                  data.reviews.reduce((sum, r) => sum + r.rating, 0) /
                  data.reviews.length
                ).toFixed(1)
              : '0.0'}
          </Text>
          <Text style={styles.statLabel}>{t('driver.stats_rating')}</Text>
        </View>
      </View>

      {/* Reviews List */}
      <FlatList
        data={data.reviews}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ReviewCard review={item} showDriverResponse />}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && page === 1}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  statsHeader: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    padding: spacing.lg,
    elevation: 2,
    marginBottom: spacing.md,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primary,
  },
  statLabel: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  list: {
    padding: spacing.lg,
  },
  footerLoader: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
});
