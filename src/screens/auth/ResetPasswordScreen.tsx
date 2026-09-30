import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, TouchableOpacity } from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { StackScreenProps } from '@react-navigation/stack';
import { AuthStackParamList } from '../../navigation/types';
import { useForgotPasswordMutation, useResetPasswordMutation } from '../../store/api/authApi';
import { ChocolateButton } from '../../components/shared/ChocolateButton';
import { useAppTheme } from '../../theme/ThemeProvider';
import { colors } from '../../theme/colors';
import { otpErrorMessage, otpMustBeRenewed, passwordRuleErrors } from '../../utils/passwordRules';

type Props = StackScreenProps<AuthStackParamList, 'ResetPassword'>;

/** Délai avant de pouvoir redemander un code (identique au délai serveur) */
const RESEND_DELAY_S = 60;

/** Étape 2 : code reçu par SMS + nouveau mot de passe */
export const ResetPasswordScreen = ({ navigation, route }: Props) => {
  const { phone } = route.params;
  const { t } = useTranslation();
  const { tokens } = useAppTheme();
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(RESEND_DELAY_S);
  const [resetPassword, { isLoading }] = useResetPasswordMutation();
  const [forgotPassword, { isLoading: resending }] = useForgotPasswordMutation();

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: tokens.background },
    content: { flexGrow: 1, padding: 24, justifyContent: 'center' },
    title: { color: tokens.text.primary, textAlign: 'center', marginBottom: 8 },
    subtitle: { color: tokens.text.secondary, textAlign: 'center', lineHeight: 21, marginBottom: 24 },
    phone: { color: tokens.text.primary, fontWeight: '700' },
    input: { backgroundColor: tokens.backgroundAlt, marginBottom: 4 },
    codeInput: { backgroundColor: tokens.backgroundAlt, marginBottom: 4, fontSize: 22, letterSpacing: 8, textAlign: 'center' },
    errorText: { color: colors.error, fontSize: 12, marginBottom: 10 },
    hint: { color: tokens.text.secondary, fontSize: 11, lineHeight: 16, marginBottom: 12 },
    resendRow: { flexDirection: 'row', justifyContent: 'center', marginVertical: 12 },
    resendText: { color: tokens.text.secondary, fontSize: 13 },
    resendLink: { color: tokens.primary, fontSize: 13, fontWeight: '600' },
    spacer: { height: 12 },
  }), [tokens]);

  // Mêmes règles que l'inscription
  const passwordErrors = passwordRuleErrors(password, t);
  const codeValid = /^\d{6}$/.test(code);
  const confirmValid = confirm.length > 0 && confirm === password;
  const canSubmit = codeValid && passwordErrors.length === 0 && confirmValid && !isLoading;

  const submit = async () => {
    setSubmitted(true);
    setServerError(null);
    if (!canSubmit) return;
    try {
      await resetPassword({ phone, code, newPassword: password }).unwrap();
      navigation.navigate('Login', { phone, passwordReset: true });
    } catch (err: any) {
      setServerError(otpErrorMessage(err, t, 'auth.reset_failed'));
      if (otpMustBeRenewed(err)) setCode('');
    }
  };

  const resend = async () => {
    setServerError(null);
    try {
      await forgotPassword({ phone }).unwrap();
      setResendIn(RESEND_DELAY_S);
      setCode('');
    } catch {
      setServerError(t('auth.forgot_send_error'));
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding">
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text variant="headlineSmall" style={styles.title}>{t('auth.reset_title')}</Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          {t('auth.reset_subtitle')} <Text style={styles.phone}>{phone}</Text>
        </Text>

        <TextInput
          label={t('auth.reset_code_label')}
          value={code}
          onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="sms-otp"
          maxLength={6}
          mode="outlined"
          error={submitted && !codeValid}
          outlineColor={tokens.border}
          activeOutlineColor={tokens.primary}
          style={styles.codeInput}
          autoFocus
        />
        {submitted && !codeValid && <Text style={styles.errorText}>{t('auth.reset_code_format')}</Text>}

        <View style={styles.resendRow}>
          {resendIn > 0 ? (
            <Text style={styles.resendText}>{t('auth.reset_resend_in', { seconds: resendIn })}</Text>
          ) : (
            <TouchableOpacity onPress={resend} disabled={resending}>
              <Text style={styles.resendLink}>{resending ? '…' : t('auth.reset_resend')}</Text>
            </TouchableOpacity>
          )}
        </View>

        <TextInput
          label={t('auth.new_password')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          mode="outlined"
          error={submitted && passwordErrors.length > 0}
          outlineColor={tokens.border}
          activeOutlineColor={tokens.primary}
          style={styles.input}
          right={
            <TextInput.Icon
              icon={showPassword ? 'eye-off' : 'eye'}
              onPress={() => setShowPassword((v) => !v)}
              color={tokens.text.secondary}
            />
          }
        />
        {submitted && passwordErrors.length > 0
          ? <Text style={styles.errorText}>{passwordErrors[0]}</Text>
          : <Text style={styles.hint}>{t('auth.password_hint')}</Text>}

        <TextInput
          label={t('auth.confirm_password')}
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry={!showPassword}
          mode="outlined"
          error={submitted && !confirmValid}
          outlineColor={tokens.border}
          activeOutlineColor={tokens.primary}
          style={styles.input}
        />
        {submitted && !confirmValid && <Text style={styles.errorText}>{t('auth.passwords_mismatch')}</Text>}

        {serverError && (
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-start', marginTop: 8 }}>
            <Icon name="alert-circle-outline" size={16} color={colors.error} />
            <Text style={[styles.errorText, { flex: 1 }]}>{serverError}</Text>
          </View>
        )}

        <View style={styles.spacer} />
        <ChocolateButton onPress={submit} loading={isLoading} disabled={isLoading}>
          {t('auth.reset_submit')}
        </ChocolateButton>
        <Text style={[styles.hint, { textAlign: 'center', marginTop: 12 }]}>{t('auth.reset_sessions_note')}</Text>
        <ChocolateButton variant="ghost" onPress={() => navigation.navigate('ForgotPassword', { phone })}>
          {t('auth.reset_change_number')}
        </ChocolateButton>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
