import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, ActivityIndicator, Divider } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { useGetPaymentByIdQuery } from '../../store/api/paymentApi';
import { useGetTransportRequestQuery } from '../../store/api/transportApi';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';

const ESCROW_CONFIG: Record<string, { color: string; icon: string }> = {
  pending:  { color: '#FF9800', icon: 'clock-outline' },
  captured: { color: '#2196F3', icon: 'lock-outline' },
  held:     { color: '#9C27B0', icon: 'lock' },
  released: { color: '#4CAF50', icon: 'check-circle-outline' },
  refunded: { color: '#F44336', icon: 'refresh' },
};

interface Props {
  route: { params: { paymentId?: string; requestId?: string } };
  navigation: any;
}

export const PaymentDetailsScreen = ({ route }: Props) => {
  const { t, i18n } = useTranslation();
  const { paymentId, requestId } = route.params;
  const isDriver = useSelector((state: RootState) => state.auth.isDriver);

  // Mode payment entity (in-app / stripe)
  const { data: payment, isLoading: paymentLoading } = useGetPaymentByIdQuery(paymentId!, {
    skip: !paymentId,
  });

  // Mode cash (requestId only, no payment entity)
  const { data: transportRequest, isLoading: transportLoading } = useGetTransportRequestQuery(requestId!, {
    skip: !requestId || !!paymentId,
  });

  const isLoading = paymentLoading || transportLoading;

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(i18n.language, {
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  const formatAmount = (val: number) => `${val?.toFixed(2)} EGP`;

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // ── Vue cash (pas d'entité Payment) ────────────────────────────────
  if (!paymentId && requestId && transportRequest) {
    const price = transportRequest.totalPrice ?? transportRequest.price ?? 0;
    const paymentMethod = (transportRequest as any).paymentMethod ?? 'cash';

    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>

        {/* Badge cash */}
        <Card style={styles.statusCard}>
          <Card.Content style={styles.statusContent}>
            <Icon name="cash" size={40} color={colors.success} />
            <Text variant="headlineSmall" style={[styles.statusLabel, { color: colors.success }]}>
              {t('transport.payment_cash_label')}
            </Text>
            <Text variant="bodySmall" style={styles.statusExplanation}>
              {isDriver ? t('cash_validation.driver_subtitle') : t('cash_validation.client_subtitle')}
            </Text>
          </Card.Content>
        </Card>

        {/* Montant */}
        <Card style={styles.card}>
          <Card.Title title={`💰 ${t('payment.details_amounts')}`} titleStyle={styles.cardTitle} />
          <Card.Content>
            {isDriver ? (
              <>
                <View style={styles.row}>
                  <Text variant="bodyMedium" style={styles.rowLabel}>{t('driver.net_amount_label')}</Text>
                  <Text variant="titleMedium" style={styles.netAmount}>
                    {formatAmount((transportRequest as any).cashNetAmount ?? price)}
                  </Text>
                </View>
                <Divider style={styles.divider} />
                <View style={styles.row}>
                  <Text variant="bodySmall" style={styles.subLabel}>{t('driver.gross_amount_label')}</Text>
                  <Text variant="bodySmall" style={styles.subValue}>{formatAmount(price)}</Text>
                </View>
                {(transportRequest as any).cashCommissionRate != null && (
                  <View style={styles.row}>
                    <Text variant="bodySmall" style={styles.subLabel}>
                      {t('driver.commission_label')} ({(transportRequest as any).cashCommissionRate}%)
                    </Text>
                    <Text variant="bodySmall" style={[styles.subValue, { color: colors.error }]}>
                      -{formatAmount((transportRequest as any).cashCommissionAmount ?? 0)}
                    </Text>
                  </View>
                )}
                <View style={styles.row}>
                  <Text variant="bodySmall" style={styles.subLabel}>{t('transport.payment_method')}</Text>
                  <Text variant="bodySmall" style={styles.subValue}>{t('transport.pay_cash')}</Text>
                </View>
              </>
            ) : (
              <>
                <View style={styles.row}>
                  <Text variant="bodyMedium" style={styles.rowLabel}>{t('payment.details_paid')}</Text>
                  <Text variant="titleMedium" style={styles.netAmount}>{formatAmount(price)}</Text>
                </View>
                <View style={styles.row}>
                  <Text variant="bodySmall" style={styles.subLabel}>{t('transport.payment_method')}</Text>
                  <Text variant="bodySmall" style={styles.subValue}>{t('transport.pay_cash')}</Text>
                </View>
              </>
            )}
          </Card.Content>
        </Card>

        {/* Référence service */}
        <Card style={styles.card}>
          <Card.Title title={`📦 ${t('payment.details_service_ref')}`} titleStyle={styles.cardTitle} />
          <Card.Content>
            <View style={styles.row}>
              <Text variant="bodySmall" style={styles.subLabel}>{t('common.from')}</Text>
              <Text variant="bodySmall" style={[styles.subValue, { flex: 2 }]} numberOfLines={2}>
                {(transportRequest as any).pickup?.address ?? transportRequest.pickupAddress}
              </Text>
            </View>
            <View style={styles.row}>
              <Text variant="bodySmall" style={styles.subLabel}>{t('common.to')}</Text>
              <Text variant="bodySmall" style={[styles.subValue, { flex: 2 }]} numberOfLines={2}>
                {(transportRequest as any).delivery?.address ?? transportRequest.deliveryAddress}
              </Text>
            </View>
            <View style={styles.row}>
              <Text variant="bodySmall" style={styles.subLabel}>{t('payment.details_scheduled')}</Text>
              <Text variant="bodySmall" style={styles.subValue}>
                {formatDate(transportRequest.scheduledDate)}
              </Text>
            </View>
          </Card.Content>
        </Card>

      </ScrollView>
    );
  }

  // ── Vue payment entity non trouvée ──────────────────────────────────
  if (!payment) {
    return (
      <View style={styles.center}>
        <Icon name="alert-circle-outline" size={48} color={colors.error} />
        <Text variant="bodyMedium" style={styles.emptyText}>{t('payment.details_not_found')}</Text>
      </View>
    );
  }

  // ── Vue in-app / stripe ─────────────────────────────────────────────
  const escrowCfg = ESCROW_CONFIG[payment.escrowStatus] ?? ESCROW_CONFIG.pending;
  const transport = payment.transportRequest;
  const booking   = payment.booking;
  const order     = payment.marketplaceOrder;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Statut escrow — badge central */}
      <Card style={styles.statusCard}>
        <Card.Content style={styles.statusContent}>
          <Icon name={escrowCfg.icon} size={40} color={escrowCfg.color} />
          <Text variant="headlineSmall" style={[styles.statusLabel, { color: escrowCfg.color }]}>
            {t('payment.escrow_' + payment.escrowStatus)}
          </Text>
          <Text variant="bodySmall" style={styles.statusExplanation}>
            {t('payment.escrow_explanation_' + payment.escrowStatus)}
          </Text>
        </Card.Content>
      </Card>

      {/* Montants */}
      <Card style={styles.card}>
        <Card.Title
          title={`💰 ${t('payment.details_amounts')}`}
          titleStyle={styles.cardTitle}
        />
        <Card.Content>
          {isDriver ? (
            <>
              <View style={styles.row}>
                <Text variant="bodyMedium" style={styles.rowLabel}>{t('driver.net_amount_label')}</Text>
                <Text variant="titleMedium" style={styles.netAmount}>
                  {formatAmount(payment.proNetAmount ?? payment.amount)}
                </Text>
              </View>
              <Divider style={styles.divider} />
              <View style={styles.row}>
                <Text variant="bodySmall" style={styles.subLabel}>{t('driver.gross_amount_label')}</Text>
                <Text variant="bodySmall" style={styles.subValue}>{formatAmount(payment.amount)}</Text>
              </View>
              <View style={styles.row}>
                <Text variant="bodySmall" style={styles.subLabel}>
                  {t('driver.commission_label')} ({payment.commissionRate ?? 0}%)
                </Text>
                <Text variant="bodySmall" style={[styles.subValue, { color: colors.error }]}>
                  -{formatAmount(payment.commissionAmount ?? 0)}
                </Text>
              </View>
            </>
          ) : (
            <View style={styles.row}>
              <Text variant="bodyMedium" style={styles.rowLabel}>{t('payment.details_paid')}</Text>
              <Text variant="titleMedium" style={styles.netAmount}>{formatAmount(payment.amount)}</Text>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* Détails transaction */}
      <Card style={styles.card}>
        <Card.Title
          title={`🧾 ${t('payment.details_transaction')}`}
          titleStyle={styles.cardTitle}
        />
        <Card.Content>
          <View style={styles.row}>
            <Text variant="bodySmall" style={styles.subLabel}>{t('payment.details_provider')}</Text>
            <Text variant="bodySmall" style={styles.subValue}>{payment.paymentProvider ?? '—'}</Text>
          </View>
          {payment.providerTransactionId && (
            <View style={styles.row}>
              <Text variant="bodySmall" style={styles.subLabel}>{t('payment.details_stripe_id')}</Text>
              <Text variant="bodySmall" style={[styles.subValue, styles.mono]} numberOfLines={1} ellipsizeMode="middle">
                {payment.providerTransactionId}
              </Text>
            </View>
          )}
          <View style={styles.row}>
            <Text variant="bodySmall" style={styles.subLabel}>{t('payment.details_transfer_status')}</Text>
            <Text variant="bodySmall" style={[
              styles.subValue,
              { color: payment.transferStatus === 'transferred' ? colors.success : colors.gray },
            ]}>
              {payment.transferStatus === 'transferred'
                ? `✅ ${t('payment.history_transferred')}`
                : t('payment.details_transfer_pending')}
            </Text>
          </View>
          {payment.transferredAt && (
            <View style={styles.row}>
              <Text variant="bodySmall" style={styles.subLabel}>{t('payment.details_transferred_at')}</Text>
              <Text variant="bodySmall" style={styles.subValue}>{formatDate(payment.transferredAt)}</Text>
            </View>
          )}
          <View style={styles.row}>
            <Text variant="bodySmall" style={styles.subLabel}>{t('payment.details_created_at')}</Text>
            <Text variant="bodySmall" style={styles.subValue}>{formatDate(payment.createdAt)}</Text>
          </View>
        </Card.Content>
      </Card>

      {/* Référence service */}
      {(transport || booking || order) && (
        <Card style={styles.card}>
          <Card.Title
            title={`📦 ${t('payment.details_service_ref')}`}
            titleStyle={styles.cardTitle}
          />
          <Card.Content>
            {transport && (
              <>
                <View style={styles.row}>
                  <Text variant="bodySmall" style={styles.subLabel}>{t('common.from')}</Text>
                  <Text variant="bodySmall" style={[styles.subValue, { flex: 2 }]} numberOfLines={2}>
                    {transport.pickupAddress}
                  </Text>
                </View>
                <View style={styles.row}>
                  <Text variant="bodySmall" style={styles.subLabel}>{t('common.to')}</Text>
                  <Text variant="bodySmall" style={[styles.subValue, { flex: 2 }]} numberOfLines={2}>
                    {transport.deliveryAddress}
                  </Text>
                </View>
                <View style={styles.row}>
                  <Text variant="bodySmall" style={styles.subLabel}>{t('payment.details_scheduled')}</Text>
                  <Text variant="bodySmall" style={styles.subValue}>
                    {formatDate(transport.scheduledDate)}
                  </Text>
                </View>
              </>
            )}
            {booking && (
              <View style={styles.row}>
                <Text variant="bodySmall" style={styles.subLabel}>{t('payment.details_scheduled')}</Text>
                <Text variant="bodySmall" style={styles.subValue}>{formatDate(booking.scheduledDate)}</Text>
              </View>
            )}
            {order && (
              <View style={styles.row}>
                <Text variant="bodySmall" style={styles.subLabel}>{t('payment.details_order_date')}</Text>
                <Text variant="bodySmall" style={styles.subValue}>{formatDate(order.createdAt)}</Text>
              </View>
            )}
          </Card.Content>
        </Card>
      )}

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.light },
  content: { padding: spacing.md, paddingBottom: spacing.xl * 2 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  emptyText: { color: colors.gray, marginTop: spacing.md, textAlign: 'center' },

  statusCard: {
    marginBottom: spacing.md,
    backgroundColor: colors.white,
    elevation: 3,
  },
  statusContent: { alignItems: 'center', paddingVertical: spacing.lg, gap: spacing.sm },
  statusLabel: { fontWeight: '700', textAlign: 'center' },
  statusExplanation: { color: colors.gray, textAlign: 'center', lineHeight: 20 },

  card: { marginBottom: spacing.md, backgroundColor: colors.white, elevation: 2 },
  cardTitle: { fontSize: 15, fontWeight: '600' },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  rowLabel: { fontWeight: '600', color: colors.dark },
  netAmount: { fontWeight: '700', color: colors.primary },
  subLabel: { color: colors.gray, flex: 1 },
  subValue: { color: colors.dark, textAlign: 'right', flex: 1 },
  mono: { fontFamily: 'monospace', fontSize: 11 },
  divider: { marginVertical: spacing.sm },
});
