import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { CURRENCY_CONFIG, CURRENCY_PRESETS, setCurrencyConfig } from '../config/currency';

/**
 * Hook réactif pour le formatage des montants.
 * Se re-rend automatiquement quand la devise change dans le store Redux
 * (changement de pays ou chargement des platform settings).
 */
export const useCurrencyFormatter = () => {
  const activeCurrencyCode = useSelector((s: RootState) => s.location.activeCurrencyCode);

  // Synchroniser CURRENCY_CONFIG si le store contient un code différent
  if (activeCurrencyCode && activeCurrencyCode !== CURRENCY_CONFIG.code) {
    setCurrencyConfig(activeCurrencyCode);
  }

  const config = activeCurrencyCode
    ? (CURRENCY_PRESETS[activeCurrencyCode as keyof typeof CURRENCY_PRESETS] ?? CURRENCY_CONFIG)
    : CURRENCY_CONFIG;

  const format = (amount: number): string => {
    const rounded = amount.toFixed(config.decimals);
    const [integerPart, decimalPart] = rounded.split('.');
    const formattedInteger = integerPart.replace(
      /\B(?=(\d{3})+(?!\d))/g,
      config.thousandsSeparator
    );
    const formattedAmount = decimalPart
      ? `${formattedInteger}${config.decimalSeparator}${decimalPart}`
      : formattedInteger;
    return config.position === 'before'
      ? `${config.symbol}${formattedAmount}`
      : `${formattedAmount} ${config.symbol}`;
  };

  /**
   * Formate un montant historique avec la devise stockée (ex: booking.currency).
   * Utilise la devise fournie en paramètre, pas le pays actif.
   * Pour les cas où la devise du store diffère (utilisateur qui a changé de pays).
   */
  const formatWithCurrency = (amount: number, currencyCode: string): string => {
    const preset = CURRENCY_PRESETS[currencyCode as keyof typeof CURRENCY_PRESETS];
    if (!preset) return `${amount} ${currencyCode}`;
    const rounded = amount.toFixed(preset.decimals);
    const [integerPart, decimalPart] = rounded.split('.');
    const formattedInteger = integerPart.replace(
      /\B(?=(\d{3})+(?!\d))/g,
      preset.thousandsSeparator
    );
    const formattedAmount = decimalPart
      ? `${formattedInteger}${preset.decimalSeparator}${decimalPart}`
      : formattedInteger;
    return preset.position === 'before'
      ? `${preset.symbol}${formattedAmount}`
      : `${formattedAmount} ${preset.symbol}`;
  };

  return { format, formatWithCurrency, currencyCode: config.code, currencySymbol: config.symbol };
};
