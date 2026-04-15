# Guide de Test Mobile - CheckAll@t

## Configuration Réseau

### Backend
- ✅ Backend doit être lancé sur `http://10.160.93.122:4000`
- ✅ CORS configuré pour accepter toutes les origines en développement
- ✅ Port: 4000

### Mobile App
- ✅ Configuration API: `src/config/api.ts`
- ✅ URL API: `http://10.160.93.122:4000/api/v1`
- ✅ AsyncStorage pour la persistance des tokens

## Tests à Effectuer

### 1. Test d'Authentification (Login)

**Endpoint:** `POST /api/v1/auth/login`

**Test Steps:**
1. Ouvrir l'app mobile sur Expo Go
2. Vous devriez voir l'écran de Login (AuthNavigator)
3. Tester avec un utilisateur existant du backend

**Credentials de test:**
```
Email: user@checkallat.com
Password: Password123!
```

**Résultat attendu:**
- Token JWT reçu
- Stocké dans AsyncStorage
- Navigation vers MainNavigator (écran Home)
- State Redux mis à jour (`isAuthenticated: true`)

### 2. Test d'Inscription (Register)

**Endpoint:** `POST /api/v1/auth/register`

**Test Steps:**
1. Cliquer sur "S'inscrire" depuis l'écran Login
2. Remplir le formulaire:
   - Nom complet
   - Email
   - Numéro de téléphone (+221...)
   - Mot de passe
   - Confirmation mot de passe

**Résultat attendu:**
- Compte créé
- OTP envoyé (si implémenté)
- Navigation vers écran OTP ou Login

### 3. Test OTP (si applicable)

**Endpoint:**
- `POST /api/v1/auth/send-otp`
- `POST /api/v1/auth/verify-otp`

**Test Steps:**
1. Après inscription, l'OTP devrait être envoyé
2. Entrer le code OTP reçu
3. Vérifier le code

**Résultat attendu:**
- OTP vérifié
- Navigation vers Home

### 4. Test Home Screen

**Endpoint:** `GET /api/v1/pros/search`

**Test Steps:**
1. Une fois connecté, vous arrivez sur HomeScreen
2. Les catégories de services devraient s'afficher
3. Possibilité de chercher des pros

**Résultat attendu:**
- Affichage des catégories
- Liste des pros disponibles
- Possibilité de filtrer par catégorie

### 5. Test Profile Screen

**Endpoint:** `GET /api/v1/auth/me`

**Test Steps:**
1. Naviguer vers l'onglet "Profile" (Bottom Tab)
2. Les informations utilisateur devraient s'afficher

**Résultat attendu:**
- Affichage des données utilisateur
- Option de déconnexion
- Navigation vers paramètres

### 6. Test Déconnexion (Logout)

**Test Steps:**
1. Depuis Profile, cliquer sur "Déconnexion"
2. Les tokens devraient être supprimés

**Résultat attendu:**
- Tokens supprimés d'AsyncStorage
- State Redux réinitialisé (`isAuthenticated: false`)
- Navigation vers AuthNavigator (Login)

## Vérifications Backend

### Tester la connexion depuis mobile:

```bash
# Depuis un terminal sur le téléphone/emulateur, vérifier que le backend est accessible
curl http://10.160.93.122:4000/api/v1/auth/health
```

### Logs Backend à surveiller:

```bash
cd backend_checkallat
npm run start:dev
```

Vous devriez voir les requêtes entrantes de l'app mobile.

## Troubleshooting

### Erreur: "Network request failed"
- ✅ Vérifier que le backend est lancé
- ✅ Vérifier que vous êtes sur le même réseau WiFi
- ✅ Vérifier l'IP dans `src/config/api.ts`
- ✅ Ping l'IP depuis votre téléphone: `http://10.160.93.122:4000`

### Erreur: "CORS policy"
- ✅ Vérifier que CORS est activé dans `backend_checkallat/src/main.ts`
- ✅ Vérifier que `NODE_ENV` n'est pas `production`

### Erreur: "401 Unauthorized"
- ✅ Vérifier que le token est bien stocké dans AsyncStorage
- ✅ Vérifier que le header `Authorization` est bien envoyé
- ✅ Vérifier que le token n'est pas expiré

### App ne se connecte pas
- ✅ Redémarrer Metro Bundler: `npm start` puis `r`
- ✅ Clear cache: `npm start -- --clear`
- ✅ Vérifier les logs Metro pour les erreurs

## Commandes Utiles

```bash
# Démarrer l'app mobile
cd mobile
npm start

# Démarrer le backend
cd backend_checkallat
npm run start:dev

# Voir les logs du backend
# Les logs s'affichent automatiquement dans la console

# Nettoyer le cache Metro
cd mobile
npm start -- --clear
```

## Prochaines Étapes

Une fois les tests d'authentification validés:
1. ✅ Implémenter les écrans de services
2. ✅ Implémenter la recherche de pros
3. ✅ Implémenter le système de réservation
4. ✅ Implémenter les paiements (Stripe/Wave)
5. ✅ Implémenter le tracking transport
6. ✅ Implémenter le marketplace

## Notes

- L'app utilise **AsyncStorage** au lieu de MMKV pour compatibilité Expo Go
- Les tokens sont persistés et restaurés au démarrage
- Redux Toolkit Query gère le cache des requêtes API
- React Navigation gère la navigation conditionnelle (Auth/Main)
