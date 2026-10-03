import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import { isCourierVehicle, vehicleEmoji, vehicleIcon } from '../utils/driverIdentity';

/**
 * Identité affichée de l'utilisateur dans son espace chauffeur : un livreur CheckAllPack (moto, vélo)
 * voit « Espace Livreur », son véhicule et des libellés de livraison, jamais ceux du transport.
 */
export const useDriverIdentity = () => {
  const vehicleType = useSelector((s: RootState) => (s.auth.user as any)?.driver?.vehicleType as string | undefined);
  const isCourier = isCourierVehicle(vehicleType);
  return {
    vehicleType,
    isCourier,
    icon: vehicleIcon(vehicleType),
    emoji: vehicleEmoji(vehicleType),
    /** Clé i18n du rôle : role_selector.role_<roleKey>, desc_<roleKey>… */
    roleKey: isCourier ? 'courier' : 'driver',
  };
};
