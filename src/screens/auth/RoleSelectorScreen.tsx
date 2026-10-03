'use client';
import React, { useState, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { ChocolateButton } from '../../components/shared/ChocolateButton';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { RootState } from '../../store';
import { setActiveRole, UserRole } from '../../store/slices/authSlice';
import { colors } from '../../theme/colors';
import { useAppTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/spacing';
import { useDriverIdentity } from '../../hooks/useDriverIdentity';

export const RoleSelectorScreen = () => {
  const { t } = useTranslation();
  const { tokens } = useAppTheme();
  const driverIdentity = useDriverIdentity();

  // Un livreur CheckAllPack (moto, vélo) voit « Espace Livreur » et son véhicule
  const ROLE_CONFIG: Record<UserRole, { icon: string; color: string; key: string }> = {
    client:  { icon: 'account',            color: tokens.primary, key: 'client' },
    driver:  { icon: driverIdentity.icon,  color: '#F59E0B',      key: driverIdentity.roleKey },
    pro:     { icon: 'briefcase',          color: '#10B981',      key: 'pro' },
    seller:  { icon: 'store',              color: '#8B5CF6',      key: 'seller' },
  };

  const styles = useMemo(() => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.background,
    padding: spacing.lg,
    paddingTop: spacing.xl * 2,
  },
  title: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: spacing.xs,
    color: tokens.text.primary,
  },
  subtitle: {
    textAlign: 'center',
    color: tokens.text.secondary,
    marginBottom: spacing.xl,
  },
  rolesContainer: {
    gap: spacing.md,
  },
  roleCard: {
    backgroundColor: tokens.card,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1.5,
    borderColor: tokens.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleText: {
    flex: 1,
    gap: 2,
  },
  roleLabel: {
    fontWeight: '600',
    color: tokens.text.primary,
  },
  roleDesc: {
    color: tokens.text.secondary,
  },
  defaultBadge: {
    backgroundColor: tokens.primary + '20',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  defaultBadgeText: {
    color: tokens.primary,
    fontSize: 11,
    fontWeight: '600',
  },
  checkIcon: {
    marginLeft: spacing.sm,
  },
  defaultToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  defaultToggleText: {
    color: tokens.text.primary,
    fontSize: 14,
  },
  confirmBtn: {
    marginTop: spacing.md,
  },
  }), [tokens]);
const dispatch = useDispatch();
  const availableRoles = useSelector((state: RootState) => state.auth.availableRoles);
  const defaultRole = useSelector((state: RootState) => state.auth.defaultRole);

  const [selected, setSelected] = useState<UserRole | null>(null);
  const [saveAsDefault, setSaveAsDefault] = useState(false);

  const handleConfirm = () => {
    if (!selected) return;
    dispatch(setActiveRole({ role: selected, setAsDefault: saveAsDefault }));
  };

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>
        {t('role_selector.title')}
      </Text>
      <Text variant="bodyMedium" style={styles.subtitle}>
        {t('role_selector.subtitle')}
      </Text>

      <View style={styles.rolesContainer}>
        {availableRoles.map((role) => {
          const cfg = ROLE_CONFIG[role];
          const isSelected = selected === role;
          const isDefault = defaultRole === role;
          return (
            <TouchableOpacity
              key={role}
              style={[styles.roleCard, isSelected && { borderColor: cfg.color, borderWidth: 2 }]}
              onPress={() => setSelected(role)}
              activeOpacity={0.8}
            >
              <View style={[styles.iconCircle, { backgroundColor: cfg.color + '20' }]}>
                <Icon name={cfg.icon} size={36} color={cfg.color} />
              </View>
              <View style={styles.roleText}>
                <Text variant="titleMedium" style={styles.roleLabel}>
                  {t(`role_selector.role_${cfg.key}`)}
                </Text>
                <Text variant="bodySmall" style={styles.roleDesc}>
                  {t(`role_selector.desc_${cfg.key}`)}
                </Text>
              </View>
              {isDefault && (
                <View style={styles.defaultBadge}>
                  <Text style={styles.defaultBadgeText}>{t('role_selector.default')}</Text>
                </View>
              )}
              {isSelected && (
                <Icon name="check-circle" size={22} color={cfg.color} style={styles.checkIcon} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {selected && (
        <TouchableOpacity
          style={styles.defaultToggle}
          onPress={() => setSaveAsDefault(!saveAsDefault)}
          activeOpacity={0.7}
        >
          <Icon
            name={saveAsDefault ? 'checkbox-marked' : 'checkbox-blank-outline'}
            size={22}
            color={tokens.primary}
          />
          <Text style={styles.defaultToggleText}>{t('role_selector.save_as_default')}</Text>
        </TouchableOpacity>
      )}

      <ChocolateButton
        onPress={handleConfirm}
        disabled={!selected}
        style={styles.confirmBtn}
      >
        {t('role_selector.confirm')}
      </ChocolateButton>
    </View>
  );
};
