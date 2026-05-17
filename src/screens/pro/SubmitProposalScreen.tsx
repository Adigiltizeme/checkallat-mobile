import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useSubmitProposalMutation } from '../../store/api/proposalsApi';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

export const SubmitProposalScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const [submitProposal, { isLoading }] = useSubmitProposalMutation();

  const [nameFr, setNameFr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [description, setDescription] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [pricingHint, setPricingHint] = useState('');
  const [credentials, setCredentials] = useState('');

  const handleSubmit = async () => {
    if (!nameFr.trim() || !nameEn.trim() || !description.trim()) {
      Alert.alert(t('common.error'), t('proposal.required_fields'));
      return;
    }
    try {
      await submitProposal({
        serviceNameFr: nameFr.trim(),
        serviceNameEn: nameEn.trim(),
        serviceNameAr: nameAr.trim() || undefined,
        description: description.trim(),
        targetAudience: targetAudience.trim() || undefined,
        pricingHint: pricingHint.trim() || undefined,
        credentials: credentials.trim() || undefined,
      }).unwrap();

      Alert.alert(t('proposal.success_title'), t('proposal.success_body'), [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert(t('common.error'), t('common.retry'));
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text variant="headlineSmall" style={styles.title}>{t('proposal.title')}</Text>
          <Text variant="bodyMedium" style={styles.subtitle}>{t('proposal.subtitle')}</Text>
        </View>

        {/* Fields */}
        <View style={styles.section}>
          <TextInput
            label={t('proposal.name_fr')}
            value={nameFr}
            onChangeText={setNameFr}
            mode="outlined"
            style={styles.input}
            placeholder="Ex: Jardinage"
          />
          <TextInput
            label={t('proposal.name_en')}
            value={nameEn}
            onChangeText={setNameEn}
            mode="outlined"
            style={styles.input}
            placeholder="Ex: Gardening"
          />
          <TextInput
            label={t('proposal.name_ar')}
            value={nameAr}
            onChangeText={setNameAr}
            mode="outlined"
            style={styles.input}
            placeholder="مثال: البستنة"
          />
          <TextInput
            label={t('proposal.description')}
            value={description}
            onChangeText={setDescription}
            mode="outlined"
            multiline
            numberOfLines={4}
            style={styles.input}
            placeholder={t('proposal.description_hint')}
          />
          <TextInput
            label={t('proposal.target_audience')}
            value={targetAudience}
            onChangeText={setTargetAudience}
            mode="outlined"
            style={styles.input}
            placeholder={t('proposal.target_audience_hint')}
          />
          <TextInput
            label={t('proposal.pricing_hint')}
            value={pricingHint}
            onChangeText={setPricingHint}
            mode="outlined"
            style={styles.input}
            placeholder={t('proposal.pricing_hint_placeholder')}
          />
          <TextInput
            label={t('proposal.credentials')}
            value={credentials}
            onChangeText={setCredentials}
            mode="outlined"
            multiline
            numberOfLines={3}
            style={styles.input}
            placeholder={t('proposal.credentials_hint')}
          />
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          <Text style={styles.submitBtnText}>
            {isLoading ? t('proposal.submitting') : t('proposal.submit')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  header: { marginBottom: spacing.lg },
  title: { color: colors.dark, fontWeight: '800', marginBottom: spacing.xs },
  subtitle: { color: colors.gray },
  section: { gap: spacing.sm },
  input: { backgroundColor: colors.white },
  submitBtn: {
    marginTop: spacing.xl,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: colors.white, fontWeight: '700', fontSize: 16 },
});
