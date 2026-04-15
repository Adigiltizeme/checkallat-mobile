import React, { useRef, useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { StackScreenProps } from '@react-navigation/stack';
import SignatureCanvas from 'react-native-signature-canvas';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { DriverStackParamList } from '../../navigation/types';
import { useSaveSignatureMutation } from '../../store/api/transportApi';

type Props = StackScreenProps<DriverStackParamList, 'DriverSignature'>;

export const DriverSignatureScreen = ({ navigation, route }: Props) => {
  const { requestId } = route.params;
  const [signature, setSignature] = useState<string | null>(null);
  const [saveSignature, { isLoading }] = useSaveSignatureMutation();
  const signatureRef = useRef<any>(null);

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
          backgroundColor={colors.white}
          penColor={colors.text.primary}
        />
      </View>

      <View style={styles.actionsContainer}>
        <Button
          mode="outlined"
          onPress={handleClear}
          disabled={isLoading}
          style={styles.clearButton}
          icon="eraser"
        >
          Effacer
        </Button>
        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={isLoading}
          disabled={isLoading || !signature}
          style={styles.submitButton}
          icon="check"
        >
          Enregistrer
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  subtitle: {
    color: colors.gray,
  },
  signatureContainer: {
    flex: 1,
    margin: spacing.md,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
    overflow: 'hidden',
  },
  actionsContainer: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  clearButton: {
    flex: 1,
  },
  submitButton: {
    flex: 2,
  },
});
