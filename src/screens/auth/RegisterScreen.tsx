import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  Dimensions,
  TouchableOpacity,
  Modal,
  FlatList,
} from 'react-native';
import * as Location from 'expo-location';
import { TextInput, Text } from 'react-native-paper';
import { ChocolateButton } from '../../components/shared/ChocolateButton';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { useRegisterMutation } from '../../store/api/authApi';
import { setCredentials } from '../../store/slices/authSlice';
import { colors } from '../../theme/colors';
import { useAppTheme } from '../../theme/ThemeProvider';
import { StackScreenProps } from '@react-navigation/stack';
import { AuthStackParamList } from '../../navigation/types';
import { SUPPORTED_COUNTRIES } from '../../config/countries';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const LOGO_SIZE = Dimensions.get('window').width * 0.75;

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
  const { tokens } = useAppTheme();
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [register, { isLoading, error }] = useRegisterMutation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Pays — détection silencieuse via géolocalisation
  const [selectedCountryCode, setSelectedCountryCode] = useState<string | null>(null);
  const [detectedIso, setDetectedIso] = useState<string | null>(null);
  const [countryModalVisible, setCountryModalVisible] = useState(false);

  const selectedCountry = useMemo(
    () => SUPPORTED_COUNTRIES.find(c => c.code === selectedCountryCode) ?? null,
    [selectedCountryCode],
  );

  // Pays détecté mais non supporté
  const isUnsupportedCountry = useMemo(
    () => !!detectedIso && !SUPPORTED_COUNTRIES.find(c => c.code === detectedIso),
    [detectedIso],
  );

  // Géolocalisation silencieuse au montage
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Low,
        });
        const [geo] = await Location.reverseGeocodeAsync({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        const isoCode = geo?.isoCountryCode?.toLowerCase();
        if (!isoCode) return;
        setDetectedIso(isoCode);
        const found = SUPPORTED_COUNTRIES.find(c => c.code === isoCode);
        if (found) setSelectedCountryCode(isoCode);
      } catch {
        // Silencieux — la sélection de pays n'est jamais bloquante à l'inscription
      }
    })();
  }, []);

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: tokens.background },
    scrollContent: { padding: 24, paddingTop: 60 },
    logoContainer: { alignItems: 'center', marginBottom: 16 },
    logo: { width: LOGO_SIZE, height: LOGO_SIZE },
    title: { marginBottom: 24, color: tokens.text.primary, textAlign: 'center' },
    input: { marginBottom: 16, backgroundColor: tokens.backgroundAlt },
    button: { marginTop: 16 },
    linkButton: { marginTop: 8 },
    errorText: { color: colors.error, fontSize: 12, marginBottom: 8, marginTop: -8 },
    helperText: { color: tokens.text.secondary, fontSize: 11, marginBottom: 8, marginTop: -8, lineHeight: 16 },
    // Chip pays détecté
    countryChip: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      backgroundColor: tokens.backgroundAlt,
      borderWidth: 1, borderColor: tokens.border,
      borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
      marginBottom: 16,
    },
    countryChipFlag: { fontSize: 20 },
    countryChipName: { flex: 1, fontSize: 14, fontWeight: '600', color: tokens.text.primary },
    countryChipHint: { fontSize: 11, color: tokens.text.secondary },
    countryChipChange: { fontSize: 13, color: tokens.primary, fontWeight: '600' },
    // Bannière pays non supporté
    unsupportedBanner: {
      flexDirection: 'row', gap: 10, alignItems: 'flex-start',
      backgroundColor: tokens.backgroundAlt,
      borderWidth: 1, borderColor: colors.warning,
      borderRadius: 10, padding: 14, marginBottom: 16,
    },
    unsupportedText: { flex: 1, fontSize: 13, color: tokens.text.primary, lineHeight: 18 },
    unsupportedLink: { fontSize: 13, color: tokens.primary, fontWeight: '600', marginTop: 6 },
    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContainer: { backgroundColor: tokens.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '60%' },
    modalHeader: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      padding: 20, borderBottomWidth: 1, borderColor: tokens.border,
    },
    modalTitle: { fontSize: 17, fontWeight: '700', color: tokens.text.primary },
    modalClose: { padding: 4 },
    countryItem: {
      flexDirection: 'row', alignItems: 'center', gap: 14,
      paddingHorizontal: 20, paddingVertical: 16,
      borderBottomWidth: 1, borderColor: tokens.border,
    },
    countryFlag: { fontSize: 22 },
    countryItemName: { flex: 1, fontSize: 15, color: tokens.text.primary, fontWeight: '500' },
    countryItemCurrency: { fontSize: 13, color: tokens.text.secondary },
  }), [tokens]);

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
      const result = await register({
        ...registerData,
        // homeCountryId envoyé uniquement si détecté/sélectionné — jamais bloquant
        ...(selectedCountryCode && { homeCountryId: selectedCountryCode.toUpperCase() }),
      }).unwrap();
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
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
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
        <Text variant="headlineLarge" style={styles.title}>
          {t('auth.register_title')}
        </Text>

        {/* ─── Prénom ─── */}
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
              outlineColor={tokens.border}
              activeOutlineColor={tokens.primary}
            />
          )}
        />
        {errors.firstName && <Text style={styles.errorText}>{errors.firstName.message}</Text>}

        {/* ─── Nom ─── */}
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
              outlineColor={tokens.border}
              activeOutlineColor={tokens.primary}
            />
          )}
        />
        {errors.lastName && <Text style={styles.errorText}>{errors.lastName.message}</Text>}

        {/* ─── Téléphone ─── */}
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
              outlineColor={tokens.border}
              activeOutlineColor={tokens.primary}
            />
          )}
        />
        {errors.phone && <Text style={styles.errorText}>{errors.phone.message}</Text>}

        {/* ─── Email (optionnel) ─── */}
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
              autoCapitalize="none"
              autoCorrect={false}
              outlineColor={tokens.border}
              activeOutlineColor={tokens.primary}
            />
          )}
        />
        {errors.email && <Text style={styles.errorText}>{errors.email.message}</Text>}

        {/* ─── Mot de passe ─── */}
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
        {errors.password && <Text style={styles.errorText}>{errors.password.message}</Text>}
        {!errors.password && <Text style={styles.helperText}>{t('auth.password_hint')}</Text>}

        {/* ─── Confirmation mot de passe ─── */}
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
              outlineColor={tokens.border}
              activeOutlineColor={tokens.primary}
              right={
                <TextInput.Icon
                  icon={showConfirmPassword ? 'eye-off' : 'eye'}
                  onPress={() => setShowConfirmPassword(v => !v)}
                  color={tokens.text.secondary}
                />
              }
            />
          )}
        />
        {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword.message}</Text>}

        {/* ─── Pays détecté (non bloquant) ─── */}
        {selectedCountry && (
          <TouchableOpacity
            style={styles.countryChip}
            onPress={() => setCountryModalVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.countryChipFlag}>{selectedCountry.flag}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.countryChipName}>{t(`country.${selectedCountry.nameKey}`)}</Text>
              <Text style={styles.countryChipHint}>{t('auth.country_detected_hint')}</Text>
            </View>
            <Text style={styles.countryChipChange}>{t('location.change_country')}</Text>
          </TouchableOpacity>
        )}

        {/* ─── Pays non supporté ─── */}
        {isUnsupportedCountry && (
          <View style={styles.unsupportedBanner}>
            <Icon name="information-outline" size={18} color={colors.warning} />
            <View style={{ flex: 1 }}>
              <Text style={styles.unsupportedText}>
                {t('location.unsupported_msg_with_country', {
                  country: detectedIso?.toUpperCase() ?? '',
                })}
              </Text>
              <TouchableOpacity onPress={() => setCountryModalVisible(true)}>
                <Text style={styles.unsupportedLink}>{t('country.select_country')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {error && <Text style={styles.errorText}>{t('auth.register_failed')}</Text>}

        <ChocolateButton onPress={handleSubmit(onSubmit)} loading={isLoading} style={styles.button}>
          {t('auth.register_btn')}
        </ChocolateButton>

        <ChocolateButton
          variant="ghost"
          onPress={() => navigation.navigate('Login')}
          style={styles.linkButton}
        >
          {`${t('auth.already_account')} ${t('auth.login_link')}`}
        </ChocolateButton>
      </ScrollView>

      {/* ─── Modal correction pays ─── */}
      <Modal
        visible={countryModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCountryModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setCountryModalVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('country.select_country')}</Text>
              <TouchableOpacity style={styles.modalClose} onPress={() => setCountryModalVisible(false)}>
                <Icon name="close" size={22} color={tokens.text.primary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={SUPPORTED_COUNTRIES}
              keyExtractor={item => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.countryItem,
                    selectedCountryCode === item.code && { backgroundColor: tokens.primary + '15' },
                  ]}
                  onPress={() => {
                    setSelectedCountryCode(item.code);
                    setCountryModalVisible(false);
                  }}
                >
                  <Text style={styles.countryFlag}>{item.flag}</Text>
                  <Text style={styles.countryItemName}>{t(`country.${item.nameKey}`)}</Text>
                  <Text style={styles.countryItemCurrency}>{item.currency}</Text>
                  {selectedCountryCode === item.code && (
                    <Icon name="check" size={18} color={tokens.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
};
