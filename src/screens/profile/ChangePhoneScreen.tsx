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
import { useDispatch } from 'react-redux';
import { updateUser } from '../../store/slices/authSlice';
import { useSendOtpMeMutation, useChangePhoneMutation } from '../../store/api/authApi';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

type Step = 'enter_phone' | 'verify';

export const ChangePhoneScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const [step, setStep] = useState<Step>('enter_phone');
  const [newPhone, setNewPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');

  const [sendOtp, { isLoading: sending }] = useSendOtpMeMutation();
  const [changePhone, { isLoading: saving }] = useChangePhoneMutation();

  const phoneValid = /^\+\d{10,15}$/.test(newPhone.trim());

  const handleSendOtp = async () => {
    if (!phoneValid) {
      Alert.alert(t('common.error'), t('auth.phone_invalid'));
      return;
    }
    try {
      await sendOtp({ phone: newPhone.trim() }).unwrap();
      setStep('verify');
    } catch {
      Alert.alert(t('common.error'), t('auth.otp_failed'));
    }
  };

  const handleSubmit = async () => {
    try {
      await changePhone({ newPhone: newPhone.trim(), otpCode }).unwrap();
      dispatch(updateUser({ phone: newPhone.trim() }));
      Alert.alert(t('common.success'), t('auth.phone_changed'), [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      const msg = err?.data?.message?.includes('use')
        ? t('auth.phone_taken')
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
          <Icon name="phone-lock" size={48} color={colors.primary} />
        </View>

        <Text variant="headlineSmall" style={styles.title}>{t('profile.change_phone')}</Text>

        {step === 'enter_phone' ? (
          <>
            <Text style={styles.label}>{t('auth.new_phone')}</Text>
            <RNTextInput
              style={styles.input}
              value={newPhone}
              onChangeText={setNewPhone}
              keyboardType="phone-pad"
              placeholder={t('auth.phone_placeholder')}
              placeholderTextColor={colors.gray}
              autoComplete="tel"
            />

            <TouchableOpacity
              style={[styles.btn, (!phoneValid || sending) && styles.btnDisabled]}
              onPress={handleSendOtp}
              disabled={!phoneValid || sending}
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
            <Text style={styles.description}>
              {t('auth.otp_subtitle', { phone: newPhone })}
            </Text>

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

            <TouchableOpacity
              style={[styles.btn, (saving || otpCode.length < 6) && styles.btnDisabled]}
              onPress={handleSubmit}
              disabled={saving || otpCode.length < 6}
              activeOpacity={0.8}
            >
              {saving
                ? <ActivityIndicator color={colors.white} size="small" />
                : <Text style={styles.btnText}>{t('common.confirm')}</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity onPress={() => { setStep('enter_phone'); setOtpCode(''); }} style={styles.resendBtn}>
              <Text style={styles.resendText}>{t('auth.resend_otp') ?? 'Modifier le numéro'}</Text>
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
