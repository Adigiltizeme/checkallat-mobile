import React, { useState, useMemo, useEffect } from 'react';
import { View, StyleSheet, Image, Dimensions, Alert } from 'react-native';

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
import { otpErrorKey } from '../../utils/otpErrors';

const RESEND_DELAY_S = 60;

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
  const [verifyOTP, { isLoading }] = useVerifyOTPMutation();
  const [resendOTP, { isLoading: isResending }] = useSendOTPMutation();
  const dispatch = useDispatch();
  const [errorKey, setErrorKey] = useState<string | null>(null);
  // Un code vient d'être envoyé : renvoi possible après une minute
  const [cooldown, setCooldown] = useState(RESEND_DELAY_S);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const handleVerify = async () => {
    setErrorKey(null);
    try {
      const result = await verifyOTP({ phone, code: otp }).unwrap();
      dispatch(setCredentials(result));
    } catch (err) {
      setErrorKey(otpErrorKey(err));
    }
  };

  const handleResend = async () => {
    setErrorKey(null);
    try {
      await resendOTP({ phone }).unwrap();
      setOtp('');
      setCooldown(RESEND_DELAY_S);
      Alert.alert(t('auth.otp_title'), t('auth.resend_success'));
    } catch (err: any) {
      setErrorKey(err?.status === 429 ? 'email_verification.too_many_requests' : 'email_verification.send_failed');
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
        onChangeText={(v) => setOtp(v.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad"
        maxLength={6}
        style={styles.input}
        mode="outlined"
        outlineColor={tokens.border}
        activeOutlineColor={tokens.primary}
      />

      {errorKey && (
        <Text style={styles.errorText}>
          {t(errorKey)}
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
        disabled={cooldown > 0 || isResending}
        style={styles.linkButton}
      >
        {cooldown > 0 ? t('auth.reset_resend_in', { seconds: cooldown }) : t('auth.resend_code')}
      </ChocolateButton>
    </View>
  );
};

