import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { useStripe } from '@stripe/stripe-react-native';
import { useAppTheme } from '../../theme/ThemeProvider';
import { colors } from '../../theme/colors';
import { ChocolateButton } from './ChocolateButton';
import {
  useConfirmOvertimePaymentMutation,
  useRequestOvertimeMutation,
  useRespondOvertimeMutation,
} from '../../store/api/bookingsApi';
import { BILLING_STEP_MINUTES, OVERTIME_OPTIONS, formatDuration, roundMoney } from '../../utils/servicePricing';

interface Props {
  booking: any;
  role: 'client' | 'pro';
}

/**
 * Prestation à l'heure : tarif, temps écoulé, plafond facturable, temps supplémentaire
 * (demande du prestataire, accord du client) et détail du prix final.
 * Rafraîchi par l'interrogation régulière de l'écran parent.
 */
export const HourlyWorkPanel = ({ booking, role }: Props) => {
  const { t } = useTranslation();
  const { tokens } = useAppTheme();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [requestOvertime, { isLoading: requesting }] = useRequestOvertimeMutation();
  const [respondOvertime, { isLoading: responding }] = useRespondOvertimeMutation();
  const [confirmOvertimePayment] = useConfirmOvertimePaymentMutation();
  const [minutes, setMinutes] = useState(30);
  const [reason, setReason] = useState('');
  const [now, setNow] = useState(Date.now());

  const inProgress = booking?.status === 'in_progress' && !booking?.proConfirmedCompletion;
  useEffect(() => {
    if (!inProgress) return;
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [inProgress]);

  const styles = useMemo(() => StyleSheet.create({
    card: { borderRadius: 14, padding: 14, gap: 8, backgroundColor: tokens.card, borderWidth: 1, borderColor: tokens.primary + '30' },
    header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    title: { fontSize: 15, fontWeight: '700', color: tokens.text.primary, flex: 1 },
    row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
    label: { fontSize: 13, color: tokens.text.secondary, flexShrink: 1 },
    value: { fontSize: 13, fontWeight: '600', color: tokens.text.primary },
    strong: { fontSize: 15, fontWeight: '800', color: tokens.primary },
    progressTrack: { height: 6, borderRadius: 3, backgroundColor: tokens.border, overflow: 'hidden' },
    progressFill: { height: 6, borderRadius: 3 },
    note: { fontSize: 12, lineHeight: 17, color: tokens.text.secondary },
    box: { borderRadius: 12, padding: 12, gap: 8, backgroundColor: colors.warning + '14', borderWidth: 1, borderColor: colors.warning + '55' },
    boxTitle: { fontSize: 14, fontWeight: '700', color: tokens.text.primary },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 18, borderWidth: 1, borderColor: tokens.border, backgroundColor: tokens.background },
    chipOn: { borderColor: tokens.primary, backgroundColor: tokens.primary },
    chipText: { fontSize: 13, fontWeight: '600', color: tokens.text.primary },
    chipTextOn: { color: '#fff' },
    buttons: { flexDirection: 'row', gap: 10 },
    button: { flex: 1 },
    divider: { height: 1, backgroundColor: tokens.border, marginVertical: 2 },
  }), [tokens]);

  if (!booking || booking.pricingMode !== 'hourly') return null;

  const cur = booking.currency ?? '';
  const money = (v: number) => `${roundMoney(v, cur)} ${cur}`;
  const rate: number = booking.hourlyRate ?? 0;
  const multiplier: number = booking.priceMultiplier ?? 1;
  const capMinutes = Math.round((booking.estimatedHours ?? booking.minimumHours ?? 1) * 60) + (booking.approvedOvertimeMinutes ?? 0);
  const startedAt = booking.startedAt ? new Date(booking.startedAt).getTime() : null;
  const elapsed = startedAt ? Math.max(0, Math.round((now - startedAt) / 60000)) : 0;
  const nearCap = inProgress && elapsed >= capMinutes - BILLING_STEP_MINUTES;
  const overtimeAmount = (m: number) => roundMoney(((rate * m) / 60) * multiplier, cur);
  const pending = booking.overtimeRequestStatus === 'pending';
  const finished = booking.billedMinutes != null;

  const sendRequest = async () => {
    try {
      await requestOvertime({ id: booking.id, minutes, reason: reason.trim() || undefined }).unwrap();
      setReason('');
      Alert.alert(t('service_pricing.overtime_title'), t('service_pricing.overtime_sent'));
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.data?.message ?? t('service_pricing.overtime_error'));
    }
  };

  const answer = async (approve: boolean) => {
    try {
      const res = await respondOvertime({ id: booking.id, approve }).unwrap();
      if (res.status !== 'payment_required') return;
      // Paiement dans l'app : autorisation complémentaire (débitée seulement si le temps est utilisé)
      const init = await initPaymentSheet({
        merchantDisplayName: 'CheckAll@t',
        paymentIntentClientSecret: res.clientSecret!,
        allowsDelayedPaymentMethods: false,
      });
      if (init.error) throw new Error(init.error.message);
      const pay = await presentPaymentSheet();
      if (pay.error) {
        if (pay.error.code !== 'Canceled') Alert.alert(t('common.error'), pay.error.message);
        return;
      }
      await confirmOvertimePayment(booking.id).unwrap();
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.data?.message ?? err?.message ?? t('service_pricing.overtime_error'));
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Icon name="clock-outline" size={20} color={tokens.primary} />
        <Text style={styles.title}>{t('service_pricing.work_title')}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>{t('service_pricing.rate_label')}</Text>
        <Text style={styles.value}>
          {t('service_pricing.rate_badge', { rate, currency: cur })}
          {booking.callOutFee ? ` + ${t('service_pricing.call_out_short', { amount: money(booking.callOutFee) })}` : ''}
        </Text>
      </View>
      {multiplier > 1 && (
        <View style={styles.row}>
          <Text style={styles.label}>{t('service_pricing.urgency_label')}</Text>
          <Text style={styles.value}>+{Math.round((multiplier - 1) * 100)} %</Text>
        </View>
      )}
      <View style={styles.row}>
        <Text style={styles.label}>{t('service_pricing.cap_label')}</Text>
        <Text style={styles.value}>
          {formatDuration(capMinutes, t)}
          {booking.approvedOvertimeMinutes > 0 ? ` (${t('service_pricing.incl_overtime', { d: formatDuration(booking.approvedOvertimeMinutes, t) })})` : ''}
        </Text>
      </View>

      {/* Pendant l'intervention : temps écoulé */}
      {inProgress && startedAt != null && (
        <>
          <View style={styles.row}>
            <Text style={styles.label}>{t('service_pricing.elapsed_label')}</Text>
            <Text style={[styles.value, nearCap && { color: colors.warning }]}>{formatDuration(elapsed, t)}</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, {
              width: `${Math.min(100, (elapsed / Math.max(1, capMinutes)) * 100)}%`,
              backgroundColor: nearCap ? colors.warning : tokens.primary,
            }]} />
          </View>
          <Text style={styles.note}>{t('service_pricing.billing_rule', { min: formatDuration(Math.round((booking.minimumHours ?? 1) * 60), t) })}</Text>
        </>
      )}

      {/* Demande de temps supplémentaire en attente */}
      {pending && (
        <View style={styles.box}>
          <Text style={styles.boxTitle}>
            {t(role === 'client' ? 'service_pricing.overtime_client_title' : 'service_pricing.overtime_pro_waiting', {
              d: formatDuration(booking.overtimeRequestMinutes ?? 0, t),
              amount: money(overtimeAmount(booking.overtimeRequestMinutes ?? 0)),
            })}
          </Text>
          {!!booking.overtimeRequestReason && <Text style={styles.note}>« {booking.overtimeRequestReason} »</Text>}
          {role === 'client' && (
            <>
              <Text style={styles.note}>
                {t(booking.paymentMethod === 'in_app' ? 'service_pricing.overtime_client_note_inapp' : 'service_pricing.overtime_client_note_cash')}
              </Text>
              <View style={styles.buttons}>
                <ChocolateButton variant="outline" style={styles.button} onPress={() => answer(false)} disabled={responding}>
                  {t('service_pricing.overtime_decline')}
                </ChocolateButton>
                <ChocolateButton style={styles.button} onPress={() => answer(true)} disabled={responding}>
                  {t('service_pricing.overtime_accept')}
                </ChocolateButton>
              </View>
            </>
          )}
        </View>
      )}

      {/* Réponse du client à la dernière demande */}
      {!pending && !finished && booking.overtimeRequestStatus === 'declined' && (
        <Text style={[styles.note, { color: colors.error }]}>{t('service_pricing.overtime_declined')}</Text>
      )}

      {/* Prestataire : demander du temps supplémentaire */}
      {role === 'pro' && inProgress && !pending && (
        <View style={{ gap: 8 }}>
          <Text style={styles.label}>{t('service_pricing.overtime_request_label')}</Text>
          <View style={styles.chips}>
            {OVERTIME_OPTIONS.map((m) => {
              const on = m === minutes;
              return (
                <TouchableOpacity key={m} style={[styles.chip, on && styles.chipOn]} onPress={() => setMinutes(m)}>
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>+{formatDuration(m, t)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TextInput
            mode="outlined"
            dense
            value={reason}
            onChangeText={setReason}
            maxLength={300}
            placeholder={t('service_pricing.overtime_reason_placeholder')}
            outlineColor={tokens.border}
            activeOutlineColor={tokens.primary}
            style={{ backgroundColor: tokens.background }}
          />
          <ChocolateButton variant="outline" onPress={sendRequest} loading={requesting} disabled={requesting}>
            {t('service_pricing.overtime_send', { d: formatDuration(minutes, t), amount: money(overtimeAmount(minutes)) })}
          </ChocolateButton>
        </View>
      )}

      {/* Fin déclarée : temps réel, temps facturé, prix final */}
      {finished && (
        <>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.label}>{t('service_pricing.worked_label')}</Text>
            <Text style={styles.value}>{formatDuration(booking.workedMinutes ?? 0, t)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>{t('service_pricing.billed_label')}</Text>
            <Text style={styles.value}>{formatDuration(booking.billedMinutes, t)}</Text>
          </View>
          {booking.finalPrice != null && (
            <View style={styles.row}>
              <Text style={[styles.label, { fontWeight: '700', color: tokens.text.primary }]}>{t('service_pricing.final_total')}</Text>
              <Text style={styles.strong}>{money(booking.finalPrice)}</Text>
            </View>
          )}
          {booking.paymentMethod === 'in_app' && booking.finalPrice != null && booking.finalPrice < (booking.estimatedPrice ?? 0) && (
            <Text style={styles.note}>{t('service_pricing.released_note', { amount: money((booking.estimatedPrice ?? 0) - booking.finalPrice) })}</Text>
          )}
        </>
      )}
    </View>
  );
};
