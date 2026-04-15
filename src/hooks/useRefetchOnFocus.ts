import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';

/**
 * Déclenche un refetch RTK Query à chaque fois que l'écran redevient actif
 * (navigation retour, retour depuis un autre onglet, etc.)
 */
export function useRefetchOnFocus(refetch: () => void) {
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );
}
