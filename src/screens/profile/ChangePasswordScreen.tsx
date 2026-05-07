import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { TextInput as RNTextInput } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { useSendOtpMeMutation, useChangePasswordMutation } from '../../store/api/authApi';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

// Steps: 1 = send OTP, 2 = enter OTP + new password
type Step = 'send' | 'verify';

export const ChangePasswordScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const user = useSelector((state: RootState) => state.auth.user);

  const [step, setStep] = useState<Step>('send');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [sendOtp, { isLoading: sending }] = useSendOtpMeMutation();
  const [changePassword, { isLoading: saving }] = useChangePasswordMutation();

  const phone = user?.phone ?? '';

  const handleSendOtp = async () => {
    try {
      await sendOtp({ phone }).unwrap();
      setStep('verify');
    } catch {
      Alert.alert(t('common.error'), t('auth.otp_failed'));
    }
  };

  const handleSubmit = async () => {
    if (newPassword !== confirmPassword) {
      Alert.alert(t('common.error'), t('auth.passwords_mismatch'));
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert(t('common.error'), t('auth.password_min_length'));
      return;
    }
    try {
      await changePassword({ otpCode, newPassword }).unwrap();
      Alert.alert(t('common.success'), t('auth.password_changed'), [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      const msg = err?.data?.message?.includes('expired')
        ? t('auth.otp_failed')
        : t('auth.otp_failed');
      Alert.alert(t('common.error'), msg);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.iconWrapper}>
          <Icon name="lock-reset" size={48} color={colors.primary} />
        </View>

        <Text variant="headlineSmall" style={styles.title}>{t('profile.change_password')}</Text>

        {step === 'send' ? (
          <>
            <Text style={styles.description}>
              {t('auth.otp_subtitle', { phone })}
            </Text>
            <TouchableOpacity
              style={[styles.btn, sending && styles.btnDisabled]}
              onPress={handleSendOtp}
              disabled={sending}
              activeOpacity={0.8}
            >
              {sending
                ? <ActivityIndicator color={colors.white} size="small" />
                : <Text style={styles.btnText}>{t('auth.verify_btn')}</Text>
              }
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.label}>{t('auth.otp_code')}</Text>
            <RNTextInput
              style={styles.input}
              value={otpCode}
              onChangeText={setOtpCode}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="------"
              placeholderTextColor={colors.gray}
            />

            <Text style={styles.label}>{t('auth.new_password')}</Text>
            <View style={styles.inputRow}>
              <RNTextInput
                style={[styles.input, { flex: 1 }]}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showNew}
                placeholder={t('auth.new_password')}
                placeholderTextColor={colors.gray}
              />
              <TouchableOpacity onPress={() => setShowNew(v => !v)} style={styles.eyeBtn}>
                <Icon name={showNew ? 'eye-off' : 'eye'} size={20} color={colors.gray} />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>{t('auth.confirm_password')}</Text>
            <View style={styles.inputRow}>
              <RNTextInput
                style={[styles.input, { flex: 1 }]}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirm}
                placeholder={t('auth.confirm_password')}
                placeholderTextColor={colors.gray}
              />
              <TouchableOpacity onPress={() => setShowConfirm(v => !v)} style={styles.eyeBtn}>
                <Icon name={showConfirm ? 'eye-off' : 'eye'} size={20} color={colors.gray} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.btn, (saving || !otpCode || !newPassword || !confirmPassword) && styles.btnDisabled]}
              onPress={handleSubmit}
              disabled={saving || !otpCode || !newPassword || !confirmPassword}
              activeOpacity={0.8}
            >
              {saving
                ? <ActivityIndicator color={colors.white} size="small" />
                : <Text style={styles.btnText}>{t('common.confirm')}</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setStep('send')} style={styles.resendBtn}>
              <Text style={styles.resendText}>{t('auth.resend_otp') ?? 'Renvoyer le code'}</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.light },
  content: { padding: spacing.lg, paddingTop: spacing.xl },
  iconWrapper: { alignItems: 'center', marginBottom: spacing.lg },
  title: { textAlign: 'center', color: colors.dark, fontWeight: '700', marginBottom: spacing.md },
  description: { textAlign: 'center', color: colors.gray, marginBottom: spacing.xl, lineHeight: 22 },
  label: { color: colors.dark, fontSize: 13, fontWeight: '600', marginBottom: 4, marginTop: spacing.sm },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.dark,
    backgroundColor: colors.white,
    marginBottom: spacing.sm,
  },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  eyeBtn: { padding: spacing.sm, marginLeft: 4 },
  btn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: colors.white, fontSize: 16, fontWeight: '600' },
  resendBtn: { alignItems: 'center', marginTop: spacing.md },
  resendText: { color: colors.primary, fontSize: 14 },
});
