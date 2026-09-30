import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { updateUser } from '../../store/slices/authSlice';
import {
  useSendEmailCodeMutation,
  useUpdateProfileMutation,
  useVerifyEmailMutation,
} from '../../store/api/authApi';
import { useEmailVerification } from '../../hooks/useEmailVerification';
import { ChocolateButton } from './ChocolateButton';
import { useAppTheme } from '../../theme/ThemeProvider';
import { colors } from '../../theme/colors';
import { otpErrorKey } from '../../utils/otpErrors';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const RESEND_DELAY_S = 60;

/**
 * Vérification de l'adresse e-mail par code à 6 chiffres.
 * - Sans adresse : saisie de l'adresse puis envoi du code.
 * - Adresse non vérifiée : envoi du code, saisie, confirmation.
 * - Adresse vérifiée : rien n'est affiché.
 * `required` : message « obligatoire pour candidater » au lieu de « recommandé ».
 */
export const EmailVerificationCard = ({ required = false }: { required?: boolean }) => {
  const { t } = useTranslation();
  const { tokens } = useAppTheme();
  const dispatch = useDispatch();
  const { email, emailVerified } = useEmailVerification();

  const [newEmail, setNewEmail] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const [updateProfile, { isLoading: savingEmail }] = useUpdateProfileMutation();
  const [sendCode, { isLoading: sending }] = useSendEmailCodeMutation();
  const [verifyEmail, { isLoading: verifying }] = useVerifyEmailMutation();

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const styles = useMemo(() => StyleSheet.create({
    card: {
      borderRadius: 14, padding: 16, gap: 10, marginBottom: 12,
      backgroundColor: required ? colors.warning + '14' : tokens.primary + '10',
      borderWidth: 1, borderColor: required ? colors.warning + '55' : tokens.primary + '33',
    },
    header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    title: { flex: 1, fontSize: 15, fontWeight: '700', color: tokens.text.primary },
    body: { fontSize: 13, lineHeight: 19, color: tokens.text.secondary },
    email: { fontWeight: '700', color: tokens.text.primary },
    input: { backgroundColor: tokens.card },
    error: { color: colors.error, fontSize: 13 },
  }), [tokens, required]);

  if (emailVerified) return null;

  const sendTo = async () => {
    setError(null);
    try {
      if (!email) {
        const address = newEmail.trim();
        if (!EMAIL_REGEX.test(address)) {
          setError(t('auth.email_invalid'));
          return;
        }
        // Enregistrement de l'adresse : le serveur envoie le code automatiquement
        const updated = await updateProfile({ email: address }).unwrap();
        dispatch(updateUser(updated));
      } else {
        await sendCode().unwrap();
      }
      setCodeSent(true);
      setCooldown(RESEND_DELAY_S);
    } catch (err: any) {
      setError(t(err?.status === 409 ? 'email_verification.email_in_use' : err?.status === 429 ? 'email_verification.too_many_requests' : 'email_verification.send_failed'));
    }
  };

  const confirm = async () => {
    setError(null);
    try {
      await verifyEmail({ code }).unwrap();
      dispatch(updateUser({ emailVerified: true }));
    } catch (err) {
      setError(t(otpErrorKey(err)));
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Icon name={required ? 'email-alert-outline' : 'email-check-outline'} size={22} color={required ? colors.warning : tokens.primary} />
        <Text style={styles.title}>{t(email ? 'email_verification.title_verify' : 'email_verification.title_add')}</Text>
      </View>
      <Text style={styles.body}>
        {t(required ? 'email_verification.required_body' : 'email_verification.recommended_body')}
      </Text>

      {!email ? (
        <TextInput
          mode="outlined"
          label={t('auth.email')}
          value={newEmail}
          onChangeText={setNewEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          style={styles.input}
          outlineColor={tokens.border}
          activeOutlineColor={tokens.primary}
          disabled={codeSent}
        />
      ) : (
        <Text style={styles.body}>
          {t('email_verification.address')} <Text style={styles.email}>{email}</Text>
        </Text>
      )}

      {codeSent && (
        <>
          <Text style={styles.body}>{t('email_verification.code_sent')}</Text>
          <TextInput
            mode="outlined"
            label={t('email_verification.code_label')}
            value={code}
            onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            maxLength={6}
            style={styles.input}
            outlineColor={tokens.border}
            activeOutlineColor={tokens.primary}
          />
        </>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      {codeSent ? (
        <>
          <ChocolateButton onPress={confirm} loading={verifying} disabled={code.length !== 6 || verifying}>
            {t('email_verification.confirm_btn')}
          </ChocolateButton>
          <ChocolateButton variant="ghost" onPress={sendTo} disabled={cooldown > 0 || sending}>
            {cooldown > 0 ? t('auth.reset_resend_in', { seconds: cooldown }) : t('auth.reset_resend')}
          </ChocolateButton>
        </>
      ) : (
        <ChocolateButton onPress={sendTo} loading={sending || savingEmail} disabled={sending || savingEmail}>
          {t(email ? 'email_verification.send_btn' : 'email_verification.save_and_send_btn')}
        </ChocolateButton>
      )}
    </View>
  );
};
