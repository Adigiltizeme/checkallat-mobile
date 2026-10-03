/**
 * Gains d'une course ou d'une prestation, calculés par le serveur
 * (backend_checkallat/src/common/earnings.ts) — jamais recalculés dans l'app.
 */
export interface Earnings {
  /** Montant payé par le client */
  gross: number;
  /** Taux de commission de la plateforme (%) */
  commissionRate: number;
  commission: number;
  /** Ce qui revient au chauffeur, livreur ou prestataire */
  net: number;
  /** false : estimation au taux actuel, le paiement n'est pas encore confirmé */
  settled: boolean;
  paymentMethod: 'cash' | 'in_app';
  currency: string;
}
