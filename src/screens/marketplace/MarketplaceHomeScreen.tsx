import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Image, ScrollView, RefreshControl } from 'react-native';
import { Text, TextInput, ActivityIndicator } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { RootState } from '../../store';
import { useGetDomainsQuery, useGetProductsQuery, useGetShopsQuery } from '../../store/api/marketplaceApi';
import { useRefetchOnFocus } from '../../hooks/useRefetchOnFocus';
import { useCurrencyFormatter } from '../../hooks/useCurrencyFormatter';
import { useAppTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/spacing';
import { CartBar } from '../../components/marketplace/CartBar';
import { localizedName, type MarketplaceShop } from '../../types/marketplace';

export const MarketplaceHomeScreen = ({ navigation }: any) => {
  const { tokens } = useAppTheme();
  const { t, i18n } = useTranslation();
  const { formatWithCurrency } = useCurrencyFormatter();
  const countryCode = useSelector((s: RootState) => s.location.selectedCountryCode ?? s.location.detectedCountryCode ?? undefined);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [domainId, setDomainId] = useState<string | undefined>(undefined);

  useEffect(() => {
    const id = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(id);
  }, [searchInput]);

  const { data: domains = [] } = useGetDomainsQuery();
  const { data: shops = [], isLoading, isFetching, refetch } = useGetShopsQuery(
    { domainId, search: search || undefined, countryCode: countryCode?.toUpperCase() },
    { pollingInterval: 30_000, refetchOnMountOrArgChange: true },
  );
  const { data: productResults } = useGetProductsQuery(
    { search, domainId, countryCode: countryCode?.toUpperCase() },
    { skip: search.length < 2, refetchOnMountOrArgChange: true },
  );
  useRefetchOnFocus(refetch);

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: tokens.background },
    header: { padding: spacing.md, paddingBottom: spacing.sm, backgroundColor: tokens.card },
    search: { backgroundColor: tokens.backgroundAlt },
    chips: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.xs },
    chip: {
      flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7,
      borderRadius: 20, borderWidth: 1, borderColor: tokens.border, backgroundColor: tokens.card, marginRight: spacing.xs,
    },
    chipActive: { backgroundColor: tokens.primary, borderColor: tokens.primary },
    chipText: { fontSize: 13, color: tokens.text.primary, fontWeight: '600' },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: tokens.text.primary, marginHorizontal: spacing.md, marginTop: spacing.md, marginBottom: spacing.sm },
    list: { paddingHorizontal: spacing.md, paddingBottom: 110 },
    card: { backgroundColor: tokens.card, borderRadius: 14, marginBottom: spacing.md, overflow: 'hidden', borderWidth: 1, borderColor: tokens.border },
    banner: { height: 110, backgroundColor: tokens.primary + '22' },
    cardBody: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md },
    logo: { width: 52, height: 52, borderRadius: 12, backgroundColor: tokens.backgroundAlt, marginTop: -40, borderWidth: 2, borderColor: tokens.card },
    shopName: { fontSize: 16, fontWeight: '700', color: tokens.text.primary },
    meta: { fontSize: 12, color: tokens.text.secondary, marginTop: 2 },
    closedBadge: { position: 'absolute', top: spacing.sm, right: spacing.sm, backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
    closedText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
    productCard: { width: 140, marginRight: spacing.sm, backgroundColor: tokens.card, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: tokens.border },
    productImage: { width: 140, height: 100, backgroundColor: tokens.backgroundAlt },
    productName: { fontSize: 13, fontWeight: '600', color: tokens.text.primary, marginHorizontal: 8, marginTop: 6 },
    productPrice: { fontSize: 13, fontWeight: '700', color: tokens.primary, marginHorizontal: 8, marginBottom: 8, marginTop: 2 },
    empty: { alignItems: 'center', marginTop: spacing.xl * 2, gap: spacing.sm, paddingHorizontal: spacing.lg },
    emptyText: { color: tokens.text.secondary, textAlign: 'center' },
  }), [tokens]);

  const renderShop = ({ item }: { item: MarketplaceShop }) => (
    <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={() => navigation.navigate('MarketplaceShop', { sellerId: item.id })}>
      {item.bannerUrl ? <Image source={{ uri: item.bannerUrl }} style={styles.banner} /> : <View style={styles.banner} />}
      {item.isTemporarilyClosed && (
        <View style={styles.closedBadge}><Text style={styles.closedText}>{t('marketplace.shop_closed')}</Text></View>
      )}
      <View style={styles.cardBody}>
        {item.logo
          ? <Image source={{ uri: item.logo }} style={styles.logo} />
          : <View style={[styles.logo, { alignItems: 'center', justifyContent: 'center' }]}><Icon name="storefront-outline" size={26} color={tokens.primary} /></View>}
        <View style={{ flex: 1 }}>
          <Text style={styles.shopName} numberOfLines={1}>{item.businessName}</Text>
          <Text style={styles.meta} numberOfLines={1}>
            {item.domains.map((d) => localizedName(d, i18n.language)).join(' · ')}
          </Text>
          <Text style={styles.meta}>
            {item.averageRating > 0 ? `⭐ ${item.averageRating.toFixed(1)}  ·  ` : ''}
            {t('marketplace.prep_time_short', { minutes: item.preparationTimeMin })}
          </Text>
        </View>
        <Icon name="chevron-right" size={22} color={tokens.text.secondary} />
      </View>
    </TouchableOpacity>
  );

  const header = (
    <>
      {search.length >= 2 && (productResults?.products?.length ?? 0) > 0 && (
        <>
          <Text style={styles.sectionTitle}>{t('marketplace.products_found', { count: productResults!.total })}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.md }}>
            {productResults!.products.map((p) => (
              <TouchableOpacity key={p.id} style={styles.productCard} onPress={() => navigation.navigate('ProductDetail', { productId: p.id })}>
                {p.images[0] ? <Image source={{ uri: p.images[0] }} style={styles.productImage} /> : <View style={styles.productImage} />}
                <Text style={styles.productName} numberOfLines={2}>{localizedName(p, i18n.language)}</Text>
                <Text style={styles.productPrice}>{formatWithCurrency(p.price, p.currency)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </>
      )}
      <Text style={styles.sectionTitle}>{t('marketplace.shops_title')}</Text>
    </>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TextInput
          mode="outlined"
          placeholder={t('marketplace.search_placeholder')}
          value={searchInput}
          onChangeText={setSearchInput}
          left={<TextInput.Icon icon="magnify" />}
          right={searchInput ? <TextInput.Icon icon="close" onPress={() => setSearchInput('')} /> : undefined}
          outlineColor={tokens.border}
          activeOutlineColor={tokens.primary}
          style={styles.search}
        />
      </View>

      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <TouchableOpacity style={[styles.chip, !domainId && styles.chipActive]} onPress={() => setDomainId(undefined)}>
            <Text style={[styles.chipText, !domainId && { color: '#FFFFFF' }]}>{t('marketplace.all_domains')}</Text>
          </TouchableOpacity>
          {domains.map((d) => {
            const active = domainId === d.id;
            return (
              <TouchableOpacity key={d.id} style={[styles.chip, active && styles.chipActive]} onPress={() => setDomainId(active ? undefined : d.id)}>
                {d.icon ? <Icon name={d.icon} size={16} color={active ? '#FFFFFF' : tokens.primary} /> : null}
                <Text style={[styles.chipText, active && { color: '#FFFFFF' }]}>{localizedName(d, i18n.language)}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={tokens.primary} />
      ) : (
        <FlatList
          data={shops}
          keyExtractor={(item) => item.id}
          renderItem={renderShop}
          ListHeaderComponent={header}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} colors={[tokens.primary]} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Icon name="storefront-outline" size={56} color={tokens.border} />
              <Text style={styles.emptyText}>{search || domainId ? t('marketplace.no_shop_match') : t('marketplace.no_shop_yet')}</Text>
            </View>
          }
        />
      )}

      <CartBar onPress={() => navigation.navigate('Cart')} />
    </View>
  );
};
