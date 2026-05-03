import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';

/**
 * Déclenche un refetch RTK Query à chaque fois que l'écran redevient actif.
 *
 * @param refetch  La fonction refetch retournée par un hook RTK Query.
 * @param delay    Délai en ms avant d'exécuter le refetch (défaut : 0).
 *                 Utile pour laisser la transition de navigation se terminer
 *                 avant de provoquer des re-renders (ex : 400 ms).
 */
export function useRefetchOnFocus(refetch: () => void, delay = 0) {
  useFocusEffect(
    useCallback(() => {
      if (delay === 0) {
        refetch();
        return;
      }
      const timer = setTimeout(refetch, delay);
      return () => clearTimeout(timer);
    }, [refetch, delay])
  );
}
