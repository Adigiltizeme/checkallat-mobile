import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Linking,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Text, Chip } from 'react-native-paper';
import { ChocolateButton } from '../../components/shared/ChocolateButton';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../theme/colors';
import { useAppTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/spacing';
import { API_CONFIG } from '../../config/api';
import { useSendSupportContactMutation } from '../../store/api/authApi';

const CATEGORIES = ['transport', 'services', 'marketplace', 'payment', 'account', 'other'] as const;

type Tab = 'written' | 'immediate';

export const SupportScreen = () => {
  const { t } = useTranslation();

    const { tokens } = useAppTheme();

  const styles = useMemo(() => StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: tokens.background },

  header: {
    backgroundColor: tokens.card,
    alignItems: 'center',
    padding: spacing.xl,
    marginBottom: spacing.md,
  },
  headerTitle: {
    fontWeight: 'bold',
    color: tokens.text.primary,
    marginTop: spacing.sm,
  },
  headerSubtitle: {
    color: tokens.text.secondary,
    marginTop: 4,
    textAlign: 'center',
  },

  tabs: {
    flexDirection: 'row',
    backgroundColor: tokens.card,
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: tokens.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: tokens.primary,
  },
  tabLabel: { color: tokens.text.secondary },
  tabLabelActive: { color: tokens.primary, fontWeight: '600' },

  section: {
    backgroundColor: tokens.card,
    padding: spacing.lg,
    borderRadius: 12,
    marginHorizontal: spacing.md,
  },

  fieldLabel: {
    color: tokens.text.primary,
    fontWeight: '600',
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  categoryChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  categoryChip: {
    backgroundColor: tokens.backgroundAlt,
    borderWidth: 1,
    borderColor: tokens.border,
  },
  categoryChipSelected: {
    backgroundColor: tokens.primary + '15',
    borderColor: tokens.primary,
  },
  categoryChipText: { color: tokens.text.primary, fontSize: 13 },
  categoryChipTextSelected: { color: tokens.primary, fontWeight: '600' },

  messageInput: {
    borderWidth: 1,
    borderColor: tokens.border,
    borderRadius: 10,
    padding: spacing.md,
    color: tokens.text.primary,
    fontSize: 14,
    minHeight: 120,
    backgroundColor: tokens.backgroundAlt,
  },
  inputError: { borderColor: colors.error },
  errorText: { color: colors.error, marginTop: 4 },

  sendBtn: { marginTop: spacing.lg },

  sentContainer: { alignItems: 'center', paddingVertical: spacing.xl },
  sentTitle: { fontWeight: 'bold', color: tokens.text.primary, marginTop: spacing.md },
  sentMsg: { color: tokens.text.secondary, textAlign: 'center', marginTop: spacing.sm, lineHeight: 20 },

  warningBox: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.md,
    alignItems: 'flex-start',
  },
  warningText: { color: '#92400E', flex: 1, lineHeight: 18 },
  hoursLabel: { color: tokens.text.secondary, marginBottom: spacing.md, textAlign: 'center' },

  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: tokens.border,
    borderRadius: 12,
    marginBottom: spacing.md,
    backgroundColor: tokens.card,
  },
  contactIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactInfo: { flex: 1 },
  contactTitle: { fontWeight: '600', color: tokens.text.primary },
  contactSubtitle: { color: tokens.text.secondary, marginTop: 2 },
  }), [tokens]);
