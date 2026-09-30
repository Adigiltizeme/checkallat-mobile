import React, { useState, useMemo } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { RootState } from '../../store';
import { colors } from '../../theme/colors';
import { useAppTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/spacing';
import { getLocalizedName } from '../../utils/localize';
import { useServiceCategories, ServiceCategoryItem } from '../../hooks/useServiceCategories';
import { CategoryIcon } from '../../components/shared/CategoryIcon';
import { getCountryInfo } from '../../config/countries';

const COLUMNS = 3;

/** Comparaison sans accents ni majuscules (ex. « electricite » trouve « Électricité ») */
const normalize = (v: string) => v.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export const SearchHomeScreen = () => {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<any>();
  const user = useSelector((state: RootState) => state.auth.user);
  const [query, setQuery] = useState('');
  const { tokens } = useAppTheme();
  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: tokens.background },
    searchWrap: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: tokens.card,
      borderRadius: 12, margin: spacing.md, paddingHorizontal: spacing.sm,
      paddingVertical: 10, borderWidth: 1, borderColor: tokens.border, gap: spacing.xs,
    },
    searchIcon: { marginRight: 2 },
    searchInput: { flex: 1, fontSize: 15, color: tokens.text.primary, padding: 0 },
    sectionTitle: {
      fontSize: 13, fontWeight: '700', color: tokens.text.secondary, textTransform: 'uppercase',
      letterSpacing: 0.5, marginHorizontal: spacing.md, marginBottom: spacing.sm,
    },
    grid: { paddingHorizontal: spacing.md, paddingBottom: spacing.xxl },
    // Cartes alignées à gauche : une dernière ligne incomplète ne laisse pas de trou au milieu
    row: { justifyContent: 'flex-start', gap: spacing.sm, marginBottom: spacing.sm },
    card: {
      width: '31.5%', backgroundColor: tokens.card, borderRadius: 14,
      paddingVertical: spacing.md, paddingHorizontal: 6, alignItems: 'center',
      borderWidth: 1, borderColor: tokens.border, gap: 8,
    },
    label: { fontSize: 11, fontWeight: '600', color: tokens.text.primary, textAlign: 'center' },
    empty: { alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing.xl, gap: spacing.sm },
    emptyText: { color: tokens.text.secondary, textAlign: 'center', lineHeight: 20 },
  }), [tokens]);

  // Catégories réglées dans le web-admin et proposées dans le pays de l'utilisateur
  const { categories, isLoading, isFetching, refetch, countryCode } = useServiceCategories();

  const handleCategory = (item: ServiceCategoryItem) => {
    const proSlugs: string[] = user?.pro?.serviceCategorySlugs ?? [];
    if (user?.pro?.status === 'active' && proSlugs.includes(item.slug)) {
      Alert.alert(t('common.access_denied'), t('home.pro_cannot_book_own_category'));
      return;
    }
    navigation.navigate('SearchPros', { category: item.slug });
  };

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return categories;
    return categories.filter((c) =>
      [c.nameFr, c.nameEn, c.nameAr, c.slug].some((v) => v && normalize(v).includes(q)),
    );
  }, [categories, query]);

  // Validation du clavier : ouvre la catégorie si une seule correspond
  const handleSearch = () => {
    if (filtered.length === 1) handleCategory(filtered[0]);
  };

  const countryName = countryCode ? t(`country.${getCountryInfo(countryCode)?.nameKey ?? ''}`, { defaultValue: countryCode }) : '';

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchWrap}>
        <Icon name="magnify" size={20} color={tokens.text.secondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={t('search.placeholder')}
          placeholderTextColor={tokens.text.secondary}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Icon name="close-circle" size={18} color={tokens.text.secondary} />
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.sectionTitle}>{t('search.categories')}</Text>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.primary} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.slug}
          numColumns={COLUMNS}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.grid}
          refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Icon name={query.trim() ? 'text-search' : 'map-marker-off-outline'} size={40} color={tokens.text.secondary} />
              <Text style={styles.emptyText}>
                {query.trim()
                  ? t('search.no_result', { query: query.trim() })
                  : t('search.no_category_in_country', { country: countryName })}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} activeOpacity={0.8} onPress={() => handleCategory(item)}>
              <CategoryIcon category={item} />
              <Text style={styles.label} numberOfLines={2}>
                {getLocalizedName(item, i18n.language)}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
};
