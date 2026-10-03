import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../theme/colors';
import { useGetUnreadNotificationsCountQuery } from '../../store/api/notificationsApi';
import { useRefetchOnFocus } from '../../hooks/useRefetchOnFocus';

/**
 * Cloche des notifications in-app, avec le nombre de non lues — dans l'en-tête de l'accueil
 * de chaque espace (chauffeur / livreur, prestataire, vendeur) ; le client l'a dans son accueil.
 */
export const NotificationBell: React.FC<{ color?: string }> = ({ color = colors.white }) => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const { data, refetch } = useGetUnreadNotificationsCountQuery(undefined, {
    pollingInterval: 30_000,
    refetchOnMountOrArgChange: true,
  });
  useRefetchOnFocus(refetch);
  const count = data?.count ?? 0;

  return (
    <TouchableOpacity
      style={styles.btn}
      onPress={() => navigation.navigate('Notifications')}
      accessibilityRole="button"
      accessibilityLabel={t('notifications.title')}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Icon name={count > 0 ? 'bell-ring-outline' : 'bell-outline'} size={24} color={color} />
      {count > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count > 9 ? '9+' : count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  btn: { marginRight: 12, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute', top: 2, right: 2, minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: colors.error, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
  },
  badgeText: { color: colors.white, fontSize: 10, fontWeight: '700' },
});
