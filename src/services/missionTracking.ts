import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../config/api';
import { secureStorage } from '../utils/secureStorage';
import { store } from '../store';
import { isExpoGo } from '../utils/environment';

/**
 * Suivi de position pendant une mission (course de chauffeur/livreur ou intervention de prestataire).
 * Continue en arrière-plan — par exemple quand l'app de navigation (Google Maps) est ouverte —
 * afin que le client suive l'arrivée en temps réel. Arrêté dès que la mission se termine.
 *
 * La tâche doit être définie au chargement du module : ce fichier est importé dans App.tsx.
 */

export const MISSION_LOCATION_TASK = 'checkallat-mission-location';
const CONTEXT_KEY = 'mission_tracking_context';
/** Sécurité : une mission oubliée ne suit jamais la position plus de 12 h */
const MAX_TRACKING_MS = 12 * 60 * 60 * 1000;

export type MissionKind = 'transport' | 'booking';

interface MissionContext {
  kind: MissionKind;
  id: string;
  startedAt: number;
}

const endpointFor = (ctx: MissionContext) =>
  ctx.kind === 'transport'
    ? `${API_CONFIG.BASE_URL}/transport/${ctx.id}/driver-location`
    : `${API_CONFIG.BASE_URL}/bookings/${ctx.id}/location`;

async function readContext(): Promise<MissionContext | null> {
  try {
    const raw = await AsyncStorage.getItem(CONTEXT_KEY);
    return raw ? (JSON.parse(raw) as MissionContext) : null;
  } catch {
    return null;
  }
}

async function authToken(): Promise<string | null> {
  // Jeton en mémoire (app en arrière-plan) ; sinon stockage sécurisé (app relancée par le système)
  const inMemory = (store.getState() as any)?.auth?.token as string | undefined;
  if (inMemory) return inMemory;
  try {
    return await secureStorage.getToken();
  } catch {
    return null; // trousseau verrouillé : on réessaiera à la prochaine position
  }
}

if (!isExpoGo && !TaskManager.isTaskDefined(MISSION_LOCATION_TASK)) {
  TaskManager.defineTask(MISSION_LOCATION_TASK, async ({ data, error }) => {
    if (error) return;
    const locations = (data as { locations?: Location.LocationObject[] })?.locations;
    const last = locations?.[locations.length - 1];
    if (!last) return;

    const ctx = await readContext();
    if (!ctx || Date.now() - ctx.startedAt > MAX_TRACKING_MS) {
      await stopMissionTracking();
      return;
    }

    const token = await authToken();
    if (!token) return;
    try {
      const res = await fetch(endpointFor(ctx), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ lat: last.coords.latitude, lng: last.coords.longitude }),
      });
      // Session expirée ou mission inaccessible : inutile de continuer à suivre
      if (res.status === 401 || res.status === 403 || res.status === 404) await stopMissionTracking();
    } catch {
      // Réseau indisponible : la position suivante sera envoyée
    }
  });
}

/**
 * - background : suivi actif même app en arrière-plan
 * - declined : l'utilisateur a refusé l'explication préalable (aucune demande système affichée)
 * - foreground_only : permission « Toujours » refusée ; suivi seulement app ouverte
 */
export type MissionTrackingResult = 'background' | 'declined' | 'foreground_only' | 'unavailable';

/**
 * Démarre le suivi d'une mission. La permission « Toujours » est demandée à ce moment-là
 * (jamais au lancement de l'app). Si elle est refusée, le suivi reste actif tant que l'app est ouverte.
 */
export async function startMissionTracking(
  kind: MissionKind,
  id: string,
  /** Explication affichée avant la demande système (exigée par Google Play) ; true = continuer */
  confirmDisclosure: () => Promise<boolean>,
): Promise<MissionTrackingResult> {
  if (isExpoGo) return 'unavailable';
  const fg = await Location.getForegroundPermissionsAsync();
  if (fg.status !== 'granted') return 'unavailable';

  let bg = await Location.getBackgroundPermissionsAsync();
  if (bg.status !== 'granted' && bg.canAskAgain) {
    if (!(await confirmDisclosure())) return 'declined';
    bg = await Location.requestBackgroundPermissionsAsync();
  }
  if (bg.status !== 'granted') return 'foreground_only';

  const ctx: MissionContext = { kind, id, startedAt: Date.now() };
  await AsyncStorage.setItem(CONTEXT_KEY, JSON.stringify(ctx));

  const lang = (store.getState() as any)?.auth?.user?.preferredLanguage;
  const title = lang === 'en' ? 'Mission in progress' : lang === 'ar' ? 'مهمة جارية' : 'Mission en cours';
  const body =
    lang === 'en'
      ? 'Your position is shared with the client until the end of the mission.'
      : lang === 'ar'
        ? 'تتم مشاركة موقعك مع العميل حتى نهاية المهمة.'
        : 'Votre position est partagée avec le client jusqu’à la fin de la mission.';

  if (await Location.hasStartedLocationUpdatesAsync(MISSION_LOCATION_TASK)) {
    await Location.stopLocationUpdatesAsync(MISSION_LOCATION_TASK);
  }
  await Location.startLocationUpdatesAsync(MISSION_LOCATION_TASK, {
    accuracy: Location.Accuracy.High,
    timeInterval: 10000,
    distanceInterval: 25,
    deferredUpdatesInterval: 10000,
    pausesUpdatesAutomatically: false,
    activityType: Location.ActivityType.AutomotiveNavigation,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: title,
      notificationBody: body,
      notificationColor: '#00B8A9',
      killServiceOnDestroy: true,
    },
  });
  return 'background';
}

/** Arrête le suivi (fin de mission, sortie de l'écran de navigation, déconnexion) */
export async function stopMissionTracking(): Promise<void> {
  await AsyncStorage.removeItem(CONTEXT_KEY).catch(() => {});
  if (isExpoGo) return;
  try {
    if (await Location.hasStartedLocationUpdatesAsync(MISSION_LOCATION_TASK)) {
      await Location.stopLocationUpdatesAsync(MISSION_LOCATION_TASK);
    }
  } catch {
    // tâche déjà arrêtée
  }
}

// Déconnexion (jeton effacé) : plus aucun suivi de position
let lastToken: string | null | undefined = (store.getState() as any)?.auth?.token;
store.subscribe(() => {
  const token = (store.getState() as any)?.auth?.token;
  if (lastToken && !token) stopMissionTracking();
  lastToken = token;
});
