import React, { useRef, useState, useMemo } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { ChocolateButton } from '../../components/shared/ChocolateButton';
import { StackScreenProps } from '@react-navigation/stack';
import SignatureCanvas from 'react-native-signature-canvas';
import { spacing } from '../../theme/spacing';
import { useAppTheme } from '../../theme/ThemeProvider';
import { DriverStackParamList } from '../../navigation/types';
import { useSaveSignatureMutation, useUpdateTransportStatusMutation } from '../../store/api/transportApi';

type Props = StackScreenProps<DriverStackParamList, 'DriverSignature'>;

export const DriverSignatureScreen = ({ navigation, route }: Props) => {
  const { tokens } = useAppTheme();
  const { t } = useTranslation();
  const { requestId, completeAfter } = route.params;
  const [signature, setSignature] = useState<string | null>(null);
  const [saveSignature, { isLoading: isSaving }] = useSaveSignatureMutation();
  const [updateStatus, { isLoading: isCompleting }] = useUpdateTransportStatusMutation();
  const isLoading = isSaving || isCompleting;
  const signatureRef = useRef<any>(null);

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: tokens.background },
    header: {
      padding: spacing.md,
      backgroundColor: tokens.card,
      borderBottomWidth: 1,
      borderBottomColor: tokens.border,
    },
    title: { fontWeight: 'bold', marginBottom: spacing.xs },
    subtitle: { color: tokens.text.secondary },
    signatureContainer: {
      flex: 1,
      margin: spacing.md,
      backgroundColor: tokens.card,
      borderRadius: 12,
      borderWidth: 2,
      borderStyle: 'dashed',
      borderColor: tokens.border,
      overflow: 'hidden',
    },
    actionsContainer: {
      flexDirection: 'row',
      padding: spacing.md,
      gap: spacing.sm,
      backgroundColor: tokens.card,
      borderTopWidth: 1,
      borderTopColor: tokens.border,
    },
    clearButton: { flex: 1 },
    submitButton: { flex: 2 },
  }), [tokens]);

  const handleClear = () => {
    signatureRef.current?.clearSignature();
    setSignature(null);
  };

  const handleSubmit = async () => {
    if (!signature) {
      Alert.alert(t('common.error'), t('driver.signature_required_msg'));
      return;
    }

    try {
      await saveSignature({ requestId, signature }).unwrap();
      if (completeAfter) {
        await updateStatus({ requestId, status: 'completed' }).unwrap();
      }
      Alert.alert(
        t('common.success'),
        t(completeAfter ? 'driver.signature_saved_delivery_done' : 'driver.signature_saved'),
        [{ text: t('common.ok'), onPress: () => navigation.goBack() }],
      );
    } catch (error: any) {
      Alert.alert(t('common.error'), error?.data?.message || t('driver.signature_save_error'));
    }
  };

  const webStyle = `.m-signature-pad {
    box-shadow: none;
    border: none;
  }
  .m-signature-pad--body {
    border: none;
  }
  .m-signature-pad--footer {
    display: none;
  }
  body,html {
    width: 100%;
    height: 100%;
  }`;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="titleLarge" style={styles.title}>
          ✍️ {t('driver.client_signature')}
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          {t('driver.signature_instructions')}
        </Text>
      </View>

      <View style={styles.signatureContainer}>
        <SignatureCanvas
          ref={signatureRef}
          onOK={setSignature}
          descriptionText=""
          clearText={t('common.clear')}
          confirmText={t('common.confirm')}
          webStyle={webStyle}
          backgroundColor={tokens.card}
          penColor={tokens.text.primary}
        />
      </View>

      <View style={styles.actionsContainer}>
        <ChocolateButton
          variant="outline"
          onPress={handleClear}
          disabled={isLoading}
          style={styles.clearButton}
        >
          {t('common.clear')}
        </ChocolateButton>
        <ChocolateButton
          onPress={handleSubmit}
          loading={isLoading}
          disabled={isLoading || !signature}
          style={styles.submitButton}
        >
          {completeAfter ? t('driver.signature_confirm_delivery') : t('common.save')}
        </ChocolateButton>
      </View>
    </View>
  );
};
