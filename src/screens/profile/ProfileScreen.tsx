import React, { useEffect, useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Switch, Image, Linking } from 'react-native';
import { List, Divider, Text } from 'react-native-paper';
import { ChocolateButton } from '../../components/shared/ChocolateButton';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootState } from '../../store';
import { logout, setActiveRole, clearDefaultRole } from '../../store/slices/authSlice';
import { ProfileStackParamList } from '../../navigation/types';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { useAppTheme } from '../../theme/ThemeProvider';

type ProfileNavProp = StackNavigationProp<ProfileStackParamList, 'ProfileHome'>;

const NOTIF_KEY = 'notificationsEnabled';
const LANG_LABELS: Record<string, string> = { fr: 'Français', en: 'English', ar: 'العربية' };
const THEME_LABEL_KEYS: Record<string, string> = {
  light:   'settings.theme_light',
  comfort: 'settings.theme_comfort',
  dark:    'settings.theme_dark',
  system:  'settings.theme_system',
  teal:    'settings.theme_teal',
};

export const ProfileScreen = () => {
  const { tokens, mode } = useAppTheme();

  const styles = useMemo(() => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.background,
  },
  header: {
    backgroundColor: tokens.card,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: tokens.primary,
    marginBottom: spacing.md,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: tokens.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarInitials: {
    color: colors.white,
    fontSize: 28,
    fontWeight: '700',
  },
  name: {
    color: tokens.text.primary,
    fontWeight: '600',
    marginBottom: 4,
  },
  email: {
    color: tokens.text.secondary,
  },
  driverBadge: {
    marginTop: 8,
    backgroundColor: tokens.primary + '15',
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  driverBadgeText: {
    color: tokens.primary,
    fontWeight: '600',
    fontSize: 13,
  },
  section: {
    backgroundColor: tokens.card,
    marginBottom: spacing.md,
  },
  logoutButton: {
    margin: spacing.lg,
  },
  version: {
    textAlign: 'center',
    color: tokens.text.secondary,
    marginBottom: spacing.xl,
  },
  }), [tokens]);
  const sectionStyle = [styles.section, { backgroundColor: tokens.card }];
  const headerStyle  = [styles.header,  { backgroundColor: tokens.card }];
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigation = useNavigation<ProfileNavProp>();
  const user = useSelector((state: RootState) => state.auth.user);
  const activeRole = useSelector((state: RootState) => state.auth.activeRole);
  const availableRoles = useSelector((state: RootState) => state.auth.availableRoles);
  const defaultRole = useSelector((state: RootState) => state.auth.defaultRole);
  const isDriver = activeRole === 'driver';
  const isPro = activeRole === 'pro';
  const currentLang = useSelector((state: RootState) => state.auth.language ?? 'fr');

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(NOTIF_KEY).then((val) => {
      if (val !== null) setNotificationsEnabled(val === 'true');
    });
  }, []);

  const toggleNotifications = (value: boolean) => {
    setNotificationsEnabled(value);
    AsyncStorage.setItem(NOTIF_KEY, String(value));
  };

  const handleLogout = () => {
    dispatch(logout());
  };

  const avatarSource = user?.profilePicture ? { uri: user.profilePicture } : null;
  const initials =
    (user?.firstName?.[0] || 'U').toUpperCase() +
    (user?.lastName?.[0] || '').toUpperCase();

  return (
    <ScrollView style={[styles.container, { backgroundColor: tokens.background }]}>
      {/* Header avatar */}
      <View style={headerStyle}>
        {avatarSource ? (
          <Image source={avatarSource} style={[styles.avatarImage, { borderColor: tokens.primary }]} />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: tokens.primary }]}>
            <Text style={styles.avatarInitials}>{initials}</Text>
          </View>
        )}
        <Text variant="headlineSmall" style={styles.name}>
          {user?.firstName} {user?.lastName}
        </Text>
        <Text variant="bodyMedium" style={styles.email}>
          {user?.email || user?.phone}
        </Text>
        {isDriver && (
          <View style={[styles.driverBadge, { backgroundColor: tokens.primary + '15' }]}>
            <Text style={[styles.driverBadgeText, { color: tokens.primary }]}>🚚 {t('profile.driver_badge')}</Text>
          </View>
        )}
        {isPro && (
          <View style={[styles.driverBadge, { backgroundColor: '#10B98120' }]}>
            <Text style={[styles.driverBadgeText, { color: '#10B981' }]}>💼 {t('profile.pro_badge')}</Text>
          </View>
        )}
      </View>

      {/* Switcher de rôle — visible uniquement si plusieurs rôles */}
      {availableRoles.length > 1 && (
        <View style={sectionStyle}>
          {availableRoles.filter((r) => r !== activeRole).map((role, index) => {
            const iconName = role === 'driver' ? 'truck-delivery' : role === 'pro' ? 'briefcase' : role === 'seller' ? 'store' : 'account';
            const iconColor = role === 'driver' ? '#F59E0B' : role === 'pro' ? '#10B981' : role === 'seller' ? '#8B5CF6' : tokens.primary;
            return (
              <React.Fragment key={role}>
                {index > 0 && <Divider />}
                <List.Item
                  title={t(`role_selector.role_${role}`)}
                  description={defaultRole === role ? t('role_selector.default') : t(`role_selector.desc_${role}`)}
                  left={(props) => <List.Icon {...props} icon={iconName} color={iconColor} />}
                  right={(props) => <List.Icon {...props} icon="swap-horizontal" />}
                  onPress={() => dispatch(setActiveRole({ role, setAsDefault: false }))}
                />
              </React.Fragment>
            );
          })}
          {defaultRole && (
            <>
              <Divider />
              <List.Item
                title={t('role_selector.clear_default')}
                left={(props) => <List.Icon {...props} icon="star-off" color={tokens.text.secondary} />}
                onPress={() => dispatch(clearDefaultRole())}
              />
            </>
          )}
        </View>
      )}

      {/* Compte */}
      <View style={sectionStyle}>
        <List.Item
          title={t('profile.my_info')}
          description={t('profile.my_info_desc')}
          left={(props) => <List.Icon {...props} icon="account-edit" color={tokens.primary} />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('EditProfile')}
        />
        <Divider />
        <List.Item
          title={t('profile.my_addresses')}
          description={t('profile.my_addresses_desc')}
          left={(props) => <List.Icon {...props} icon="map-marker-multiple" color={tokens.primary} />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('Addresses')}
        />
        <Divider />
        <List.Item
          title={t('profile.payment_methods')}
          left={(props) => <List.Icon {...props} icon="credit-card" color={tokens.primary} />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('PayoutAccounts')}
        />
      </View>

      {/* Mes activités / Ajouter une activité */}
      <View style={sectionStyle}>
        <List.Item
          title={t('activity.my_activities')}
          description={t('activity.my_activities_desc')}
          left={(props) => <List.Icon {...props} icon="briefcase-plus-outline" color="#10B981" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('AddActivity')}
        />
      </View>

      {/* Proposer un nouveau service */}
      <View style={sectionStyle}>
        <List.Item
          title={t('proposal.my_proposals')}
          description={t('proposal.subtitle')}
          left={(props) => <List.Icon {...props} icon="lightbulb-outline" color="#7C3AED" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('MyProposals')}
        />
      </View>

      {/* Sécurité */}
      <View style={sectionStyle}>
        <List.Item
          title={t('profile.change_password')}
          description={t('profile.change_password_desc')}
          left={(props) => <List.Icon {...props} icon="lock-reset" color={tokens.primary} />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('ChangePassword')}
        />
      </View>

      {/* Préférences */}
      <View style={sectionStyle}>
        <List.Item
          title={t('profile.notifications')}
          description={notificationsEnabled ? t('profile.notifications_on') : t('profile.notifications_off')}
          left={(props) => <List.Icon {...props} icon="bell" color={tokens.primary} />}
          right={() => (
            <Switch
              value={notificationsEnabled}
              onValueChange={toggleNotifications}
              trackColor={{ false: tokens.border, true: tokens.primary + '80' }}
              thumbColor={notificationsEnabled ? tokens.primary : tokens.text.secondary}
            />
          )}
        />
        <Divider />
        <List.Item
          title={t('profile.language')}
          description={LANG_LABELS[currentLang] ?? currentLang}
          left={(props) => <List.Icon {...props} icon="translate" color={tokens.primary} />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('Language')}
        />
        <Divider />
        <List.Item
          title={t('settings.theme_title')}
          description={t(THEME_LABEL_KEYS[mode])}
          left={(props) => <List.Icon {...props} icon="palette-outline" color={tokens.primary} />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('Appearance')}
        />
      </View>

      {/* Support */}
      <View style={sectionStyle}>
        <List.Item
          title={t('profile.help')}
          left={(props) => <List.Icon {...props} icon="headset" color={tokens.primary} />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('Support')}
        />
        <Divider />
        <List.Item
          title={t('profile.terms')}
          left={(props) => <List.Icon {...props} icon="file-document" color={tokens.primary} />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => Linking.openURL('https://checkallat-web-admin.vercel.app/terms')}
        />
        <Divider />
        <List.Item
          title={t('profile.privacy')}
          left={(props) => <List.Icon {...props} icon="shield-lock" color={tokens.primary} />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => Linking.openURL('https://checkallat-web-admin.vercel.app/privacy')}
        />
      </View>

      <ChocolateButton
        onPress={handleLogout}
        style={styles.logoutButton}
      >
        {t('profile.logout')}
      </ChocolateButton>

      <Text variant="bodySmall" style={styles.version}>
        Version 1.0.0
      </Text>
    </ScrollView>
  );
};

