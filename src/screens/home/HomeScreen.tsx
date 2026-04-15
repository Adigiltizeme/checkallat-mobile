import React from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Text, Searchbar } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export const HomeScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const user = useSelector((state: RootState) => state.auth.user);
  const [searchQuery, setSearchQuery] = React.useState('');

  const CATEGORIES = [
    { id: 'services', title: t('home.services_home'), icon: 'home-city', route: 'SearchPros', color: colors.primary },
    { id: 'transport', title: t('home.transport'), icon: 'truck', route: 'CreateTransport', color: colors.secondary },
    { id: 'marketplace', title: t('home.marketplace'), icon: 'shopping', route: 'MarketplaceHome', color: colors.accent },
    { id: 'auto-moto', title: t('home.auto_moto'), icon: 'car', route: 'MarketplaceHome', color: colors.accent },
  ];

  const handleCategoryPress = (route: string) => {
    // TODO: Navigate to the specific category screen
    console.log('Navigate to:', route);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.greeting}>
          {t('home.welcome', { name: user?.firstName ?? '' })} 👋
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          {t('common.search')}...
        </Text>
      </View>

      <Searchbar
        placeholder={t('home.search_placeholder')}
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
        iconColor={colors.primary}
      />

      <View style={styles.categoriesContainer}>
        <Text variant="titleLarge" style={styles.sectionTitle}>
          {t('home.services')}
        </Text>

        {CATEGORIES.map((category) => (
          <TouchableOpacity
            key={category.id}
            onPress={() => handleCategoryPress(category.route)}
          >
            <Card style={styles.categoryCard} mode="elevated">
              <Card.Content style={styles.categoryContent}>
                <View style={[styles.iconContainer, { backgroundColor: `${category.color}20` }]}>
                  <Icon name={category.icon} size={32} color={category.color} />
                </View>
                <View style={styles.categoryTextContainer}>
                  <Text variant="titleMedium" style={styles.categoryTitle}>
                    {category.title}
                  </Text>
                  <Text variant="bodySmall" style={styles.categorySubtitle}>
                    {t('home.discover')} →
                  </Text>
                </View>
              </Card.Content>
            </Card>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.featuresContainer}>
        <Text variant="titleLarge" style={styles.sectionTitle}>
          {t('home.why_checkallat')}
        </Text>

        <Card style={styles.featureCard}>
          <Card.Content style={styles.featureContent}>
            <Icon name="shield-check" size={24} color={colors.success} />
            <Text variant="bodyMedium" style={styles.featureText}>
              {t('home.feature_verified')}
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.featureCard}>
          <Card.Content style={styles.featureContent}>
            <Icon name="cash-lock" size={24} color={colors.info} />
            <Text variant="bodyMedium" style={styles.featureText}>
              {t('home.feature_payment')}
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.featureCard}>
          <Card.Content style={styles.featureContent}>
            <Icon name="star" size={24} color={colors.warning} />
            <Text variant="bodyMedium" style={styles.featureText}>
              {t('home.feature_rating')}
            </Text>
          </Card.Content>
        </Card>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light,
  },
  header: {
    padding: spacing.lg,
    backgroundColor: colors.white,
  },
  greeting: {
    color: colors.dark,
    marginBottom: spacing.sm,
  },
  subtitle: {
    color: colors.gray,
  },
  searchBar: {
    margin: spacing.md,
    elevation: 2,
    backgroundColor: colors.white,
  },
  categoriesContainer: {
    padding: spacing.md,
  },
  sectionTitle: {
    color: colors.dark,
    marginBottom: spacing.md,
    fontWeight: '600',
  },
  categoryCard: {
    marginBottom: spacing.md,
    backgroundColor: colors.white,
  },
  categoryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  categoryTextContainer: {
    flex: 1,
  },
  categoryTitle: {
    color: colors.dark,
    fontWeight: '600',
    marginBottom: 4,
  },
  categorySubtitle: {
    color: colors.primary,
  },
  featuresContainer: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  featureCard: {
    marginBottom: spacing.md,
    backgroundColor: colors.white,
  },
  featureContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  featureText: {
    color: colors.dark,
    marginLeft: spacing.md,
    flex: 1,
  },
});
