# Publication sur l'App Store et Google Play — CheckAll@t

Tout ce qu'il faut saisir dans App Store Connect et la Play Console, prêt à copier-coller.
Les textes App Store sont aussi dans [`../store.config.json`](../store.config.json) et s'envoient d'une commande (`eas metadata:push`).

| Élément | Valeur |
|---|---|
| Nom de l'app | CheckAll@t |
| Identifiant iOS / Android | `com.digiltizeme.checkallat` |
| Assistance (Support URL) | https://checkallat-web-admin.vercel.app/contact |
| Politique de confidentialité | https://checkallat-web-admin.vercel.app/privacy |
| Conditions d'utilisation | https://checkallat-web-admin.vercel.app/terms |
| Suppression de compte (Google) | https://checkallat-web-admin.vercel.app/account-deletion |
| Catégorie Apple | Style de vie (principale), Shopping (secondaire) |
| Catégorie Google | Style de vie (alternative : Maison et habitat) |
| Public | 18 ans et plus (les CGU l'exigent) — pas destiné aux enfants |
| Publicité | Aucune |
| Achats intégrés | Aucun (paiements de services et biens physiques par Stripe : autorisé par Apple, règle 3.1.3(e)) |

---

## 1. Ordre des opérations

1. **Comptes de démonstration en production** (les testeurs d'Apple et de Google ne reçoivent pas de SMS) :
   ```
   cd backend_checkallat
   REVIEW_ACCOUNT_PASSWORD='<mot de passe fort>' railway run npm run review-accounts:prod
   ```
   Crée : client `+33639980001` et prestataire plombier (Paris) `+33639980002`, même mot de passe, connexion sans code.
   **Après validation des deux stores**, rendez le prestataire invisible pour les vrais clients :
   `REVIEW_PRO_AVAILABLE=false REVIEW_ACCOUNT_PASSWORD='<même mot de passe>' railway run npm run review-accounts:prod`
2. **Build de production** : `cd mobile && eas build --platform all --profile production`
3. **Apple** : créer l'app dans App Store Connect (bundle `com.digiltizeme.checkallat`), puis
   `eas metadata:push` (textes FR/EN/AR, catégories, adresses) et `eas submit --platform ios`
   (EAS demande votre Apple ID au premier envoi et retrouve l'app automatiquement).
4. **Google** : créer l'app dans la Play Console, **téléverser le premier .aab à la main** (Google l'impose pour le tout premier envoi),
   créer le compte de service (section 9), puis les envois suivants : `eas submit --platform android`
   (piste « test interne », en brouillon).
5. Remplir les formulaires des sections 3 à 7, ajouter les captures (section 8), envoyer en revue.

---

## 2. Textes Google Play

**Titre (30 max)** : `CheckAll@t`

**Description courte (80 max)**

| Langue | Texte |
|---|---|
| FR | Déménagement, livraison express, artisans à domicile et marketplace |
| EN | Moving, express delivery, home services and a local marketplace |
| AR | النقل والتوصيل السريع والخدمات المنزلية والتسوق في تطبيق واحد |

**Description complète** : reprendre le champ `description` de chaque langue dans [`../store.config.json`](../store.config.json)
(identique pour les deux stores ; FR = `fr-FR`, EN = `en-US`, AR = `ar-SA`).

---

## 3. Apple — Confidentialité de l'app (App Privacy)

**Suivi (tracking) : Non.** Aucune donnée n'est utilisée pour du suivi publicitaire entre apps ou sites d'autres sociétés.

Toutes les données ci-dessous sont **liées à l'identité de l'utilisateur** et **non utilisées pour le suivi**.

| Type de donnée Apple | Collectée | Finalités à cocher |
|---|---|---|
| Coordonnées → Nom | Oui | Fonctionnalité de l'app |
| Coordonnées → Adresse e-mail | Oui | Fonctionnalité de l'app, Communications du développeur |
| Coordonnées → Numéro de téléphone | Oui | Fonctionnalité de l'app |
| Coordonnées → Adresse physique | Oui | Fonctionnalité de l'app (adresses d'intervention et de livraison) |
| Infos financières → Infos de paiement | Oui | Fonctionnalité de l'app (carte traitée par Stripe) |
| Infos financières → Autres infos financières | Oui | Fonctionnalité de l'app (coordonnées de versement des prestataires) |
| Localisation → Localisation précise | Oui | Fonctionnalité de l'app (prestataires proches, suivi en direct des missions) |
| Localisation → Localisation approximative | Oui | Fonctionnalité de l'app (pays, devise) |
| Contenu utilisateur → Photos ou vidéos | Oui | Fonctionnalité de l'app (profil, pièces d'identité des prestataires, photos avant/après, produits) |
| Contenu utilisateur → E-mails ou messages texte | Oui | Fonctionnalité de l'app (messagerie entre client et prestataire) |
| Contenu utilisateur → Assistance client | Oui | Fonctionnalité de l'app |
| Contenu utilisateur → Autre contenu | Oui | Fonctionnalité de l'app (avis, descriptions de demandes) |
| Identifiants → Identifiant utilisateur | Oui | Fonctionnalité de l'app |
| Identifiants → Identifiant de l'appareil | Oui | Fonctionnalité de l'app (notifications), Analyses (identifiant d'installation, avec accord) |
| Achats → Historique des achats | Oui | Fonctionnalité de l'app |
| Données d'utilisation → Interaction avec le produit | Oui | Analyses (uniquement avec l'accord de l'utilisateur) |
| Diagnostics → Données de plantage | Oui | Fonctionnalité de l'app (Sentry) |
| Diagnostics → Données de performance | Oui | Fonctionnalité de l'app (Sentry) |
| Santé, Contacts, Historique de navigation, Historique de recherche, Infos sensibles, Audio | **Non** | — |

---

## 4. Google — Sécurité des données (Data safety)

**Réponses générales**
- L'app collecte ou partage des données : **Oui**
- Toutes les données sont chiffrées en transit : **Oui**
- Les utilisateurs peuvent demander la suppression : **Oui** (dans l'app : Profil → Supprimer mon compte ; et l'adresse `/account-deletion`)
- Données **partagées** avec des tiers : **Non**. Stripe, Twilio, Mapbox, Cloudinary, Sentry et les prestataires de versement
  traitent les données pour notre compte (prestataires de services, exclus de la notion de « partage »). Les informations montrées à
  l'autre partie d'une commande (nom, adresse, position pendant la mission) le sont à l'initiative de l'utilisateur.

| Catégorie Google | Donnée | Collectée | Facultative ? | Finalités |
|---|---|---|---|---|
| Position | Position exacte | Oui | Facultative pour les clients, requise pour les prestataires en mission | Fonctionnalité de l'app |
| Position | Position approximative | Oui | Facultative | Fonctionnalité de l'app |
| Informations personnelles | Nom | Oui | Requise | Fonctionnalité, Gestion du compte |
| Informations personnelles | Adresse e-mail | Oui | Facultative | Gestion du compte, Communications du développeur |
| Informations personnelles | ID utilisateur | Oui | Requise | Gestion du compte |
| Informations personnelles | Adresse | Oui | Requise | Fonctionnalité de l'app |
| Informations personnelles | Numéro de téléphone | Oui | Requise | Gestion du compte, Prévention des fraudes et sécurité |
| Informations personnelles | Autres infos (pièce d'identité, SIRET des prestataires) | Oui | Facultative (prestataires uniquement) | Prévention des fraudes, sécurité et conformité |
| Informations financières | Infos de paiement de l'utilisateur | Oui | Facultative (espèces possibles) | Fonctionnalité de l'app |
| Informations financières | Historique des achats | Oui | Requise | Fonctionnalité de l'app |
| Informations financières | Autres infos financières (coordonnées de versement) | Oui | Facultative (prestataires uniquement) | Fonctionnalité de l'app |
| Messages | Autres messages dans l'app | Oui | Facultative | Fonctionnalité de l'app |
| Photos et vidéos | Photos | Oui | Facultative | Fonctionnalité de l'app, Prévention des fraudes (pièces d'identité) |
| Activité dans l'app | Interactions avec l'app | Oui | **Facultative** (accord demandé) | Analyses |
| Activité dans l'app | Autre contenu généré (avis, descriptions) | Oui | Facultative | Fonctionnalité de l'app |
| Infos et performances de l'app | Journaux de plantage | Oui | Requise | Analyses |
| Infos et performances de l'app | Diagnostics | Oui | Requise | Analyses |
| Appareil ou autres ID | Appareil ou autres ID | Oui | Requise | Fonctionnalité de l'app (notifications) |
| Santé, Contacts, Agenda, Fichiers, Audio, Navigation web, Applis installées | — | **Non** | — | — |

---

## 5. Classification du contenu

### Google (questionnaire IARC)
- Catégorie : **Toutes les autres applications**
- Violence, sexualité, langage grossier, substances contrôlées, jeux d'argent, horreur : **Non** partout
- Les utilisateurs peuvent interagir ou échanger du contenu : **Oui** (messagerie, avis, photos)
- L'app partage la position actuelle de l'utilisateur avec d'autres utilisateurs : **Oui** (position du prestataire visible par le client pendant la mission)
- Achat de biens numériques : **Non**
- Résultat attendu : PEGI 3 / Tout public, avec les mentions « Les utilisateurs interagissent » et « Partage la position ».

### Apple (classification par âge)
- Violence, contenus sexuels, langage, drogues, jeux d'argent, horreur, contenu médical : **Aucun**
- Accès web non restreint : **Non**
- Concours / tirages au sort : **Non**
- Messagerie et chat entre utilisateurs : **Oui**
- Contenu généré par les utilisateurs : **Oui** (avis, photos) — modération par l'équipe (litiges, signalements)
- Publicité : **Non**
- Apple calcule la classe (probablement 12+ ou 13+ à cause de la messagerie). Les CGU réservent l'usage aux 18 ans et plus.

---

## 6. Autres déclarations Google Play (Contenu de l'application)

| Formulaire | Réponse |
|---|---|
| Publicités | L'app ne contient pas de publicités |
| Accès à l'application | Certaines fonctionnalités sont restreintes → ajouter les deux comptes de démonstration (numéro, mot de passe) et préciser : « se connecter avec le numéro de téléphone et le mot de passe ; aucun code SMS n'est demandé pour ces comptes » |
| Public cible | 18 ans et plus |
| Appli d'actualités | Non |
| Fonctionnalités financières | Aucune (les paiements concernent des services et biens physiques) |
| Santé | Non |
| Appli gouvernementale | Non |
| Suppression des données | URL : `https://checkallat-web-admin.vercel.app/account-deletion` ; suppression possible dans l'app : Oui |
| **Localisation en arrière-plan** | Voir ci-dessous — **déclaration et vidéo obligatoires** |
| **Services de premier plan** | Type « Localisation » — voir ci-dessous |

### Localisation en arrière-plan (ACCESS_BACKGROUND_LOCATION)
- Fonctionnalité : suivi en direct de l'arrivée du chauffeur, du livreur ou du prestataire par le client.
- Texte proposé : *« Pendant une livraison ou une intervention qu'ils ont acceptée, les chauffeurs, livreurs et prestataires partagent leur position avec le client, y compris lorsqu'ils utilisent une application de navigation. La position n'est utilisée que pendant une mission active et cesse d'être collectée à la fin de la mission. Les clients n'utilisent jamais la localisation en arrière-plan. »*
- Vidéo (30 s à 1 min, lien YouTube non répertorié) : compte prestataire → accepter une mission → message d'autorisation « Toujours » → ouvrir Google Maps → côté client, la position se déplace sur la carte → fin de mission.

### Service de premier plan (FOREGROUND_SERVICE_LOCATION)
- Type : **Localisation**. Même justification et même vidéo que ci-dessus (notification persistante visible pendant la mission).

---

## 7. Apple — Informations pour la revue (App Review)

- **Connexion requise : Oui** → compte client `+33639980001` et mot de passe choisi.
- **Notes pour le testeur (en anglais)** :

> CheckAll@t is a marketplace for moving/transport, express courier delivery, home services and local shopping.
> Demo accounts (log in with phone number + password, no SMS code is required for these accounts):
> • Client: +33 6 39 98 00 01
> • Professional (plumber, Paris): +33 6 39 98 00 02
> To test a booking: log in as the client, choose "Services" → Plumbing, enter an address in Paris, pick the demo professional.
> Payments are for physical services and goods delivered outside the app (guideline 3.1.3(e)); they are processed by Stripe.
> Background location is only used by professionals (drivers, couriers, service providers) during an accepted mission, so the client can follow their arrival; it stops when the mission ends. Clients never use background location.
> Account deletion: Profile → Delete my account.

---

## 8. Captures d'écran à prendre

**Formats**
- iPhone : **6,9"** (1320 × 2868 px, iPhone 16/17 Pro Max) — 3 minimum, 10 maximum. Pas de captures iPad (support iPad désactivé).
- Android : téléphone, **1080 × 1920 px ou plus** (9:16), 2 minimum, 8 maximum.
- Google exige aussi une **image de présentation 1024 × 500 px** (bannière) et l'icône 512 × 512 px (`assets/icon.png` redimensionnée).

**Écrans conseillés, dans cet ordre** (prendre les mêmes dans chaque langue, avec des données réalistes, sans vrais noms ni numéros) :

1. **Accueil** avec les 4 secteurs (Transport, CheckAllPack, Services, Marketplace) — l'écran qui explique l'app.
2. **Transport : prix calculé** (étape récapitulative avec distance, volume, options et total).
3. **Suivi en direct** d'un transport : carte avec le chauffeur en route et la frise d'étapes.
4. **Services à domicile : choix de la durée et détail du prix à l'heure** (déplacement + tarif × durée, total maximum).
5. **Choix du prestataire** : liste avec notes, distance et tarif horaire.
6. **CheckAllPack** : demande de livraison express avec les options (express, fragile, chaîne du froid).
7. **Marketplace** : boutique avec produits et panier.
8. **Messagerie ou détail de commande** avec paiement sécurisé et avis.
9. (Facultatif) **Espace prestataire** : tableau de bord avec demandes et revenus — pour attirer les partenaires.
10. (Facultatif) **Profil** : langue FR/EN/AR, sécurité, suppression du compte.

Conseil : ajouter une courte légende au-dessus de chaque capture (ex. « Le prix avant de réserver », « Suivez votre chauffeur en direct »), dans la langue de la fiche.

---

## 9. Clés et identifiants pour `eas submit`

Déjà configuré dans [`../eas.json`](../eas.json) (`submit.production`).

- **Google** : Play Console → Configuration → Accès à l'API → créer un **compte de service** (rôle « Gestionnaire des versions »),
  télécharger la clé JSON et l'enregistrer sous `mobile/secrets/google-play-service-account.json`.
  Ce dossier est exclu de git : ne jamais le committer.
- **Apple** : rien à écrire dans le dépôt. Au premier `eas submit --platform ios`, EAS demande l'Apple ID, se connecte et retrouve
  l'app par son identifiant. Option recommandée : créer une **clé API App Store Connect** (Utilisateurs et accès → Intégrations)
  et la laisser gérer par EAS (`eas credentials`), pour éviter la double authentification à chaque envoi.
