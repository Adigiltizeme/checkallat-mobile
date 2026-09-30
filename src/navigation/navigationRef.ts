import { createNavigationContainerRef } from '@react-navigation/native';

/** Référence globale du navigateur : navigation hors composants (ouverture d'une notification) */
export const navigationRef = createNavigationContainerRef<any>();