const [activeTab, setActiveTab] = useState<Tab>('written');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [showError, setShowError] = useState(false);
  const [sent, setSent] = useState(false);

  const [supportPhone, setSupportPhone] = useState('');
  const [supportEmail, setSupportEmail] = useState('');

  const [sendSupportContact, { isLoading }] = useSendSupportContactMutation();

  useEffect(() => {
    fetch(`${API_CONFIG.BASE_URL}/admin/settings/public`, {
      headers: { 'ngrok-skip-browser-warning': 'true' },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        if (data.supportPhone) setSupportPhone(data.supportPhone);
        if (data.supportEmail) setSupportEmail(data.supportEmail);
      })
      .catch(() => {});
  }, []);

  const handleSend = async () => {
    if (!selectedCategory || message.trim().length < 10) {
      setShowError(true);
      return;
    }
    setShowError(false);
    try {
      await sendSupportContact({
        category: t(`support.category_${selectedCategory}`),
        message: message.trim(),
      }).unwrap();
      setSent(true);
    } catch {
      Alert.alert(t('common.error'), t('common.try_again'));
    }
  };

  const handlePhone = () => {
    if (!supportPhone) return;
    Linking.openURL(`tel:${supportPhone.replace(/\s/g, '')}`);
  };

  const handleWhatsApp = () => {
    if (!supportPhone) return;
    const number = supportPhone.replace(/[^\d+]/g, '');
    Linking.openURL(`https://wa.me/${number}`);
  };

  const handleEmail = () => {
    if (!supportEmail) return;
    Linking.openURL(`mailto:${supportEmail}?subject=${encodeURIComponent(t('support.title'))}`);
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={'padding'}
    >
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <Icon name="headset" size={48} color={tokens.primary} />
          <Text variant="titleLarge" style={styles.headerTitle}>{t('support.title')}</Text>
          <Text variant="bodyMedium" style={styles.headerSubtitle}>{t('support.subtitle')}</Text>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {(['written', 'immediate'] as Tab[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Icon
                name={tab === 'written' ? 'email-edit-outline' : 'phone'}
                size={18}
                color={activeTab === tab ? tokens.primary : tokens.text.secondary}
              />
              <Text
                variant="bodyMedium"
                style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}
              >
                {t(`support.${tab}_tab`)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Written tab */}
        {activeTab === 'written' && (
          <View style={styles.section}>
            {sent ? (
              <View style={styles.sentContainer}>
                <Icon name="check-circle" size={64} color={colors.success} />
                <Text variant="titleMedium" style={styles.sentTitle}>{t('support.sent_title')}</Text>
                <Text variant="bodyMedium" style={styles.sentMsg}>{t('support.sent_msg')}</Text>
                <ChocolateButton
                  variant="outline"
                  onPress={() => { setSent(false); setSelectedCategory(null); setMessage(''); }}
                  style={{ marginTop: spacing.lg }}
                >
                  {t('common.back')}
                </ChocolateButton>
              </View>
            ) : (
              <>
                <Text variant="labelMedium" style={styles.fieldLabel}>{t('support.category_label')}</Text>
                <View style={styles.categoryChips}>
                  {CATEGORIES.map((cat) => (
                    <Chip
                      key={cat}
                      selected={selectedCategory === cat}
                      onPress={() => { setSelectedCategory(cat); setShowError(false); }}
                      style={[
                        styles.categoryChip,
                        selectedCategory === cat && styles.categoryChipSelected,
                      ]}
                      textStyle={[
                        styles.categoryChipText,
                        selectedCategory === cat && styles.categoryChipTextSelected,
                      ]}
                      showSelectedCheck={false}
                    >
                      {t(`support.category_${cat}`)}
                    </Chip>
                  ))}
                </View>

                <Text variant="labelMedium" style={styles.fieldLabel}>{t('support.reason_label')}</Text>
                <TextInput
                  style={[styles.messageInput, showError && !message.trim() && styles.inputError]}
                  placeholder={t('support.reason_placeholder')}
                  placeholderTextColor={tokens.text.secondary}
                  value={message}
                  onChangeText={(v) => { setMessage(v); setShowError(false); }}
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                  maxLength={1000}
                />
                {showError && (
                  <Text variant="bodySmall" style={styles.errorText}>{t('support.reason_required')}</Text>
                )}

                <ChocolateButton
                  onPress={handleSend}
                  loading={isLoading}
                  disabled={isLoading}
                  style={styles.sendBtn}
                >
                  {isLoading ? t('support.sending') : t('support.send_btn')}
                </ChocolateButton>
              </>
            )}
          </View>
        )}

        {/* Immediate tab */}
        {activeTab === 'immediate' && (
          <View style={styles.section}>
            {/* Warning */}
            <View style={styles.warningBox}>
              <Icon name="information" size={20} color="#92400E" />
              <Text variant="bodySmall" style={styles.warningText}>{t('support.immediate_warning')}</Text>
            </View>

            <Text variant="bodySmall" style={styles.hoursLabel}>{t('support.hours_label')}</Text>

            {/* Phone */}
            <TouchableOpacity style={styles.contactCard} onPress={handlePhone} disabled={!supportPhone}>
              <View style={[styles.contactIcon, { backgroundColor: '#ECFDF5' }]}>
                <Icon name="phone" size={28} color={colors.success} />
              </View>
              <View style={styles.contactInfo}>
                <Text variant="titleSmall" style={styles.contactTitle}>{t('support.phone_title')}</Text>
                <Text variant="bodySmall" style={styles.contactSubtitle}>{supportPhone || '—'}</Text>
              </View>
              <Icon name="chevron-right" size={22} color={tokens.text.secondary} />
            </TouchableOpacity>

            {/* WhatsApp */}
            <TouchableOpacity style={styles.contactCard} onPress={handleWhatsApp} disabled={!supportPhone}>
              <View style={[styles.contactIcon, { backgroundColor: '#F0FDF4' }]}>
                <Icon name="whatsapp" size={28} color="#25D366" />
              </View>
              <View style={styles.contactInfo}>
                <Text variant="titleSmall" style={styles.contactTitle}>{t('support.whatsapp_title')}</Text>
                <Text variant="bodySmall" style={styles.contactSubtitle}>{t('support.whatsapp_subtitle')}</Text>
              </View>
              <Icon name="chevron-right" size={22} color={tokens.text.secondary} />
            </TouchableOpacity>

            {/* Email */}
            <TouchableOpacity style={styles.contactCard} onPress={handleEmail} disabled={!supportEmail}>
              <View style={[styles.contactIcon, { backgroundColor: '#EFF6FF' }]}>
                <Icon name="email" size={28} color="#3B82F6" />
              </View>
              <View style={styles.contactInfo}>
                <Text variant="titleSmall" style={styles.contactTitle}>{t('support.email_title')}</Text>
                <Text variant="bodySmall" style={styles.contactSubtitle}>{supportEmail || '—'}</Text>
              </View>
              <Icon name="chevron-right" size={22} color={tokens.text.secondary} />
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: spacing.xl * 2 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
