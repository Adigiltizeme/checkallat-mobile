/**
 * Répare les fichiers dont la fin a été corrompue par le script useMemo :
 * - Fragment résiduel de StyleSheet (  },[tokens]);   ... }),\n);
 * - Manque de  );  et  }; pour fermer le composant
 */
const fs = require('fs');
const path = require('path');
const BASE = path.join(__dirname, '..');

// Fichiers avec erreurs TypeScript détectés
const BROKEN_FILES = [
  'src/screens/pro/ProAgendaScreen.tsx',
  'src/screens/pro/ProBookingDetailsScreen.tsx',
  'src/screens/pro/ProNavigationScreen.tsx',
  'src/screens/pro/ProposalDetailScreen.tsx',
  'src/screens/profile/AddressesScreen.tsx',
  'src/screens/profile/ChangePasswordScreen.tsx',
  'src/screens/profile/ChangePhoneScreen.tsx',
  'src/screens/profile/DriverDocumentsScreen.tsx',
  'src/screens/profile/EditProfileScreen.tsx',
  'src/screens/profile/PayoutAccountFormScreen.tsx',
  'src/screens/profile/PayoutAccountsScreen.tsx',
  'src/screens/profile/SupportScreen.tsx',
  'src/screens/services/BookingChatScreen.tsx',
  'src/screens/services/BookingDetailsScreen.tsx',
  'src/screens/services/BookingDisputeScreen.tsx',
  'src/screens/services/BookingRequestStep2Screen.tsx',
  'src/screens/services/BookingRequestStep3Screen.tsx',
  'src/screens/services/BookingRequestStep4Screen.tsx',
  'src/screens/services/BookingRequestStep5Screen.tsx',
  'src/screens/services/BookingTrackingScreen.tsx',
  'src/screens/services/CreateBookingScreen.tsx',
  'src/screens/services/MyBookingsScreen.tsx',
  'src/screens/services/ProDetailScreen.tsx',
  'src/screens/services/SearchProsScreen.tsx',
  'src/screens/transport/StripePaymentScreen.tsx',
  'src/screens/transport/TransportDetailsScreen.tsx',
  'src/screens/transport/TransportRequestStep1Screen.tsx',
  'src/screens/transport/TransportRequestStep2Screen.tsx',
  'src/screens/transport/TransportRequestStep3Screen.tsx',
  'src/screens/transport/TransportRequestStep4Screen.tsx',
  'src/screens/transport/TransportRequestStep5Screen.tsx',
  'src/screens/transport/TransportTrackingScreen.tsx',
  // These are in other stacks but might have issues too
  'src/screens/driver/DriverDeliveryDetailsScreen.tsx',
  'src/screens/driver/DriverEarningsScreen.tsx',
  'src/screens/driver/DriverNavigationScreen.tsx',
  'src/screens/driver/DriverReviewsScreen.tsx',
  'src/screens/driver/DriverTransportDetailsScreen.tsx',
  'src/screens/payment/PaymentDetailsScreen.tsx',
  'src/screens/profile/DriverApplicationScreen.tsx',
  'src/screens/profile/EditProfileScreen.tsx',
  'src/screens/services/BookingRequestStep4Screen.tsx',
];

let fixed = 0, skipped = 0;
const errors = [];

// Déduplique
const files = [...new Set(BROKEN_FILES)];

