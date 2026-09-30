import React, { useMemo, useState } from 'react';
import { View, StyleSheet, SectionList, TouchableOpacity, Image, Alert, Switch, RefreshControl } from 'react-native';
import { Text, ActivityIndicator, FAB, TextInput } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  useGetSellerProductsQuery,
  useGetSellerSectionsQuery,
  useUpdateSellerProductMutation,
  useUpdateSellerProductStockMutation,
} from '../../store/api/marketplaceApi';
import { useRefetchOnFocus } from '../../hooks/useRefetchOnFocus';
import { useCurrencyFormatter } from '../../hooks/useCurrencyFormatter';
import { useAppTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/spacing';
import { colors } from '../../theme/colors';
import { localizedName, type MarketplaceProduct } from '../../types/marketplace';

export const SellerProductsScreen = ({ navigation }: any) => {
  const { tokens } = useAppTheme();
  const { t, i18n } = useTranslation();
  const { formatWithCurrency } = useCurrencyFormatter();
  const [search, setSearch] = useState('');

  const { data: products = [], isLoading, isFetching, refetch } = useGetSellerProductsQuery(undefined, {
    pollingInterval: 30_000,
    refetchOnMountOrArgChange: true,
  });
  const { data: sections = [], refetch: refetchSections } = useGetSellerSectionsQuery(undefined, { refetchOnMountOrArgChange: true });
  useRefetchOnFocus(() => { refetch(); refetchSections(); });
  const [updateProduct] = useUpdateSellerProductMutation();
  const [updateStock] = useUpdateSellerProductStockMutation();

  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q ? products.filter((p) => localizedName(p, i18n.language).toLowerCase().includes(q)) : products;
    const result = sections
      .map((s) => ({ key: s.id, title: localizedName(s, i18n.language), data: filtered.filter((p) => p.sectionId === s.id) }))
      .filter((s) => s.data.length > 0);
    const others = filtered.filter((p) => !p.sectionId || !sections.find((s) => s.id === p.sectionId));
    if (others.length > 0) result.push({ key: 'others', title: t('marketplace.other_products'), data: others });
    return result;
  }, [products, sections, search, i18n.language, t]);

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: tokens.background },
    search: { margin: spacing.md, marginBottom: 0, backgroundColor: tokens.backgroundAlt },
    list: { padding: spacing.md, paddingBottom: 100 },
    sectionHeader: { fontSize: 13, fontWeight: '700', color: tokens.text.secondary, textTransform: 'uppercase', marginTop: spacing.md, marginBottom: spacing.xs },
    card: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: tokens.card, borderRadius: 12, padding: spacing.sm, marginBottom: spacing.sm, borderWidth: 1, borderColor: tokens.border },
    image: { width: 56, height: 56, borderRadius: 10, backgroundColor: tokens.backgroundAlt },
    name: { fontSize: 14, fontWeight: '600', color: tokens.text.primary },
    meta: { fontSize: 12, color: tokens.text.secondary, marginTop: 2 },
    stockLow: { color: '#B45309', fontWeight: '600' },
    stockOut: { color: colors.error, fontWeight: '600' },
    empty: { alignItems: 'center', marginTop: spacing.xl * 2, gap: spacing.sm, paddingHorizontal: spacing.lg },
    emptyText: { color: tokens.text.secondary, textAlign: 'center' },
    fab: { position: 'absolute', right: spacing.md, bottom: spacing.md, backgroundColor: tokens.primary },
  }), [tokens]);

  const toggleAvailable = async (product: MarketplaceProduct, value: boolean) => {
    if (value && product.hasStock && (product.stockQuantity ?? 0) <= 0) {
      Alert.alert(t('seller.restock_title'), t('seller.restock_first'));
      return;
    }
    try {
      await updateProduct({ id: product.id, isAvailable: value }).unwrap();
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.data?.message || t('common.error'));
    }
  };

  const restock = async (product: MarketplaceProduct, delta: number) => {
    const quantity = Math.max(0, (product.stockQuantity ?? 0) + delta);
    try {
      await updateStock({ id: product.id, quantity }).unwrap();
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.data?.message || t('common.error'));
    }
  };

  const renderProduct = ({ item }: { item: MarketplaceProduct }) => {
    const outOfStock = item.hasStock && (item.stockQuantity ?? 0) <= 0;
    const lowStock = item.hasStock && !outOfStock && item.lowStockThreshold != null && (item.stockQuantity ?? 0) <= item.lowStockThreshold;
    return (
      <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('SellerProductForm', { productId: item.id })} activeOpacity={0.85}>
        {item.images[0] ? <Image source={{ uri: item.images[0] }} style={styles.image} /> : <View style={styles.image} />}
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={1}>{localizedName(item, i18n.language)}</Text>
          <Text style={styles.meta}>{formatWithCurrency(item.price, item.currency)}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Text style={[styles.meta, outOfStock && styles.stockOut, lowStock && styles.stockLow]}>
              {item.hasStock ? t('seller.stock_count', { count: item.stockQuantity ?? 0 }) : t('seller.stock_unlimited')}
            </Text>
            {item.hasStock && (
              <>
                <TouchableOpacity onPress={() => restock(item, -1)} hitSlop={8} accessibilityLabel="-1">
                  <Icon name="minus-circle-outline" size={20} color={tokens.text.secondary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => restock(item, 1)} hitSlop={8} accessibilityLabel="+1">
                  <Icon name="plus-circle-outline" size={20} color={tokens.primary} />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
        <Switch value={item.isAvailable} onValueChange={(v) => toggleAvailable(item, v)} trackColor={{ false: tokens.border, true: tokens.primary }} thumbColor={colors.white} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <TextInput mode="outlined" dense placeholder={t('seller.search_products')} value={search} onChangeText={setSearch}
        left={<TextInput.Icon icon="magnify" />} outlineColor={tokens.border} activeOutlineColor={tokens.primary} style={styles.search} />
      {isLoading ? <ActivityIndicator style={{ marginTop: spacing.xl }} color={tokens.primary} /> : (
        <SectionList
          sections={grouped}
          keyExtractor={(item) => item.id}
          renderItem={renderProduct}
          renderSectionHeader={({ section }) => <Text style={styles.sectionHeader}>{section.title}</Text>}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} colors={[tokens.primary]} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Icon name="package-variant-plus" size={56} color={tokens.border} />
              <Text style={styles.emptyText}>{t('seller.no_products')}</Text>
            </View>
          }
        />
      )}
      <FAB icon="plus" label={t('seller.add_product')} color="#FFFFFF" style={styles.fab} onPress={() => navigation.navigate('SellerProductForm', {})} />
    </View>
  );
};
