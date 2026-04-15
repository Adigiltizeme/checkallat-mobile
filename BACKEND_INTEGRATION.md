# Intégration avec Backend CheckAll@t

L'application mobile utilise le backend NestJS existant (`backend_checkallat`).

## 🌐 Configuration API

**URL de base :** `http://localhost:4000/api/v1`

### Endpoints utilisés

#### 🔐 Authentification (`/auth`)
- `POST /auth/register` - Inscription
- `POST /auth/login` - Connexion
- `POST /auth/send-otp` - Envoyer code OTP
- `POST /auth/verify-otp` - Vérifier code OTP
- `POST /auth/refresh` - Rafraîchir le token
- `GET /auth/me` - Profil utilisateur

#### 👨‍🔧 Professionnels (`/pros`)
- `GET /pros/search` - Rechercher des pros (avec filtres géolocalisation)
- `GET /pros/:id` - Détails d'un pro
- `POST /pros` - Créer profil pro
- `PUT /pros/:id` - Mettre à jour profil pro

#### 📅 Réservations (`/bookings`)
- `POST /bookings` - Créer une réservation
- `GET /bookings/my-bookings` - Mes réservations
- `GET /bookings/:id` - Détails réservation
- `PUT /bookings/:id/status` - Mettre à jour statut

#### 🚚 Transport (`/transport`)
- `POST /transport/requests` - Créer demande transport
- `GET /transport/requests/:id` - Détails demande
- `GET /transport/requests/:id/track` - Suivre transport

#### 🛍️ Marketplace (`/marketplace`)
- `GET /marketplace/products` - Liste produits
- `GET /marketplace/products/:id` - Détails produit
- `POST /marketplace/orders` - Créer commande

## 🔑 Authentification JWT

Le token JWT est stocké de manière sécurisée via **MMKV** et est automatiquement ajouté aux headers de chaque requête API.

```typescript
headers: {
  'Authorization': `Bearer ${token}`
}
```

## 📦 Structure des DTOs

### RegisterDto
```typescript
{
  phone: string;
  email?: string;
  firstName: string;
  lastName: string;
  password: string;
}
```

### LoginDto
```typescript
{
  identifier: string; // email ou phone
  password: string;
}
```

### CreateBookingDto
```typescript
{
  proId: string;
  serviceId?: string;
  scheduledDate: Date;
  description: string;
  address: string;
  estimatedDuration?: number;
}
```

## 🚀 Démarrage

### Backend
```bash
cd backend_checkallat
npm run start:dev
```

### Mobile
```bash
cd mobile
npm start
```

## ⚙️ Configuration

Pour changer l'URL de l'API (production), modifier les fichiers :
- `mobile/src/store/api/authApi.ts`
- `mobile/src/store/api/prosApi.ts`
- `mobile/src/store/api/bookingsApi.ts`
- `mobile/src/store/api/transportApi.ts`
- `mobile/src/store/api/marketplaceApi.ts`

```typescript
const API_URL = 'https://api.checkallat.com/v1'; // Production
```

## 🔄 Cache & Invalidation

RTK Query gère automatiquement le cache et l'invalidation :
- Les données sont mises en cache
- Les mutations invalident automatiquement les queries associées
- Exemple : `createBooking` invalide automatiquement `getMyBookings`

## 📱 Tests API

Utilisez Postman ou curl pour tester les endpoints backend :

```bash
# Login
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"user@example.com","password":"password123"}'

# Get Pros (avec token)
curl -X GET "http://localhost:4000/api/v1/pros/search?userLat=30.0444&userLng=31.2357&category=plumbing" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🛠️ Troubleshooting

### Erreur de connexion
- Vérifier que le backend tourne sur le port 4000
- Vérifier l'URL dans les fichiers API

### Erreur 401 Unauthorized
- Le token JWT a peut-être expiré
- Se reconnecter pour obtenir un nouveau token

### Erreur CORS
- Le backend doit autoriser les requêtes depuis l'app mobile
- Vérifier la configuration CORS dans `backend_checkallat/src/main.ts`