for (const rel of files) {
  const file = path.join(BASE, rel);
  if (!fs.existsSync(file)) { continue; }

  let src = fs.readFileSync(file, 'utf8');
  // Normalise les fins de ligne
  src = src.replace(/\r\n/g, '\n');
  let lines = src.split('\n');
  let changed = false;

  // -- 1. Trouver et nettoyer le fragment résiduel au fond du fichier -------
  // Pattern: les 2-3 dernières lignes non-vides contiennent });  et optionnellement },
  // Le fichier peut se terminer par:
  //   [JSX_line]garbage },    ← merged
  //   });
  // ou:
  //   [JSX_line]              ← clean
  //   garbage },              ← style entry close
  //   });
  // Parfois plusieurs entrées de style peuvent être là

  // Chercher le dernier '});' qui n'est PAS dans un useMemo
  const lastDosLine = (() => {
    for (let i = lines.length - 1; i >= 0; i--) {
      if (/^\}\);$/.test(lines[i].trim())) return i;
    }
    return -1;
  })();

  if (lastDosLine === -1) {
    skipped++;
    continue;
  }

  // Vérifier que c'est bien un fragment résiduel (pas useMemo)
  // Un vrai useMemo se termine par "}), [tokens]);"
  // Un StyleSheet résiduel se termine par "});"
  if (!/^\}\);$/.test(lines[lastDosLine].trim())) {
    skipped++;
    continue;
  }

  // Chercher la ligne de fermeture du composant (}) après la dernière ligne })
  // Trouver toutes les lignes de débris avant });
  // Débris = lignes qui ressemblent à des entrées de StyleSheet (contiennent },  ou }; mais pas JSX)
  // On va chercher la dernière ligne de JSX valide

  // Stratégie: partir de lastDosLine et remonter jusqu'à trouver une ligne JSX valide
  let trashStart = lastDosLine; // première ligne de débris (remontant)

  // Remonter pour trouver les lignes de déchets
  for (let i = lastDosLine - 1; i >= Math.max(0, lastDosLine - 10); i--) {
    const t = lines[i].trim();
    if (t === '') continue; // ligne vide
    // Ligne de débris si: contient seulement des chars de styleSheet comme "  }," "  }," ou finit par "},"
    if (/^[\w\s"':`${}[\](),.*+?|\\/-]*\},?$/.test(t) || t === '},' || t === '},') {
      trashStart = i;
      continue;
    }
    // Ligne JSX mergée : une ligne JSX valide + garbage
    // ex: "    /> 1 }," ou "    </View>or },"
    const jsMerged = t.match(/^(<\/\w+>|\/>|<\/\w+\s[^>]*>)\s*[\w\d\s"'`]*\},$/);
    if (jsMerged) {
      trashStart = i;
      break;
    }
    // Sinon c'est du contenu JSX valide — stop
    break;
  }

  // La ligne juste avant trashStart est la dernière ligne JSX valide
  // Si la ligne trashStart est elle-même une ligne JSX mergée, on la nettoie
  // Sinon on la supprime

  // Construire les nouvelles lignes
  let newLines = lines.slice(0, trashStart);

  // Vérifier si la ligne à trashStart est une ligne JSX mergée avec garbage
  if (trashStart < lastDosLine) {
    const trashLine = lines[trashStart];
    // Nettoyer: enlever le suffix garbage
    // Chercher JSX close et couper là
    const cleanMatch = trashLine.match(/^(\s*(?:<\/\w+>|\/>|<\/\w+\s[^>]*>|\)\}|\)\s*\}|\})\s*)/);
    if (cleanMatch) {
      newLines.push(cleanMatch[1].replace(/\s+$/, '')); // garder la partie JSX propre
      changed = true;
    }
    // Sinon: ignore entièrement (c'est pure débris)
  } else if (trashStart === lastDosLine) {
    // Le lastDosLine lui-même est '}); ' — juste ignorer
    changed = true;
  } else {
    changed = true; // On enlève quand même les lignes trashStart à lastDosLine
  }

  if (!changed) { skipped++; continue; }

  // -- 2. Ajouter la fermeture du composant si manquante --------------------
  // Chercher si }; (fermeture composant) est présente dans les lignes conservées
  const lastValid = newLines;
  const hasComponentClose = lastValid.some((l, i) => i > lastValid.length - 20 && /^};?\s*$/.test(l.trim()));
  const hasReturnClose = lastValid.some((l, i) => i > lastValid.length - 20 && /^\s*\);\s*$/.test(l));

  if (!hasComponentClose) {
    if (!hasReturnClose) {
      newLines.push('  );');
    }
    newLines.push('};');
  }

  // Trailing newline
  if (newLines[newLines.length - 1] !== '') {
    newLines.push('');
  }

  fs.writeFileSync(file, newLines.join('\n'));
  fixed++;
  console.log('Fixed:', rel);
}

console.log('\nFixed:', fixed, '| Skipped:', skipped);
