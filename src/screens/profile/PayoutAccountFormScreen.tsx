import React, { useState, useMemo } from 'react';
import {
  View, StyleSheet, ScrollView, Alert, TouchableOpacity,
  KeyboardAvoidingView, Platform, Switch,
} from 'react-native';
import { Text, ActivityIndicator, TextInput } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { SUPPORTED_COUNTRIES } from '../../config/countries';
import {
  PayoutMethodDef,
  useGetPayoutMethodsQuery,
  useCreateDriverAccountMutation,
  useCreateProAccountMutation,
} from '../../store/api/payoutAccountsApi';
import { colors } from '../../theme/colors';
import { useAppTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/spacing';

const PAYOUT_COUNTRIES = SUPPORTED_COUNTRIES.map((c) => ({
  code: c.code.toUpperCase(),
  label: `${c.flag} ${c.code.toUpperCase()}`,
  flag: c.flag,
}));

export const PayoutAccountFormScreen = () => {
  const { t } = useTranslation();
    const { tokens } = useAppTheme();

  const styles = useMemo(() => StyleSheet.create({
  container: { flex: 1, backgroundColor: tokens.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl * 2 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: tokens.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: tokens.border,
    backgroundColor: tokens.card,
  },
  chipActive: { borderColor: tokens.primary, backgroundColor: tokens.primary + '10' },
  chipText: { fontSize: 14, color: tokens.text.primary, fontWeight: '500' },
  chipTextActive: { color: tokens.primary, fontWeight: '700' },
  noMethods: { fontSize: 14, color: tokens.text.secondary, fontStyle: 'italic', marginVertical: spacing.sm },
  methodList: { gap: spacing.sm },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.card,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: tokens.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  methodCardActive: { borderColor: tokens.primary, backgroundColor: tokens.primary + '08' },
  methodRadio: { width: 24, alignItems: 'center' },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: tokens.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterActive: { borderColor: tokens.primary },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: tokens.primary,
  },
  methodLabel: { fontSize: 15, color: tokens.text.primary, fontWeight: '500', flex: 1 },
  methodLabelActive: { color: tokens.primary, fontWeight: '600' },
  input: { marginBottom: spacing.sm, backgroundColor: tokens.backgroundAlt },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: tokens.border,
    padding: spacing.md,
    marginVertical: spacing.sm,
    gap: spacing.md,
  },
  switchLabel: { fontSize: 14, fontWeight: '600', color: tokens.text.primary },
  switchSub: { fontSize: 12, color: tokens.text.secondary, marginTop: 2 },
  submitBtn: {
    backgroundColor: tokens.primary,
    borderRadius: 10,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: colors.white, fontSize: 15, fontWeight: '700' },
  }), [tokens]);
