# CheckAll@t Mobile App

Application mobile React Native (Expo) pour la plateforme CheckAll@t.

## 🚀 Installation

```bash
# Installer les dépendances
npm install

# Démarrer le serveur de développement
npm start

# Lancer sur Android
npm run android

# Lancer sur iOS
npm run ios

# Lancer sur le web
npm run web
```

## 📱 Structure du Projet

```
mobile/
├── src/
│   ├── navigation/          # Configuration de la navigation
│   ├── screens/            # Écrans de l'application
│   │   ├── auth/          # Authentification (Login, Register, OTP)
│   │   ├── home/          # Écran d'accueil
│   │   └── profile/       # Profil utilisateur & historique
│   ├── store/             # Redux store & RTK Query
│   │   ├── slices/        # Auth & Cart slices
│   │   └── api/           # API services (auth, services, transport, marketplace)
│   ├── theme/             # Thème (colors, typography, spacing)
│   └── App.tsx            # Point d'entrée de l'application
```

## 🎨 Thème

- **Couleur primaire**: #00B8A9 (Turquoise)
- **Couleur secondaire**: #F8B400 (Jaune)
- **Couleur accent**: #FF6B6B (Rouge)

## 🔐 Authentification

L'application utilise JWT pour l'authentification avec stockage sécurisé via `react-native-mmkv`.

### Flux d'authentification:
1. Login/Register
2. Vérification OTP (si inscription)
3. Redirection automatique vers l'écran principal

## 📦 Technologies

- **React Native** (0.73.0)
- **Expo** (50.0.0)
- **Redux Toolkit** + RTK Query
- **React Navigation** (v6)
- **React Native Paper** (UI components)
- **React Hook Form** + Zod (validation)
- **MMKV** (stockage persistant)

## 🧪 Tests

```bash
npm test
```

## 📝 Build

```bash
# Build Android (EAS)
eas build --platform android

# Build iOS (EAS)
eas build --platform ios
```

## 🌐 Configuration API

L'URL de l'API est configurée dans `src/store/api/*.ts`:

```typescript
const API_URL = 'http://localhost:4000/api/v1'; // Development
// const API_URL = 'https://api.checkallat.com/v1'; // Production
```

## 📱 Fonctionnalités Implémentées

### ✅ MVP
- [x] Authentification (Login, Register, OTP)
- [x] Écran d'accueil avec catégories
- [x] Navigation (Auth, Main avec tabs)
- [x] Profil utilisateur
- [x] Historique des services

### 🚧 À venir
- [ ] Recherche de professionnels
- [ ] Réservation de services
- [ ] Demande de transport
- [ ] Marketplace
- [ ] Suivi en temps réel
- [ ] Paiements (Stripe)
- [ ] Notifications push

## 📄 Licence

Propriété de Digiltizeme © 2026
