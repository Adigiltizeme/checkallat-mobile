import React, { useMemo, useEffect, useState } from 'react';
import { StyleSheet, KeyboardAvoidingView, ScrollView, Platform, View, Image, Dimensions, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const LOGO_SIZE = Dimensions.get('window').width * 0.85;
import { TextInput, Text } from 'react-native-paper';
import { ChocolateButton } from '../../components/shared/ChocolateButton';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLoginMutation } from '../../store/api/authApi';
import { useDispatch } from 'react-redux';
import { setCredentials, DEFAULT_ROLE_KEY, UserRole } from '../../store/slices/authSlice';
import { colors } from '../../theme/colors';
import { useAppTheme } from '../../theme/ThemeProvider';
import { StackScreenProps } from '@react-navigation/stack';
import { AuthStackParamList } from '../../navigation/types';
import { LanguagePickerModal, LANGUAGE_PICKER_DISMISSED_KEY } from './LanguagePickerModal';

interface LoginForm {
  identifier: string;
  password: string;
}

type Props = StackScreenProps<AuthStackParamList, 'Login'>;

export const LoginScreen = ({ navigation, route }: Props) => {
  const { tokens } = useAppTheme();

  const styles = useMemo(() => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.background,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    marginBottom: 32,
    color: tokens.text.primary,
    textAlign: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },
  input: {
    marginBottom: 16,
    backgroundColor: tokens.backgroundAlt,
  },
  button: {
    marginTop: 16,
  },
  linkButton: {
    marginTop: 8,
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
    marginBottom: 8,
    marginTop: -8,
  },
  forgotLink: {
    alignSelf: 'flex-end',
    marginTop: -8,
    paddingVertical: 4,
  },
  forgotText: {
    color: tokens.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.success + '18',
    borderColor: colors.success,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  successText: {
    flex: 1,
    color: tokens.text.primary,
    fontSize: 13,
    lineHeight: 18,
  },
  }), [tokens]);
  const { t } = useTranslation();
  const [login, { isLoading, error }] = useLoginMutation();
  const dispatch = useDispatch();
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(LANGUAGE_PICKER_DISMISSED_KEY).then((dismissed) => {
      if (!dismissed) setShowLangPicker(true);
    });
  }, []);

  const loginSchema = useMemo(() => z.object({
    identifier: z.string().min(1, t('auth.identifier_required')),
    password: z.string().min(8, t('auth.password_min_length')),
  }), [t]);

  const { control, handleSubmit, setValue, getValues, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  // Retour depuis la réinitialisation du mot de passe : numéro pré-rempli + confirmation
  const resetPhone = route.params?.phone;
  const passwordReset = !!route.params?.passwordReset;
  useEffect(() => {
    if (resetPhone) setValue('identifier', resetPhone);
  }, [resetPhone, setValue]);

  const openForgotPassword = () => {
    const identifier = (getValues('identifier') ?? '').replace(/\s/g, '');
    navigation.navigate('ForgotPassword', /^\+\d{10,15}$/.test(identifier) ? { phone: identifier } : undefined);
  };

  const onSubmit = async (data: LoginForm) => {
    try {
      const result = await login(data).unwrap();
      // Numéro jamais confirmé : un code vient d'être envoyé par SMS
      if (result.requiresPhoneVerification) {
        navigation.navigate('OTP', { phone: result.phone });
        return;
      }
      const savedDefault = await AsyncStorage.getItem(DEFAULT_ROLE_KEY) as UserRole | null;
      dispatch(setCredentials({ ...result, defaultRole: savedDefault }));
      // Navigation handled automatically by RootNavigator
    } catch (err) {
      console.error('Login failed:', err);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={'padding'}
    >
      <LanguagePickerModal
        visible={showLangPicker}
        onDismiss={() => setShowLangPicker(false)}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoContainer}>
          <Image
            source={require('../../../assets/splash.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <Text variant="bodyLarge" style={styles.title}>
          {t('auth.login_title')}
        </Text>

        {passwordReset && (
          <View style={styles.successBanner}>
            <Icon name="check-circle-outline" size={20} color={colors.success} />
            <Text style={styles.successText}>{t('auth.reset_success')}</Text>
          </View>
        )}

        <Controller
          control={control}
          name="identifier"
          render={({ field: { onChange, value } }) => (
            <TextInput
              label={t('auth.phone_or_email')}
              value={value}
              onChangeText={(text) => onChange(text.trim())}
              error={!!errors.identifier}
              style={styles.input}
              mode="outlined"
              outlineColor={tokens.border}
              activeOutlineColor={tokens.primary}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
            />
          )}
        />
        {errors.identifier && (
          <Text style={styles.errorText}>{errors.identifier.message}</Text>
        )}

        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, value } }) => (
            <TextInput
              label={t('auth.password')}
              value={value}
              onChangeText={onChange}
              secureTextEntry={!showPassword}
              error={!!errors.password}
              style={styles.input}
              mode="outlined"
              outlineColor={tokens.border}
              activeOutlineColor={tokens.primary}
              right={
                <TextInput.Icon
                  icon={showPassword ? 'eye-off' : 'eye'}
                  onPress={() => setShowPassword(v => !v)}
                  color={tokens.text.secondary}
                />
              }
            />
          )}
        />
        {errors.password && (
          <Text style={styles.errorText}>{errors.password.message}</Text>
        )}

        <TouchableOpacity style={styles.forgotLink} onPress={openForgotPassword}>
          <Text style={styles.forgotText}>{t('auth.forgot_password_link')}</Text>
        </TouchableOpacity>

        {error && (
          <Text style={styles.errorText}>
            {t('auth.login_failed')}
          </Text>
        )}

        <ChocolateButton
          onPress={handleSubmit(onSubmit)}
          loading={isLoading}
          style={styles.button}
        >
          {t('auth.login_btn')}
        </ChocolateButton>

        <ChocolateButton
          variant="ghost"
          onPress={() => navigation.navigate('Register')}
          style={styles.linkButton}
        >
          {`${t('auth.no_account')} ${t('auth.register_link')}`}
        </ChocolateButton>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

