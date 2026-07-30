import React, { useEffect, useState, useMemo } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useStripe } from '@stripe/stripe-react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { ChocolateButton } from '../../components/shared/ChocolateButton';
import { ProfileStackParamList } from '../../navigation/types';
import { useCreateSetupIntentMutation } from '../../store/api/savedCardsApi';
import { colors } from '../../theme/colors';
import { useAppTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/spacing';

type Props = StackScreenProps<ProfileStackParamList, 'AddCard'>;

type State = 'loading' | 'ready' | 'processing' | 'success' | 'error';

export const AddCardScreen = ({ navigation }: Props) => {
  const { tokens } = useAppTheme();
  const { t } = useTranslation();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const [createSetupIntent] = useCreateSetupIntentMutation();
  const [state, setState] = useState<State>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: tokens.background, padding: spacing.lg },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
    infoCard: {
      backgroundColor: tokens.card,
      borderRadius: 12,
      padding: spacing.lg,
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.xl,
    },
    infoTitle: { color: tokens.text.primary, fontWeight: '700', textAlign: 'center' },
    infoSub: { color: tokens.text.secondary, textAlign: 'center', lineHeight: 20 },
    stripeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: spacing.xs,
    },
    stripeText: { color: tokens.text.secondary, fontSize: 12 },
    actions: { flex: 1, justifyContent: 'flex-end', paddingBottom: spacing.md },
    errorText: { color: colors.error, textAlign: 'center', marginBottom: spacing.md },
  }), [tokens]);

  useEffect(() => {
    initializeSheet();
  }, []);

  const initializeSheet = async () => {
    try {
      setState('loading');
      const { clientSecret } = await createSetupIntent().unwrap();
      const { error } = await initPaymentSheet({
        setupIntentClientSecret: clientSecret,
        merchantDisplayName: 'CheckAllAt',
        style: 'automatic',
      });
      if (error) {
        setErrorMessage(error.message);
        setState('error');
        return;
      }
      setState('ready');
    } catch (err: any) {
      const msg = err?.data?.message || err?.message || t('saved_cards.add_error');
      setErrorMessage(msg);
      setState('error');
    }
  };

  const handleAddCard = async () => {
    setState('processing');
    const { error } = await presentPaymentSheet();
    if (error) {
      if (error.code !== 'Canceled') {
        Alert.alert(t('common.error'), error.message);
      }
      setState('ready');
      return;
    }
    setState('success');
    Alert.alert(t('common.success'), t('saved_cards.add_success'), [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  };

  if (state === 'loading') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={tokens.primary} />
        <Text style={{ color: tokens.text.secondary }}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (state === 'error') {
    return (
      <View style={styles.centered}>
        <Icon name="alert-circle-outline" size={48} color={colors.error} />
        <Text style={{ color: colors.error, textAlign: 'center' }}>{errorMessage}</Text>
        <ChocolateButton onPress={initializeSheet}>{t('common.retry')}</ChocolateButton>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.infoCard}>
        <Icon name="shield-check-outline" size={40} color={tokens.primary} />
        <Text variant="titleMedium" style={styles.infoTitle}>{t('saved_cards.add_title')}</Text>
        <Text variant="bodySmall" style={styles.infoSub}>{t('saved_cards.add_subtitle')}</Text>
        <View style={styles.stripeRow}>
          <Icon name="lock-outline" size={14} color={tokens.text.secondary} />
          <Text style={styles.stripeText}>{t('saved_cards.secured_by_stripe')}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <ChocolateButton
          onPress={handleAddCard}
          disabled={state === 'processing'}
          loading={state === 'processing'}
        >
          {t('saved_cards.add_btn')}
        </ChocolateButton>
      </View>
    </View>
  );
};
