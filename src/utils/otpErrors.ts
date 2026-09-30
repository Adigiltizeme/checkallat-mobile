/**
 * Clé i18n du message à afficher après l'échec d'un code (SMS ou e-mail),
 * d'après le code d'erreur renvoyé par le serveur.
 */
export function otpErrorKey(err: unknown): string {
  const code = (err as any)?.data?.code;
  if (code === 'OTP_EXPIRED') return 'auth.reset_code_expired';
  if (code === 'OTP_TOO_MANY_ATTEMPTS') return 'auth.reset_code_locked';
  if ((err as any)?.status === 429) return 'email_verification.too_many_requests';
  return 'auth.reset_code_invalid';
}
