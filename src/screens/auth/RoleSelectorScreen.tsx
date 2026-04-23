'use client';
import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { RootState } from '../../store';
import { setActiveRole, UserRole } from '../../store/slices/authSlice';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

const ROLE_CONFIG: Record<UserRole, { icon: string; color: string }> = {
  client:  { icon: 'account',        color: colors.primary },
  driver:  { icon: 'truck-delivery', color: '#F59E0B' },
  pro:     { icon: 'briefcase',      color: '#10B981' },
  seller:  { icon: 'store',          color: '#8B5CF6' },
};

export const RoleSelectorScreen = () => {
  const { t } = useTranslation();
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
              <Text variant="titleMedium" style={styles.roleLabel}>
                {t(`role_selector.role_${role}`)}
              </Text>
              <Text variant="bodySmall" style={styles.roleDesc}>
                {t(`role_selector.desc_${role}`)}
              </Text>
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
            color={colors.primary}
          />
          <Text style={styles.defaultToggleText}>{t('role_selector.save_as_default')}</Text>
        </TouchableOpacity>
      )}

      <Button
        mode="contained"
        onPress={handleConfirm}
        disabled={!selected}
        style={styles.confirmBtn}
        contentStyle={styles.confirmBtnContent}
      >
        {t('role_selector.confirm')}
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    paddingTop: spacing.xl * 2,
  },
  title: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: spacing.xs,
    color: colors.text.primary,
  },
  subtitle: {
    textAlign: 'center',
    color: colors.gray,
    marginBottom: spacing.xl,
  },
  rolesContainer: {
    gap: spacing.md,
  },
  roleCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
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
  roleLabel: {
    fontWeight: '600',
    flex: 1,
    color: colors.text.primary,
  },
  roleDesc: {
    color: colors.gray,
    flex: 1,
    position: 'absolute',
    bottom: spacing.sm,
    left: 92,
  },
  defaultBadge: {
    backgroundColor: colors.primary + '20',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  defaultBadgeText: {
    color: colors.primary,
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
    color: colors.text.primary,
    fontSize: 14,
  },
  confirmBtn: {
    marginTop: spacing.md,
    borderRadius: 12,
  },
  confirmBtnContent: {
    paddingVertical: spacing.sm,
  },
});
