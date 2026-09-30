import { useCallback, useEffect, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';

/**
 * Déclenche un refetch RTK Query à chaque fois que l'écran redevient actif.
 *
 * @param refetch  La fonction refetch retournée par un hook RTK Query (une fonction en ligne est acceptée :
 *                 elle est lue via une référence, le refetch ne se déclenche donc qu'au retour sur l'écran,
 *                 pas à chaque rendu).
 * @param delay    Délai en ms avant d'exécuter le refetch (défaut : 0).
 *                 Utile pour laisser la transition de navigation se terminer
 *                 avant de provoquer des re-renders (ex : 400 ms).
 */
export function useRefetchOnFocus(refetch: () => void, delay = 0) {
  const refetchRef = useRef(refetch);
  useEffect(() => {
    refetchRef.current = refetch;
  }, [refetch]);

  useFocusEffect(
    useCallback(() => {
      const safeRefetch = () => {
        try {
          refetchRef.current();
        } catch {
          // Query not started yet (skip: true or uninitialized) — no-op, polling handles it
        }
      };
      if (delay === 0) {
        safeRefetch();
        return;
      }
      const timer = setTimeout(safeRefetch, delay);
      return () => clearTimeout(timer);
    }, [delay])
  );
}
