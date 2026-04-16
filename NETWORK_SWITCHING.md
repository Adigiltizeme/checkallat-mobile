# 🌐 Configuration Multi-Réseaux & Modes de Connexion

Ce guide explique comment basculer entre les réseaux WiFi et choisir le bon mode de connexion Expo.

## 📍 Réseaux Configurés

### Réseau 1 (Premier lieu)

- **IP**: `10.160.93.122`
- **Fichier**: `.env.network1`

### Réseau 2 (Deuxième lieu)

- **IP**: `192.168.1.55`
- **Fichier**: `.env.network2`

---

## 🚀 Modes de Connexion Expo

### 🏠 Mode LAN (Recommandé pour le développement)

**Avantages** :

- ✅ **Rapide** : Communication directe (latence < 50ms)
- ✅ **Hot reload instantané** : Modifications visibles immédiatement
- ✅ **Fonctionne hors ligne** : Pas besoin d'internet
- ✅ **Gratuit et illimité** : Aucune limitation

**Inconvénients** :

- ❌ Nécessite même réseau WiFi (ordinateur + téléphone)
- ❌ Gestion des IP à chaque changement de lieu
- ❌ Peut être bloqué par firewall/antivirus

**Démarrage** :

```bash
npx expo start
# ou
npx expo start --clear  # Pour vider le cache
```

---

### 🌐 Mode Tunnel (Backup / Dépannage)

**Avantages** :

- ✅ **Fonctionne partout** : Réseaux différents OK
- ✅ **Pas de config IP** : Pas de gestion d'adresses IP
- ✅ **Contourne firewalls** : Passe par serveurs Expo
- ✅ **Partage facile** : QR code partageable avec d'autres développeurs

**Inconvénients** :

- ❌ **Plus lent** : Latence 200-500ms (vs < 50ms en LAN)
- ❌ **Hot reload lent** : Rechargement plus lent à chaque modification
- ❌ **Nécessite internet** : Connexion requise sur les 2 appareils
- ❌ **Peut être instable** : Dépend de la connexion et des serveurs Expo

**Démarrage** :

```bash
npx expo start --tunnel

# Ou double-cliquer sur :
start-tunnel.bat  # Windows
./start-tunnel.sh  # Linux/Mac
```

---

## 🎯 Quelle Option Choisir ?

### ✅ **Mode LAN** → Développement quotidien (Recommandé)

Utilisez quand :

- Vous êtes dans un lieu stable (maison, bureau)
- Vous voulez un développement fluide et rapide
- Vous avez accès au WiFi local

**Workflow** :

1. Basculer vers le bon réseau avec les scripts
2. Démarrer Expo en mode LAN
3. Profiter du hot reload ultra-rapide

---

### ✅ **Mode Tunnel** → Dépannage & Démonstration

Utilisez quand :

- Le mode LAN ne fonctionne pas (problème firewall, réseau)
- Vous voulez montrer l'app à quelqu'un sur un autre réseau
- Vous êtes dans un lieu avec restrictions réseau
- Vous acceptez la latence supplémentaire

**Workflow** :

1. Démarrer directement avec `start-tunnel.bat`
2. Scanner le QR code depuis n'importe où
3. Accepter le rechargement plus lent

---

## 🔄 Basculer Entre les Réseaux (Mode LAN)

### Sur Windows

Double-cliquez sur le fichier correspondant :

- **Réseau 1** : `switch-network1.bat`
- **Réseau 2** : `switch-network2.bat`

Ou en ligne de commande :

```bash
# Basculer vers Réseau 1
cd mobile
switch-network1.bat

# Basculer vers Réseau 2
cd mobile
switch-network2.bat
```

### Sur Linux/Mac

```bash
# Basculer vers Réseau 1
cd mobile
./switch-network1.sh

# Basculer vers Réseau 2
cd mobile
./switch-network2.sh
```

---

## 📱 Après le Basculement

### Pour Mode LAN

1. **Redémarrer Expo** :

   ```bash
   npx expo start --clear
   ```

2. **Sur le téléphone** :
   - Fermez complètement Expo Go (force close)
   - Réouvrez et scannez le nouveau QR code

   OU

   - Secouez le téléphone
   - Tapez sur "Reload"

### Pour Mode Tunnel

Pas besoin de basculer de réseau ! Utilisez directement :

