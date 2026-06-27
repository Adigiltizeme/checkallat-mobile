import React, { useMemo } from 'react';
import {
  View, StyleSheet, FlatList, Alert, TouchableOpacity,
} from 'react-native';
import { Text, Divider, ActivityIndicator, FAB } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { ProfileStackParamList } from '../../navigation/types';
import { colors } from '../../theme/colors';
import { useAppTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/spacing';
import {
  PayoutAccount,
  useGetDriverAccountsQuery,
  useGetProAccountsQuery,
  useSetDefaultDriverAccountMutation,
  useSetDefaultProAccountMutation,
  useDeleteDriverAccountMutation,
  useDeleteProAccountMutation,
} from '../../store/api/payoutAccountsApi';

type NavProp = StackNavigationProp<ProfileStackParamList, 'PayoutAccounts'>;

const ACCOUNT_TYPE_ICONS: Record<string, string> = {
  bank_transfer: '🏦',
  instapay: '⚡',
  vodafone_cash: '📱',
  orange_cash: '🟠',
  etisalat_cash: '📲',
  fawry: '💳',
  aman: '🔒',
  orange_money: '🟠',
  inwi_money: '📱',
  barid_cash: '✉️',
  cih_money: '🏦',
  wafacash: '💸',
  poste_tunisienne: '✉️',
  ooredoo_money: '📱',
  temtem: '💜',
  wave: '🌊',
  free_money: '📱',
  mtn_momo: '🟡',
  moov_money: '📱',
  stc_pay: '🔵',
  sadad: '💳',
  etisalat_wallet: '📲',
};

export const PayoutAccountsScreen = () => {
  const { t } = useTranslation();
    const { tokens } = useAppTheme();

  const styles = useMemo(() => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background ?? '#F9FAFB' },
  infoBanner: {
    backgroundColor: '#EFF6FF',
    borderLeftWidth: 4,
    borderLeftColor: tokens.primary,
    margin: spacing.md,
    padding: spacing.md,
    borderRadius: 8,
  },
  infoText: { fontSize: 13, color: '#1E40AF', lineHeight: 18 },
  list: { padding: spacing.md, gap: spacing.sm },
  emptyList: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyIcon: { fontSize: 48, marginBottom: spacing.md },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#111827', textAlign: 'center' },
  emptySubtext: { fontSize: 14, color: colors.gray ?? '#6B7280', marginTop: spacing.sm, textAlign: 'center' },
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardDefault: { borderColor: tokens.primary, borderWidth: 2 },
  cardHeader: { flexDirection: 'row', gap: spacing.sm },
  cardIcon: { fontSize: 28, marginTop: 2 },
  cardInfo: { flex: 1, gap: 2 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs ?? 4, flexWrap: 'wrap' },
  cardType: { fontSize: 15, fontWeight: '700', color: '#111827' },
  defaultBadge: {
    backgroundColor: tokens.primary + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  defaultBadgeText: { fontSize: 10, color: tokens.primary, fontWeight: '600' },
  verifiedBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  verifiedBadgeText: { fontSize: 10, color: '#065F46', fontWeight: '600' },
  cardHolder: { fontSize: 13, color: '#374151', fontWeight: '500' },
  cardDetail: { fontSize: 13, color: '#6B7280', fontFamily: 'monospace' },
  cardCountry: { fontSize: 11, color: '#9CA3AF' },
  cardActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  actionBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: tokens.primary,
  },
  actionBtnDanger: { borderColor: '#EF4444' },
  actionBtnText: { fontSize: 12, color: tokens.primary, fontWeight: '600' },
  actionBtnTextDanger: { color: '#EF4444' },
  fab: {
    position: 'absolute',
    bottom: spacing.lg,
    right: spacing.lg,
    backgroundColor: tokens.primary,
  },
  }), [tokens]);
