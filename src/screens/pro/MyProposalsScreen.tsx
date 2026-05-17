import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Linking } from 'react-native';
import { Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useGetMyProposalsQuery } from '../../store/api/proposalsApi';
import { useRefetchOnFocus } from '../../hooks/useRefetchOnFocus';
import { API_CONFIG } from '../../config/api';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

const RDV_URL = 'https://digiltizeme-portfolio.vercel.app/rdv';

const STATUS_COLOR: Record<string, string> = {
  pending:      '#F59E0B',
  under_review: '#3B82F6',
  accepted:     '#10B981',
  refused:      '#EF4444',
};

export const MyProposalsScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const [supportPhone, setSupportPhone] = useState('');
  const { data: proposals = [], isLoading, refetch } = useGetMyProposalsQuery(undefined, {
    pollingInterval: 30_000,
    refetchOnMountOrArgChange: true,
  });
  useRefetchOnFocus(refetch);

  useEffect(() => {
    fetch(`${API_CONFIG.BASE_URL}/admin/settings/public`, {
      headers: { 'ngrok-skip-browser-warning': 'true' },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => { if (data.supportPhone) setSupportPhone(data.supportPhone); })
      .catch(() => {});
  }, []);

  const openWhatsApp = () => {
    const number = supportPhone.replace(/[^\d+]/g, '');
    const msg = encodeURIComponent(t('proposal.whatsapp_prefill', { service: t('proposal.title') }));
    Linking.openURL(`https://wa.me/${number}?text=${msg}`);
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      pending: t('proposal.status_pending'),
      under_review: t('proposal.status_under_review'),
      accepted: t('proposal.status_accepted'),
      refused: t('proposal.status_refused'),
    };
    return map[status] ?? status;
  };

  if (isLoading) {
    return <View style={styles.center}><Text style={styles.gray}>{t('common.loading')}</Text></View>;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={proposals}
        keyExtractor={(item) => item.id}
        contentContainerStyle={proposals.length === 0 ? styles.emptyContainer : styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{t('proposal.no_proposals')}</Text>
            <TouchableOpacity
              style={styles.proposeBtn}
              onPress={() => navigation.navigate('SubmitProposal')}
              activeOpacity={0.8}
            >
              <Text style={styles.proposeBtnText}>{t('proposal.propose_btn')}</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => {
          const lastRead = item.userLastReadAt ? new Date(item.userLastReadAt) : null;
          const adminMessages = (item.messages ?? []).filter(
            (m: any) => m.fromAdmin && (!lastRead || new Date(m.createdAt) > lastRead)
          ).length;
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('ProposalDetail', { proposalId: item.id })}
              activeOpacity={0.8}
            >
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle} numberOfLines={1}>{item.serviceNameFr}</Text>
                <View style={[styles.badge, { backgroundColor: STATUS_COLOR[item.status] + '20' }]}>
                  <Text style={[styles.badgeText, { color: STATUS_COLOR[item.status] }]}>
                    {getStatusLabel(item.status)}
                  </Text>
                </View>
              </View>
              <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
              <View style={styles.cardFooter}>
                <Text style={styles.cardDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                {adminMessages > 0 && (
                  <View style={styles.msgCount}>
                    <View style={styles.unreadDot}>
                      <Text style={styles.unreadDotText}>{adminMessages}</Text>
                    </View>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
        ListFooterComponent={
          <View style={styles.footer}>
            {proposals.length > 0 && (
              <TouchableOpacity
                style={styles.proposeBtn}
                onPress={() => navigation.navigate('SubmitProposal')}
                activeOpacity={0.8}
              >
                <Text style={styles.proposeBtnText}>+ {t('proposal.propose_btn')}</Text>
              </TouchableOpacity>
            )}
            <View style={styles.contactCard}>
              <Text style={styles.contactTitle}>{t('proposal.contact_team_title')}</Text>
              <Text style={styles.contactSubtitle}>{t('proposal.contact_team_desc')}</Text>
              <View style={styles.contactBtns}>
                {!!supportPhone && (
                  <TouchableOpacity style={styles.whatsappBtn} onPress={openWhatsApp} activeOpacity={0.8}>
                    <Text style={styles.whatsappBtnText}>💬 WhatsApp</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.rdvBtn}
                  onPress={() => Linking.openURL(RDV_URL)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.rdvBtnText}>📅 {t('proposal.book_rdv')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  gray: { color: colors.gray },
  list: { padding: spacing.md, gap: spacing.sm },
  emptyContainer: { flexGrow: 1 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  emptyText: { color: colors.gray, textAlign: 'center', marginBottom: spacing.lg },
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: spacing.sm,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.dark, flex: 1, marginRight: spacing.sm },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  cardDesc: { color: colors.gray, fontSize: 13, marginBottom: spacing.sm },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardDate: { fontSize: 11, color: colors.gray },
  msgCount: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  msgCountText: { fontSize: 11, color: colors.gray },
  unreadDot: {
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  unreadDotText: { fontSize: 9, color: colors.white, fontWeight: '700' },
  proposeBtn: {
    margin: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  proposeBtnText: { color: colors.white, fontWeight: '700', fontSize: 15 },
  footer: { paddingBottom: spacing.xl },
  contactCard: {
    margin: spacing.md,
    backgroundColor: '#F5F3FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    padding: spacing.md,
  },
  contactTitle: { fontWeight: '700', color: '#5B21B6', fontSize: 14, marginBottom: 4 },
  contactSubtitle: { color: '#7C3AED', fontSize: 12, marginBottom: spacing.md },
  contactBtns: { flexDirection: 'row', gap: spacing.sm },
  whatsappBtn: {
    flex: 1, backgroundColor: '#25D366', borderRadius: 10,
    paddingVertical: spacing.sm, alignItems: 'center',
  },
  whatsappBtnText: { color: colors.white, fontWeight: '700', fontSize: 13 },
  rdvBtn: {
    flex: 1, backgroundColor: colors.primary, borderRadius: 10,
    paddingVertical: spacing.sm, alignItems: 'center',
  },
  rdvBtnText: { color: colors.white, fontWeight: '700', fontSize: 13 },
});
