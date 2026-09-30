import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { API_CONFIG } from '../config/api';

/**
 * Mesure d'usage de l'application, envoyée à notre propre serveur (aucun service tiers).
 *
 * - Rien n'est collecté tant que la personne n'a pas accepté (consentement demandé une fois,
 *   modifiable à tout moment dans Profil).
 * - Identifiant d'installation aléatoire : aucun identifiant publicitaire ni donnée de l'appareil.
 * - Uniquement des noms d'écrans et d'étapes, jamais de texte saisi ni d'adresse.
 * - Envoi par lots (toutes les 30 s, en passant en arrière-plan, ou dès 20 événements).
 */

export type AnalyticsConsent = 'granted' | 'denied' | null;

export type AnalyticsEventName =
  | 'app_open'
  | 'screen_view'
  | 'register'
  | 'phone_verified'
  | 'email_verified'
  | 'login'
  | 'order_created'
  | 'order_cancelled'
  | 'checkout_started'
  | 'payment_started'
  | 'dispute_opened'
  | 'application_submitted';

type EventProps = Record<string, string | number | boolean | undefined>;
type QueuedEvent = { name: string; screen?: string; props?: EventProps; at: string };

const CONSENT_KEY = 'analytics_consent';
const ANON_ID_KEY = 'analytics_anonymous_id';
const FLUSH_INTERVAL_MS = 30_000;
const FLUSH_THRESHOLD = 20;
const MAX_QUEUE = 200;
const BATCH_SIZE = 50;

let consent: AnalyticsConsent = null;
let loaded = false;
let anonymousId: string | null = null;
let queue: QueuedEvent[] = [];
/** Événements survenus avant le chargement du consentement (conservés en mémoire seulement) */
let pending: QueuedEvent[] = [];
let flushing = false;
let lastScreen: string | null = null;
const listeners = new Set<() => void>();

let getToken: () => string | null | undefined = () => null;
let getCountry: () => string | null | undefined = () => null;

/** Branché une seule fois par le store (évite une dépendance circulaire) */
export function configureAnalytics(options: {
  getToken: () => string | null | undefined;
  getCountry: () => string | null | undefined;
}) {
  getToken = options.getToken;
  getCountry = options.getCountry;
}

function randomId(): string {
  const c = (globalThis as any).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    return (ch === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function notify() {
  listeners.forEach((l) => l());
}

export function subscribeAnalyticsConsent(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getAnalyticsConsent(): AnalyticsConsent {
  return consent;
}

export function isAnalyticsConsentLoaded(): boolean {
  return loaded;
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function flush() {
  if (flushing || consent !== 'granted' || !anonymousId || queue.length === 0) return;
  flushing = true;
  const batch = queue.slice(0, BATCH_SIZE);
  try {
    const res = await fetch(`${API_CONFIG.BASE_URL}/analytics/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({
        anonymousId,
        platform: Platform.OS,
        appVersion: Constants.expoConfig?.version,
        country: getCountry() || undefined,
        events: batch,
      }),
    });
    // Envoyé, ou refusé définitivement (lot invalide) : on retire le lot pour ne pas bloquer la file
    if (res.ok || (res.status >= 400 && res.status < 500 && res.status !== 429)) {
      queue = queue.slice(batch.length);
    }
  } catch {
    // Hors ligne : nouvel essai au prochain envoi
  } finally {
    flushing = false;
  }
  if (queue.length >= BATCH_SIZE) flush();
}

function enqueue(event: QueuedEvent) {
  if (__DEV__) console.log(`[Analytics] ${event.name}`, event.screen ?? '', event.props ?? '');
  if (!loaded) {
    if (pending.length < MAX_QUEUE) pending.push(event);
    return;
  }
  if (consent !== 'granted') return;
  queue.push(event);
  if (queue.length > MAX_QUEUE) queue = queue.slice(-MAX_QUEUE);
  if (queue.length >= FLUSH_THRESHOLD) flush();
}

export function trackEvent(name: AnalyticsEventName, props?: EventProps) {
  enqueue({ name, props, at: new Date().toISOString() });
}

/** Écran affiché (appelé à chaque changement de route) ; les doublons consécutifs sont ignorés */
export function trackScreen(screen: string | undefined) {
  if (!screen || screen === lastScreen) return;
  lastScreen = screen;
  enqueue({ name: 'screen_view', screen, at: new Date().toISOString() });
}

/** Envoie le choix au serveur (compte connecté) ; en cas de refus, le serveur efface l'historique */
async function syncConsent(value: boolean) {
  try {
    await fetch(`${API_CONFIG.BASE_URL}/analytics/consent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ consent: value, anonymousId: anonymousId ?? undefined }),
    });
  } catch {
    // Nouvel essai à la prochaine connexion (identifyAnalyticsUser)
  }
}

export async function setAnalyticsConsent(granted: boolean) {
  consent = granted ? 'granted' : 'denied';
  if (!granted) queue = [];
  notify();
  try {
    await AsyncStorage.setItem(CONSENT_KEY, consent);
  } catch {}
  await syncConsent(granted);
  if (granted) flush();
}

/** Au démarrage : charge le choix et l'identifiant d'installation, puis démarre les envois */
let initPromise: Promise<void> | null = null;

export function initAnalytics(): Promise<void> {
  // Un seul démarrage, même si l'appel est répété (rechargement, double montage)
  initPromise ??= startAnalytics();
  return initPromise;
}

async function startAnalytics() {
  try {
    const [storedConsent, storedId] = await Promise.all([
      AsyncStorage.getItem(CONSENT_KEY),
      AsyncStorage.getItem(ANON_ID_KEY),
    ]);
    consent = storedConsent === 'granted' || storedConsent === 'denied' ? storedConsent : null;
    anonymousId = storedId;
    if (!anonymousId) {
      anonymousId = randomId();
      await AsyncStorage.setItem(ANON_ID_KEY, anonymousId);
    }
  } catch {
    anonymousId = anonymousId ?? randomId();
  }
  loaded = true;
  if (consent === 'granted') queue.push(...pending);
  pending = [];
  notify();

  setInterval(flush, FLUSH_INTERVAL_MS);
  AppState.addEventListener('change', (state) => {
    if (state !== 'active') flush();
  });
  trackEvent('app_open');
}

/**
 * Connexion : aligne le choix de l'appareil et celui du compte.
 * - choix déjà fait sur l'appareil → enregistré sur le compte s'il diffère ;
 * - aucun choix sur l'appareil (réinstallation) → reprise du choix du compte.
 */
export function identifyAnalyticsUser(user: { analyticsConsent?: boolean | null } | null | undefined) {
  if (!user) return;
  const account = user.analyticsConsent;
  if (consent === null) {
    if (account === true || account === false) {
      consent = account ? 'granted' : 'denied';
      AsyncStorage.setItem(CONSENT_KEY, consent).catch(() => undefined);
      notify();
    }
  } else if (account !== (consent === 'granted')) {
    syncConsent(consent === 'granted');
  }
}

/** Déconnexion : envoie ce qui reste avec l'ancienne session ; la suite est anonyme */
export function resetAnalytics() {
  flush();
}
