/**
 * Configuration de la devise de l'application
 * Sera mise à jour dynamiquement depuis le backend
 */

export let CURRENCY_CONFIG = {
  // Code ISO de la devise (EUR, USD, XOF, etc.)
  code: 'EUR',

  // Symbole à afficher
  symbol: '€',

  // Position du symbole ('before' ou 'after')
  position: 'after' as 'before' | 'after',

  // Séparateur décimal
  decimalSeparator: ',',

  // Séparateur de milliers
  thousandsSeparator: ' ',

  // Nombre de décimales
  decimals: 2,
};

/**
 * Retourne le code devise d'une entité existante (booking, transport, payment, bid…)
 * en priorité sur le code global — pour que les montants historiques ne changent
 * pas quand le pays actif change.
 */
export const entityCurrencyCode = (entity: any, field = 'currency'): string =>
  (entity?.[field] ?? CURRENCY_CONFIG.code).toUpperCase();

/**
 * Met à jour la configuration de devise depuis le backend
 */
export const setCurrencyConfig = (currencyCode: string) => {
  const preset = CURRENCY_PRESETS[currencyCode as keyof typeof CURRENCY_PRESETS];
  if (preset) {
    CURRENCY_CONFIG = preset;
    console.log('[CURRENCY] Configuration mise à jour:', currencyCode, CURRENCY_CONFIG.symbol);
  } else {
    console.warn('[CURRENCY] Code de devise inconnu:', currencyCode);
  }
};

/**
 * Formate un montant selon la configuration de devise
 */
export const formatCurrency = (amount: number): string => {
  // Arrondir au nombre de décimales configuré
  const rounded = amount.toFixed(CURRENCY_CONFIG.decimals);

  // Séparer la partie entière et décimale
  const [integerPart, decimalPart] = rounded.split('.');

  // Ajouter les séparateurs de milliers
  const formattedInteger = integerPart.replace(
    /\B(?=(\d{3})+(?!\d))/g,
    CURRENCY_CONFIG.thousandsSeparator
  );

  // Reconstituer le nombre
  const formattedAmount = decimalPart
    ? `${formattedInteger}${CURRENCY_CONFIG.decimalSeparator}${decimalPart}`
    : formattedInteger;

  // Ajouter le symbole
  return CURRENCY_CONFIG.position === 'before'
    ? `${CURRENCY_CONFIG.symbol}${formattedAmount}`
    : `${formattedAmount} ${CURRENCY_CONFIG.symbol}`;
};

// Exemples de configurations pour différentes devises

export const CURRENCY_PRESETS = {
  EUR: {
    code: 'EUR',
    symbol: '€',
    position: 'after' as const,
    decimalSeparator: ',',
    thousandsSeparator: ' ',
    decimals: 2,
  },
  USD: {
    code: 'USD',
    symbol: '$',
    position: 'before' as const,
    decimalSeparator: '.',
    thousandsSeparator: ',',
    decimals: 2,
  },
  XOF: {
    code: 'XOF',
    symbol: 'FCFA',
    position: 'after' as const,
    decimalSeparator: ',',
    thousandsSeparator: ' ',
    decimals: 0, // Le franc CFA n'a pas de centimes
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    position: 'before' as const,
    decimalSeparator: '.',
    thousandsSeparator: ',',
    decimals: 2,
  },
  EGP: {
    code: 'EGP',
    symbol: 'EGP',
    position: 'after' as const,
    decimalSeparator: ',',
    thousandsSeparator: ' ',
    decimals: 2,
  },
  MAD: {
    code: 'MAD',
    symbol: 'DH',
    position: 'after' as const,
    decimalSeparator: ',',
    thousandsSeparator: ' ',
    decimals: 2,
  },
  TND: {
    code: 'TND',
    symbol: 'DT',
    position: 'after' as const,
    decimalSeparator: ',',
    thousandsSeparator: ' ',
    decimals: 3,
  },
  DZD: {
    code: 'DZD',
    symbol: 'د.ج',
    position: 'after' as const,
    decimalSeparator: ',',
    thousandsSeparator: ' ',
    decimals: 2,
  },
  SAR: {
    code: 'SAR',
    symbol: 'ر.س',
    position: 'after' as const,
    decimalSeparator: '.',
    thousandsSeparator: ',',
    decimals: 2,
  },
  AED: {
    code: 'AED',
    symbol: 'د.إ',
    position: 'after' as const,
    decimalSeparator: '.',
    thousandsSeparator: ',',
    decimals: 2,
  },
  XAF: {
    code: 'XAF',
    symbol: 'FCFA',
    position: 'after' as const,
    decimalSeparator: ',',
    thousandsSeparator: ' ',
    decimals: 0,
  },
};
