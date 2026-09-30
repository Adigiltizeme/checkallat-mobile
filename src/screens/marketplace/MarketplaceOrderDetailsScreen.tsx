import React, { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, Image, TouchableOpacity, Alert, Modal, RefreshControl } from 'react-native';
import { Text, TextInput, ActivityIndicator } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  useCancelOrderMutation,
  useConfirmOrderReceivedMutation,
  useGetOrderQuery,
  useReviewOrderMutation,
} from '../../store/api/marketplaceApi';
import { useRefetchOnFocus } from '../../hooks/useRefetchOnFocus';
import { useCurrencyFormatter } from '../../hooks/useCurrencyFormatter';
import { useAppTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/spacing';
import { colors } from '../../theme/colors';
import { ChocolateButton } from '../../components/shared/ChocolateButton';
import { AutoConfirmNotice } from '../../components/shared/AutoConfirmNotice';
import { OrderStatusChip } from '../../components/marketplace/OrderStatusChip';
import { localizedName, type FulfillmentType, type MarketplaceOrderStatus } from '../../types/marketplace';

const STEPS: Record<FulfillmentType, MarketplaceOrderStatus[]> = {
  checkallpack: ['pending', 'confirmed', 'preparing', 'ready', 'in_delivery', 'delivered', 'completed'],
  transport: ['pending', 'confirmed', 'preparing', 'ready', 'in_delivery', 'delivered', 'completed'],
  seller_delivery: ['pending', 'confirmed', 'preparing', 'ready', 'in_delivery', 'completed'],
  pickup: ['pending', 'confirmed', 'preparing', 'ready', 'completed'],
};

const CODE_VISIBLE: MarketplaceOrderStatus[] = ['confirmed', 'preparing', 'ready', 'in_delivery'];

export const MarketplaceOrderDetailsScreen = ({ route, navigation }: any) => {
  const { orderId } = route.params as { orderId: string };
  const { tokens } = useAppTheme();
  const { t, i18n } = useTranslation();
  const { formatWithCurrency } = useCurrencyFormatter();
  const [reviewOpen, setReviewOpen] = useState(false);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});

  const { data: order, isLoading, isFetching, refetch } = useGetOrderQuery(orderId, {
    pollingInterval: 5000,
    refetchOnMountOrArgChange: true,
  });
  useRefetchOnFocus(refetch);
  const [cancelOrder, { isLoading: cancelling }] = useCancelOrderMutation();
  const [confirmReceived, { isLoading: confirming }] = useConfirmOrderReceivedMutation();
  const [reviewOrder, { isLoading: reviewing }] = useReviewOrderMutation();

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: tokens.background },
    content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
    card: { backgroundColor: tokens.card, borderRadius: 14, padding: spacing.md, borderWidth: 1, borderColor: tokens.border },
    headRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    logo: { width: 44, height: 44, borderRadius: 10, backgroundColor: tokens.backgroundAlt },
    title: { fontSize: 16, fontWeight: '700', color: tokens.text.primary },
    sub: { fontSize: 12, color: tokens.text.secondary, marginTop: 2 },
    cardTitle: { fontSize: 15, fontWeight: '700', color: tokens.text.primary, marginBottom: spacing.sm },
    step: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 5 },
    stepText: { fontSize: 13 },
    codeCard: { backgroundColor: tokens.primary, borderRadius: 14, padding: spacing.md, alignItems: 'center' },
    codeLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 13, textAlign: 'center' },
    code: { color: '#FFFFFF', fontSize: 36, fontWeight: '800', letterSpacing: 8, marginVertical: 4 },
    item: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 6 },
    itemImage: { width: 44, height: 44, borderRadius: 8, backgroundColor: tokens.backgroundAlt },
    row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
    muted: { color: tokens.text.secondary },
    total: { fontWeight: '800', color: tokens.text.primary, fontSize: 15 },
    linkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
    linkText: { flex: 1, color: tokens.primary, fontWeight: '600' },
    cancelledBox: { backgroundColor: '#FEE2E2', borderRadius: 12, padding: spacing.md },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    modalSheet: { backgroundColor: tokens.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.lg, maxHeight: '85%' },
    stars: { flexDirection: 'row', gap: 4, marginVertical: 6 },
  }), [tokens]);

  if (isLoading || !order) {
    return <View style={[styles.container, { justifyContent: 'center' }]}><ActivityIndicator color={tokens.primary} /></View>;
  }

  const steps = STEPS[order.fulfillmentType];
  const currentIndex = steps.indexOf(order.status);
  const shortId = order.id.slice(0, 8).toUpperCase();
  const showCode = !!order.pickupCode && CODE_VISIBLE.includes(order.status)
    && (order.fulfillmentType === 'pickup' || order.fulfillmentType === 'seller_delivery');
  const driver = order.transportRequest?.driver;

  const handleCancel = () => {
    Alert.alert(t('marketplace.cancel_order_title'), t('marketplace.cancel_order_msg'), [
      { text: t('common.no'), style: 'cancel' },
      {
        text: t('marketplace.cancel_order_confirm'),
        style: 'destructive',
        onPress: async () => {
          try { await cancelOrder(order.id).unwrap(); } catch (err: any) {
            Alert.alert(t('common.error'), err?.data?.message || t('common.error'));
          }
        },
      },
    ]);
  };

  const handleConfirm = () => {
    Alert.alert(t('marketplace.confirm_received_title'), t('marketplace.confirm_received_msg'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('marketplace.confirm_received_btn'),
        onPress: async () => {
          try {
            await confirmReceived(order.id).unwrap();
            setReviewOpen(true);
          } catch (err: any) {
            Alert.alert(t('common.error'), err?.data?.message || t('common.error'));
          }
        },
      },
    ]);
  };

  const submitReview = async () => {
    const products = order.items
      .filter((item) => ratings[item.productId])
      .map((item) => ({ productId: item.productId, rating: ratings[item.productId], ...(comments[item.productId] ? { comment: comments[item.productId] } : {}) }));
    if (products.length === 0) { setReviewOpen(false); return; }
    try {
      await reviewOrder({ orderId: order.id, products }).unwrap();
      setReviewOpen(false);
      Alert.alert(t('common.success'), t('marketplace.review_thanks'));
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.data?.message || t('common.error'));
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} colors={[tokens.primary]} />}
      >
        <View style={styles.card}>
          <View style={styles.headRow}>
            {order.seller.logo ? <Image source={{ uri: order.seller.logo }} style={styles.logo} /> : <View style={styles.logo} />}
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{order.seller.businessName}</Text>
              <Text style={styles.sub}>
                #{shortId} · {new Date(order.createdAt).toLocaleDateString(i18n.language, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
            <OrderStatusChip status={order.status} />
          </View>
          <Text style={[styles.sub, { marginTop: spacing.sm }]}>{t(`marketplace.fulfillment_${order.fulfillmentType}`)}</Text>
        </View>

        {order.status === 'cancelled' ? (
          <View style={styles.cancelledBox}>
            <Text style={{ color: '#991B1B', fontWeight: '700' }}>{t('marketplace.order_cancelled')}</Text>
            {!!order.cancellationReason && <Text style={{ color: '#991B1B', marginTop: 4 }}>{order.cancellationReason}</Text>}
            <Text style={{ color: '#991B1B', marginTop: 4 }}>{t('marketplace.order_cancelled_refund')}</Text>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('marketplace.order_progress')}</Text>
            {steps.map((step, index) => {
              const done = index <= currentIndex;
              return (
                <View key={step} style={styles.step}>
                  <Icon
                    name={index < currentIndex ? 'check-circle' : index === currentIndex ? 'record-circle' : 'checkbox-blank-circle-outline'}
                    size={20}
                    color={done ? tokens.primary : tokens.border}
                  />
                  <Text style={[styles.stepText, { color: done ? tokens.text.primary : tokens.text.secondary, fontWeight: index === currentIndex ? '700' : '400' }]}>
                    {t(`marketplace.step_${step}_${order.fulfillmentType === 'pickup' ? 'pickup' : 'delivery'}`)}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {showCode && (
          <View style={styles.codeCard}>
            <Text style={styles.codeLabel}>
              {order.fulfillmentType === 'pickup' ? t('marketplace.pickup_code_label') : t('marketplace.handover_code_label')}
            </Text>
            <Text style={styles.code}>{order.pickupCode}</Text>
            {order.fulfillmentType === 'pickup' && (
              <Text style={styles.codeLabel}>📍 {order.seller.address}{order.seller.pickupInstructions ? `\n${order.seller.pickupInstructions}` : ''}</Text>
            )}
          </View>
        )}

        {order.transportRequest && order.status !== 'cancelled' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('marketplace.delivery_title')}</Text>
            {driver ? (
              <Text style={styles.muted}>
                {order.transportRequest.vehicleCategory === 'courier' ? '🛵' : '🚚'} {driver.user.firstName} {driver.user.lastName}
                {driver.averageRating > 0 ? `  ·  ⭐ ${driver.averageRating.toFixed(1)}` : ''}
              </Text>
            ) : (
              <Text style={styles.muted}>{t('marketplace.searching_driver')}</Text>
            )}
            {['accepted', 'heading_to_pickup', 'arrived_at_pickup', 'loading', 'in_transit', 'arrived_at_delivery', 'unloading'].includes(order.transportRequest.status) && (
              <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate('TransportTracking', { requestId: order.transportRequest!.id })}>
                <Icon name="map-marker-path" size={20} color={tokens.primary} />
                <Text style={styles.linkText}>{t('marketplace.track_delivery')}</Text>
                <Icon name="chevron-right" size={20} color={tokens.primary} />
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('marketplace.items')}</Text>
          {order.items.map((item) => (
            <View key={item.id} style={styles.item}>
              {item.product.images[0] ? <Image source={{ uri: item.product.images[0] }} style={styles.itemImage} /> : <View style={styles.itemImage} />}
              <View style={{ flex: 1 }}>
                <Text numberOfLines={2}>{localizedName(item.product, i18n.language)}</Text>
                {!!item.specialNotes && <Text style={styles.sub}>{item.specialNotes}</Text>}
              </View>
              <Text style={styles.muted}>× {item.quantity}</Text>
              <Text>{formatWithCurrency(item.totalPrice, order.currency)}</Text>
            </View>
          ))}
          <View style={[styles.row, { marginTop: spacing.sm }]}><Text style={styles.muted}>{t('marketplace.subtotal')}</Text><Text>{formatWithCurrency(order.subtotal, order.currency)}</Text></View>
          <View style={styles.row}><Text style={styles.muted}>{t('marketplace.delivery_fee')}</Text><Text>{formatWithCurrency(order.deliveryFee, order.currency)}</Text></View>
          <View style={styles.row}><Text style={styles.total}>{t('marketplace.total')}</Text><Text style={styles.total}>{formatWithCurrency(order.totalAmount, order.currency)}</Text></View>
          {!!order.deliveryAddress && <Text style={[styles.sub, { marginTop: spacing.sm }]}>📍 {order.deliveryAddress}</Text>}
        </View>

        {!['completed', 'cancelled'].includes(order.status) && (
          <TouchableOpacity
            style={[styles.card, styles.linkRow]}
            onPress={() => navigation.navigate('BookingChat', { entityType: 'order', entityId: order.id, otherPartyName: order.seller.businessName })}
          >
            <Icon name="message-text-outline" size={20} color={tokens.primary} />
            <Text style={styles.linkText}>{t('marketplace.contact_shop')}</Text>
            <Icon name="chevron-right" size={20} color={tokens.primary} />
          </TouchableOpacity>
        )}

        {order.status === 'pending' && (
          <ChocolateButton variant="outline" onPress={handleCancel} loading={cancelling} disabled={cancelling}>
            {t('marketplace.cancel_order')}
          </ChocolateButton>
        )}
        {/* Livrée : échéance de la clôture automatique et signalement d'un problème */}
        {order.status === 'delivered' && !order.hasOpenClaim && !!order.autoCompleteAt && (
          <AutoConfirmNotice
            title={t('completion.order_title')}
            deadline={order.autoCompleteAt}
            message={(deadline) => t('completion.order_message', { deadline })}
            onReport={() => navigation.navigate('BookingDispute', { orderId: order.id })}
          />
        )}
        {order.hasOpenClaim && (
          <View style={[styles.card, styles.linkRow]}>
            <Icon name="shield-alert-outline" size={20} color={tokens.primary} />
            <Text style={styles.linkText}>{t('completion.claim_in_review')}</Text>
          </View>
        )}
        {order.status === 'completed' && !order.hasOpenClaim && !!order.claimDeadline && new Date(order.claimDeadline).getTime() > Date.now() && (
          <TouchableOpacity
            style={[styles.card, styles.linkRow]}
            onPress={() => navigation.navigate('BookingDispute', { orderId: order.id })}
          >
            <Icon name="flag-outline" size={20} color={tokens.primary} />
            <Text style={styles.linkText}>{t('completion.report_problem')}</Text>
            <Icon name="chevron-right" size={20} color={tokens.primary} />
          </TouchableOpacity>
        )}
        {order.status === 'delivered' && (
          <ChocolateButton onPress={handleConfirm} loading={confirming} disabled={confirming}>
            {t('marketplace.confirm_received_btn')}
          </ChocolateButton>
        )}
        {order.status === 'completed' && (
          <ChocolateButton variant="outline" onPress={() => setReviewOpen(true)}>
            {t('marketplace.rate_products')}
          </ChocolateButton>
        )}
      </ScrollView>

      <Modal visible={reviewOpen} transparent animationType="slide" onRequestClose={() => setReviewOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <Text style={styles.cardTitle}>{t('marketplace.rate_products')}</Text>
            <ScrollView>
              {order.items.map((item) => (
                <View key={item.id} style={{ marginBottom: spacing.md }}>
                  <Text>{localizedName(item.product, i18n.language)}</Text>
                  <View style={styles.stars}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <TouchableOpacity key={n} onPress={() => setRatings((r) => ({ ...r, [item.productId]: n }))} accessibilityLabel={`${n}/5`}>
                        <Icon name={(ratings[item.productId] ?? 0) >= n ? 'star' : 'star-outline'} size={30} color={colors.warning} />
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TextInput
                    mode="outlined"
                    dense
                    placeholder={t('marketplace.review_comment_placeholder')}
                    value={comments[item.productId] ?? ''}
                    onChangeText={(text) => setComments((c) => ({ ...c, [item.productId]: text }))}
                    outlineColor={tokens.border}
                    activeOutlineColor={tokens.primary}
                  />
                </View>
              ))}
            </ScrollView>
            <ChocolateButton onPress={submitReview} loading={reviewing} disabled={reviewing}>{t('marketplace.send_review')}</ChocolateButton>
            <ChocolateButton variant="outline" onPress={() => setReviewOpen(false)} style={{ marginTop: spacing.sm }}>{t('marketplace.later')}</ChocolateButton>
          </View>
        </View>
      </Modal>
    </View>
  );
};
