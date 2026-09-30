import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { useGetPublicSettingsQuery } from '../store/api/settingsApi';

/**
 * État de l'adresse e-mail du compte et exigence pour candidater
 * (réglée par pays dans le web-admin : Zones de service → « E-mail vérifié requis »).
 * Même règle que le serveur : pays actif, sinon pays d'origine.
 */
export function useEmailVerification() {
  const user = useSelector((state: RootState) => state.auth.user);
  const { data: settings } = useGetPublicSettingsQuery(undefined);
  const country = String(user?.activeCountryId || user?.homeCountryId || '').toUpperCase();
  const requiredForApplication =
    !!country &&
    (settings?.serviceZones ?? []).some(
      (z) => String(z.countryCode ?? '').toUpperCase() === country && z.requireVerifiedEmail === true,
    );

  return {
    email: (user?.email as string | null | undefined) ?? null,
    emailVerified: !!user?.emailVerified,
    requiredForApplication,
    /** Candidature bloquée tant que l'e-mail n'est pas vérifié */
    blocksApplication: requiredForApplication && !user?.emailVerified,
  };
}
