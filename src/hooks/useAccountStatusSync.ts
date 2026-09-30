import { useEffect, useRef } from 'react';
import { Alert, AppState } from 'react-native';
import { isExpoGo } from '../utils/environment';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { useGetProfileQuery } from '../store/api/authApi';
import { refreshProfile } from '../store/slices/authSlice';
import { RootState } from '../store';

/** Candidature en cours d'examen : vérification fréquente */
const PENDING_POLL_MS = 15_000;
/** Compte validé : les changements (suspension, réactivation…) restent rares */
const IDLE_POLL_MS = 60_000;

type Activity = 'driver' | 'pro' | 'seller';

const statusesOf = (user: any): Record<Activity, string | undefined> => ({
  driver: user?.driver?.status,
  pro: user?.pro?.status,
  seller: user?.marketplaceSeller?.status,
});

/** Pushs envoyés par le web-admin quand le statut d'une activité change */
const ACCOUNT_PUSH_TYPES = new Set(['account_status', 'driver_validation', 'pro_validation', 'seller_validation']);

/**
 * Synchronise en temps réel le statut du compte (chauffeur, prestataire, vendeur) avec le web-admin :
 * candidature acceptée ou refusée, suspension, réactivation. Sans relancer l'application.
 * - interrogation régulière du profil (plus rapide tant qu'une candidature est en attente) ;
 * - rafraîchissement au retour au premier plan et dès réception d'un push de changement de statut.
 */
export const useAccountStatusSync = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);

  const current = statusesOf(user);
  const anyPending = Object.values(current).some((s) => s === 'pending');

  const { data, refetch } = useGetProfileQuery(undefined, {
    skip: !isAuthenticated,
    pollingInterval: anyPending ? PENDING_POLL_MS : IDLE_POLL_MS,
    refetchOnMountOrArgChange: true,
  });

  // Retour au premier plan
  useEffect(() => {
    if (!isAuthenticated) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refetch();
    });
    return () => sub.remove();
  }, [isAuthenticated, refetch]);

  // Push de changement de statut reçu pendant que l'app est ouverte
  useEffect(() => {
    // expo-notifications n'est chargé que hors Expo Go (le module plante au chargement dans Expo Go, SDK 53+)
    if (!isAuthenticated || isExpoGo) return;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Notifications = require('expo-notifications') as typeof import('expo-notifications');
    const sub = Notifications.addNotificationReceivedListener((notification) => {
      const type = (notification.request.content.data as any)?.type;
      if (type && ACCOUNT_PUSH_TYPES.has(type)) refetch();
    });
    return () => sub.remove();
  }, [isAuthenticated, refetch]);

  const lastSeen = useRef<Record<Activity, string | undefined> | null>(null);

  useEffect(() => {
    if (!data) return;
    const next = statusesOf(data);
    const previous = lastSeen.current ?? current;
    lastSeen.current = next;

    const changed = (Object.keys(next) as Activity[]).filter((k) => next[k] !== previous[k]);
    if (changed.length === 0) return;

    // Mise à jour du profil uniquement en cas de changement (rôles disponibles, écrans)
    dispatch(refreshProfile(data));

    for (const activity of changed) {
      const before = previous[activity];
      const after = next[activity];
      if (!before) continue; // nouvelle candidature déposée depuis cet appareil
      if (after === 'active' && before !== 'suspended') {
        Alert.alert(t('account_status.approved_title'), t(`account_status.approved_${activity}`));
      } else if (after === 'active' && before === 'suspended') {
        Alert.alert(t('account_status.reactivated_title'), t(`account_status.reactivated_${activity}`));
      } else if (after === 'rejected') {
        Alert.alert(t('account_status.rejected_title'), t(`account_status.rejected_${activity}`));
      } else if (after === 'suspended') {
        Alert.alert(t('account_status.suspended_title'), t(`account_status.suspended_${activity}`));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, dispatch, t]);
};