const navigation = useNavigation();
  const activeRole = useSelector((state: RootState) => state.auth.activeRole);
  const isDriver = activeRole === 'driver';

  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [holderName, setHolderName] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});

  const { data: methods = [], isFetching: loadingMethods } = useGetPayoutMethodsQuery(
    selectedCountry,
    { skip: !selectedCountry },
  );

  const [createDriver, { isLoading: savingDriver }] = useCreateDriverAccountMutation();
  const [createPro, { isLoading: savingPro }] = useCreateProAccountMutation();
  const isSaving = savingDriver || savingPro;

  const selectedMethod: PayoutMethodDef | undefined = methods.find((m) => m.type === selectedType);

  const handleCountrySelect = (code: string) => {
    setSelectedCountry(code);
    setSelectedType('');
    setFieldValues({});
  };

  const handleTypeSelect = (type: string) => {
    setSelectedType(type);
    setFieldValues({});
  };

  const setField = (key: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [key]: value }));
  };

  const validate = (): string | null => {
    if (!selectedCountry) return t('payout_accounts.form_error_country');
    if (!selectedType) return t('payout_accounts.form_error_type');
    if (!holderName.trim()) return t('payout_accounts.form_error_holder');
    if (selectedMethod) {
      for (const field of selectedMethod.fields) {
        if (field.required && !fieldValues[field.key]?.trim()) {
          return t('payout_accounts.form_error_field', { field: field.label });
        }
      }
    }
    return null;
  };

  const handleSubmit = async () => {
    const error = validate();
    if (error) {
      Alert.alert(t('common.error'), error);
      return;
    }
    const payload = {
      accountType: selectedType,
      country: selectedCountry,
      accountHolderName: holderName.trim(),
      accountDetails: fieldValues,
      isDefault,
    };
    try {
      if (isDriver) await createDriver(payload).unwrap();
      else await createPro(payload).unwrap();
      navigation.goBack();
    } catch {
      Alert.alert(t('common.error'), t('payout_accounts.error_create'));
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>

        {/* Étape 1 : Pays */}
        <Text style={styles.sectionLabel}>{t('payout_accounts.form_country')}</Text>
        <View style={styles.chipRow}>
          {PAYOUT_COUNTRIES.map((c) => (
            <TouchableOpacity
              key={c.code}
              style={[styles.chip, selectedCountry === c.code && styles.chipActive]}
              onPress={() => handleCountrySelect(c.code)}
            >
              <Text style={[styles.chipText, selectedCountry === c.code && styles.chipTextActive]}>
                {c.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Étape 2 : Type de compte */}
        {selectedCountry !== '' && (
          <>
            <Text style={styles.sectionLabel}>{t('payout_accounts.form_type')}</Text>
            {loadingMethods ? (
              <ActivityIndicator color={tokens.primary} style={{ marginVertical: spacing.md }} />
            ) : methods.length === 0 ? (
              <Text style={styles.noMethods}>{t('payout_accounts.form_no_methods')}</Text>
            ) : (
              <View style={styles.methodList}>
                {methods.map((m) => (
                  <TouchableOpacity
                    key={m.type}
                    style={[styles.methodCard, selectedType === m.type && styles.methodCardActive]}
                    onPress={() => handleTypeSelect(m.type)}
                  >
                    <View style={styles.methodRadio}>
                      <View style={[
                        styles.radioOuter,
                        selectedType === m.type && styles.radioOuterActive,
                      ]}>
                        {selectedType === m.type && <View style={styles.radioInner} />}
                      </View>
                    </View>
                    <Text style={[styles.methodLabel, selectedType === m.type && styles.methodLabelActive]}>
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}

        {/* Étape 3 : Champs dynamiques */}
        {selectedMethod && (
          <>
            <Text style={styles.sectionLabel}>{t('payout_accounts.form_details')}</Text>

            {/* Nom du titulaire */}
            <TextInput
              mode="outlined"
              label={t('payout_accounts.form_holder_name')}
              value={holderName}
              onChangeText={setHolderName}
              style={styles.input}
              outlineColor={tokens.border}
              activeOutlineColor={tokens.primary}
            />

            {/* Champs spécifiques au type */}
            {selectedMethod.fields.map((field) => (
              <TextInput
                key={field.key}
                mode="outlined"
                label={`${field.label}${field.required ? ' *' : ''}`}
                value={fieldValues[field.key] ?? ''}
                onChangeText={(v) => setField(field.key, v)}
                style={styles.input}
                outlineColor={tokens.border}
                activeOutlineColor={tokens.primary}
                keyboardType={
                  field.type === 'phone' ? 'phone-pad' :
                  field.type === 'email' ? 'email-address' : 'default'
                }
                placeholder={field.placeholder}
              />
            ))}

            {/* Par défaut */}
            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.switchLabel}>{t('payout_accounts.form_set_default')}</Text>
                <Text style={styles.switchSub}>{t('payout_accounts.form_set_default_sub')}</Text>
              </View>
              <Switch
                value={isDefault}
                onValueChange={setIsDefault}
                trackColor={{ false: tokens.border, true: tokens.primary + '80' }}
                thumbColor={isDefault ? tokens.primary : tokens.text.secondary}
              />
            </View>

            {/* Bouton submit */}
            <TouchableOpacity
              style={[styles.submitBtn, isSaving && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <Text style={styles.submitBtnText}>{t('payout_accounts.form_submit')}</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
