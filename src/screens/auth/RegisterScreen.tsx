import React, { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { useRegisterMutation } from '../../store/api/authApi';
import { setCredentials } from '../../store/slices/authSlice';
import { colors } from '../../theme/colors';
import { StackScreenProps } from '@react-navigation/stack';
import { AuthStackParamList } from '../../navigation/types';

interface RegisterForm {
  phone: string;
  email?: string;
  firstName: string;
  lastName: string;
  password: string;
  confirmPassword: string;
}

type Props = StackScreenProps<AuthStackParamList, 'Register'>;

export const RegisterScreen = ({ navigation }: Props) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [register, { isLoading, error }] = useRegisterMutation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const registerSchema = useMemo(() => z.object({
    phone: z.string().regex(/^\+\d{10,15}$/, t('auth.phone_invalid')),
    email: z.string().email(t('auth.email_invalid')).optional(),
    firstName: z.string().min(2, t('auth.first_name_min')),
    lastName: z.string().min(2, t('auth.last_name_min')),
    password: z
      .string()
      .min(8, t('auth.password_min_length'))
      .regex(/[A-Z]/, t('auth.password_uppercase'))
      .regex(/[a-z]/, t('auth.password_lowercase'))
      .regex(/[0-9]/, t('auth.password_number'))
      .regex(/[@$!%*?&#]/, t('auth.password_special')),
    confirmPassword: z.string(),
  }).refine((data) => data.password === data.confirmPassword, {
    message: t('auth.passwords_mismatch'),
    path: ['confirmPassword'],
  }), [t]);

  const { control, handleSubmit, formState: { errors } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterForm) => {
    try {
      const { confirmPassword, ...registerData } = data;
      const result = await register(registerData).unwrap();
      dispatch(setCredentials({
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      }));
    } catch (err) {
      console.error('Registration failed:', err);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text variant="headlineLarge" style={styles.title}>
          {t('auth.register_title')}
        </Text>

        <Controller
          control={control}
          name="firstName"
          render={({ field: { onChange, value } }) => (
            <TextInput
              label={t('auth.first_name')}
              value={value}
              onChangeText={onChange}
              error={!!errors.firstName}
              style={styles.input}
              mode="outlined"
              outlineColor={colors.border}
              activeOutlineColor={colors.primary}
            />
          )}
        />
        {errors.firstName && (
          <Text style={styles.errorText}>{errors.firstName.message}</Text>
        )}

        <Controller
          control={control}
          name="lastName"
          render={({ field: { onChange, value } }) => (
            <TextInput
              label={t('auth.last_name')}
              value={value}
              onChangeText={onChange}
              error={!!errors.lastName}
              style={styles.input}
              mode="outlined"
              outlineColor={colors.border}
              activeOutlineColor={colors.primary}
            />
          )}
        />
        {errors.lastName && (
          <Text style={styles.errorText}>{errors.lastName.message}</Text>
        )}

        <Controller
          control={control}
          name="phone"
          render={({ field: { onChange, value } }) => (
            <TextInput
              label={t('auth.phone')}
              value={value}
              onChangeText={onChange}
              error={!!errors.phone}
              style={styles.input}
              mode="outlined"
              keyboardType="phone-pad"
              placeholder={t('auth.phone_placeholder')}
              outlineColor={colors.border}
              activeOutlineColor={colors.primary}
            />
          )}
        />
        {errors.phone && (
          <Text style={styles.errorText}>{errors.phone.message}</Text>
        )}

        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, value } }) => (
            <TextInput
              label={t('auth.email_optional')}
              value={value}
              onChangeText={onChange}
              error={!!errors.email}
              style={styles.input}
              mode="outlined"
              keyboardType="email-address"
              outlineColor={colors.border}
              activeOutlineColor={colors.primary}
            />
          )}
        />
        {errors.email && (
          <Text style={styles.errorText}>{errors.email.message}</Text>
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
              outlineColor={colors.border}
              activeOutlineColor={colors.primary}
              right={
                <TextInput.Icon
                  icon={showPassword ? 'eye-off' : 'eye'}
                  onPress={() => setShowPassword(v => !v)}
                  color={colors.gray}
                />
              }
            />
          )}
        />
        {errors.password && (
          <Text style={styles.errorText}>{errors.password.message}</Text>
        )}
        {!errors.password && (
          <Text style={styles.helperText}>
            {t('auth.password_hint')}
          </Text>
        )}

        <Controller
          control={control}
          name="confirmPassword"
          render={({ field: { onChange, value } }) => (
            <TextInput
              label={t('auth.confirm_password')}
              value={value}
              onChangeText={onChange}
              secureTextEntry={!showConfirmPassword}
              error={!!errors.confirmPassword}
              style={styles.input}
              mode="outlined"
              outlineColor={colors.border}
              activeOutlineColor={colors.primary}
              right={
                <TextInput.Icon
                  icon={showConfirmPassword ? 'eye-off' : 'eye'}
                  onPress={() => setShowConfirmPassword(v => !v)}
                  color={colors.gray}
                />
              }
            />
          )}
        />
        {errors.confirmPassword && (
          <Text style={styles.errorText}>{errors.confirmPassword.message}</Text>
        )}

        {error && (
          <Text style={styles.errorText}>
            {t('auth.register_failed')}
          </Text>
        )}

        <Button
          mode="contained"
          onPress={handleSubmit(onSubmit)}
          loading={isLoading}
          style={styles.button}
          buttonColor={colors.primary}
        >
          {t('auth.register_btn')}
        </Button>

        <Button
          mode="text"
          onPress={() => navigation.navigate('Login')}
          style={styles.linkButton}
        >
          {t('auth.already_account')} {t('auth.login_link')}
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 60,
  },
  title: {
    marginBottom: 32,
    color: colors.primary,
    textAlign: 'center',
  },
  input: {
    marginBottom: 16,
    backgroundColor: colors.white,
  },
  button: {
    marginTop: 16,
    paddingVertical: 8,
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
  helperText: {
    color: colors.gray,
    fontSize: 11,
    marginBottom: 8,
    marginTop: -8,
    lineHeight: 16,
  },
});
