import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Switch, Image } from 'react-native';
import { List, Button, Divider, Text } from 'react-native-paper';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootState } from '../../store';
import { logout, setActiveRole, clearDefaultRole, UserRole } from '../../store/slices/authSlice';
import { ProfileStackParamList } from '../../navigation/types';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

type ProfileNavProp = StackNavigationProp<ProfileStackParamList, 'ProfileHome'>;

const NOTIF_KEY = 'notificationsEnabled';
const LANG_LABELS: Record<string, string> = { fr: 'Français', en: 'English', ar: 'العربية' };

export const ProfileScreen = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigation = useNavigation<ProfileNavProp>();
  const user = useSelector((state: RootState) => state.auth.user);
  const activeRole = useSelector((state: RootState) => state.auth.activeRole);
  const availableRoles = useSelector((state: RootState) => state.auth.availableRoles);
  const defaultRole = useSelector((state: RootState) => state.auth.defaultRole);
  const isDriver = activeRole === 'driver';
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
    <ScrollView style={styles.container}>
      {/* Header avatar */}
      <View style={styles.header}>
        {avatarSource ? (
          <Image source={avatarSource} style={styles.avatarImage} />
        ) : (
          <View style={styles.avatarPlaceholder}>
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
          <View style={styles.driverBadge}>
            <Text style={styles.driverBadgeText}>🚚 {t('profile.driver_badge')}</Text>
          </View>
        )}
      </View>

      {/* Switcher de rôle — visible uniquement si plusieurs rôles */}
      {availableRoles.length > 1 && (
        <View style={styles.section}>
          {availableRoles.filter((r) => r !== activeRole).map((role, index) => {
            const iconName = role === 'driver' ? 'truck-delivery' : role === 'pro' ? 'briefcase' : role === 'seller' ? 'store' : 'account';
            const iconColor = role === 'driver' ? '#F59E0B' : role === 'pro' ? '#10B981' : role === 'seller' ? '#8B5CF6' : colors.primary;
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
                left={(props) => <List.Icon {...props} icon="star-off" color={colors.gray} />}
                onPress={() => dispatch(clearDefaultRole())}
              />
            </>
          )}
        </View>
      )}

      {/* Compte */}
      <View style={styles.section}>
        <List.Item
          title={t('profile.my_info')}
          description={t('profile.my_info_desc')}
          left={(props) => <List.Icon {...props} icon="account-edit" color={colors.primary} />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('EditProfile')}
        />
        <Divider />
        <List.Item
          title={t('profile.my_addresses')}
          description={t('profile.my_addresses_desc')}
          left={(props) => <List.Icon {...props} icon="map-marker-multiple" color={colors.primary} />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('Addresses')}
        />
        <Divider />
        <List.Item
          title={t('profile.payment_methods')}
          left={(props) => <List.Icon {...props} icon="credit-card" color={colors.primary} />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => {}}
        />
      </View>

      {/* Préférences */}
      <View style={styles.section}>
        <List.Item
          title={t('profile.notifications')}
          description={notificationsEnabled ? t('profile.notifications_on') : t('profile.notifications_off')}
          left={(props) => <List.Icon {...props} icon="bell" color={colors.primary} />}
          right={() => (
            <Switch
              value={notificationsEnabled}
              onValueChange={toggleNotifications}
              trackColor={{ false: colors.border, true: colors.primary + '80' }}
              thumbColor={notificationsEnabled ? colors.primary : colors.gray}
            />
          )}
        />
        <Divider />
        <List.Item
          title={t('profile.language')}
          description={LANG_LABELS[currentLang] ?? currentLang}
          left={(props) => <List.Icon {...props} icon="translate" color={colors.primary} />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('Language')}
        />
      </View>

      {/* Support */}
      <View style={styles.section}>
        <List.Item
          title={t('profile.help')}
          left={(props) => <List.Icon {...props} icon="headset" color={colors.primary} />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('Support')}
        />
        <Divider />
        <List.Item
          title={t('profile.terms')}
          left={(props) => <List.Icon {...props} icon="file-document" color={colors.primary} />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => {}}
        />
        <Divider />
        <List.Item
          title={t('profile.privacy')}
          left={(props) => <List.Icon {...props} icon="shield-lock" color={colors.primary} />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => {}}
        />
      </View>

      <Button
        mode="contained"
        onPress={handleLogout}
        style={styles.logoutButton}
        buttonColor={colors.error}
        icon="logout"
      >
        {t('profile.logout')}
      </Button>

      <Text variant="bodySmall" style={styles.version}>
        Version 1.0.0
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light,
  },
  header: {
    backgroundColor: colors.white,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: colors.primary,
    marginBottom: spacing.md,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
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
    color: colors.dark,
    fontWeight: '600',
    marginBottom: 4,
  },
  email: {
    color: colors.gray,
  },
  driverBadge: {
    marginTop: 8,
    backgroundColor: colors.primary + '15',
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  driverBadgeText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 13,
  },
  section: {
    backgroundColor: colors.white,
    marginBottom: spacing.md,
  },
  logoutButton: {
    margin: spacing.lg,
    paddingVertical: 8,
  },
  version: {
    textAlign: 'center',
    color: colors.gray,
    marginBottom: spacing.xl,
  },
});
