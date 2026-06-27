import { SurfaceTokens } from '../theme/ThemeProvider';

/**
 * Options de navigation communes à tous les Stack.Navigator de l'app.
 * Centralise la couleur du header et du texte/icônes pour qu'ils suivent le thème actif.
 */
export function defaultStackScreenOptions(tokens: SurfaceTokens) {
  return {
    headerTintColor: tokens.headerTint,
    headerTitleStyle: { fontWeight: '600' as const },
  };
}

/** Variante pour les stacks Pro — utilise les tokens du thème actif comme les autres stacks. */
export function proStackScreenOptions(tokens: SurfaceTokens) {
  return {
    headerTintColor: tokens.headerTint,
    headerTitleStyle: { fontWeight: '600' as const },
  };
}
