import { useGetPublicSettingsQuery, CancellationPolicy } from '../store/api/settingsApi';

// Valeurs de secours tant que les paramètres ne sont pas chargés (mêmes défauts que le backend)
const FALLBACK: CancellationPolicy = {
  feeEnabled: true,
  feeRatePct: 20,
  transport: { freeCancelHoursBeforeSlot: 2, headingFreeCancelMin: 5, autoConfirmCompletionHours: 48 },
  booking: { freeCancelHoursBeforeSlot: 2, enRouteFreeCancelMin: 5, autoCompleteHours: 48 },
};

/** Règles d'annulation réglées dans le web-admin (textes affichés toujours cohérents avec la plateforme) */
export const useCancellationPolicy = (): CancellationPolicy => {
  const { data } = useGetPublicSettingsQuery();
  const p = data?.cancellationPolicy;
  return {
    feeEnabled: p?.feeEnabled ?? FALLBACK.feeEnabled,
    feeRatePct: p?.feeRatePct ?? FALLBACK.feeRatePct,
    transport: { ...FALLBACK.transport, ...(p?.transport ?? {}) },
    booking: { ...FALLBACK.booking, ...(p?.booking ?? {}) },
  };
};
