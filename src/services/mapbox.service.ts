import axios from 'axios';

// Mapbox Access Token - À configurer dans .env
const MAPBOX_ACCESS_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '';

export interface GeocodingResult {
  address: string;       // Adresse complète (stockée lors de la sélection)
  lat: number;
  lng: number;
  placeName: string;     // Adresse complète pour l'input (full_address)
  name: string;          // Nom propre du lieu (ex: "City towers", "شارع الشباب") — ligne principale
  subtitle: string;      // Contexte géographique (ex: "New Cairo 1, Égypte") — ligne secondaire
  featureType?: string;  // 'address', 'poi', 'place', etc.
  city?: string;
  country?: string;
}

/**
 * Service de géocodage universel Mapbox
 * Utilise SearchBox API v2 pour une meilleure détection des POIs, restaurants, entreprises
 */
export class MapboxService {
  private static baseUrl = 'https://api.mapbox.com';

  /**
   * Recherche d'adresses, POIs, restaurants, entreprises via Mapbox SearchBox API v2
   * Remplace l'ancien forward geocoding v5 avec une bien meilleure détection des lieux
   *
   * @param query - La recherche (adresse, nom d'entreprise, restaurant, POI...)
   * @param options - Options de recherche
   * @returns Tableau de résultats avec coordonnées, triés par pertinence
   */
  static async geocodeAddress(
    query: string,
    options?: {
      country?: string; // Code ISO 3166-1 alpha-2 (ex: 'eg', 'fr')
      proximity?: { lng: number; lat: number }; // Biaiser vers une position GPS
      types?: string[]; // Types (ignoré — SearchBox gère address + poi + place nativement)
      language?: string; // Langue des résultats (ex: 'ar', 'en', 'fr')
    }
  ): Promise<GeocodingResult[]> {
    try {
      const params = new URLSearchParams({
        q: query,
        access_token: MAPBOX_ACCESS_TOKEN,
        // SearchBox gère adresses, POIs, places nativement sans besoin de les lister
        types: 'address,poi,place,street,neighborhood',
        limit: '6',
      });

      if (options?.country) {
        params.append('country', options.country);
      }

      if (options?.proximity) {
        params.append('proximity', `${options.proximity.lng},${options.proximity.lat}`);
      }

      if (options?.language) {
        params.append('language', options.language);
      }

      const url = `${this.baseUrl}/search/searchbox/v1/forward?${params.toString()}`;
      const response = await axios.get(url);

      if (!response.data.features || response.data.features.length === 0) {
        // Fallback sur geocoding v5 si SearchBox ne retourne rien
        return this.geocodeAddressV5(query, options);
      }

      return response.data.features.map((feature: any) => {
        const coords = feature.geometry?.coordinates;
        const props = feature.properties ?? {};
        const fullAddress = props.full_address ?? props.name ?? query;
        const placeName = props.name ?? fullAddress;
        const placeFormatted = props.place_formatted ?? props.context?.place?.name ?? '';
        return {
          address: fullAddress,
          lat: coords ? coords[1] : (props.coordinates?.latitude ?? 0),
          lng: coords ? coords[0] : (props.coordinates?.longitude ?? 0),
          placeName: fullAddress,
          name: placeName,
          subtitle: placeFormatted,
          featureType: props.feature_type,
          city: props.context?.place?.name,
          country: props.context?.country?.name,
        };
      });
    } catch (error: any) {
      console.error('Mapbox SearchBox error:', error.response?.data || error.message);
      // Fallback sur geocoding v5 en cas d'erreur SearchBox
      return this.geocodeAddressV5(query, options);
    }
  }

  /**
   * Fallback : Geocoding v5 (mapbox.places) utilisé si SearchBox échoue
   */
  private static async geocodeAddressV5(
    query: string,
    options?: {
      country?: string;
      proximity?: { lng: number; lat: number };
      types?: string[];
      language?: string;
    }
  ): Promise<GeocodingResult[]> {
    try {
      const params = new URLSearchParams({ access_token: MAPBOX_ACCESS_TOKEN });
      if (options?.country) params.append('country', options.country);
      if (options?.proximity) params.append('proximity', `${options.proximity.lng},${options.proximity.lat}`);
      if (options?.language) params.append('language', options.language);
      params.append('types', 'address,poi,place');

      const url = `${this.baseUrl}/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?${params.toString()}`;
      const response = await axios.get(url);
      if (!response.data.features?.length) return [];

      return response.data.features.map((feature: any) => {
        const city = feature.context?.find((c: any) => c.id.startsWith('place.'))?.text;
        const country = feature.context?.find((c: any) => c.id.startsWith('country.'))?.text;
        // Le nom propre est le texte du feature, le contexte est la ville + pays
        const name = feature.text ?? feature.place_name;
        const subtitle = [city, country].filter(Boolean).join(', ');
        return {
          address: feature.place_name,
          lat: feature.center[1],
          lng: feature.center[0],
          placeName: feature.place_name,
          name,
          subtitle,
          city,
          country,
        };
      });
    } catch {
      return [];
    }
  }

