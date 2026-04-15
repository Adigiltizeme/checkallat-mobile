import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useVerifyOTPMutation, useSendOTPMutation } from '../../store/api/authApi';
import { useDispatch } from 'react-redux';
import { setCredentials } from '../../store/slices/authSlice';
import { colors } from '../../theme/colors';
import { StackScreenProps } from '@react-navigation/stack';
import { AuthStackParamList } from '../../navigation/types';

type Props = StackScreenProps<AuthStackParamList, 'OTP'>;

export const OTPScreen = ({ route }: Props) => {
  const { t } = useTranslation();
  const { phone } = route.params;
  const [otp, setOtp] = useState('');
  const [verifyOTP, { isLoading, error }] = useVerifyOTPMutation();
  const [resendOTP, { isLoading: isResending }] = useSendOTPMutation();
  const dispatch = useDispatch();

  const handleVerify = async () => {
    try {
      const result = await verifyOTP({ phone, code: otp }).unwrap();
      dispatch(setCredentials(result));
    } catch (err) {
      console.error('OTP verification failed:', err);
    }
  };

  const handleResend = async () => {
    try {
      await resendOTP({ phone }).unwrap();
      alert(t('auth.resend_success'));
    } catch (err) {
      console.error('Failed to resend OTP:', err);
    }
  };

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>
        {t('auth.otp_title')}
      </Text>
      <Text variant="bodyMedium" style={styles.subtitle}>
        {t('auth.otp_subtitle', { phone })}
      </Text>

      <TextInput
        label={t('auth.otp_code')}
        value={otp}
        onChangeText={setOtp}
        keyboardType="number-pad"
        maxLength={6}
        style={styles.input}
        mode="outlined"
        outlineColor={colors.border}
        activeOutlineColor={colors.primary}
      />

      {error && (
        <Text style={styles.errorText}>
          {t('auth.otp_failed')}
        </Text>
      )}

      <Button
        mode="contained"
        onPress={handleVerify}
        loading={isLoading}
        disabled={otp.length !== 6}
        style={styles.button}
        buttonColor={colors.primary}
      >
        {t('auth.verify_btn')}
      </Button>

      <Button
        mode="text"
        onPress={handleResend}
        loading={isResending}
        style={styles.linkButton}
      >
        {t('auth.resend_code')}
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  title: {
    marginBottom: 16,
    color: colors.dark,
    textAlign: 'center',
  },
  subtitle: {
    marginBottom: 32,
    color: colors.gray,
    textAlign: 'center',
  },
  input: {
    marginBottom: 16,
    backgroundColor: colors.white,
    fontSize: 24,
    textAlign: 'center',
  },
  button: {
    marginTop: 16,
    paddingVertical: 8,
  },
  linkButton: {
    marginTop: 16,
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
});
