import React, { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, Image, TouchableOpacity, Alert, Modal, RefreshControl } from 'react-native';
import { Text, TextInput, ActivityIndicator } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  useConfirmHandoverMutation,
  useGetOrderQuery,
  useRejectSellerOrderMutation,
  useSellerOrderActionMutation,
} from '../../store/api/marketplaceApi';
import { useRefetchOnFocus } from '../../hooks/useRefetchOnFocus';
import { useCurrencyFormatter } from '../../hooks/useCurrencyFormatter';
import { useAppTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/spacing';
import { ChocolateButton } from '../../components/shared/ChocolateButton';
import { OrderStatusChip } from '../../components/marketplace/OrderStatusChip';
import { localizedName } from '../../types/marketplace';

const DRIVER_ON_THE_WAY = ['accepted', 'heading_to_pickup', 'arrived_at_pickup', 'loading'];

export const SellerOrderDetailsScreen = ({ route, navigation }: any) => {
  const { orderId } = route.params as { orderId: string };
  const { tokens } = useAppTheme();
  const { t, i18n } = useTranslation();
  const { formatWithCurrency } = useCurrencyFormatter();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [handoverOpen, setHandoverOpen] = useState(false);
  const [handoverCode, setHandoverCode] = useState('');

  const { data: order, isLoading, isFetching, refetch } = useGetOrderQuery(orderId, {
    pollingInterval: 5000,
    refetchOnMountOrArgChange: true,
  });
  useRefetchOnFocus(refetch);
  const [runAction, { isLoading: acting }] = useSellerOrderActionMutation();
  const [rejectOrder, { isLoading: rejecting }] = useRejectSellerOrderMutation();
  const [confirmHandover, { isLoading: handingOver }] = useConfirmHandoverMutation();

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: tokens.background },
    content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
    card: { backgroundColor: tokens.card, borderRadius: 14, padding: spacing.md, borderWidth: 1, borderColor: tokens.border },
    title: { fontSize: 16, fontWeight: '700', color: tokens.text.primary },
    cardTitle: { fontSize: 15, fontWeight: '700', color: tokens.text.primary, marginBottom: spacing.sm },
    sub: { fontSize: 12, color: tokens.text.secondary, marginTop: 2 },
    item: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 6 },
    itemImage: { width: 48, height: 48, borderRadius: 8, backgroundColor: tokens.backgroundAlt },
    qty: { fontSize: 16, fontWeight: '800', color: tokens.primary, minWidth: 36 },
    notes: { fontSize: 12, color: '#B45309', fontStyle: 'italic' },
    row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
    muted: { color: tokens.text.secondary },
    strong: { fontWeight: '800', color: tokens.text.primary },
    info: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, backgroundColor: tokens.primary + '12', borderRadius: 12, padding: spacing.md },
    infoText: { flex: 1, color: tokens.text.primary, lineHeight: 19 },
    actions: { gap: spacing.sm },
    linkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    linkText: { flex: 1, color: tokens.primary, fontWeight: '600' },
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: tokens.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.lg, gap: spacing.sm },
  }), [tokens]);

  if (isLoading || !order) {
    return <View style={[styles.container, { justifyContent: 'center' }]}><ActivityIndicator color={tokens.primary} /></View>;
  }

  const shortId = order.id.slice(0, 8).toUpperCase();
  const isPlatformDelivery = order.fulfillmentType === 'checkallpack' || order.fulfillmentType === 'transport';
  const needsCode = order.fulfillmentType === 'pickup' || order.fulfillmentType === 'seller_delivery';
  const transport = order.transportRequest;

  const run = async (action: 'accept' | 'preparing' | 'ready' | 'out-for-delivery' | 'relaunch-delivery') => {
    try {
      await runAction({ id: order.id, action }).unwrap();
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.data?.message || t('common.error'));
    }
  };

  const confirmReady = () => {
    Alert.alert(
      t('seller.ready_confirm_title'),
      isPlatformDelivery ? t('seller.ready_confirm_platform') : t('seller.ready_confirm_other'),
      [{ text: t('common.cancel'), style: 'cancel' }, { text: t('seller.mark_ready'), onPress: () => run('ready') }],
    );
  };

  const submitReject = async () => {
    if (!rejectReason.trim()) return;
    try {
      await rejectOrder({ id: order.id, reason: rejectReason.trim() }).unwrap();
      setRejectOpen(false);
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.data?.message || t('common.error'));
    }
  };

  const submitHandover = async () => {
    try {
      await confirmHandover({ id: order.id, code: handoverCode.trim() }).unwrap();
      setHandoverOpen(false);
      Alert.alert(t('common.success'), t('seller.handover_done'));
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.data?.code === 'INVALID_HANDOVER_CODE' ? t('seller.handover_invalid_code') : err?.data?.message || t('common.error'));
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} colors={[tokens.primary]} />}>
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>#{shortId} · {order.client.firstName} {order.client.lastName}</Text>
              <Text style={styles.sub}>{new Date(order.createdAt).toLocaleString(i18n.language, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</Text>
            </View>
            <OrderStatusChip status={order.status} />
          </View>
          <Text style={[styles.sub, { marginTop: spacing.sm }]}>{t(`marketplace.fulfillment_${order.fulfillmentType}`)}</Text>
          {!!order.deliveryAddress && <Text style={styles.sub}>📍 {order.deliveryAddress}</Text>}
          {!!order.deliveryInstructions && <Text style={styles.sub}>💬 {order.deliveryInstructions}</Text>}
        </View>

        {order.status === 'pending' && (
          <View style={styles.info}>
            <Icon name="timer-sand" size={22} color={tokens.primary} />
            <Text style={styles.infoText}>{t('seller.pending_info')}</Text>
          </View>
        )}
        {order.status === 'ready' && isPlatformDelivery && (
          <View style={styles.info}>
            <Icon name={order.fulfillmentType === 'checkallpack' ? 'moped' : 'truck-fast'} size={22} color={tokens.primary} />
            <Text style={styles.infoText}>
              {!transport
                ? t('seller.delivery_to_relaunch')
                : transport.driver
                  ? t('seller.driver_on_the_way', { name: transport.driver.user.firstName })
                  : t('seller.searching_driver')}
            </Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('seller.items_to_prepare')}</Text>
          {order.items.map((item) => (
            <View key={item.id} style={styles.item}>
              <Text style={styles.qty}>{item.quantity}×</Text>
              {item.product.images[0] ? <Image source={{ uri: item.product.images[0] }} style={styles.itemImage} /> : <View style={styles.itemImage} />}
              <View style={{ flex: 1 }}>
                <Text>{localizedName(item.product, i18n.language)}</Text>
                {!!item.specialNotes && <Text style={styles.notes}>{item.specialNotes}</Text>}
              </View>
            </View>
          ))}
          <View style={[styles.row, { marginTop: spacing.sm }]}><Text style={styles.muted}>{t('marketplace.subtotal')}</Text><Text>{formatWithCurrency(order.subtotal, order.currency)}</Text></View>
          <View style={styles.row}><Text style={styles.muted}>{t('seller.commission')}</Text><Text>− {formatWithCurrency(order.commissionAmount, order.currency)}</Text></View>
          {order.fulfillmentType === 'seller_delivery' && (
            <View style={styles.row}><Text style={styles.muted}>{t('seller.your_delivery_fee')}</Text><Text>+ {formatWithCurrency(order.deliveryFee, order.currency)}</Text></View>
          )}
          <View style={styles.row}><Text style={styles.strong}>{t('seller.your_earnings')}</Text><Text style={styles.strong}>{formatWithCurrency(order.sellerNetAmount, order.currency)}</Text></View>
        </View>

        {transport && DRIVER_ON_THE_WAY.includes(transport.status) && (
          <TouchableOpacity style={[styles.card, styles.linkRow]} onPress={() => navigation.navigate('TransportTracking', { requestId: transport.id })}>
            <Icon name="map-marker-path" size={20} color={tokens.primary} />
            <Text style={styles.linkText}>{t('seller.track_driver')}</Text>
            <Icon name="chevron-right" size={20} color={tokens.primary} />
          </TouchableOpacity>
        )}

        {!['completed', 'cancelled'].includes(order.status) && (
          <TouchableOpacity
            style={[styles.card, styles.linkRow]}
            onPress={() => navigation.navigate('BookingChat', { entityType: 'order', entityId: order.id, otherPartyName: `${order.client.firstName} ${order.client.lastName}` })}
          >
            <Icon name="message-text-outline" size={20} color={tokens.primary} />
            <Text style={styles.linkText}>{t('seller.contact_client')}</Text>
            <Icon name="chevron-right" size={20} color={tokens.primary} />
          </TouchableOpacity>
        )}

        {order.status === 'cancelled' && (
          <View style={[styles.card, { backgroundColor: '#FEE2E2', borderColor: '#FECACA' }]}>
            <Text style={{ color: '#991B1B', fontWeight: '700' }}>{t('marketplace.order_cancelled')}</Text>
            {!!order.cancellationReason && <Text style={{ color: '#991B1B', marginTop: 4 }}>{order.cancellationReason}</Text>}
          </View>
        )}

        <View style={styles.actions}>
          {order.status === 'pending' && (
            <>
              <ChocolateButton onPress={() => run('accept')} loading={acting} disabled={acting}>{t('seller.accept_order')}</ChocolateButton>
              <ChocolateButton variant="outline" onPress={() => setRejectOpen(true)} disabled={acting}>{t('seller.reject_order')}</ChocolateButton>
            </>
          )}
          {order.status === 'confirmed' && (
            <ChocolateButton onPress={() => run('preparing')} loading={acting} disabled={acting}>{t('seller.start_preparing')}</ChocolateButton>
          )}
          {(order.status === 'confirmed' || order.status === 'preparing') && (
            <ChocolateButton variant={order.status === 'confirmed' ? 'outline' : undefined} onPress={confirmReady} loading={acting} disabled={acting}>
              {t('seller.mark_ready')}
            </ChocolateButton>
          )}
          {order.status === 'ready' && isPlatformDelivery && !transport && (
            <ChocolateButton onPress={() => run('relaunch-delivery')} loading={acting} disabled={acting}>{t('seller.relaunch_delivery')}</ChocolateButton>
          )}
          {order.status === 'ready' && order.fulfillmentType === 'seller_delivery' && (
            <ChocolateButton onPress={() => run('out-for-delivery')} loading={acting} disabled={acting}>{t('seller.out_for_delivery')}</ChocolateButton>
          )}
          {needsCode && (order.status === 'ready' || order.status === 'in_delivery') && (
            <ChocolateButton onPress={() => { setHandoverCode(''); setHandoverOpen(true); }}>
              {order.fulfillmentType === 'pickup' ? t('seller.confirm_pickup') : t('seller.confirm_delivery')}
            </ChocolateButton>
          )}
        </View>
      </ScrollView>

      <Modal visible={rejectOpen} transparent animationType="slide" onRequestClose={() => setRejectOpen(false)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={styles.cardTitle}>{t('seller.reject_title')}</Text>
            <Text style={styles.muted}>{t('seller.reject_desc')}</Text>
            <TextInput mode="outlined" label={t('seller.reject_reason')} value={rejectReason} onChangeText={setRejectReason} multiline
              outlineColor={tokens.border} activeOutlineColor={tokens.primary} />
            <ChocolateButton onPress={submitReject} loading={rejecting} disabled={rejecting || !rejectReason.trim()}>{t('seller.reject_order')}</ChocolateButton>
            <ChocolateButton variant="outline" onPress={() => setRejectOpen(false)}>{t('common.cancel')}</ChocolateButton>
          </View>
        </View>
      </Modal>

      <Modal visible={handoverOpen} transparent animationType="slide" onRequestClose={() => setHandoverOpen(false)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={styles.cardTitle}>{order.fulfillmentType === 'pickup' ? t('seller.confirm_pickup') : t('seller.confirm_delivery')}</Text>
            <Text style={styles.muted}>{t('seller.handover_code_desc')}</Text>
            <TextInput mode="outlined" label={t('seller.handover_code')} value={handoverCode} onChangeText={setHandoverCode} keyboardType="number-pad" maxLength={6}
              outlineColor={tokens.border} activeOutlineColor={tokens.primary} />
            <ChocolateButton onPress={submitHandover} loading={handingOver} disabled={handingOver || handoverCode.trim().length < 4}>{t('seller.validate')}</ChocolateButton>
            <ChocolateButton variant="outline" onPress={() => setHandoverOpen(false)}>{t('common.cancel')}</ChocolateButton>
          </View>
        </View>
      </Modal>
    </View>
  );
};
