import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Button, Text, Switch, IconButton, Card, Checkbox } from 'react-native-paper';
import { StackScreenProps } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { Step1Data, Step2Data, Step3Data } from '../../types/transport';

type Props = StackScreenProps<any, 'TransportRequestStep3'>;

export const TransportRequestStep3Screen = ({ route, navigation }: Props) => {
  const { t } = useTranslation();
  const { step1Data, step2Data } = route.params as {
    step1Data: Step1Data;
    step2Data: Step2Data;
  };

  const [needHelpers, setNeedHelpers] = useState(false);
  const [helpersCount, setHelpersCount] = useState(1);
  const [needDisassembly, setNeedDisassembly] = useState(false);
  const [needReassembly, setNeedReassembly] = useState(false);
  const [needPacking, setNeedPacking] = useState(false);

  const handleNext = () => {
    const step3Data: Step3Data = {
      needHelpers,
      helpersCount: needHelpers ? helpersCount : 0,
      needDisassembly,
      needReassembly,
      needPacking,
    };

    navigation.navigate('TransportRequestStep4', { step1Data, step2Data, step3Data });
  };

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text variant="headlineSmall" style={styles.title}>
        {t('transport.additional_services')}
      </Text>

      <Text variant="bodyMedium" style={styles.subtitle}>
        {t('transport.services_subtitle')}
      </Text>

      {/* Aide pour porter */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.serviceHeader}>
            <View style={styles.serviceInfo}>
              <Text variant="titleMedium" style={styles.serviceTitle}>
                🤝 {t('transport.helpers_title')}
              </Text>
              <Text variant="bodySmall" style={styles.serviceDescription}>
                {t('transport.helpers_desc')}
              </Text>
            </View>
            <Switch
              value={needHelpers}
              onValueChange={setNeedHelpers}
              color={colors.primary}
            />
          </View>

          {needHelpers && (
            <View style={styles.helperCounter}>
              <Text variant="bodyMedium">{t('transport.helpers_count_label')}</Text>
              <View style={styles.stepper}>
                <IconButton
                  icon="minus"
                  size={20}
                  disabled={helpersCount <= 1}
                  onPress={() => setHelpersCount(Math.max(1, helpersCount - 1))}
                />
                <Text variant="titleLarge" style={styles.stepperValue}>
                  {helpersCount}
                </Text>
                <IconButton
                  icon="plus"
                  size={20}
                  disabled={helpersCount >= 5}
                  onPress={() => setHelpersCount(Math.min(5, helpersCount + 1))}
                />
              </View>
              <Text variant="bodySmall" style={styles.servicePrice}>
                +{helpersCount * 50} EGP
              </Text>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* Démontage */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.serviceRow}>
            <Checkbox
              status={needDisassembly ? 'checked' : 'unchecked'}
              onPress={() => setNeedDisassembly(!needDisassembly)}
              color={colors.primary}
            />
            <View style={styles.serviceInfo}>
              <Text variant="titleMedium" style={styles.serviceTitle}>
                🔧 {t('transport.disassembly_service')}
              </Text>
              <Text variant="bodySmall" style={styles.serviceDescription}>
                {t('transport.disassembly_desc')}
              </Text>
              {needDisassembly && (
                <Text variant="bodySmall" style={styles.servicePrice}>
                  +40 EGP
                </Text>
              )}
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Remontage */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.serviceRow}>
            <Checkbox
              status={needReassembly ? 'checked' : 'unchecked'}
              onPress={() => setNeedReassembly(!needReassembly)}
              color={colors.primary}
            />
            <View style={styles.serviceInfo}>
              <Text variant="titleMedium" style={styles.serviceTitle}>
                🔨 {t('transport.reassembly_service')}
              </Text>
              <Text variant="bodySmall" style={styles.serviceDescription}>
                {t('transport.reassembly_desc')}
              </Text>
              {needReassembly && (
                <Text variant="bodySmall" style={styles.servicePrice}>
                  +40 EGP
                </Text>
              )}
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Emballage */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.serviceRow}>
            <Checkbox
              status={needPacking ? 'checked' : 'unchecked'}
              onPress={() => setNeedPacking(!needPacking)}
              color={colors.primary}
            />
            <View style={styles.serviceInfo}>
              <Text variant="titleMedium" style={styles.serviceTitle}>
                📦 {t('transport.packing_service')}
              </Text>
              <Text variant="bodySmall" style={styles.serviceDescription}>
                {t('transport.packing_desc')}
              </Text>
              {needPacking && (
                <Text variant="bodySmall" style={styles.servicePrice}>
                  +30 EGP
                </Text>
              )}
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Info */}
      <Card style={styles.infoCard}>
        <Card.Content>
          <View style={styles.infoIcon}>
            <Text variant="headlineSmall">💡</Text>
          </View>
          <Text variant="bodyMedium" style={styles.infoText}>
            {t('transport.services_info')}
          </Text>
        </Card.Content>
      </Card>

      {/* Boutons navigation */}
      <View style={styles.actions}>
        <Button
          mode="outlined"
          onPress={handleBack}
          style={styles.backButton}
          textColor={colors.gray}
        >
          {t('common.back')}
        </Button>
        <Button
          mode="contained"
          onPress={handleNext}
          buttonColor={colors.primary}
          style={styles.nextButton}
        >
          {t('transport.next')}
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  title: {
    color: colors.dark,
    marginBottom: spacing.sm,
  },
  subtitle: {
    color: colors.gray,
    marginBottom: spacing.lg,
  },
  card: {
    marginBottom: spacing.md,
    backgroundColor: colors.white,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceTitle: {
    color: colors.dark,
    marginBottom: 4,
  },
  serviceDescription: {
    color: colors.gray,
    marginBottom: 4,
  },
  servicePrice: {
    color: colors.primary,
    fontWeight: '600',
    marginTop: 4,
  },
  helperCounter: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.sm,
  },
  stepperValue: {
    marginHorizontal: spacing.lg,
    color: colors.primary,
    fontWeight: '700',
  },
  infoCard: {
    backgroundColor: '#E3F2FD',
    marginBottom: spacing.md,
  },
  infoIcon: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  infoText: {
    color: colors.dark,
    textAlign: 'center',
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  backButton: {
    flex: 1,
    paddingVertical: spacing.sm,
  },
  nextButton: {
    flex: 2,
    paddingVertical: spacing.sm,
  },
});
