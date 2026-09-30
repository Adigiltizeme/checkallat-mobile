import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import type { MarketplaceOrderStatus } from '../../types/marketplace';

export const ORDER_STATUS_COLORS: Record<MarketplaceOrderStatus, { color: string; bg: string }> = {
  pending: { color: '#92400E', bg: '#FEF3C7' },
  confirmed: { color: '#1E40AF', bg: '#DBEAFE' },
  preparing: { color: '#3730A3', bg: '#E0E7FF' },
  ready: { color: '#6B21A8', bg: '#F3E8FF' },
  in_delivery: { color: '#0E7490', bg: '#CFFAFE' },
  delivered: { color: '#0F766E', bg: '#CCFBF1' },
  completed: { color: '#166534', bg: '#DCFCE7' },
  cancelled: { color: '#991B1B', bg: '#FEE2E2' },
};

export const OrderStatusChip = ({ status }: { status: MarketplaceOrderStatus }) => {
  const { t } = useTranslation();
  const palette = ORDER_STATUS_COLORS[status] ?? ORDER_STATUS_COLORS.pending;
  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }]}>
      <Text style={[styles.text, { color: palette.color }]}>{t(`marketplace.status_${status}`)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  text: { fontSize: 10, fontWeight: '700' },
});
