# Audit des Écrans Transport - Mobile App

**Date:** 2026-03-10
**Référence:** CAHIER_DES_CHARGES_COMPLET.md Section 7.2 + MASTER_CONTEXT.md
**Projet source:** My Truck Transport (réutilisation COMPLÈTE requise)

---

## 📍 État Actuel: **0% Implémenté** ❌

**Dossiers existants:**
- ✅ `mobile/src/screens/transport/` - **VIDE**
- ✅ `mobile/src/screens/tracking/` - **VIDE**

**Écrans existants:** **AUCUN**

---

## 📋 Spécifications Cahier des Charges (Section 7.2)

### Fonctionnalités Requises MVP

#### 1. **Demande Transport Multi-Étapes** (5 Steps)

**Step 1: Objet à Transporter**
- Type dropdown (Meubles, Électroménager, Cartons, Véhicule, Autre)
- Description textarea (500 caractères)
- Upload photos (max 5)
- **Volume Estimator:**
  - Aide visuelle (canapé = 2m³, frigo = 1m³)
  - Calcul auto si dimensions saisies
  - Affichage volume total estimé

**Step 2: Adresses**
- **Pickup:**
  - Adresse (autocomplete Mapbox)
  - Étage (stepper 0-50)
  - Ascenseur ? (toggle)
  - Instructions spéciales (textarea 200 car)
- **Delivery:**
  - Idem pickup
- **Distance auto-calculée** affichée: "X km, ~Y minutes"

**Step 3: Services Additionnels**
- Besoin d'aide pour porter? (toggle)
  - Si oui: Combien de personnes? (stepper 1-5)
- Démontage de meubles? (checkbox)
- Remontage à l'arrivée? (checkbox)
- Emballage fourni? (checkbox)

**Step 4: Planification**
- Date (date picker, min = demain)
- Créneau (buttons):
  - Matin (8h-12h)
  - Après-midi (12h-17h)
  - Soir (17h-20h)
  - Flexible (driver choisit)

**Step 5: Récapitulatif & Prix**
- Résumé complet
- **Prix détaillé ligne par ligne:**
  ```
  Forfait de base (van/truck)    : XXX EGP
  Distance (X km)                 : XXX EGP
  Étages (pickup + delivery)      : XXX EGP
  Helpers (X personnes)           : XXX EGP
  Services (démontage/remontage)  : XXX EGP
  ──────────────────────────────────────────
  TOTAL                           : XXX EGP
  ```
- Choix paiement (in-app Stripe ou cash)
- Conditions annulation
- Bouton "Confirmer la demande"

---

#### 2. **Algorithme Calcul Prix Automatique**

**Formule (Section 7.2.2):**
```typescript
function calculateTransportPrice(request) {
  let total = 0;

  // 1. Base fare (selon véhicule nécessaire)
  const vehicleType = determineVehicleType(request.estimatedVolume);
  const baseFares = {
    'van': 100,           // 0-15 m³
    'small_truck': 200,   // 15-30 m³
    'large_truck': 350    // 30+ m³
  };
  total += baseFares[vehicleType];

  // 2. Distance fare (tarification dégressive)
  if (distance <= 5) {
    total += distance × 10; // 10 EGP/km
  } else if (distance <= 15) {
    total += 50 + (distance - 5) × 7; // 7 EGP/km
  } else {
    total += 120 + (distance - 15) × 5; // 5 EGP/km
  }

  // 3. Floor fare (étages sans ascenseur)
  if (!request.hasElevator) {
    total += request.pickupFloor × 15; // 15 EGP/étage
  }
  if (!request.hasElevatorDelivery) {
    total += request.deliveryFloor × 15;
  }

  // 4. Helpers fare
  if (request.needHelpers) {
    total += request.helpersCount × 50; // 50 EGP/personne
  }

  // 5. Services fare
  if (request.needDisassembly) total += 40;
  if (request.needReassembly) total += 40;
  if (request.needPacking) total += 30;

  return Math.round(total);
}
```

---

#### 3. **Tracking Temps Réel**

**Écran Tracking (Section 7.2.4):**

**Carte interactive:**
- Marker pickup (vert)
- Marker delivery (rouge)
- Marker driver (camion animé avec heading)
- Polyline route (bleu)
- Mise à jour position driver toutes les 10 secondes

**Bottom Sheet:**
- Photo driver + nom + rating + type véhicule
- **Timeline statuts:**
  ```
  ✅ Demande acceptée             [Timestamp]
  🚗 En route vers chargement     [Timestamp]
  📦 Chargement en cours          [Timestamp]
  🚚 En route vers livraison      [Timestamp]
  📍 Arrivé à destination         [Timestamp]
  ✔️ Livraison terminée           [Timestamp]
  ```
- **ETA:** "Arrivée estimée dans X minutes"
- **Boutons actions:**
  - Appeler driver
  - Envoyer message (Phase 2)