const navigation = useNavigation<NavProp>();
  const activeRole = useSelector((state: RootState) => state.auth.activeRole);
  const isDriver = activeRole === 'driver';
  const isPro = activeRole === 'pro';

  const {
    data: accounts = [],
    isLoading,
    refetch,
  } = isDriver
    ? useGetDriverAccountsQuery()
    : useGetProAccountsQuery();

  const [setDefaultDriver] = useSetDefaultDriverAccountMutation();
  const [setDefaultPro] = useSetDefaultProAccountMutation();
  const [deleteDriver] = useDeleteDriverAccountMutation();
  const [deletePro] = useDeleteProAccountMutation();

  const handleSetDefault = async (id: string) => {
    try {
      if (isDriver) await setDefaultDriver(id).unwrap();
      else await setDefaultPro(id).unwrap();
    } catch {
      Alert.alert(t('common.error'), t('payout_accounts.error_set_default'));
    }
  };

  const handleDelete = (account: PayoutAccount) => {
    Alert.alert(
      t('payout_accounts.delete_confirm_title'),
      t('payout_accounts.delete_confirm_message', { type: account.accountType }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              if (isDriver) await deleteDriver(account.id).unwrap();
              else await deletePro(account.id).unwrap();
            } catch {
              Alert.alert(t('common.error'), t('payout_accounts.error_delete'));
            }
          },
        },
      ],
    );
  };

  const getMainDetail = (acc: PayoutAccount) => {
    const d = acc.accountDetails;
    return d.ipaAddress ?? d.phoneNumber ?? d.iban ?? d.accountNumber ?? '—';
  };

  if (!isDriver && !isPro) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>{t('payout_accounts.not_available')}</Text>
      </View>
    );
  }

  if (isLoading) {
    return <ActivityIndicator style={{ marginTop: spacing.xl }} color={tokens.primary} />;
  }

  return (
    <View style={styles.container}>
      {/* Bannière d'info */}
      <View style={styles.infoBanner}>
        <Text style={styles.infoText}>{t('payout_accounts.info_banner')}</Text>
      </View>

      <FlatList
        data={accounts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={accounts.length === 0 ? styles.emptyList : styles.list}
        ItemSeparatorComponent={() => <Divider />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🏦</Text>
            <Text style={styles.emptyText}>{t('payout_accounts.empty')}</Text>
            <Text style={styles.emptySubtext}>{t('payout_accounts.empty_sub')}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.card, item.isDefault && styles.cardDefault]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardIcon}>{ACCOUNT_TYPE_ICONS[item.accountType] ?? '💳'}</Text>
              <View style={styles.cardInfo}>
                <View style={styles.cardTitleRow}>
                  <Text style={styles.cardType}>
                    {t(`payout_accounts.type_${item.accountType}`, { defaultValue: item.accountType })}
                  </Text>
                  {item.isDefault && (
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultBadgeText}>{t('payout_accounts.default')}</Text>
                    </View>
                  )}
                  {item.isVerified && (
                    <View style={styles.verifiedBadge}>
                      <Text style={styles.verifiedBadgeText}>✓ {t('payout_accounts.verified')}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.cardHolder}>{item.accountHolderName}</Text>
                <Text style={styles.cardDetail}>{getMainDetail(item)}</Text>
                <Text style={styles.cardCountry}>{item.country}</Text>
              </View>
            </View>

            <View style={styles.cardActions}>
              {!item.isDefault && (
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => handleSetDefault(item.id)}
                >
                  <Text style={styles.actionBtnText}>{t('payout_accounts.set_default')}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnDanger]}
                onPress={() => handleDelete(item)}
              >
                <Text style={[styles.actionBtnText, styles.actionBtnTextDanger]}>
                  {t('common.delete')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <FAB
        icon="plus"
        label={t('payout_accounts.add_button')}
        style={styles.fab}
        color={colors.white}
        onPress={() => navigation.navigate('PayoutAccountForm', {})}
      />
    </View>
  );
};
