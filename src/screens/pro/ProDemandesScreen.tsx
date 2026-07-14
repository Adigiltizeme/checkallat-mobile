import React, { useState, useMemo } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { getLocalizedName } from '../../utils/localize';
import { useGetProDemandesQuery } from '../../store/api/bookingsApi';
import { useRefetchOnFocus } from '../../hooks/useRefetchOnFocus';
import { colors } from '../../theme/colors';
import { useAppTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/spacing';

const STATUS_BADGE: Record<string, { color: string; bg: string; icon: string }> = {
  pending:  { color: '#92400E', bg: '#FEF3C7', icon: 'clock-outline' },
  accepted: { color: '#1E40AF', bg: '#DBEAFE', icon: 'check-circle-outline' },
};

export const ProDemandesScreen = () => {
  const { t, i18n } = useTranslation();
  const { tokens } = useAppTheme();
  const navigation = useNavigation<any>();
  const [refreshing, setRefreshing] = useState(false);

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: tokens.background },
    content: { padding: spacing.md, paddingBottom: spacing.xxl },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
    emptyText: { color: tokens.text.secondary, fontSize: 14, textAlign: 'center' },
    sectionHeader: {
      fontSize: 11, fontWeight: '700', color: tokens.text.secondary,
      textTransform: 'uppercase', letterSpacing: 0.5,
      marginTop: spacing.md, marginBottom: spacing.sm, paddingHorizontal: 2,
    },
    card: {
      backgroundColor: tokens.card, borderRadius: 14,
      padding: spacing.md, marginBottom: spacing.sm,
      borderWidth: 1, borderColor: tokens.border,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
    badge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
    badgeText: { fontSize: 11, fontWeight: '700' },
    cardDate: { fontSize: 11, color: tokens.text.secondary },
    cardTitle: { fontSize: 15, fontWeight: '700', color: tokens.text.primary, marginBottom: spacing.xs },
    cardRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
    cardMeta: { fontSize: 13, color: tokens.text.secondary, flex: 1 },
    chevron: { position: 'absolute', right: spacing.md, top: '50%' },
  }), [tokens]);

  const { data = [], isLoading, refetch } = useGetProDemandesQuery(undefined, {
    pollingInterval: 8000,
    refetchOnMountOrArgChange: true,
  });
  useRefetchOnFocus(refetch);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const items: any[] = Array.isArray(data) ? data : [];
  const pending  = items.filter(b => b.status === 'pending');
  const accepted = items.filter(b => b.status === 'accepted');

  const renderItem = ({ item }: { item: any }) => {
    const badge = STATUS_BADGE[item.status] ?? STATUS_BADGE.pending;
    const cat = item.serviceOffering?.category ?? item.category;
    const catName = cat ? getLocalizedName(cat, i18n.language) : '—';
    const clientName = item.client
      ? `${item.client.firstName} ${item.client.lastName ?? ''}`
      : '—';
    const scheduledAt = item.scheduledAt ? new Date(item.scheduledAt) : null;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('ProBookingDetails', { bookingId: item.id })}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Icon name={badge.icon} size={13} color={badge.color} />
            <Text style={[styles.badgeText, { color: badge.color }]}>
              {t(`booking_status.${item.status}`, { defaultValue: item.status })}
            </Text>
          </View>
          <Text style={styles.cardDate}>
            {scheduledAt
              ? scheduledAt.toLocaleDateString(i18n.language, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
              : t('common.date_tbd')}
          </Text>
        </View>

        <Text style={styles.cardTitle}>{catName}</Text>

        <View style={styles.cardRow}>
          <Icon name="account" size={15} color={tokens.text.secondary} />
          <Text style={styles.cardMeta}>{clientName}</Text>
        </View>

        {item.address ? (
          <View style={styles.cardRow}>
            <Icon name="map-marker-outline" size={15} color={tokens.text.secondary} />
            <Text style={styles.cardMeta} numberOfLines={1}>{item.address}</Text>
          </View>
        ) : null}

        <Icon name="chevron-right" size={20} color={tokens.border} style={styles.chevron} />
      </TouchableOpacity>
    );
  };

  if (isLoading && items.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={tokens.primary} />
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={styles.centered}>
        <Icon name="inbox-outline" size={48} color={tokens.border} />
        <Text style={styles.emptyText}>{t('pro_space.no_demandes')}</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={[
        ...(pending.length > 0 ? [{ _section: t('pro_space.demandes_pending'), _key: 's1' }, ...pending] : []),
        ...(accepted.length > 0 ? [{ _section: t('pro_space.demandes_accepted'), _key: 's2' }, ...accepted] : []),
      ]}
      keyExtractor={(item: any) => item._key ?? item.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[tokens.primary]} />}
      renderItem={({ item }: { item: any }) => {
        if (item._section) {
          return <Text style={styles.sectionHeader}>{item._section}</Text>;
        }
        return renderItem({ item });
      }}
    />
  );
};

