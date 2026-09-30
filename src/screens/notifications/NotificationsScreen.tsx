import React, { useMemo } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppTheme } from '../../theme/ThemeProvider';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { useRefetchOnFocus } from '../../hooks/useRefetchOnFocus';
import { resolveNotificationTarget, useOpenNotification } from '../../hooks/useNotificationRouting';
import {
  AppNotification,
  useGetNotificationsQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
} from '../../store/api/notificationsApi';

/** Icône selon le type de notification */
const iconFor = (n: AppNotification): string => {
  const t = `${n.type} ${n.data?.screen ?? ''}`;
  if (/validation|account_status/.test(t)) return 'account-check-outline';
  if (/marketplace|Seller|Order/.test(t)) return 'shopping-outline';
  if (/transport|assignment|requestId/.test(t) || n.data?.requestId) return 'truck-outline';
  if (/Booking|booking|ProHome/.test(t)) return 'calendar-check-outline';
  if (/speed/.test(t)) return 'speedometer';
  return 'bell-outline';
};

/**
 * Notifications reçues par l'utilisateur (cloche de l'accueil). Toucher une notification la marque
 * comme lue et ouvre l'écran concerné, comme une notification reçue sur le téléphone.
 */
export const NotificationsScreen = () => {
  const { t, i18n } = useTranslation();
  const { tokens } = useAppTheme();
  const openTarget = useOpenNotification();
  const { data, isLoading, isFetching, refetch } = useGetNotificationsQuery(1, {
    pollingInterval: 30_000,
    refetchOnMountOrArgChange: true,
  });
  useRefetchOnFocus(refetch);
  const [markRead] = useMarkNotificationReadMutation();
  const [markAllRead, { isLoading: markingAll }] = useMarkAllNotificationsReadMutation();

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: tokens.background },
    toolbar: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: spacing.md, paddingTop: spacing.sm },
    markAll: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: spacing.xs },
    markAllText: { color: tokens.primary, fontWeight: '600', fontSize: 13 },
    list: { padding: spacing.md, gap: spacing.sm, flexGrow: 1 },
    item: {
      flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderRadius: 14,
      backgroundColor: tokens.card, borderWidth: 1, borderColor: tokens.border,
    },
    itemUnread: { borderColor: tokens.primary, backgroundColor: tokens.primary + '0F' },
    iconWrap: {
      width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
      backgroundColor: tokens.primary + '18',
    },
    body: { flex: 1, gap: 2 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    title: { flex: 1, fontSize: 14, fontWeight: '700', color: tokens.text.primary },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: tokens.primary },
    message: { fontSize: 13, lineHeight: 18, color: tokens.text.secondary },
    date: { fontSize: 11, color: tokens.text.secondary, marginTop: 2 },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingTop: spacing.xxl },
    emptyText: { color: tokens.text.secondary, textAlign: 'center' },
  }), [tokens]);

  const items = data?.items ?? [];
  const hasUnread = items.some((n) => !n.isRead);

  const handlePress = (n: AppNotification) => {
    if (!n.isRead) markRead(n.id).catch(() => {});
    if (n.data && resolveNotificationTarget(n.data, null)) openTarget(n.data);
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString(i18n.language, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  if (isLoading) {
    return (
      <View style={[styles.container, styles.empty]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {hasUnread && (
        <View style={styles.toolbar}>
          <TouchableOpacity style={styles.markAll} onPress={() => markAllRead()} disabled={markingAll}>
            <Icon name="check-all" size={18} color={tokens.primary} />
            <Text style={styles.markAllText}>{t('notifications.mark_all_read')}</Text>
          </TouchableOpacity>
        </View>
      )}
      <FlatList
        data={items}
        keyExtractor={(n) => n.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="bell-sleep-outline" size={48} color={tokens.text.secondary} />
            <Text style={styles.emptyText}>{t('notifications.empty')}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.item, !item.isRead && styles.itemUnread]}
            activeOpacity={0.8}
            onPress={() => handlePress(item)}
          >
            <View style={styles.iconWrap}>
              <Icon name={iconFor(item)} size={22} color={tokens.primary} />
            </View>
            <View style={styles.body}>
              <View style={styles.titleRow}>
                <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
                {!item.isRead && <View style={styles.dot} accessibilityLabel={t('notifications.unread')} />}
              </View>
              <Text style={styles.message}>{item.message}</Text>
              <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};
