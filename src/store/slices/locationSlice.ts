import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type DetectionStatus = 'idle' | 'detecting' | 'done' | 'unsupported' | 'denied' | 'error';

interface LocationState {
  /** Code ISO du pays détecté via GPS (ex: 'eg', 'fr') */
  detectedCountryCode: string | null;
  /** Override manuel : pays choisi par l'utilisateur dans la liste des pays supportés */
  selectedCountryCode: string | null;
  /** Coordonnées GPS actuelles de l'utilisateur (pour le biais de proximité Mapbox) */
  userLat: number | null;
  userLng: number | null;
  /** Statut de la détection */
  detectionStatus: DetectionStatus;
}

const initialState: LocationState = {
  detectedCountryCode: null,
  selectedCountryCode: null,
  userLat: null,
  userLng: null,
  detectionStatus: 'idle',
};

const locationSlice = createSlice({
  name: 'location',
  initialState,
  reducers: {
    setDetecting(state) {
      state.detectionStatus = 'detecting';
    },
    setDetectedCountry(
      state,
      action: PayloadAction<{ countryCode: string; lat: number; lng: number }>
    ) {
      state.detectedCountryCode = action.payload.countryCode;
      state.userLat = action.payload.lat;
      state.userLng = action.payload.lng;
      state.detectionStatus = 'done';
      // Si pas encore de sélection manuelle, appliquer le pays détecté
      if (!state.selectedCountryCode) {
        state.selectedCountryCode = action.payload.countryCode;
      }
    },
    setUserPosition(state, action: PayloadAction<{ lat: number; lng: number }>) {
      state.userLat = action.payload.lat;
      state.userLng = action.payload.lng;
    },
    setUnsupportedCountry(state, action: PayloadAction<{ lat: number; lng: number; countryCode?: string | null }>) {
      state.userLat = action.payload.lat;
      state.userLng = action.payload.lng;
      state.detectionStatus = 'unsupported';
      if (action.payload.countryCode) {
        state.detectedCountryCode = action.payload.countryCode;
      }
    },
    setDetectionDenied(state) {
      state.detectionStatus = 'denied';
    },
    setDetectionError(state) {
      state.detectionStatus = 'error';
    },
    /** L'utilisateur choisit manuellement un pays supporté */
    selectCountry(state, action: PayloadAction<string>) {
      state.selectedCountryCode = action.payload;
      if (state.detectionStatus === 'unsupported') {
        state.detectionStatus = 'done';
      }
    },
    resetDetection(state) {
      state.detectionStatus = 'idle';
      state.detectedCountryCode = null;
      state.selectedCountryCode = null;
    },
  },
});

export const {
  setDetecting,
  setDetectedCountry,
  setUserPosition,
  setUnsupportedCountry,
  setDetectionDenied,
  setDetectionError,
  selectCountry,
  resetDetection,
} = locationSlice.actions;

export default locationSlice.reducer;
