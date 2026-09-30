import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { useGetCategoriesQuery } from '../store/api/servicesApi';
import { useRefetchOnFocus } from './useRefetchOnFocus';

export interface ServiceCategoryItem {
  id: string;
  slug: string;
  nameFr: string;
  nameEn: string;
  nameAr: string;
  icon: string;
  color: string | null;
  sortOrder: number;
  imageUrl: string | null;
  imageBanner: string | null;
  createdAt: string;
  availableInCountry: boolean | null;
  basePrice: number | null;
  currency: string | null;
}

/** Pays de l'utilisateur : pays actif du compte, sinon pays détecté par GPS */
export const useUserCountryCode = (): string | undefined => {
  const user = useSelector((state: RootState) => state.auth.user);
  const detected = useSelector((state: RootState) => state.location.detectedCountryCode);
  const code = (user?.activeCountryId ?? detected ?? '').toUpperCase();
  return code || undefined;
};

/**
 * Catégories de services telles que réglées dans le web-admin : actives, dans l'ordre choisi,
 * avec leur nom, icône et couleur. Par défaut, seulement celles proposées dans le pays de l'utilisateur
 * (tarif actif pour ce pays dans « Tarification des services »). Mises à jour sans relancer l'app.
 */
export const useServiceCategories = (options: { availableOnly?: boolean; countryCode?: string } = {}) => {
  const { availableOnly = true } = options;
  const userCountry = useUserCountryCode();
  const countryCode = options.countryCode ?? userCountry;

  const query = useGetCategoriesQuery(
    { activeOnly: true, countryCode, availableOnly: availableOnly && !!countryCode },
    { pollingInterval: 60_000, refetchOnMountOrArgChange: true },
  );
  useRefetchOnFocus(query.refetch);

  const categories = useMemo(() => (query.data ?? []) as ServiceCategoryItem[], [query.data]);
  return { ...query, categories, countryCode };
};
