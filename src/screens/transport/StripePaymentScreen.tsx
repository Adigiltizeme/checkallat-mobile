import React, { useEffect, useState, useMemo } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, ActivityIndicator, Card } from 'react-native-paper';
import { ChocolateButton } from '../../components/shared/ChocolateButton';
import { useStripe } from '@stripe/stripe-react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { HomeStackParamList } from '../../navigation/types';
import { useCreatePaymentIntentMutation } from '../../store/api/paymentsApi';
import { useCreateTransportRequestMutation, useCancelTransportMutation } from '../../store/api/transportApi';
import { colors } from '../../theme/colors';
import { useAppTheme } from '../../theme/ThemeProvider';
import { formatCurrency, CURRENCY_CONFIG } from '../../config/currency';

type Props = StackScreenProps<HomeStackParamList, 'StripePayment'>;

type PaymentState = 'loading' | 'ready' | 'processing' | 'success' | 'error';

export const StripePaymentScreen = ({ route, navigation }: Props) => {
  const { tokens } = useAppTheme();


  const styles = useMemo(() => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.background,
    padding: 16,
  },
  amountCard: {
    marginBottom: 24,
  },
  amountContent: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  secureLabel: {
    marginTop: 12,
    color: tokens.text.secondary,
  },
  amount: {
    marginTop: 8,
    fontWeight: 'bold',
    color: tokens.primary,
  },
  escrowNote: {
    marginTop: 8,
    color: tokens.text.secondary,
    textAlign: 'center',
  },
  stateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  stateText: {
    color: tokens.text.secondary,
    fontSize: 16,
    marginTop: 12,
  },
  errorTitle: {
    color: colors.error,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  errorMsg: {
    color: tokens.text.secondary,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  successTitle: {
    color: colors.success,
    fontWeight: 'bold',
  },
  actionsContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 16,
    gap: 12,
  },
  stripeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 8,
  },
  stripeInfoText: {
    color: tokens.text.secondary,
  },
  button: {
    marginBottom: 4,
  },
  payButton: {
    marginBottom: 8,
  },
  }), [tokens]);

  const { requestId: initialRequestId, clientSecret: prebuiltClientSecret, amount, type, pendingRequestData } = route.params;
  const { t } = useTranslation();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const [createPaymentIntent] = useCreatePaymentIntentMutation();
  const [createTransportRequest] = useCreateTransportRequestMutation();
  const [cancelTransport] = useCancelTransportMutation();
  const [paymentState, setPaymentState] = useState<PaymentState>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [resolvedRequestId, setResolvedRequestId] = useState<string | undefined>(initialRequestId);

  useEffect(() => {
    initializePayment();
  }, []);

  const initializePayment = async () => {
    try {
      setPaymentState('loading');

      let secret: string;

      if (prebuiltClientSecret) {
        // Nouveau flux : clientSecret déjà créé côté backend via prepare-payment
        secret = prebuiltClientSecret;
      } else {
        // Flux legacy : on crée d'abord la commande, puis le PaymentIntent
        let activeRequestId = resolvedRequestId;
        if (!activeRequestId && pendingRequestData && type === 'transport') {
          const created = await createTransportRequest(pendingRequestData).unwrap();
          activeRequestId = created.id;
          setResolvedRequestId(activeRequestId);
        }

        const metadata: Record<string, string> = {};
        if (type === 'transport' && activeRequestId) metadata.transportRequestId = activeRequestId;
        if (type === 'booking' && activeRequestId) metadata.bookingId = activeRequestId;
        if (type === 'marketplace' && activeRequestId) metadata.marketplaceOrderId = activeRequestId;

        const result = await createPaymentIntent({
          amount: Math.round(amount * 100),
          currency: CURRENCY_CONFIG.code.toLowerCase(),
          metadata,
          type,
        }).unwrap();
        secret = result.clientSecret;
      }

      const { error } = await initPaymentSheet({
        merchantDisplayName: 'CheckAll@t',
        paymentIntentClientSecret: secret,
        allowsDelayedPaymentMethods: false,
      });

      if (error) {
        setErrorMessage(error.message);
        setPaymentState('error');
        return;
      }

      setPaymentState('ready');
    } catch (err: any) {
      setErrorMessage(err?.data?.message || t('payment.init_error'));
      setPaymentState('error');
    }
  };

  const handlePay = async () => {
    try {
      setPaymentState('processing');

      const { error } = await presentPaymentSheet();

      if (error) {
        if (error.code === 'Canceled') {
          setPaymentState('ready');
          return;
        }
        setErrorMessage(error.message);
        setPaymentState('error');
        return;
      }

      setPaymentState('success');

      const onViewPress = () => {
        // Nouveau flux : pas de requestId avant confirmation webhook, on retourne à l'accueil
        if (prebuiltClientSecret) {
          navigation.reset({ index: 0, routes: [{ name: 'HomeScreen' }] });
          return;
        }
        if (type === 'booking') {
          navigation.reset({
            index: 1,
            routes: [
              { name: 'HomeScreen' },
              { name: 'BookingDetails', params: { bookingId: resolvedRequestId } },
            ],
          });
        } else {
          navigation.reset({
            index: 1,
            routes: [
              { name: 'HomeScreen' },
              { name: 'TransportDetails', params: { requestId: resolvedRequestId } },
            ],
          });
        }
      };
      Alert.alert(
        t('payment.success_title'),
        t('payment.success_msg'),
        [{ text: t('transport.view_request'), onPress: onViewPress }],
        { cancelable: false }
      );
    } catch (err: any) {
      setErrorMessage(err?.message || t('payment.init_error'));
      setPaymentState('error');
    }
  };

  const handleCancel = () => {
    Alert.alert(
      t('payment.cancel_title'),
      t('payment.cancel_confirm'),
      [
        { text: t('common.no'), style: 'cancel' },
        {
          text: t('common.yes'),
          style: 'destructive',
          onPress: async () => {
            // Nouveau flux (clientSecret pré-construit) : aucune commande en DB à annuler
            if (!prebuiltClientSecret && pendingRequestData && resolvedRequestId && type === 'transport') {
              try {
                await cancelTransport({ id: resolvedRequestId, reason: 'payment_cancelled' }).unwrap();
              } catch {}
            }
            navigation.goBack();
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Amount card */}
      <Card style={styles.amountCard}>
        <Card.Content style={styles.amountContent}>
          <Icon name="shield-lock" size={48} color={tokens.primary} />
          <Text variant="titleMedium" style={styles.secureLabel}>
            {t('payment.secure_payment')}
          </Text>
          <Text variant="displaySmall" style={styles.amount}>
            {formatCurrency(amount)}
          </Text>
          <Text variant="bodySmall" style={styles.escrowNote}>
            {t('payment.escrow_note')}
          </Text>
        </Card.Content>
      </Card>

      {/* State-based content */}
      {paymentState === 'loading' && (
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color={tokens.primary} />
          <Text style={styles.stateText}>{t('payment.preparing')}</Text>
        </View>
      )}

      {paymentState === 'error' && (
        <View style={styles.stateContainer}>
          <Icon name="alert-circle" size={64} color={colors.error} />
          <Text variant="titleMedium" style={styles.errorTitle}>
            {t('payment.init_error')}
          </Text>
          <Text variant="bodyMedium" style={styles.errorMsg}>
            {errorMessage}
          </Text>
          <ChocolateButton
            onPress={initializePayment}
            style={styles.button}
          >
            {t('common.retry')}
          </ChocolateButton>
        </View>
      )}

      {paymentState === 'success' && (
        <View style={styles.stateContainer}>
          <Icon name="check-circle" size={80} color={colors.success} />
          <Text variant="titleLarge" style={styles.successTitle}>
            {t('payment.success_title')}
          </Text>
        </View>
      )}

      {(paymentState === 'ready' || paymentState === 'processing') && (
        <View style={styles.actionsContainer}>
          <View style={styles.stripeInfo}>
            <Icon name="lock" size={16} color={tokens.text.secondary} />
            <Text variant="bodySmall" style={styles.stripeInfoText}>
              {t('payment.powered_by_stripe')}
            </Text>
          </View>

          <ChocolateButton
            onPress={handlePay}
            loading={paymentState === 'processing'}
            disabled={paymentState === 'processing'}
            style={[styles.button, styles.payButton]}
          >
            {t('payment.pay_now')}
          </ChocolateButton>

          <ChocolateButton
            variant="outline"
            onPress={handleCancel}
            disabled={paymentState === 'processing'}
            style={styles.button}
          >
            {t('common.cancel')}
          </ChocolateButton>
        </View>
      )}
    </View>
  );
};