**Statuts backend (TransportRequest):**
- `pending` - En attente driver
- `accepted` - Driver accepté
- `en_route_to_pickup` - En route vers pickup
- `loading` - Chargement en cours
- `in_transit` - En route vers delivery
- `unloading` - Déchargement en cours
- `completed` - Terminée
- `cancelled` - Annulée

---

#### 4. **Validation & Preuves** (Section 7.2.5)

**Photos preuve (driver obligatoire):**
- Avant chargement (état objet, environnement pickup)
- Après livraison (objet livré, environnement delivery)
- Upload obligatoire (min 2 photos)

**Signature client:**
- Canvas signature sur écran mobile
- Sauvegarde base64 ou upload S3

**Double validation:**
- Driver clique "Livraison terminée"
- Client clique "Confirmer réception"
- Si concordance → Passage notation
- Si divergence → Support contacté

---

## 🎯 Écrans à Créer (Ordre Prioritaire)

### 🔴 PRIORITÉ 1 - MVP Core

1. **TransportRequestStep1Screen.tsx** - Type & Photos Objet
2. **TransportRequestStep2Screen.tsx** - Adresses (Mapbox)
3. **TransportRequestStep3Screen.tsx** - Services Additionnels
4. **TransportRequestStep4Screen.tsx** - Date & Créneau
5. **TransportRequestStep5Screen.tsx** - Récapitulatif & Prix
6. **TransportTrackingScreen.tsx** - Carte + Timeline (react-native-maps)
7. **TransportListScreen.tsx** - Mes demandes (client)
8. **TransportDetailsScreen.tsx** - Détails demande

### 🟡 PRIORITÉ 2 - Driver Features

9. **DriverDashboardScreen.tsx** - Disponibilité + Demandes
10. **DriverAcceptScreen.tsx** - Accepter/Refuser demande
11. **DriverPhotoUploadScreen.tsx** - Photos avant/après
12. **DriverSignatureScreen.tsx** - Signature client

### 🟢 PRIORITÉ 3 - Polish

13. **TransportHistoryScreen.tsx** - Historique complet
14. **DriverStatsScreen.tsx** - Statistiques driver

---

## 🛠️ Composants & Utilitaires Requis

### Composants UI

**À créer dans `mobile/src/components/transport/`:**

1. **VolumeEstimator.tsx**
   - Aide visuelle estimation volume
   - Calcul auto selon dimensions
   - Suggestions objets courants

2. **PriceBreakdown.tsx**
   - Affichage détaillé prix ligne par ligne
   - Animation montant total

3. **TransportTimeline.tsx**
   - Timeline verticale avec icônes
   - Statuts colorés
   - Timestamps formatés

4. **DriverInfoCard.tsx**
   - Photo, nom, rating
   - Type véhicule
   - Boutons actions

5. **AddressAutocomplete.tsx**
   - Intégration Mapbox
   - Autocomplete adresses
   - Sélection sur carte

6. **FloorPicker.tsx**
   - Stepper élégant
   - Toggle ascenseur
   - Visual feedback

7. **SignatureCanvas.tsx**
   - Canvas React Native
   - Boutons effacer/valider
   - Export base64

### Utilitaires

**À créer dans `mobile/src/utils/transport/`:**

1. **priceCalculator.ts** - Fonction calcul prix (algorithme complet)
2. **vehicleTypeDetector.ts** - Détection véhicule selon volume
3. **distanceCalculator.ts** - Calcul distance Mapbox
4. **etaCalculator.ts** - Estimation temps arrivée
5. **transportValidation.ts** - Validation formulaires multi-steps

---

## 📱 Navigation Structure

**À ajouter dans `mobile/src/navigation/types.ts`:**

```typescript
export type TransportStackParamList = {
  TransportList: undefined;
  TransportRequestStep1: undefined;
  TransportRequestStep2: { step1Data: Step1Data };
  TransportRequestStep3: { step1Data: Step1Data; step2Data: Step2Data };
  TransportRequestStep4: { step1Data: Step1Data; step2Data: Step2Data; step3Data: Step3Data };
  TransportRequestStep5: {
    step1Data: Step1Data;
    step2Data: Step2Data;
    step3Data: Step3Data;
    step4Data: Step4Data;
    calculatedPrice: number;
  };
  TransportTracking: { requestId: string };
  TransportDetails: { requestId: string };
  DriverPhotoUpload: { requestId: string; type: 'before' | 'after' };
  DriverSignature: { requestId: string };
};
```

---

## 🔌 Intégrations Requises

### 1. Maps (Mapbox)
- `@rnmapbox/maps`
- Autocomplete adresses
- Affichage carte + markers
- Polyline route
- Tracking position driver temps réel

### 2. Camera & Photos
- `expo-image-picker`
- Upload photos objet
- Photos preuve driver

### 3. Signature
- `react-native-signature-canvas` ou custom canvas
- Export base64

