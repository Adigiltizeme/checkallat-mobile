import React, { useMemo } from 'react';
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
import {
  useGetMyConversationsListQuery,
  ConversationSummary,
} from '../../store/api/communicationApi';
import { useRefetchOnFocus } from '../../hooks/useRefetchOnFocus';
import { colors } from '../../theme/colors';
import { useAppTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/spacing';

const ENTITY_ICON: Record<string, string> = {
  booking: 'briefcase-check',
  transport: 'truck-fast',
  order: 'store',
};

export const MessagesScreen = () => {
  const { t, i18n } = useTranslation();
  const { tokens } = useAppTheme();

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: tokens.background },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
    emptyText: { color: tokens.text.secondary, fontSize: 14, textAlign: 'center' },

    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: 14,
      backgroundColor: tokens.card,
      gap: spacing.sm,
    },
    avatar: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: `${tokens.primary}15`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarActive: { backgroundColor: tokens.primary },

    rowBody: { flex: 1 },
    rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
    name: { fontSize: 15, color: tokens.text.primary, flex: 1, marginRight: 8 },
    nameBold: { fontWeight: '700' },
    time: { fontSize: 11, color: tokens.text.secondary },
    preview: { fontSize: 13, color: tokens.text.secondary },
    previewBold: { color: tokens.text.primary, fontWeight: '600' },

    badge: {
      minWidth: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: tokens.primary,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
    },
    badgeText: { color: colors.white, fontSize: 11, fontWeight: '700' },

    separator: { height: 1, backgroundColor: tokens.backgroundAlt, marginLeft: 74 },
  }), [tokens]);
  const navigation = useNavigation<any>();
  const [refreshing, setRefreshing] = React.useState(false);

  const { data = [], isLoading, refetch } = useGetMyConversationsListQuery(undefined, {
    pollingInterval: 8000,
    refetchOnMountOrArgChange: true,
  });
  useRefetchOnFocus(refetch);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const items: ConversationSummary[] = Array.isArray(data) ? data : [];

  const renderItem = ({ item }: { item: ConversationSummary }) => {
    const icon = ENTITY_ICON[item.entityType] ?? 'message';
    const hasUnread = item.unreadCount > 0;
    const timeLabel = item.lastMessageAt
      ? new Date(item.lastMessageAt).toLocaleTimeString(i18n.language, {
        hour: '2-digit',
        minute: '2-digit',
      })
      : '';

    return (
      <TouchableOpacity
        style={styles.row}
        activeOpacity={0.75}
        onPress={() =>
          navigation.navigate('BookingChat', {
            entityType: item.entityType,
            entityId: item.entityId,
            otherPartyName: item.otherPartyName,
          })
        }
      >
        <View style={[styles.avatar, hasUnread && styles.avatarActive]}>
          <Icon name={icon} size={22} color={hasUnread ? colors.white : tokens.primary} />
        </View>

        <View style={styles.rowBody}>
          <View style={styles.rowHeader}>
            <Text style={[styles.name, hasUnread && styles.nameBold]} numberOfLines={1}>
              {item.otherPartyName}
            </Text>
            <Text style={styles.time}>{timeLabel}</Text>
          </View>
          <Text style={[styles.preview, hasUnread && styles.previewBold]} numberOfLines={1}>
            {item.lastMessage ?? '—'}
          </Text>
        </View>

        {hasUnread && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{item.unreadCount > 9 ? '9+' : item.unreadCount}</Text>
          </View>
        )}
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
        <Icon name="message-off-outline" size={48} color={tokens.border} />
        <Text style={styles.emptyText}>{t('messages.empty')}</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={items}
      keyExtractor={(item) => `${item.entityType}-${item.entityId}`}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[tokens.primary]} />
      }
      renderItem={renderItem}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />
  );
};
