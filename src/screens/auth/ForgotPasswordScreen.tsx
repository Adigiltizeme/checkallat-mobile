import React, { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView } from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { StackScreenProps } from '@react-navigation/stack';
import { AuthStackParamList } from '../../navigation/types';
import { useForgotPasswordMutation } from '../../store/api/authApi';
import { ChocolateButton } from '../../components/shared/ChocolateButton';
import { useAppTheme } from '../../theme/ThemeProvider';
import { colors } from '../../theme/colors';

type Props = StackScreenProps<AuthStackParamList, 'ForgotPassword'>;

const PHONE_REGEX = /^\+\d{10,15}$/;

/** Étape 1 : saisie du numéro — un code de réinitialisation est envoyé par SMS */
export const ForgotPasswordScreen = ({ navigation, route }: Props) => {
  const { t } = useTranslation();
  const { tokens } = useAppTheme();
  const [phone, setPhone] = useState(route.params?.phone ?? '');
  const [touched, setTouched] = useState(false);
  const [forgotPassword, { isLoading, isError }] = useForgotPasswordMutation();

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: tokens.background },
    content: { flexGrow: 1, padding: 24, justifyContent: 'center' },
    iconWrap: {
      alignSelf: 'center', width: 72, height: 72, borderRadius: 36, marginBottom: 20,
      alignItems: 'center', justifyContent: 'center', backgroundColor: tokens.primary + '18',
    },
    title: { color: tokens.text.primary, textAlign: 'center', marginBottom: 8 },
    subtitle: { color: tokens.text.secondary, textAlign: 'center', lineHeight: 21, marginBottom: 28 },
    input: { backgroundColor: tokens.backgroundAlt },
    errorText: { color: colors.error, fontSize: 12, marginTop: 6 },
    button: { marginTop: 24 },
  }), [tokens]);

  const trimmed = phone.replace(/\s/g, '');
  const valid = PHONE_REGEX.test(trimmed);

  const submit = async () => {
    setTouched(true);
    if (!valid) return;
    try {
      await forgotPassword({ phone: trimmed }).unwrap();
      navigation.navigate('ResetPassword', { phone: trimmed });
    } catch {
      // Erreur réseau ou limite d'envois : message affiché sous le champ
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding">
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.iconWrap}>
          <Icon name="lock-reset" size={34} color={tokens.primary} />
        </View>
        <Text variant="headlineSmall" style={styles.title}>{t('auth.forgot_title')}</Text>
        <Text variant="bodyMedium" style={styles.subtitle}>{t('auth.forgot_subtitle')}</Text>

        <TextInput
          label={t('auth.phone')}
          value={phone}
          onChangeText={setPhone}
          onBlur={() => setTouched(true)}
          keyboardType="phone-pad"
          placeholder={t('auth.phone_placeholder')}
          mode="outlined"
          error={touched && !valid}
          outlineColor={tokens.border}
          activeOutlineColor={tokens.primary}
          style={styles.input}
          autoFocus={!phone}
        />
        {touched && !valid && <Text style={styles.errorText}>{t('auth.phone_invalid')}</Text>}
        {isError && <Text style={styles.errorText}>{t('auth.forgot_send_error')}</Text>}

        <ChocolateButton onPress={submit} loading={isLoading} disabled={isLoading} style={styles.button}>
          {t('auth.forgot_send_code')}
        </ChocolateButton>
        <ChocolateButton variant="ghost" onPress={() => navigation.goBack()} style={{ marginTop: 8 }}>
          {t('auth.back_to_login')}
        </ChocolateButton>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
