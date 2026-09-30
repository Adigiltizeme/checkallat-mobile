import { useCallback, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { setActiveRole } from '../store/slices/authSlice';
import { navigationRef } from '../navigation/navigationRef';
import { isExpoGo } from '../utils/environment';

type Role = 'client' | 'driver' | 'pro' | 'seller';

interface Target {
  role: Role;
  tab: string;
  screen?: string;
  params?: Record<string, string>;
}

/**
 * Écran à ouvrir pour une notification, d'après les données envoyées par le serveur
 * (screen, type et identifiants). null : la notification n'a pas de destination.
 */
export function resolveNotificationTarget(data: Record<string, any>, activeRole: Role | null): Target | null {
  const { screen, type, bookingId, requestId, orderId } = data ?? {};

  // Destinations explicites
  switch (screen) {
    case 'BookingDetails':
      return bookingId ? { role: 'client', tab: 'Commandes', screen: 'BookingDetails', params: { bookingId } } : null;
    case 'ProBookingDetails':
      return bookingId ? { role: 'pro', tab: 'ProAgenda', screen: 'ProBookingDetails', params: { bookingId } } : null;
    case 'ProHome':
      return bookingId
        ? { role: 'pro', tab: 'ProDemandes', screen: 'ProBookingDetails', params: { bookingId } }
        : { role: 'pro', tab: 'Pro' };
    case 'MarketplaceOrderDetails':
      return orderId ? { role: 'client', tab: 'Commandes', screen: 'MarketplaceOrderDetails', params: { orderId } } : null;
    case 'SellerOrderDetails':
      return orderId ? { role: 'seller', tab: 'SellerOrders', screen: 'SellerOrderDetails', params: { orderId } } : null;
    case 'SellerDashboard':
      return { role: 'seller', tab: 'SellerHome' };
  }

  // Transports : chauffeur (nouvelle demande, attribution) ou client (fin de course, rappels…)
  if (requestId) {
    const forDriver = type === 'new_transport_request' || type === 'assignment' || (activeRole === 'driver' && type === 'transport_auto_confirmed');
    return forDriver
      ? { role: 'driver', tab: 'DriverAvailables', screen: 'DriverTransportDetails', params: { requestId } }
      : { role: 'client', tab: 'Commandes', screen: 'TransportDetails', params: { requestId } };
  }

  // Statut du compte (candidature, suspension) : espace Profil
  if (['account_status', 'driver_validation', 'pro_validation', 'seller_validation'].includes(type)) {
    return { role: activeRole ?? 'client', tab: 'Profile' };
  }
  if (type === 'speed_anomaly') return { role: 'driver', tab: 'Profile' };
  return null;
}

/**
 * Ouvre l'écran d'une notification. Bascule d'abord dans le bon espace (client, chauffeur, prestataire,
 * vendeur) si l'utilisateur y a accès. Utilisé par les notifications push et par la cloche.
 */
export const useOpenNotification = () => {
  const dispatch = useDispatch();
  const activeRole = useSelector((state: RootState) => state.auth.activeRole) as Role | null;
  const availableRoles = useSelector((state: RootState) => state.auth.availableRoles) as Role[];
  const stateRef = useRef({ activeRole, availableRoles });
  stateRef.current = { activeRole, availableRoles };

  const open = useCallback(
    (data: Record<string, any>, attempt = 0) => {
      const { activeRole: current, availableRoles: roles } = stateRef.current;
      const target = resolveNotificationTarget(data, current);
      if (!target) return;
      // Espace inaccessible (activité non validée) : on ne navigue pas
      if (target.role !== 'client' && !roles.includes(target.role)) return;

      if (current !== target.role) {
        dispatch(setActiveRole({ role: target.role }));
        // Laisser les onglets du nouvel espace se monter avant de naviguer
        setTimeout(() => open(data, attempt + 1), 400);
        return;
      }
      if (!navigationRef.isReady()) {
        if (attempt < 20) setTimeout(() => open(data, attempt + 1), 250);
        return;
      }
      navigationRef.navigate(target.tab, target.screen ? { screen: target.screen, params: target.params } : undefined);
    },
    [dispatch],
  );

  return open;
};

/**
 * Ouvre l'écran concerné quand l'utilisateur touche une notification push (app ouverte, en arrière-plan
 * ou lancée par la notification).
 */
export const useNotificationRouting = () => {
  const open = useOpenNotification();
  const handledIds = useRef(new Set<string>());

  useEffect(() => {
    // expo-notifications n'est pas disponible dans Expo Go (SDK 53+)
    if (isExpoGo) return;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Notifications = require('expo-notifications') as typeof import('expo-notifications');

    const handle = (response: any) => {
      const id = response?.notification?.request?.identifier;
      if (id) {
        if (handledIds.current.has(id)) return;
        handledIds.current.add(id);
      }
      open((response?.notification?.request?.content?.data ?? {}) as Record<string, any>);
    };

    // App lancée en touchant une notification
    Notifications.getLastNotificationResponseAsync().then((r) => r && handle(r)).catch(() => {});
    // App ouverte ou en arrière-plan
    const sub = Notifications.addNotificationResponseReceivedListener(handle);
    return () => sub.remove();
  }, [open]);
};
