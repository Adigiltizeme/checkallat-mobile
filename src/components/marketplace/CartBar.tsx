import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { RootState } from '../../store';
import { selectCartCount, selectCartSubtotal } from '../../store/slices/cartSlice';
import { useAppTheme } from '../../theme/ThemeProvider';
import { useCurrencyFormatter } from '../../hooks/useCurrencyFormatter';
import { spacing } from '../../theme/spacing';

/** Barre flottante "Voir le panier" — affichée tant que le panier contient des articles */
export const CartBar = ({ onPress }: { onPress: () => void }) => {
  const { tokens } = useAppTheme();
  const { t } = useTranslation();
  const { formatWithCurrency } = useCurrencyFormatter();
  const count = useSelector(selectCartCount);
  const subtotal = useSelector(selectCartSubtotal);
  const currency = useSelector((s: RootState) => s.cart.items[0]?.currency);
  const sellerName = useSelector((s: RootState) => s.cart.sellerName);

  if (count === 0) return null;

  return (
    <TouchableOpacity style={[styles.bar, { backgroundColor: tokens.primary }]} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.countBubble}>
        <Text style={[styles.countText, { color: tokens.primary }]}>{count}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{t('marketplace.view_cart')}</Text>
        {sellerName && <Text style={styles.sub} numberOfLines={1}>{sellerName}</Text>}
      </View>
      <Text style={styles.total}>{currency ? formatWithCurrency(subtotal, currency) : subtotal}</Text>
      <Icon name="chevron-right" size={22} color="#FFFFFF" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  countBubble: { backgroundColor: '#FFFFFF', minWidth: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  countText: { fontWeight: '800', fontSize: 13 },
  title: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  sub: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
  total: { color: '#FFFFFF', fontWeight: '700', fontSize: 15, fontVariant: ['tabular-nums'] },
});
