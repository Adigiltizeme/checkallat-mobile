import React, { useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Text, ActivityIndicator, FAB } from 'react-native-paper';
import { StackScreenProps } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { ProfileStackParamList } from '../../navigation/types';
import {
  useGetSavedCardsQuery,
  useSetDefaultCardMutation,
  useDeleteCardMutation,
  SavedCard,
} from '../../store/api/savedCardsApi';
import { useRefetchOnFocus } from '../../hooks/useRefetchOnFocus';
import { colors } from '../../theme/colors';
import { useAppTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/spacing';

type Props = StackScreenProps<ProfileStackParamList, 'SavedCards'>;

const BRAND_ICONS: Record<string, string> = {
  visa: 'credit-card',
  mastercard: 'credit-card',
  amex: 'credit-card',
  discover: 'credit-card',
};

export const SavedCardsScreen = ({ navigation }: Props) => {
  const { tokens } = useAppTheme();
  const { t } = useTranslation();

  const { data, isLoading, refetch } = useGetSavedCardsQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  useRefetchOnFocus(refetch);

  const [setDefault, { isLoading: isSettingDefault }] = useSetDefaultCardMutation();
  const [deleteCard, { isLoading: isDeleting }] = useDeleteCardMutation();

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: tokens.background },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    list: { padding: spacing.md, gap: spacing.sm },
    card: {
      backgroundColor: tokens.card,
      borderRadius: 12,
      padding: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
    },
    cardDefault: {
      borderWidth: 1.5,
      borderColor: tokens.primary,
    },
    cardIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: tokens.primary + '15',
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardBody: { flex: 1 },
    cardTitle: { color: tokens.text.primary, fontWeight: '600', textTransform: 'capitalize' },
    cardSub: { color: tokens.text.secondary, fontSize: 13, marginTop: 2 },
    defaultBadge: {
      backgroundColor: tokens.primary,
      borderRadius: 10,
      paddingHorizontal: 8,
      paddingVertical: 2,
      alignSelf: 'flex-start',
      marginTop: 4,
    },
    defaultBadgeText: { color: colors.white, fontSize: 11, fontWeight: '700' },
    actions: { flexDirection: 'row', gap: 4 },
    actionBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: tokens.backgroundAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
    emptyIcon: { fontSize: 52, marginBottom: spacing.md },
    emptyTitle: { color: tokens.text.primary, fontWeight: '600', marginBottom: 8 },
    emptyHint: { color: tokens.text.secondary, textAlign: 'center' },
    fab: { position: 'absolute', right: spacing.lg, bottom: spacing.xl, backgroundColor: tokens.primary },
  }), [tokens]);

  const handleSetDefault = async (card: SavedCard) => {
    if (card.isDefault) return;
    try {
      await setDefault(card.id).unwrap();
    } catch {
      Alert.alert(t('common.error'), t('saved_cards.error_set_default'));
    }
  };

  const handleDelete = (card: SavedCard) => {
    Alert.alert(
      t('saved_cards.delete_confirm_title'),
      t('saved_cards.delete_confirm_msg', { last4: card.last4 }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCard(card.id).unwrap();
            } catch {
              Alert.alert(t('common.error'), t('saved_cards.error_delete'));
            }
          },
        },
      ],
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={tokens.primary} />
      </View>
    );
  }

  const cards = data?.cards ?? [];

  const renderCard = ({ item }: { item: SavedCard }) => (
    <View style={[styles.card, item.isDefault && styles.cardDefault]}>
      <View style={styles.cardIcon}>
        <Icon name={BRAND_ICONS[item.brand] ?? 'credit-card'} size={22} color={tokens.primary} />
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>{item.brand} •••• {item.last4}</Text>
        <Text style={styles.cardSub}>{t('saved_cards.expires')} {String(item.expMonth).padStart(2, '0')}/{item.expYear}</Text>
        {item.isDefault && (
          <View style={styles.defaultBadge}>
            <Text style={styles.defaultBadgeText}>{t('saved_cards.default_badge')}</Text>
          </View>
        )}
      </View>
      <View style={styles.actions}>
        {!item.isDefault && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleSetDefault(item)}
            disabled={isSettingDefault}
          >
            <Icon name="star-outline" size={18} color={tokens.primary} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => handleDelete(item)}
          disabled={isDeleting}
        >
          <Icon name="trash-can-outline" size={18} color={colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {cards.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>💳</Text>
          <Text variant="titleMedium" style={styles.emptyTitle}>{t('saved_cards.empty')}</Text>
          <Text variant="bodySmall" style={styles.emptyHint}>{t('saved_cards.empty_hint')}</Text>
        </View>
      ) : (
        <FlatList
          data={cards}
          keyExtractor={(item) => item.id}
          renderItem={renderCard}
          contentContainerStyle={styles.list}
        />
      )}
      <FAB
        icon="plus"
        style={styles.fab}
        color={colors.white}
        onPress={() => navigation.navigate('AddCard')}
      />
    </View>
  );
};
