import React, { useState, useMemo } from 'react';
import { View, StyleSheet, Image, Dimensions } from 'react-native';

const LOGO_SIZE = Dimensions.get('window').width * 0.58;
import { TextInput, Text } from 'react-native-paper';
import { ChocolateButton } from '../../components/shared/ChocolateButton';
import { useTranslation } from 'react-i18next';
import { useVerifyOTPMutation, useSendOTPMutation } from '../../store/api/authApi';
import { useDispatch } from 'react-redux';
import { setCredentials } from '../../store/slices/authSlice';
import { colors } from '../../theme/colors';
import { useAppTheme } from '../../theme/ThemeProvider';
import { StackScreenProps } from '@react-navigation/stack';
import { AuthStackParamList } from '../../navigation/types';

type Props = StackScreenProps<AuthStackParamList, 'OTP'>;

export const OTPScreen = ({ route }: Props) => {
  const { t } = useTranslation();
  const { tokens } = useAppTheme();

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: tokens.background },
    logoContainer: { alignItems: 'center', marginBottom: 16 },
    logo: { width: LOGO_SIZE, height: LOGO_SIZE },
    title: { marginBottom: 16, color: tokens.text.primary, textAlign: 'center' },
    subtitle: { marginBottom: 32, color: tokens.text.secondary, textAlign: 'center' },
    input: { marginBottom: 16, backgroundColor: tokens.backgroundAlt, fontSize: 24, textAlign: 'center' },
    button: { marginTop: 16 },
    linkButton: { marginTop: 16 },
    errorText: { color: colors.error, fontSize: 12, marginBottom: 8, textAlign: 'center' },
  }), [tokens]);

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
      <View style={styles.logoContainer}>
        <Image
          source={require('../../../assets/splash.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
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
        outlineColor={tokens.border}
        activeOutlineColor={tokens.primary}
      />

      {error && (
        <Text style={styles.errorText}>
          {t('auth.otp_failed')}
        </Text>
      )}

      <ChocolateButton
        onPress={handleVerify}
        loading={isLoading}
        disabled={otp.length !== 6}
        style={styles.button}
      >
        {t('auth.verify_btn')}
      </ChocolateButton>

      <ChocolateButton
        variant="ghost"
        onPress={handleResend}
        loading={isResending}
        style={styles.linkButton}
      >
        {t('auth.resend_code')}
      </ChocolateButton>
    </View>
  );
};

