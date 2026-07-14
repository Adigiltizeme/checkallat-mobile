import React, { useState, useMemo } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
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
import { useGetCategoriesQuery } from '../../store/api/servicesApi';
import { getLocalizedName } from '../../utils/localize';

const SLUG_TO_ICON: Record<string, string> = {
  electricity:   'lightning-bolt',
  plumbing:      'pipe-wrench',
  painting:      'palette',
  cleaning:      'broom',
  handyman:      'hammer',
  carpentry:     'toolbox-outline',
  air_condition: 'snowflake',
  gardening:     'flower-outline',
  moving:        'truck-outline',
  security:      'shield-check-outline',
  pest_control:  'bug-outline',
};

const CATEGORY_COLORS: Record<string, string> = {
  electricity:   '#FFD700',
  plumbing:      '#3498DB',
  painting:      '#E74C3C',
  cleaning:      '#27AE60',
  handyman:      '#FF9500',
  carpentry:     '#8B4513',
  air_condition: '#00BCD4',
  gardening:     '#4CAF50',
  moving:        '#9C27B0',
  security:      '#607D8B',
  pest_control:  '#795548',
};
const COLOR_PALETTE = ['#FF5733', '#3498DB', '#27AE60', '#9B59B6', '#F39C12', '#1ABC9C', '#E74C3C'];
const getCategoryColor = (slug: string, index: number) =>
  CATEGORY_COLORS[slug] ?? COLOR_PALETTE[index % COLOR_PALETTE.length];

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
    row: { justifyContent: 'space-between', marginBottom: spacing.sm },
    card: {
      flex: 1, maxWidth: '31%', backgroundColor: tokens.card, borderRadius: 14,
      paddingVertical: spacing.md, paddingHorizontal: 6, alignItems: 'center',
      borderWidth: 1, borderColor: tokens.border, gap: 8,
    },
    iconWrap: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    label: { fontSize: 11, fontWeight: '600', color: tokens.text.primary, textAlign: 'center' },
  }), [tokens]);

  const { data: apiCategories = [], isLoading: catLoading } = useGetCategoriesQuery({ activeOnly: true });

  const handleCategory = (slug: string) => {
    const proSlugs: string[] = user?.pro?.serviceCategorySlugs ?? [];
    if (user?.pro?.status === 'active' && proSlugs.includes(slug)) {
      Alert.alert(t('common.access_denied'), t('home.pro_cannot_book_own_category'));
      return;
    }
    navigation.navigate('SearchPros', { category: slug });
  };

  const handleSearch = () => {
    if (query.trim()) {
      navigation.navigate('SearchPros', { category: query.trim() });
    }
  };

  const filtered = query.trim()
    ? apiCategories.filter((c: any) =>
        getLocalizedName(c, i18n.language).toLowerCase().includes(query.toLowerCase()) ||
        c.slug.includes(query.toLowerCase()),
      )
    : apiCategories;

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

      {catLoading ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.primary} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item: any) => item.slug}
          numColumns={3}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.grid}
          renderItem={({ item, index }: { item: any; index: number }) => {
            const color = getCategoryColor(item.slug, index);
            return (
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.8}
                onPress={() => handleCategory(item.slug)}
              >
                <View style={[styles.iconWrap, { backgroundColor: color + '20' }]}>
                  <Icon name={SLUG_TO_ICON[item.slug] ?? 'tools'} size={28} color={color} />
                </View>
                <Text style={styles.label} numberOfLines={2}>
                  {getLocalizedName(item, i18n.language)}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
};

