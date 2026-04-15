import React, { useMemo } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { useLoginMutation } from '../../store/api/authApi';
import { useDispatch } from 'react-redux';
import { setCredentials } from '../../store/slices/authSlice';
import { colors } from '../../theme/colors';
import { StackScreenProps } from '@react-navigation/stack';
import { AuthStackParamList } from '../../navigation/types';

interface LoginForm {
  identifier: string;
  password: string;
}

type Props = StackScreenProps<AuthStackParamList, 'Login'>;

export const LoginScreen = ({ navigation }: Props) => {
  const { t } = useTranslation();
  const [login, { isLoading, error }] = useLoginMutation();
  const dispatch = useDispatch();

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
      console.log('[LOGIN] User logged in:', {
        id: result.user.id,
        email: result.user.email,
        isDriver: !!result.user.driver,
        isPro: !!result.user.pro,
        isSeller: !!result.user.marketplaceSeller,
      });
      dispatch(setCredentials(result));
      // Navigation handled automatically by RootNavigator
    } catch (err) {
      console.error('Login failed:', err);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.content}>
        <Text variant="displaySmall" style={styles.title}>
          {t('auth.login_title')}
        </Text>
        <Text variant="displaySmall" style={styles.titleBrand}>
          CheckAll@t
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
              outlineColor={colors.border}
              activeOutlineColor={colors.primary}
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
              secureTextEntry
              error={!!errors.password}
              style={styles.input}
              mode="outlined"
              outlineColor={colors.border}
              activeOutlineColor={colors.primary}
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

        <Button
          mode="contained"
          onPress={handleSubmit(onSubmit)}
          loading={isLoading}
          style={styles.button}
          buttonColor={colors.primary}
        >
          {t('auth.login_btn')}
        </Button>

        <Button
          mode="text"
          onPress={() => navigation.navigate('Register')}
          style={styles.linkButton}
        >
          {t('auth.no_account')} {t('auth.register_link')}
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    marginBottom: 8,
    color: colors.dark,
    textAlign: 'center',
  },
  titleBrand: {
    marginBottom: 48,
    color: colors.primary,
    textAlign: 'center',
    fontWeight: 'bold',
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
});
