import React, { useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { RootState } from '../../store';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

const CATEGORIES = [
  { slug: 'electricity',  icon: 'flash',           color: '#FFD700', labelKey: 'home.service_electric' },
  { slug: 'plumbing',     icon: 'water-pump',      color: '#3498DB', labelKey: 'home.service_plumbing' },
  { slug: 'painting',     icon: 'format-paint',    color: '#E74C3C', labelKey: 'home.service_painting' },
  { slug: 'cleaning',     icon: 'broom',           color: '#27AE60', labelKey: 'home.service_cleaning' },
  { slug: 'handyman',     icon: 'hammer',          color: '#FF9500', labelKey: 'home.service_handyman' },
  { slug: 'carpentry',    icon: 'saw-blade',       color: '#8B4513', labelKey: 'home.service_carpentry' },
  { slug: 'air_condition',icon: 'air-conditioner', color: '#00BCD4', labelKey: 'home.service_air_condition' },
];

export const SearchHomeScreen = () => {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<any>();
  const user = useSelector((state: RootState) => state.auth.user);
  const [query, setQuery] = useState('');

  const handleCategory = (slug: string, label: string) => {
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
    ? CATEGORIES.filter((c) =>
        t(c.labelKey).toLowerCase().includes(query.toLowerCase()) ||
        c.slug.includes(query.toLowerCase()),
      )
    : CATEGORIES;

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchWrap}>
        <Icon name="magnify" size={20} color={colors.gray} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={t('search.placeholder')}
          placeholderTextColor={colors.gray}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Icon name="close-circle" size={18} color={colors.gray} />
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.sectionTitle}>{t('search.categories')}</Text>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.slug}
        numColumns={3}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.grid}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.8}
            onPress={() => handleCategory(item.slug, t(item.labelKey))}
          >
            <View style={[styles.iconWrap, { backgroundColor: item.color + '20' }]}>
              <Icon name={item.icon} size={28} color={item.color} />
            </View>
            <Text style={styles.label} numberOfLines={2}>
              {t(item.labelKey)}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.light },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    margin: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  searchIcon: { marginRight: 2 },
  searchInput: { flex: 1, fontSize: 15, color: colors.dark, padding: 0 },

  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.gray,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },

  grid: { paddingHorizontal: spacing.md, paddingBottom: spacing.xxl },
  row: { justifyContent: 'space-between', marginBottom: spacing.sm },

  card: {
    flex: 1,
    maxWidth: '31%',
    backgroundColor: colors.white,
    borderRadius: 14,
    paddingVertical: spacing.md,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  iconWrap: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 11, fontWeight: '600', color: colors.dark, textAlign: 'center' },
});
