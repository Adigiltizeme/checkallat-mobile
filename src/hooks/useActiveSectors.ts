import { useCallback, useMemo } from 'react';
import { useGetPublicSettingsQuery } from '../store/api/settingsApi';
import { useUserCountryCode } from './useServiceCategories';

/**
 * Secteurs activés dans le web-admin et proposés dans le pays de l'utilisateur
 * (liste de pays vide côté admin = tous les pays). Même règle que les cartes de l'accueil.
 */
export const useActiveSectors = () => {
  const country = useUserCountryCode();
  const { data: publicSettings, isLoading } = useGetPublicSettingsQuery(undefined, {
    pollingInterval: 60_000,
    refetchOnMountOrArgChange: true,
  });

  const sectors = useMemo(
    () =>
      (publicSettings?.sectors ?? [])
        .filter((s) => s.enabled)
        .filter((s) => !s.countries?.length || !country || s.countries.includes(country))
        .sort((a, b) => a.order - b.order),
    [publicSettings?.sectors, country],
  );

  /** Tant que les réglages ne sont pas chargés, rien n'est masqué */
  const isSectorVisible = useCallback(
    (slug: string) => !publicSettings || sectors.some((s) => s.slug === slug),
    [publicSettings, sectors],
  );

  return { sectors, isSectorVisible, isLoading };
};
