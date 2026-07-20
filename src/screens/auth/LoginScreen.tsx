import React, { useMemo, useEffect, useState } from 'react';
import { StyleSheet, KeyboardAvoidingView, ScrollView, Platform, View, Image, Dimensions } from 'react-native';

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

export const LoginScreen = ({ navigation }: Props) => {
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

  const { control, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      const result = await login(data).unwrap();
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

        <Controller
          control={control}
          name="identifier"
          render={({ field: { onChange, value } }) => (
            <TextInput
              label={t('auth.phone_or_email')}
              value={value}
              onChangeText={onChange}
              error={!!errors.identifier}
              style={styles.input}
              mode="outlined"
              outlineColor={tokens.border}
              activeOutlineColor={tokens.primary}
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

