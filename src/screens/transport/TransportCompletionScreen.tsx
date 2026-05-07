import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Text, Button, TextInput, Divider, ActivityIndicator } from 'react-native-paper';
import { StackScreenProps } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import {
  useClientConfirmCompletionMutation,
  useDriverConfirmCompletionMutation,
  useGetTransportRequestQuery,
} from '../../store/api/transportApi';
import { useRefetchOnFocus } from '../../hooks/useRefetchOnFocus';
import { useCreateTransportReviewMutation } from '../../store/api/reviewsApi';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { Ionicons } from '@expo/vector-icons';

type Props = StackScreenProps<any, 'TransportCompletion'>;

export const TransportCompletionScreen = ({ route, navigation }: Props) => {
  const { requestId } = route.params as { requestId: string };
  const { t } = useTranslation();
  const { data: request, isLoading, refetch } = useGetTransportRequestQuery(requestId, {
    pollingInterval: 5000,
    refetchOnMountOrArgChange: true,
  });
  useRefetchOnFocus(refetch);
  const isDriver = useSelector((state: RootState) => state.auth.isDriver);

  const [clientConfirm] = useClientConfirmCompletionMutation();
  const [driverConfirm] = useDriverConfirmCompletionMutation();
  const [createReview] = useCreateTransportReviewMutation();

  const [notes, setNotes] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);

  const [showReviewForm, setShowReviewForm] = useState(false);
  const [punctualityRating, setPunctualityRating] = useState(0);
  const [qualityRating, setQualityRating] = useState(0);
  const [cleanlinessRating, setCleanlinessRating] = useState(0);
  const [courtesyRating, setCourtesyRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const handleConfirmCompletion = async () => {
    try {
      setIsConfirming(true);

      if (isDriver) {
        await driverConfirm({
          requestId,
          completed: true,
          notes,
        }).unwrap();

        Alert.alert(
          t('transport.completion_saved_title'),
          t('transport.completion_saved_driver_msg'),
          [{ text: t('common.ok'), onPress: () => navigation.goBack() }]
        );
      } else {
        await clientConfirm({
          requestId,
          completed: true,
          notes,
        }).unwrap();

        Alert.alert(
          t('transport.completion_saved_title'),
          t('transport.completion_saved_client_msg'),
          [
            { text: t('transport.completion_review_later'), onPress: () => navigation.goBack() },
            { text: t('transport.completion_leave_review'), onPress: () => setShowReviewForm(true) },
          ]
        );
      }
    } catch (error: any) {
      Alert.alert(t('common.error'), error?.data?.message || t('transport.completion_error_msg'));
    } finally {
      setIsConfirming(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!punctualityRating && !qualityRating && !cleanlinessRating && !courtesyRating) {
      Alert.alert(t('common.error'), t('transport.review_no_rating_error'));
      return;
    }

    try {
      setIsSubmittingReview(true);

      const ratings = [punctualityRating, qualityRating, cleanlinessRating, courtesyRating].filter(r => r > 0);
      const calculatedRating = Math.round(ratings.reduce((sum, r) => sum + r, 0) / ratings.length);

      await createReview({
        transportRequestId: requestId,
        data: {
          transportRequestId: requestId,
          rating: calculatedRating,
          punctualityRating: punctualityRating || undefined,
          qualityRating: qualityRating || undefined,
          cleanlinessRating: cleanlinessRating || undefined,
          courtesyRating: courtesyRating || undefined,
          comment: comment || undefined,
        },
      }).unwrap();

      Alert.alert(
        t('transport.review_success_title'),
        t('transport.review_success_msg'),
        [{ text: t('common.ok'), onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      Alert.alert(t('common.error'), error?.data?.message || t('transport.review_error_msg'));
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const renderStars = (currentRating: number, onPress: (rating: number) => void) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity key={star} onPress={() => onPress(star)}>
            <Ionicons
              name={star <= currentRating ? 'star' : 'star-outline'}
              size={32}
              color={star <= currentRating ? colors.warning : colors.gray}
              style={styles.star}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!request) {
    return (
      <View style={styles.container}>
        <Text>{t('transport.completion_not_found')}</Text>
      </View>
    );
  }

  const alreadyConfirmed = isDriver
    ? request.driverConfirmedCompletion
    : request.clientConfirmedCompletion;

  if (alreadyConfirmed && !showReviewForm) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>{t('transport.completion_already_title')}</Text>
          <Text style={styles.subtitle}>
            {isDriver
              ? t('transport.completion_already_subtitle_driver')
              : t('transport.completion_already_subtitle_client')}
          </Text>
          {!isDriver && (
            <Button
              mode="contained"
              onPress={() => setShowReviewForm(true)}
              style={styles.confirmButton}
              buttonColor={colors.primary}
              icon="star"
            >
              {t('transport.completion_leave_review')}
            </Button>
          )}
          <Button
            mode="outlined"
            onPress={() => navigation.goBack()}
            style={styles.cancelButton}
          >
            {t('common.back')}
          </Button>
        </View>
      </View>
    );
  }

  if (showReviewForm && !isDriver) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>{t('transport.review_title')}</Text>
        <Text style={styles.subtitle}>{t('transport.review_subtitle')}</Text>

        <Divider style={styles.divider} />

        <Text style={styles.sectionTitle}>{t('driver.punctuality')}</Text>
        {renderStars(punctualityRating, setPunctualityRating)}

        <Text style={styles.sectionTitle}>{t('driver.quality')}</Text>
        {renderStars(qualityRating, setQualityRating)}

        <Text style={styles.sectionTitle}>{t('driver.cleanliness')}</Text>
        {renderStars(cleanlinessRating, setCleanlinessRating)}

        <Text style={styles.sectionTitle}>{t('driver.courtesy')}</Text>
        {renderStars(courtesyRating, setCourtesyRating)}

        <Divider style={styles.divider} />

        <TextInput
          label={t('transport.review_comment_label')}
          value={comment}
          onChangeText={setComment}
          mode="outlined"
          multiline
          numberOfLines={4}
          style={styles.input}
          outlineColor={colors.border}
          activeOutlineColor={colors.primary}
        />

        <Button
          mode="contained"
          onPress={handleSubmitReview}
          loading={isSubmittingReview}
          disabled={isSubmittingReview || (!punctualityRating && !qualityRating && !cleanlinessRating && !courtesyRating)}
          style={styles.submitButton}
          buttonColor={colors.primary}
        >
          {t('transport.review_submit')}
        </Button>

        <Button
          mode="text"
          onPress={() => navigation.goBack()}
          disabled={isSubmittingReview}
          style={styles.cancelButton}
        >
          {t('transport.completion_review_later')}
        </Button>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>
        {isDriver ? t('transport.completion_confirm_driver') : t('transport.completion_confirm_client')}
      </Text>

      <Text style={styles.subtitle}>
        {isDriver
          ? t('transport.completion_subtitle_driver')
          : t('transport.completion_subtitle_client')}
      </Text>

      <Divider style={styles.divider} />

      <TextInput
        label={t('transport.instructions_optional')}
        value={notes}
        onChangeText={setNotes}
        mode="outlined"
        multiline
        numberOfLines={3}
        placeholder={t('transport.completion_notes_placeholder')}
        style={styles.input}
        outlineColor={colors.border}
        activeOutlineColor={colors.primary}
      />

      <Button
        mode="contained"
        onPress={handleConfirmCompletion}
        loading={isConfirming}
        disabled={isConfirming}
        style={styles.confirmButton}
        buttonColor={colors.success}
        icon="check-circle"
      >
        {t('common.confirm')}
      </Button>

      <Button
        mode="outlined"
        onPress={() => navigation.goBack()}
        disabled={isConfirming}
        style={styles.cancelButton}
      >
        {t('common.back')}
      </Button>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  divider: {
    marginVertical: spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  input: {
    marginBottom: spacing.md,
    backgroundColor: colors.white,
  },
  confirmButton: {
    marginTop: spacing.lg,
  },
  submitButton: {
    marginTop: spacing.lg,
  },
  cancelButton: {
    marginTop: spacing.md,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  star: {
    marginHorizontal: spacing.xs,
  },
});
