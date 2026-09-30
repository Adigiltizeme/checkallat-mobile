import type { TFunction } from 'i18next';

/**
 * Règles du mot de passe (inscription, réinitialisation, changement) — le backend applique les mêmes.
 * Retourne la liste des règles non respectées, déjà traduites (vide si le mot de passe est valide).
 */
export function passwordRuleErrors(password: string, t: TFunction): string[] {
  return [
    password.length < 8 && t('auth.password_min_length'),
    !/[A-Z]/.test(password) && t('auth.password_uppercase'),
    !/[a-z]/.test(password) && t('auth.password_lowercase'),
    !/[0-9]/.test(password) && t('auth.password_number'),
    !/[@$!%*?&#]/.test(password) && t('auth.password_special'),
  ].filter(Boolean) as string[];
}

/** Codes d'erreur backend sur les codes SMS → clé i18n */
const OTP_ERROR_KEYS: Record<string, string> = {
  OTP_INVALID: 'auth.reset_code_invalid',
  OTP_EXPIRED: 'auth.reset_code_expired',
  OTP_TOO_MANY_ATTEMPTS: 'auth.reset_code_locked',
};

/** Message à afficher pour une erreur de code SMS (ou `fallbackKey` si l'erreur est d'une autre nature) */
export function otpErrorMessage(err: any, t: TFunction, fallbackKey: string): string {
  const key = OTP_ERROR_KEYS[err?.data?.code];
  return t(key ?? fallbackKey);
}

/** Le code SMS doit être redemandé (expiré ou bloqué après trop d'essais) */
export function otpMustBeRenewed(err: any): boolean {
  const code = err?.data?.code;
  return code === 'OTP_EXPIRED' || code === 'OTP_TOO_MANY_ATTEMPTS';
}
