import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Text, Button, Chip } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

interface DriverCancelModalProps {
  visible: boolean;
  isConfirming?: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
  onContactSupport: () => void;
}

const PRESET_REASONS = [
  'vehicle',
  'health',
  'accident',
  'overloaded',
  'address',
  'other',
] as const;

export const DriverCancelModal = ({
  visible,
  isConfirming = false,
  onCancel,
  onConfirm,
  onContactSupport,
}: DriverCancelModalProps) => {
  const { t } = useTranslation();
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [customReason, setCustomReason] = useState('');
  const [showError, setShowError] = useState(false);

  const finalReason =
    selectedPreset === 'other'
      ? customReason.trim()
      : selectedPreset
      ? `${t(`driver.cancel_reason_${selectedPreset}`)}: ${customReason.trim()}`.replace(/: $/, '')
      : customReason.trim();

  const canConfirm = !!selectedPreset && (selectedPreset !== 'other' || customReason.trim().length > 0);

  const handleConfirm = () => {
    if (!canConfirm) {
      setShowError(true);
      return;
    }
    setShowError(false);
    const reason = selectedPreset === 'other'
      ? customReason.trim()
      : selectedPreset
      ? customReason.trim()
        ? `${t(`driver.cancel_reason_${selectedPreset}`)} – ${customReason.trim()}`
        : t(`driver.cancel_reason_${selectedPreset}`)
      : customReason.trim();
    onConfirm(reason);
  };

  const handleClose = () => {
    setSelectedPreset(null);
    setCustomReason('');
    setShowError(false);
    onCancel();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <Icon name="cancel" size={24} color={colors.error} />
            <Text variant="titleMedium" style={styles.title}>
              {t('driver.cancel_delivery_title')}
            </Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon name="close" size={22} color={colors.gray} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Warning banner */}
            <View style={styles.warningBanner}>
              <Text variant="bodySmall" style={styles.warningText}>
                {t('driver.cancel_delivery_warning')}
              </Text>
            </View>

            {/* Preset reason chips */}
            <Text variant="labelMedium" style={styles.sectionLabel}>
              {t('driver.cancel_reason_label')}
            </Text>
            <View style={styles.chipsGrid}>
              {PRESET_REASONS.map((key) => (
                <Chip
                  key={key}
                  selected={selectedPreset === key}
                  onPress={() => {
                    setSelectedPreset(key);
                    setShowError(false);
                  }}
                  style={[
                    styles.reasonChip,
                    selectedPreset === key && styles.reasonChipSelected,
                  ]}
                  textStyle={[
                    styles.reasonChipText,
                    selectedPreset === key && styles.reasonChipTextSelected,
                  ]}
                  showSelectedCheck={false}
                >
                  {t(`driver.cancel_reason_${key}`)}
                </Chip>
              ))}
            </View>

            {/* Free text */}
            {selectedPreset && (
              <View style={styles.textInputContainer}>
                <TextInput
                  style={styles.textInput}
                  placeholder={t('driver.cancel_reason_placeholder')}
                  placeholderTextColor="#9CA3AF"
                  value={customReason}
                  onChangeText={(v) => {
                    setCustomReason(v);
                    if (showError) setShowError(false);
                  }}
                  multiline
                  numberOfLines={3}
                  maxLength={500}
                  textAlignVertical="top"
                />
              </View>
            )}

            {showError && (
              <Text variant="bodySmall" style={styles.errorText}>
                {t('driver.cancel_reason_required')}
              </Text>
            )}

            {/* Actions */}
            <View style={styles.actions}>
              <Button
                mode="contained"
                onPress={handleConfirm}
                buttonColor={colors.error}
                loading={isConfirming}
                disabled={isConfirming}
                icon="check"
                style={styles.confirmBtn}
              >
                {t('driver.cancel_confirm_btn')}
              </Button>
              <Button
                mode="text"
                onPress={onContactSupport}
                textColor={colors.primary}
                icon="headset"
              >
                {t('driver.cancel_contact_support')}
              </Button>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl + spacing.md,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  title: {
    flex: 1,
    fontWeight: 'bold',
    color: colors.error,
  },

  warningBanner: {
    backgroundColor: '#FFFBEB',
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  warningText: {
    color: '#92400E',
    lineHeight: 18,
  },

  sectionLabel: {
    color: '#374151',
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
  chipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  reasonChip: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  reasonChipSelected: {
    backgroundColor: '#FEE2E2',
    borderColor: colors.error,
  },
  reasonChipText: {
    color: '#374151',
    fontSize: 13,
  },
  reasonChipTextSelected: {
    color: colors.error,
    fontWeight: '600',
  },

  textInputContainer: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    backgroundColor: '#F9FAFB',
  },
  textInput: {
    color: '#111827',
    fontSize: 14,
    minHeight: 72,
  },

  errorText: {
    color: colors.error,
    marginBottom: spacing.sm,
  },

  actions: {
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  confirmBtn: {
    borderRadius: 10,
  },
});
