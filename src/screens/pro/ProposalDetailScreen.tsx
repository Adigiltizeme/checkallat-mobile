import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useGetProposalByIdQuery, useReplyToProposalMutation, useMarkProposalReadMutation } from '../../store/api/proposalsApi';
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

export const ProposalDetailScreen = ({ navigation, route }: any) => {
  const { proposalId } = route.params;
  const { t } = useTranslation();
  const [reply, setReply] = useState('');
  const [supportPhone, setSupportPhone] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    fetch(`${API_CONFIG.BASE_URL}/admin/settings/public`, {
      headers: { 'ngrok-skip-browser-warning': 'true' },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => { if (data.supportPhone) setSupportPhone(data.supportPhone); })
      .catch(() => {});
  }, []);

  const { data: proposal, isLoading, refetch } = useGetProposalByIdQuery(proposalId, {
    pollingInterval: 15_000,
    refetchOnMountOrArgChange: true,
  });
  useRefetchOnFocus(refetch);

  // Marquer comme lu dès l'ouverture
  useEffect(() => { markRead(proposalId); }, [proposalId]);

  const [sendReply, { isLoading: sending }] = useReplyToProposalMutation();
  const [markRead] = useMarkProposalReadMutation();

  const handleReply = async () => {
    if (!reply.trim() || sending) return;
    try {
      await sendReply({ id: proposalId, message: reply.trim() }).unwrap();
      setReply('');
      refetch();
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300);
    } catch { /* silent */ }
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

  if (isLoading || !proposal) {
    return <View style={styles.center}><Text style={styles.gray}>{t('common.loading')}</Text></View>;
  }

  const canReply = proposal.status !== 'accepted' && proposal.status !== 'refused';
  const statusColor = STATUS_COLOR[proposal.status] ?? colors.gray;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView ref={scrollRef} style={styles.scroll} contentContainerStyle={styles.content}>

        {/* Status + title */}
        <View style={styles.header}>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{getStatusLabel(proposal.status)}</Text>
          </View>
          <Text style={styles.title}>{proposal.serviceNameFr}</Text>
          <Text style={styles.subtitle}>{proposal.serviceNameEn}</Text>
          <Text style={styles.date}>{new Date(proposal.createdAt).toLocaleDateString()}</Text>
        </View>

        {/* Proposal content */}
        <View style={styles.card}>
          <Text style={styles.label}>{t('proposal.description')}</Text>
          <Text style={styles.value}>{proposal.description}</Text>

          {!!proposal.targetAudience && (
            <>
              <Text style={[styles.label, { marginTop: spacing.sm }]}>{t('proposal.target_audience')}</Text>
              <Text style={styles.value}>{proposal.targetAudience}</Text>
            </>
          )}
          {!!proposal.pricingHint && (
            <>
              <Text style={[styles.label, { marginTop: spacing.sm }]}>{t('proposal.pricing_hint')}</Text>
              <Text style={styles.value}>{proposal.pricingHint}</Text>
            </>
          )}
          {!!proposal.credentials && (
            <>
              <Text style={[styles.label, { marginTop: spacing.sm }]}>{t('proposal.credentials')}</Text>
              <Text style={styles.value}>{proposal.credentials}</Text>
            </>
          )}
        </View>

        {/* Decision result */}
        {(proposal.status === 'accepted' || proposal.status === 'refused') && (
          <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: statusColor }]}>
            {!!proposal.adminNote && (
              <>
                <Text style={styles.label}>{t('proposal.admin_note')}</Text>
                <Text style={styles.value}>{proposal.adminNote}</Text>
              </>
            )}
            {proposal.status === 'refused' && !!proposal.refusalReason && (
              <>
                <Text style={[styles.label, { color: '#EF4444', marginTop: spacing.sm }]}>{t('proposal.refusal_reason')}</Text>
                <Text style={[styles.value, { color: '#EF4444' }]}>{proposal.refusalReason}</Text>
              </>
            )}
            {proposal.status === 'accepted' && !!proposal.createdCategorySlug && (
              <>
                <Text style={[styles.label, { marginTop: spacing.sm }]}>{t('proposal.category_created')}</Text>
                <Text style={[styles.value, { color: colors.primary, fontWeight: '700' }]}>{proposal.createdCategorySlug}</Text>
              </>
            )}
          </View>
        )}

        {/* Messages */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('proposal.messages')}</Text>
          {(proposal.messages ?? []).length === 0 ? (
            <Text style={styles.gray}>{t('proposal.no_messages')}</Text>
          ) : (
            <View style={styles.messages}>
              {(proposal.messages ?? []).map((m: any) => (
                <View key={m.id} style={[styles.bubble, m.fromAdmin ? styles.bubbleAdmin : styles.bubbleUser]}>
                  <Text style={[styles.bubbleText, m.fromAdmin ? styles.bubbleTextAdmin : styles.bubbleTextUser]}>
                    {m.message}
                  </Text>
                  <Text style={[styles.bubbleDate, m.fromAdmin ? styles.bubbleDateAdmin : styles.bubbleDateUser]}>
                    {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Contact équipe */}
        <View style={styles.contactCard}>
          <Text style={styles.contactTitle}>{t('proposal.contact_team_title')}</Text>
          <Text style={styles.contactSubtitle}>{t('proposal.contact_team_desc')}</Text>
          <View style={styles.contactBtns}>
            {!!supportPhone && (
              <TouchableOpacity
                style={styles.whatsappBtn}
                onPress={() => {
                  const number = supportPhone.replace(/[^\d+]/g, '');
                  const msg = encodeURIComponent(
                    t('proposal.whatsapp_prefill', { service: proposal.serviceNameFr })
                  );
                  Linking.openURL(`https://wa.me/${number}?text=${msg}`);
                }}
                activeOpacity={0.8}
              >
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

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Reply input */}
      {canReply && (
        <View style={styles.replyBar}>
          <TextInput
            style={styles.replyInput}
            value={reply}
            onChangeText={setReply}
            placeholder={t('proposal.reply_placeholder')}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!reply.trim() || sending) && styles.sendBtnDisabled]}
            onPress={handleReply}
            disabled={!reply.trim() || sending}
            activeOpacity={0.8}
          >
            <Text style={styles.sendBtnText}>{t('proposal.send')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  gray: { color: colors.gray, fontSize: 13 },
  header: { marginBottom: spacing.md },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginBottom: spacing.sm },
  statusText: { fontWeight: '700', fontSize: 12 },
  title: { fontSize: 20, fontWeight: '800', color: colors.dark, marginBottom: 2 },
  subtitle: { fontSize: 13, color: colors.gray, marginBottom: 2 },
  date: { fontSize: 11, color: colors.gray },
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  label: { fontSize: 11, fontWeight: '700', color: colors.gray, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  value: { fontSize: 14, color: colors.dark, lineHeight: 20 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.dark, marginBottom: spacing.sm },
  messages: { gap: spacing.sm },
  bubble: { maxWidth: '80%', borderRadius: 12, padding: spacing.sm },
  bubbleAdmin: { alignSelf: 'flex-start', backgroundColor: '#EFF6FF' },
  bubbleUser: { alignSelf: 'flex-end', backgroundColor: colors.primary },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  bubbleTextAdmin: { color: '#1e40af' },
  bubbleTextUser: { color: colors.white },
  bubbleDate: { fontSize: 10, marginTop: 2 },
  bubbleDateAdmin: { color: '#93C5FD', textAlign: 'left' },
  bubbleDateUser: { color: 'rgba(255,255,255,0.7)', textAlign: 'right' },
  contactCard: {
    backgroundColor: '#F5F3FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  contactTitle: { fontWeight: '700', color: '#5B21B6', fontSize: 14, marginBottom: 4 },
  contactSubtitle: { color: '#7C3AED', fontSize: 12, marginBottom: spacing.md },
  contactBtns: { flexDirection: 'row', gap: spacing.sm },
  whatsappBtn: {
    flex: 1,
    backgroundColor: '#25D366',
    borderRadius: 10,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  whatsappBtnText: { color: colors.white, fontWeight: '700', fontSize: 13 },
  rdvBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  rdvBtnText: { color: colors.white, fontWeight: '700', fontSize: 13 },
  replyBar: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  replyInput: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    fontSize: 14,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: 90,
  },
  sendBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    alignSelf: 'flex-end',
    paddingVertical: spacing.sm,
  },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnText: { color: colors.white, fontWeight: '700', fontSize: 13 },
});
