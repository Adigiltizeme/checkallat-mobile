import { useState } from 'react';
import { Alert } from 'react-native';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { useStripe } from '@stripe/stripe-react-native';
import { isExpoGo } from '../utils/environment';
import { usePayCommissionMutation, useConfirmCommissionPaymentMutation } from '../store/api/transportApi';
import { usePayProCommissionMutation, useConfirmProCommissionPaymentMutation } from '../store/api/prosApi';
import { payoutsApi } from '../store/api/payoutsApi';

/**
 * Règlement en ligne de la commission due sur les courses / prestations payées en espèces
 * (chauffeurs et livreurs : role "driver" ; prestataires : role "pro").
 */
export const usePayCashCommission = (role: 'driver' | 'pro', onPaid?: () => void) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [payDriver, { isLoading: payingDriver }] = usePayCommissionMutation();
  const [confirmDriver] = useConfirmCommissionPaymentMutation();
  const [payPro, { isLoading: payingPro }] = usePayProCommissionMutation();
  const [confirmPro] = useConfirmProCommissionPaymentMutation();
  const [paid, setPaid] = useState(false);
  const section = role === 'driver' ? 'driver' : 'pro_space';

  const pay = async () => {
    if (isExpoGo) {
      Alert.alert(t('common.error'), t('payment.dev_build_required'));
      return;
    }
    try {
      const result = role === 'driver' ? await payDriver().unwrap() : await payPro().unwrap();
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'CheckAll@t',
        paymentIntentClientSecret: result.clientSecret,
        allowsDelayedPaymentMethods: false,
      });
      if (initError) { Alert.alert(t('common.error'), initError.message); return; }
      const { error: payError } = await presentPaymentSheet();
      if (payError) {
        if (payError.code !== 'Canceled') Alert.alert(t('common.error'), payError.message);
        return;
      }
      // Confirmation immédiate côté backend (sans attendre le webhook Stripe)
      const confirm = role === 'driver' ? confirmDriver : confirmPro;
      await confirm({ paymentIntentId: result.paymentIntentId }).unwrap();
      setPaid(true);
      dispatch(payoutsApi.util.invalidateTags(['Earnings']));
      onPaid?.();
      Alert.alert(t('payment.success_title'), t(`${section}.commission_paid_success_msg`), [{ text: t('common.ok') }]);
    } catch (error: any) {
      Alert.alert(t('common.error'), error?.data?.message || t(`${section}.commission_payment_error`));
    }
  };

  return { pay, paying: role === 'driver' ? payingDriver : payingPro, paid };
};