### 4. Permissions
- Location (tracking driver)
- Camera (photos)
- Storage (save photos)

---

## 📊 État Backend (déjà implémenté)

### API Transport ✅ 100% Fonctionnelle

**Endpoints disponibles:**
- ✅ POST `/transport/request` - Créer demande
- ✅ POST `/transport/calculate-price` - Calculer prix
- ✅ GET `/transport/:id` - Récupérer demande
- ✅ GET `/transport/my-requests/client` - Mes demandes client
- ✅ GET `/transport/my-deliveries/driver` - Mes livraisons driver
- ✅ GET `/transport/:id/tracking` - Info tracking
- ✅ PUT `/transport/:id/status` - Mettre à jour statut
- ✅ PUT `/transport/:id/driver-location` - Position driver
- ✅ POST `/transport/:id/assign-driver` - Assigner driver
- ✅ POST `/transport/:id/photos/before` - Photos avant
- ✅ POST `/transport/:id/photos/after` - Photos après
- ✅ POST `/transport/:id/signature` - Signature client
- ✅ DELETE `/transport/:id` - Annuler
- ✅ GET `/transport/driver/:driverId/stats` - Stats driver

**RTK Query API:** `mobile/src/store/api/transportApi.ts` - ✅ Complet (14 endpoints)

---

## 📝 Plan de Développement Suggéré

### Phase 1: Création Demande (3-4h)
1. Créer TransportRequestStep1Screen (Type + Photos)
2. Créer TransportRequestStep2Screen (Adresses Mapbox)
3. Créer TransportRequestStep3Screen (Services)
4. Créer TransportRequestStep4Screen (Date)
5. Créer TransportRequestStep5Screen (Récap + Prix)
6. Intégrer navigation multi-steps
7. Implémenter fonction calcul prix côté mobile

### Phase 2: Tracking (2-3h)
8. Créer TransportTrackingScreen (Carte Mapbox)
9. Intégrer react-native-maps
10. Afficher markers + polyline
11. WebSocket position driver (temps réel)
12. Timeline statuts
13. Bottom Sheet driver info

### Phase 3: Liste & Détails (1-2h)
14. Créer TransportListScreen
15. Créer TransportDetailsScreen
16. Filtres & tri

### Phase 4: Features Driver (2-3h)
17. DriverAcceptScreen
18. DriverPhotoUploadScreen
19. DriverSignatureScreen

### **Total Estimé: 8-12h développement**

---

## ✅ Checklist Avant Implémentation

- ✅ Backend transport API testé et fonctionnel
- ✅ RTK Query transportApi créé avec 14 endpoints
- ✅ Algorithme pricing documenté
- ✅ Mapbox API key configurée (vérifier .env)
- ⚠️ Permissions location/camera configurées dans app.json
- ⚠️ react-native-maps installé
- ⚠️ expo-image-picker installé
- ⚠️ @rnmapbox/maps ou équivalent installé

---

## 🎨 Design References

**Couleurs (déjà définies):**
- Primary: `#00B8A9` (boutons CTA)
- Accent: `#FF6B6B` (alerts, annulation)
- Success: `#27AE60` (statuts positifs)
- Warning: `#F39C12` (en cours)

**Icônes (Material Community Icons):**
- 📦 truck
- 🚗 truck-fast
- 📍 map-marker
- 📷 camera
- ✍️ draw
- ⬆️ upload
- 📅 calendar
- ⏰ clock

---

## 🚨 Points d'Attention

1. **Réutilisation My Truck Transport:**
   - Cahier des charges insiste: "Réutilisation COMPLÈTE"
   - Algorithmes pricing identiques
   - Workflow exact (5 steps)
   - Tracking identique

2. **Performance Carte:**
   - Optimiser re-renders
   - Throttle updates position driver (10s)
   - Lazy loading markers

3. **Gestion État Multi-Steps:**
   - Redux ou useState local?
   - Validation avant passage step suivant
   - Bouton "Retour" doit préserver données

4. **Permissions:**
   - Demander location uniquement pour tracking
   - Expliquer pourquoi chaque permission

---

## 📊 Score de Conformité

### Écrans Implémentés: **0%** ❌
### Backend Prêt: **100%** ✅
### API Mobile Prête: **100%** ✅
### Composants UI: **0%** ❌
### Intégrations: **0%** ❌

### **Score Global: 40%** (Backend/API prêt, UI manquante)

---

## 🎯 Recommandation

**Action immédiate:** Créer les 5 écrans multi-steps + tracking en priorité.

**Ordre suggéré:**
1. Step 1-5 (création demande)
2. Tracking screen (expérience core)
3. Liste demandes
4. Features driver

**Prochaine étape:** Créer `TransportRequestStep1Screen.tsx`

---

**Date audit:** 2026-03-10
**Statut:** Prêt pour implémentation
**Temps estimé:** 8-12h
