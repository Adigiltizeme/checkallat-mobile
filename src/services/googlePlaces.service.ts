import axios from 'axios';

const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ?? '';

export interface PlaceSuggestion {
  placeId: string;
  name: string;            // Nom principal du lieu
  subtitle: string;        // Contexte géographique (arrondissement, ville, pays)
  distanceMeters?: number; // Distance depuis la position GPS de l'utilisateur
  types?: string[];        // Types Google Places (ex: ["shopping_mall", "point_of_interest"])
}

export interface PlaceDetails {
  placeId: string;
  name: string;
  fullAddress: string;
  lat: number;
  lng: number;
}

/**
 * Google Places API (REST) — Autocomplétion multilingue
 * Utilisé pour la recherche d'adresses, landmarks, POIs en Égypte et MENA.
 * Fonctionne quelle que soit la langue saisie (arabe, français, anglais).
 *
 * Note : nécessite EXPO_PUBLIC_GOOGLE_PLACES_API_KEY dans .env
 */
export class GooglePlacesService {
  private static autocompleteUrl =
    'https://maps.googleapis.com/maps/api/place/autocomplete/json';
  private static detailsUrl =
    'https://maps.googleapis.com/maps/api/place/details/json';

  static isConfigured(): boolean {
    return Boolean(GOOGLE_API_KEY);
  }

  /**
   * Génère un session token pour grouper suggest + getDetails dans une même
   * session de facturation Google (réduction des coûts).
   */
  static generateSessionToken(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  /**
   * Autocomplétion — retourne des suggestions textuelles (sans lat/lng).
   * L'utilisateur peut taper en arabe, français ou anglais.
   *
   * @param query - Texte saisi par l'utilisateur
   * @param options.countryCode - Code ISO alpha-2 (ex: 'eg', 'fr') pour restreindre la zone
   * @param options.language - Langue des résultats (ex: 'ar', 'fr', 'en')
   * @param options.proximity - Position GPS pour biaiser les résultats
   * @param options.sessionToken - Token de session (grouper avec getDetails)
   */
  static async suggest(
    query: string,
    options?: {
      countryCode?: string;
      language?: string;
      proximity?: { lat: number; lng: number };
      sessionToken?: string;
    },
  ): Promise<PlaceSuggestion[]> {
    if (!GOOGLE_API_KEY) return [];

    try {
      const params: Record<string, string> = {
        input: query,
        key: GOOGLE_API_KEY,
        // Adresses + établissements (restaurants, entreprises, landmarks)
        types: 'geocode|establishment',
      };

      if (options?.language) params.language = options.language;
      if (options?.sessionToken) params.sessiontoken = options.sessionToken;

      // Restreindre au pays si détecté
      if (options?.countryCode) {
        params.components = `country:${options.countryCode}`;
      }

      // Biaiser vers la position GPS + activer le calcul de distance dans les résultats
      if (options?.proximity) {
        params.location = `${options.proximity.lat},${options.proximity.lng}`;
        params.radius = '50000';
        params.strictbounds = 'false';
        // origin : permet à Google de retourner distance_meters dans chaque suggestion
        params.origin = `${options.proximity.lat},${options.proximity.lng}`;
      }

      const response = await axios.get(this.autocompleteUrl, { params });

      if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
        console.warn('Google Places suggest status:', response.data.status);
        return [];
      }

      return (response.data.predictions ?? []).map((p: any) => ({
        placeId: p.place_id,
        name: p.structured_formatting?.main_text ?? p.description,
        subtitle: p.structured_formatting?.secondary_text ?? '',
        distanceMeters: p.distance_meters,
        types: p.types,
      }));
    } catch (error: any) {
      console.error('Google Places suggest error:', error.message);
      return [];
    }
  }

  /**
   * Détails d'un lieu — retourne les coordonnées GPS précises.
   * Appelé uniquement quand l'utilisateur sélectionne une suggestion.
   *
   * @param placeId - ID Google Places de la suggestion sélectionnée
   * @param sessionToken - Même token que suggest() pour la facturation groupée
   * @param language - Langue de l'adresse formatée retournée
   */
  static async getDetails(
    placeId: string,
    sessionToken: string,
    language?: string,
  ): Promise<PlaceDetails | null> {
    if (!GOOGLE_API_KEY) return null;

    try {
      const params: Record<string, string> = {
        place_id: placeId,
        key: GOOGLE_API_KEY,
        fields: 'geometry,formatted_address,name',
        sessiontoken: sessionToken,
      };

      if (language) params.language = language;

      const response = await axios.get(this.detailsUrl, { params });

      if (response.data.status !== 'OK') {
        console.warn('Google Places details status:', response.data.status);
        return null;
      }

      const result = response.data.result;
      const location = result.geometry?.location;

      if (!location) return null;

      return {
        placeId,
        name: result.name ?? result.formatted_address,
        fullAddress: result.formatted_address ?? result.name,
        lat: location.lat,
        lng: location.lng,
      };
    } catch (error: any) {
      console.error('Google Places details error:', error.message);
      return null;
    }
  }
}
