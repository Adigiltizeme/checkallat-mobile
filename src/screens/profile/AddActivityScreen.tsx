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
import { useSelector } from 'react-redux';
import { ProfileStackParamList } from '../../navigation/types';
import { RootState } from '../../store';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

type Props = StackScreenProps<ProfileStackParamList, 'AddActivity'>;

const ACTIVITIES = [
  {
    key: 'driver',
    icon: 'truck-delivery',
    color: '#F59E0B',
    titleKey: 'activity.driver_title',
    descKey: 'activity.driver_desc',
    statusField: 'driver',
    screen: 'DriverApplication' as const,
  },
  {
    key: 'pro',
    icon: 'briefcase-check',
    color: '#10B981',
    titleKey: 'activity.pro_title',
    descKey: 'activity.pro_desc',
    statusField: 'pro',
    screen: 'ProApplication' as const,
  },
  {
    key: 'seller',
    icon: 'store',
    color: '#8B5CF6',
    titleKey: 'activity.seller_title',
    descKey: 'activity.seller_desc',
    statusField: 'marketplaceSeller',
    screen: null, // à implémenter
  },
] as const;

const STATUS_BADGE: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  pending:  { label: 'pending',  color: '#92400E', bg: '#FEF3C7', icon: 'clock-outline' },
  rejected: { label: 'rejected', color: '#7F1D1D', bg: '#FEE2E2', icon: 'alert-circle-outline' },
  active:   { label: 'active',   color: '#065F46', bg: '#D1FAE5', icon: 'check-circle-outline' },
  suspended:{ label: 'suspended',color: '#7F1D1D', bg: '#FEE2E2', icon: 'pause-circle-outline' },
};

export const AddActivityScreen = ({ navigation }: Props) => {
  const { t } = useTranslation();
  const user = useSelector((state: RootState) => state.auth.user);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      <Text style={styles.pageTitle}>{t('activity.page_title')}</Text>
      <Text style={styles.pageSubtitle}>{t('activity.page_subtitle')}</Text>

      {ACTIVITIES.map((activity) => {
        const record = user?.[activity.statusField];
        const status = record?.status ?? null;
        const isActive = status === 'active';
        const badge = status ? STATUS_BADGE[status] : null;

        return (
          <TouchableOpacity
            key={activity.key}
            style={[styles.activityCard, isActive && styles.activityCardActive]}
            onPress={() => {
              if (activity.screen) {
                navigation.navigate(activity.screen);
              }
            }}
            activeOpacity={activity.screen ? 0.85 : 1}
            disabled={!activity.screen || isActive}
          >
            <View style={[styles.activityIcon, { backgroundColor: activity.color + '20' }]}>
              <Icon name={activity.icon} size={28} color={activity.color} />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.activityTitle}>{t(activity.titleKey)}</Text>
              <Text style={styles.activityDesc}>{t(activity.descKey)}</Text>

              {badge && (
                <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                  <Icon name={badge.icon} size={12} color={badge.color} />
                  <Text style={[styles.statusText, { color: badge.color }]}>
                    {t(`activity.status_${badge.label}`)}
                  </Text>
                </View>
              )}

              {!activity.screen && (
                <View style={styles.comingSoonBadge}>
                  <Text style={styles.comingSoonText}>{t('activity.coming_soon')}</Text>
                </View>
              )}
            </View>

            {activity.screen && !isActive && (
              <Icon name="chevron-right" size={22} color={colors.border} />
            )}
            {isActive && (
              <Icon name="check-circle" size={22} color={activity.color} />
            )}
          </TouchableOpacity>
        );
      })}

      <View style={styles.infoBox}>
        <Icon name="information-outline" size={16} color={colors.gray} />
        <Text style={styles.infoText}>{t('activity.info_note')}</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.light },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },

  pageTitle: { fontSize: 20, fontWeight: '700', color: colors.dark, marginBottom: spacing.xs },
  pageSubtitle: { fontSize: 14, color: colors.gray, lineHeight: 22, marginBottom: spacing.lg },

  activityCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.white, borderRadius: 16, padding: spacing.md,
    marginBottom: spacing.md, borderWidth: 1.5, borderColor: colors.border,
  },
  activityCardActive: { borderColor: '#10B981', backgroundColor: '#10B98108' },
  activityIcon: {
    width: 56, height: 56, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  activityTitle: { fontSize: 15, fontWeight: '700', color: colors.dark, marginBottom: 2 },
  activityDesc: { fontSize: 13, color: colors.gray, lineHeight: 18 },

  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
    alignSelf: 'flex-start', marginTop: spacing.xs,
  },
  statusText: { fontSize: 11, fontWeight: '700' },

  comingSoonBadge: {
    backgroundColor: colors.border + '80', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginTop: spacing.xs,
  },
  comingSoonText: { fontSize: 11, color: colors.gray, fontWeight: '600' },

  infoBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs,
    backgroundColor: colors.white, borderRadius: 12, padding: spacing.md,
    marginTop: spacing.sm, borderWidth: 1, borderColor: colors.border,
  },
  infoText: { flex: 1, fontSize: 12, color: colors.gray, lineHeight: 18 },
});