  /**
   * Géocodage inverse (Reverse Geocoding)
   * Convertit des coordonnées GPS en adresse texte
   *
   * @param lat - Latitude
   * @param lng - Longitude
   * @param options - Options de géocodage inverse
   * @returns Adresse formatée
   */
  static async reverseGeocode(
    lat: number,
    lng: number,
    options?: {
      types?: string[]; // Types de résultats (address, place, postcode, etc.)
      language?: string; // Langue des résultats
    }
  ): Promise<GeocodingResult | null> {
    try {
      const params = new URLSearchParams({
        access_token: MAPBOX_ACCESS_TOKEN,
      });

      if (options?.types && options.types.length > 0) {
        params.append('types', options.types.join(','));
      }

      if (options?.language) {
        params.append('language', options.language);
      }

      const url = `${this.baseUrl}/geocoding/v5/mapbox.places/${lng},${lat}.json?${params.toString()}`;

      const response = await axios.get(url);

      if (!response.data.features || response.data.features.length === 0) {
        return null;
      }

      const feature = response.data.features[0];
      const city = feature.context?.find((c: any) => c.id.startsWith('place.'))?.text;
      const country = feature.context?.find((c: any) => c.id.startsWith('country.'))?.text;

      return {
        address: feature.place_name,
        lat,
        lng,
        placeName: feature.place_name,
        name: feature.text ?? feature.place_name,
        subtitle: [city, country].filter(Boolean).join(', '),
        city,
        country,
      };
    } catch (error: any) {
      console.error('Mapbox reverse geocoding error:', error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Calculer la distance et la durée entre deux points
   * Utilise l'API Directions de Mapbox
   *
   * @param from - Point de départ {lat, lng}
   * @param to - Point d'arrivée {lat, lng}
   * @param profile - Profil de transport ('driving', 'walking', 'cycling', 'driving-traffic')
   * @returns Distance (km) et durée (minutes)
   */
  static async getDistanceAndDuration(
    from: { lat: number; lng: number },
    to: { lat: number; lng: number },
    profile: 'driving' | 'walking' | 'cycling' | 'driving-traffic' = 'driving'
  ): Promise<{ distance: number; duration: number; geometry?: any }> {
    try {
      const coordinates = `${from.lng},${from.lat};${to.lng},${to.lat}`;
      const url = `${this.baseUrl}/directions/v5/mapbox/${profile}/${coordinates}?access_token=${MAPBOX_ACCESS_TOKEN}&geometries=geojson`;

      const response = await axios.get(url);

      if (!response.data.routes || response.data.routes.length === 0) {
        // Fallback sur Haversine si pas de route trouvée
        const distance = this.calculateHaversineDistance(from.lat, from.lng, to.lat, to.lng);
        const duration = Math.round((distance / 30) * 60); // 30 km/h moyen
        return { distance, duration };
      }

      const route = response.data.routes[0];

      return {
        distance: Math.round((route.distance / 1000) * 10) / 10, // Convertir m en km, arrondi 1 décimale
        duration: Math.round(route.duration / 60), // Convertir s en minutes
        geometry: route.geometry, // GeoJSON pour afficher la route sur la carte
      };
    } catch (error: any) {
      console.error('Mapbox directions error:', error.response?.data || error.message);
      // Fallback sur Haversine en cas d'erreur
      const distance = this.calculateHaversineDistance(from.lat, from.lng, to.lat, to.lng);
      const duration = Math.round((distance / 30) * 60); // 30 km/h moyen
      return { distance, duration };
    }
  }

  /**
   * Calculer la distance Haversine entre deux points (fallback)
   * Utile quand l'API Mapbox n'est pas disponible
   *
   * @param lat1 - Latitude point 1
   * @param lng1 - Longitude point 1
   * @param lat2 - Latitude point 2
   * @param lng2 - Longitude point 2
   * @returns Distance en km
   */
  private static calculateHaversineDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371; // Rayon de la Terre en km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return Math.round(distance * 10) / 10; // Arrondi 1 décimale
  }

  /**
   * Récupérer uniquement le code ISO du pays à partir de coordonnées GPS
   * Utilisé pour la détection du pays de l'utilisateur
   *
   * @param lat - Latitude
   * @param lng - Longitude
   * @returns Code ISO 3166-1 alpha-2 en minuscules (ex: 'eg', 'fr') ou null
   */
  static async reverseGeocodeCountry(lat: number, lng: number): Promise<string | null> {
    try {
      const params = new URLSearchParams({
        access_token: MAPBOX_ACCESS_TOKEN,
        types: 'country',
      });

      const url = `${this.baseUrl}/geocoding/v5/mapbox.places/${lng},${lat}.json?${params.toString()}`;
      const response = await axios.get(url);

      if (!response.data.features || response.data.features.length === 0) {
        return null;
      }

      // Le code court (short_code) est le code ISO alpha-2 (ex: 'eg', 'fr')
      const feature = response.data.features[0];
      const shortCode: string | undefined = feature.properties?.short_code;

      return shortCode ? shortCode.toLowerCase() : null;
    } catch (error: any) {
      console.warn('Mapbox reverseGeocodeCountry error:', error.message);
      return null;
    }
  }

  /**
   * Valider qu'un token Mapbox est configuré
   */
  static isConfigured(): boolean {
    return MAPBOX_ACCESS_TOKEN !== '' && MAPBOX_ACCESS_TOKEN !== 'your_mapbox_token_here';
  }
}
