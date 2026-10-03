import React, { useMemo } from 'react';
import { Linking, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { useAppTheme } from '../../theme/ThemeProvider';
import { useGetCallRelayNumberQuery, useGetUnreadCountQuery } from '../../store/api/communicationApi';

interface Props {
  entityType: 'booking' | 'transport' | 'order';
  entityId: string;
  otherPartyName: string;
  callLabel: string;
  messageLabel: string;
}

/**
 * Appel masqué (numéro relais, jamais le vrai numéro) et messagerie avec l'autre partie,
 * avec le nombre de messages non lus — commun aux clients, chauffeurs, livreurs et prestataires.
 */
export const ContactPartyButtons: React.FC<Props> = ({ entityType, entityId, otherPartyName, callLabel, messageLabel }) => {
  const { tokens } = useAppTheme();
  const navigation = useNavigation<any>();
  const { data: callRelay } = useGetCallRelayNumberQuery({ entityType, entityId });
  const { data: unread } = useGetUnreadCountQuery(
    { entityType, entityId },
    { pollingInterval: 8000, refetchOnMountOrArgChange: true },
  );
  const unreadCount: number = (unread as any)?.unreadCount ?? 0;

  const styles = useMemo(() => StyleSheet.create({
    row: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
    btn: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 6, borderRadius: 10, paddingVertical: 10, backgroundColor: tokens.primary,
    },
    btnMessage: { backgroundColor: tokens.card, borderWidth: 1.5, borderColor: tokens.primary },
    text: { fontSize: 13, fontWeight: '700', color: colors.white },
    textMessage: { color: tokens.primary },
    badge: {
      position: 'absolute', top: -6, right: -6, backgroundColor: colors.error, borderRadius: 10,
      minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3,
    },
    badgeText: { color: colors.white, fontSize: 10, fontWeight: 'bold' },
  }), [tokens]);

  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={[styles.btn, !callRelay?.relayNumber && { opacity: 0.5 }]}
        disabled={!callRelay?.relayNumber}
        onPress={() => callRelay?.relayNumber && Linking.openURL(`tel:${callRelay.relayNumber}`)}
        accessibilityRole="button"
      >
        <Icon name="phone" size={16} color={colors.white} />
        <Text style={styles.text}>{callLabel}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.btn, styles.btnMessage]}
        onPress={() => navigation.navigate('BookingChat', { entityType, entityId, otherPartyName })}
        accessibilityRole="button"
      >
        <Icon name="message-text" size={16} color={tokens.primary} />
        <Text style={[styles.text, styles.textMessage]}>{messageLabel}</Text>
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};