```bash
npx expo start --tunnel
```

---

## 📊 Tableau Comparatif Rapide

| Critère | 🏠 LAN | 🌐 Tunnel |
|---------|--------|-----------|
| **Vitesse** | ⚡ Très rapide (< 50ms) | 🐌 Lent (200-500ms) |
| **Configuration** | 🔧 Nécessite scripts | ✅ Aucune |
| **Réseau** | ⚠️ Même WiFi requis | ✅ N'importe où |
| **Internet** | ✅ Pas nécessaire | ⚠️ Requis |
| **Stabilité** | ✅ Très stable | ⚠️ Variable |
| **Usage recommandé** | 🎯 Dev quotidien | 🆘 Dépannage |

---

## ➕ Ajouter un Nouveau Réseau

1. Vérifiez votre IP :

   ```bash
   ipconfig                    # Windows
   ifconfig                    # Linux/Mac
   ip addr show                # Linux (alternative)
   ```

2. Créez un nouveau fichier `.env.network3` :

   ```bash
   # Configuration Réseau 3
   EXPO_PUBLIC_API_URL=http://VOTRE_IP:4000/api/v1
   EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN='pk.votre_token_mapbox_ici'
   EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   EXPO_PUBLIC_ENV=development
   ```

3. Créez les scripts de basculement :
   - `switch-network3.bat` (Windows)
   - `switch-network3.sh` (Linux/Mac)

---

## ⚠️ Important

### Mode LAN

- **Même réseau** : Votre ordinateur ET votre téléphone doivent être sur le même réseau WiFi
- **Backend actif** : Le backend doit tourner (`npm run start:dev` dans `backend_checkallat`)
- **Port 4000** : Assurez-vous que le port 4000 est ouvert

### Mode Tunnel

- **Connexion internet** : Les deux appareils doivent avoir internet
- **Latence** : Acceptez un délai plus important (normal)
- **Serveurs Expo** : Dépend de la disponibilité des serveurs Expo

---

## 🐛 Dépannage

### Erreur "Failed to download remote update" (Mode LAN)

**Solutions** :

1. Vérifiez que vous êtes sur le bon réseau
2. Vérifiez votre IP actuelle avec `ipconfig`
3. Basculez vers la bonne configuration (`switch-network1.bat` ou `switch-network2.bat`)
4. Redémarrez Expo avec `npx expo start --clear`

**OU utilisez le Mode Tunnel** :

```bash
npx expo start --tunnel
```

### Backend non accessible

```bash
# Tester la connexion
curl http://VOTRE_IP:4000/api/v1/services/categories

# Vérifier que le backend tourne
cd backend_checkallat
npm run start:dev
```

### Le téléphone ne se connecte pas (Mode LAN)

**Vérifications** :

1. ✅ Même réseau WiFi (ordinateur + téléphone)
2. ✅ Désactivez le VPN (si actif)
3. ✅ Vérifiez le firewall (autorise port 4000 et 8081)
4. ✅ Redémarrez le routeur WiFi si nécessaire

**Solution rapide** : Utilisez le mode Tunnel

```bash
npx expo start --tunnel
```

### Mode Tunnel lent ou instable

**Solutions** :

1. Vérifiez votre connexion internet
2. Essayez de relancer : `Ctrl+C` puis `npx expo start --tunnel`
3. Si possible, basculez en mode LAN pour plus de rapidité

---

## 🎓 Résumé Best Practices

### Workflow Quotidien Recommandé

1. **Au bureau/maison** : Mode LAN

   ```bash
   switch-network1.bat  # ou switch-network2.bat
   npx expo start --clear
   ```

2. **En déplacement ou problème réseau** : Mode Tunnel

   ```bash
   npx expo start --tunnel
   ```

3. **Développement actif** : Toujours LAN (hot reload rapide)

4. **Démonstration à distance** : Tunnel (QR code partageable)

---

## 📝 Scripts Disponibles

| Script | Description |
|--------|-------------|
| `switch-network1.bat/.sh` | Basculer vers Réseau 1 (10.160.93.122) |
| `switch-network2.bat/.sh` | Basculer vers Réseau 2 (192.168.1.55) |
| `start-tunnel.bat/.sh` | Démarrer Expo en mode Tunnel |
| `restart-expo.bat` | Redémarrer Expo avec cache clear |
