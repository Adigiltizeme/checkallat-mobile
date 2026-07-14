import React, { useRef, useState, useMemo } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text } from 'react-native-paper';
import { ChocolateButton } from '../../components/shared/ChocolateButton';
import { StackScreenProps } from '@react-navigation/stack';
import SignatureCanvas from 'react-native-signature-canvas';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { useAppTheme } from '../../theme/ThemeProvider';
import { DriverStackParamList } from '../../navigation/types';
import { useSaveSignatureMutation } from '../../store/api/transportApi';

type Props = StackScreenProps<DriverStackParamList, 'DriverSignature'>;

export const DriverSignatureScreen = ({ navigation, route }: Props) => {
  const { tokens } = useAppTheme();
  const { requestId } = route.params;
  const [signature, setSignature] = useState<string | null>(null);
  const [saveSignature, { isLoading }] = useSaveSignatureMutation();
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

  const handleSignature = (sig: string) => {
    setSignature(sig);
  };

  const handleClear = () => {
    signatureRef.current?.clearSignature();
    setSignature(null);
  };

  const handleSubmit = async () => {
    if (!signature) {
      Alert.alert('Attention', 'Veuillez faire signer le client');
      return;
    }

    try {
      await saveSignature({ requestId, signature }).unwrap();
      Alert.alert('Succès', 'Signature enregistrée avec succès', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error: any) {
      console.error('Error saving signature:', error);
      Alert.alert('Erreur', error?.data?.message || 'Impossible d\'enregistrer la signature');
    }
  };

  const style = `.m-signature-pad {
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
          ✍️ Signature du client
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Demandez au client de signer pour confirmer la livraison
        </Text>
      </View>

      <View style={styles.signatureContainer}>
        <SignatureCanvas
          ref={signatureRef}
          onOK={handleSignature}
          descriptionText=""
          clearText="Effacer"
          confirmText="Confirmer"
          webStyle={style}
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
          Effacer
        </ChocolateButton>
        <ChocolateButton
          onPress={handleSubmit}
          loading={isLoading}
          disabled={isLoading || !signature}
          style={styles.submitButton}
        >
          Enregistrer
        </ChocolateButton>
      </View>
    </View>
  );
};

