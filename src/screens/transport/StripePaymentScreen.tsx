import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, Button, ActivityIndicator, Card } from 'react-native-paper';
import { useStripe } from '@stripe/stripe-react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { TransportStackParamList } from '../../navigation/types';
import { useCreatePaymentIntentMutation } from '../../store/api/paymentsApi';
import { colors } from '../../theme/colors';
import { formatCurrency } from '../../config/currency';

type Props = StackScreenProps<TransportStackParamList, 'StripePayment'>;

type PaymentState = 'loading' | 'ready' | 'processing' | 'success' | 'error';

export const StripePaymentScreen = ({ route, navigation }: Props) => {
  const { requestId, amount, type } = route.params;
  const { t } = useTranslation();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const [createPaymentIntent] = useCreatePaymentIntentMutation();
  const [paymentState, setPaymentState] = useState<PaymentState>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    initializePayment();
  }, []);

  const initializePayment = async () => {
    try {
      setPaymentState('loading');

      const metadata: Record<string, string> = {};
      if (type === 'transport') metadata.transportRequestId = requestId;
      if (type === 'booking') metadata.bookingId = requestId;
      if (type === 'marketplace') metadata.marketplaceOrderId = requestId;

      const result = await createPaymentIntent({
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'egp',
        metadata,
        type,
      }).unwrap();

      const { error } = await initPaymentSheet({
        merchantDisplayName: 'CheckAll@t',
        paymentIntentClientSecret: result.clientSecret,
        defaultBillingDetails: {},
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

    Alert.alert(
      t('payment.success_title'),
      t('payment.success_msg'),
      [
        {
          text: t('transport.view_request'),
          onPress: () =>
            navigation.reset({
              index: 0,
              routes: [
                { name: 'TransportList' },
                { name: 'TransportDetails', params: { requestId } },
              ],
            }),
        },
      ],
      { cancelable: false }
    );
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
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Amount card */}
      <Card style={styles.amountCard}>
        <Card.Content style={styles.amountContent}>
          <Icon name="shield-lock" size={48} color={colors.primary} />
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
          <ActivityIndicator size="large" color={colors.primary} />
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
          <Button
            mode="contained"
            onPress={initializePayment}
            style={styles.button}
            icon="refresh"
          >
            {t('common.retry')}
          </Button>
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
            <Icon name="lock" size={16} color={colors.gray} />
            <Text variant="bodySmall" style={styles.stripeInfoText}>
              {t('payment.powered_by_stripe')}
            </Text>
          </View>

          <Button
            mode="contained"
            onPress={handlePay}
            loading={paymentState === 'processing'}
            disabled={paymentState === 'processing'}
            style={[styles.button, styles.payButton]}
            icon="credit-card"
            buttonColor={colors.primary}
            contentStyle={styles.payButtonContent}
          >
            {t('payment.pay_now')}
          </Button>

          <Button
            mode="outlined"
            onPress={handleCancel}
            disabled={paymentState === 'processing'}
            style={styles.button}
          >
            {t('common.cancel')}
          </Button>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
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
    color: colors.gray,
  },
  amount: {
    marginTop: 8,
    fontWeight: 'bold',
    color: colors.primary,
  },
  escrowNote: {
    marginTop: 8,
    color: colors.gray,
    textAlign: 'center',
  },
  stateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  stateText: {
    color: colors.gray,
    fontSize: 16,
    marginTop: 12,
  },
  errorTitle: {
    color: colors.error,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  errorMsg: {
    color: colors.gray,
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
    color: colors.gray,
  },
  button: {
    marginBottom: 4,
  },
  payButton: {
    marginBottom: 8,
  },
  payButtonContent: {
    paddingVertical: 8,
  },
});
