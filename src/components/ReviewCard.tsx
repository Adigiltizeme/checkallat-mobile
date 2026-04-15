import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Avatar, Divider } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

interface ReviewCardProps {
  review: {
    id: string;
    rating: number;
    punctualityRating?: number;
    qualityRating?: number;
    cleanlinessRating?: number;
    courtesyRating?: number;
    comment?: string;
    createdAt: string;
    client?: {
      firstName: string;
      lastName: string;
      profilePicture?: string;
    };
    proResponse?: string;
    proRespondedAt?: string;
  };
  showDriverResponse?: boolean;
}

export const ReviewCard: React.FC<ReviewCardProps> = ({ review, showDriverResponse = true }) => {
  const { t, i18n } = useTranslation();

  const renderStars = (rating: number) => {
    return (
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={star <= rating ? 'star' : 'star-outline'}
            size={16}
            color={star <= rating ? colors.warning : colors.gray}
            style={styles.star}
          />
        ))}
      </View>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(i18n.language, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <Card style={styles.card}>
      <Card.Content>
        {/* Client Info */}
        <View style={styles.header}>
          <Avatar.Text
            size={40}
            label={
              review.client
                ? getInitials(review.client.firstName, review.client.lastName)
                : '??'
            }
            style={styles.avatar}
          />
          <View style={styles.headerText}>
            <Text style={styles.clientName}>
              {review.client
                ? `${review.client.firstName} ${review.client.lastName}`
                : 'Client'}
            </Text>
            <Text style={styles.date}>{formatDate(review.createdAt)}</Text>
          </View>
        </View>

        {/* Global Rating */}
        <View style={styles.ratingSection}>
          {renderStars(review.rating)}
          <Text style={styles.ratingText}>{review.rating.toFixed(1)}/5</Text>
        </View>

        {/* Detailed Ratings */}
        {(review.punctualityRating ||
          review.qualityRating ||
          review.cleanlinessRating ||
          review.courtesyRating) && (
          <View style={styles.detailedRatings}>
            {review.punctualityRating && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t('driver.punctuality')}</Text>
                {renderStars(review.punctualityRating)}
              </View>
            )}
            {review.qualityRating && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t('driver.quality')}</Text>
                {renderStars(review.qualityRating)}
              </View>
            )}
            {review.cleanlinessRating && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t('driver.cleanliness')}</Text>
                {renderStars(review.cleanlinessRating)}
              </View>
            )}
            {review.courtesyRating && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t('driver.courtesy')}</Text>
                {renderStars(review.courtesyRating)}
              </View>
            )}
          </View>
        )}

        {/* Comment */}
        {review.comment && (
          <Text style={styles.comment}>{review.comment}</Text>
        )}

        {/* Driver Response */}
        {showDriverResponse && review.proResponse && (
          <>
            <Divider style={styles.divider} />
            <View style={styles.responseSection}>
              <Text style={styles.responseLabel}>{t('driver.service_response')}</Text>
              <Text style={styles.responseText}>{review.proResponse}</Text>
              {review.proRespondedAt && (
                <Text style={styles.responseDate}>
                  {formatDate(review.proRespondedAt)}
                </Text>
              )}
            </View>
          </>
        )}
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
    backgroundColor: colors.white,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatar: {
    backgroundColor: colors.primary,
  },
  headerText: {
    marginLeft: spacing.md,
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  date: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 2,
  },
  ratingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  starsRow: {
    flexDirection: 'row',
    marginRight: spacing.sm,
  },
  star: {
    marginRight: 2,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  detailedRatings: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  detailLabel: {
    fontSize: 13,
    color: colors.text.secondary,
    width: 100,
  },
  comment: {
    fontSize: 14,
    color: colors.text.primary,
    lineHeight: 20,
    marginTop: spacing.sm,
  },
  divider: {
    marginVertical: spacing.md,
  },
  responseSection: {
    backgroundColor: colors.light,
    padding: spacing.md,
    borderRadius: 8,
  },
  responseLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  responseText: {
    fontSize: 14,
    color: colors.text.primary,
    lineHeight: 20,
  },
  responseDate: {
    fontSize: 11,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
});
