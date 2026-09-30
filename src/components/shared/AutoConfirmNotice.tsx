import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

interface Props {
  /** Titre (ex. « Le prestataire a déclaré la fin ») */
  title: string;
  /** Date de la déclaration de fin (point de départ du délai) */
  declaredAt?: string | Date;
  /** Délai avant confirmation automatique (heures, réglé dans le web-admin) */
  hours?: number;
  /** Échéance déjà calculée par le serveur (prioritaire sur declaredAt + hours) */
  deadline?: string | Date;
  /** Texte expliquant la conséquence, avec {{deadline}} déjà interpolé par l'appelant */
  message: (deadline: string) => string;
  /** Ouvre le signalement d'un problème (litige) */
  onReport: () => void;
}

/**
 * Bandeau bien visible : l'autre partie a déclaré la fin, le client doit confirmer ou signaler
 * un problème avant l'échéance, faute de quoi la confirmation est automatique.
 * Commun aux transports et aux services.
 */
export const AutoConfirmNotice: React.FC<Props> = ({ title, declaredAt, hours, deadline: fixedDeadline, message, onReport }) => {
  const { t, i18n } = useTranslation();
  const deadline = fixedDeadline
    ? new Date(fixedDeadline)
    : new Date(new Date(declaredAt ?? Date.now()).getTime() + (hours ?? 0) * 60 * 60 * 1000);
  const deadlineLabel = deadline.toLocaleString(i18n.language, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Icon name="bell-ring" size={22} color={colors.warning} />
        <Text style={styles.title}>{title}</Text>
      </View>
      <Text style={styles.message}>{message(deadlineLabel)}</Text>
      <TouchableOpacity style={styles.reportBtn} onPress={onReport} activeOpacity={0.8}>
        <Icon name="flag" size={16} color={colors.error} />
        <Text style={styles.reportText}>{t('completion.report_problem')}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FEF3C7',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#F59E0B',
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { flex: 1, fontSize: 15, fontWeight: '700', color: '#92400E' },
  message: { fontSize: 13, lineHeight: 19, color: '#78350F' },
  reportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.error,
    backgroundColor: colors.white,
  },
  reportText: { fontSize: 13, fontWeight: '700', color: colors.error },
});
