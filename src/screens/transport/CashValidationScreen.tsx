import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, TextInput, Button, Card, HelperText } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { TransportStackParamList } from '../../navigation/types';
import { useValidateCashPaymentMutation } from '../../store/api/transportApi';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { colors } from '../../theme/colors';
import { formatCurrency, CURRENCY_CONFIG } from '../../config/currency';

type Props = NativeStackScreenProps<TransportStackParamList, 'CashValidation'>;

export const CashValidationScreen = ({ route, navigation }: Props) => {
  const { requestId, totalPrice } = route.params;
  const isDriver = useSelector((state: RootState) => state.auth.isDriver);
  const { t } = useTranslation();

  const [amount, setAmount] = useState(totalPrice.toString());
  const [notes, setNotes] = useState('');
  const [validateCash, { isLoading }] = useValidateCashPaymentMutation();

  const handleValidate = async () => {
    const amountNum = parseFloat(amount);

    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert(t('common.error'), t('cash_validation.invalid_amount'));
      return;
    }

    try {
      await validateCash({
        requestId,
        role: isDriver ? 'driver' : 'client',
        data: {
          amount: amountNum,
          notes: notes.trim() || undefined,
        },
      }).unwrap();

      Alert.alert(
        t('common.success'),
        t('payment.success_msg'),
        [
          {
            text: t('common.ok'),
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        t('common.error'),
        error?.data?.message || t('common.error_generic')
      );
    }
  };

  const difference = Math.abs(parseFloat(amount) - totalPrice);
  const showWarning = !isNaN(parseFloat(amount)) && difference > totalPrice * 0.01;

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="headlineSmall" style={styles.title}>
            💰 {t('cash_validation.title')}
          </Text>

          <Text variant="bodyMedium" style={styles.subtitle}>
            {isDriver ? t('cash_validation.driver_subtitle') : t('cash_validation.client_subtitle')}
          </Text>

          <View style={styles.priceInfo}>
            <Text variant="bodyLarge" style={styles.label}>
              {t('cash_validation.expected_amount')}
            </Text>
            <Text variant="headlineMedium" style={styles.expectedPrice}>
              {formatCurrency(totalPrice)}
            </Text>
          </View>

          <TextInput
            label={t('cash_validation.amount_label', { symbol: CURRENCY_CONFIG.symbol })}
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            mode="outlined"
            style={styles.input}
            left={<TextInput.Icon icon="cash" />}
            error={showWarning}
          />

          {showWarning && (
            <HelperText type="error" visible={showWarning}>
              {t('cash_validation.warning')}
            </HelperText>
          )}

          <TextInput
            label={t('cash_validation.notes_label')}
            value={notes}
            onChangeText={setNotes}
            mode="outlined"
            multiline
            numberOfLines={3}
            style={styles.input}
            placeholder={t('cash_validation.notes_placeholder')}
          />

          <View style={styles.infoBox}>
            <Text variant="bodySmall" style={styles.infoText}>
              {t('cash_validation.info')}
            </Text>
          </View>
        </Card.Content>
      </Card>

      <View style={styles.actions}>
        <Button
          mode="contained"
          onPress={handleValidate}
          loading={isLoading}
          disabled={isLoading || !amount}
          style={styles.button}
          icon="check-circle"
        >
          {t('cash_validation.validate_btn')}
        </Button>

        <Button
          mode="outlined"
          onPress={() => navigation.goBack()}
          disabled={isLoading}
          style={styles.button}
        >
          {t('common.cancel')}
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  card: {
    margin: 16,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.gray,
    marginBottom: 24,
    textAlign: 'center',
  },
  priceInfo: {
    backgroundColor: colors.lightGray,
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    alignItems: 'center',
  },
  label: {
    color: colors.gray,
    marginBottom: 4,
  },
  expectedPrice: {
    fontWeight: 'bold',
    color: colors.primary,
  },
  input: {
    marginBottom: 16,
  },
  infoBox: {
    backgroundColor: colors.lightBlue,
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  infoText: {
    color: colors.gray,
    lineHeight: 20,
  },
  actions: {
    padding: 16,
    gap: 12,
  },
  button: {
    marginBottom: 8,
  },
});
