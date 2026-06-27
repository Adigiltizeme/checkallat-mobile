/**
 * Corrige TOUS les fichiers avec erreurs TypeScript restantes.
 * Classé par type de correction.
 */
const fs = require('fs');
const path = require('path');
const BASE = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(BASE, rel), 'utf8').replace(/\r\n/g, '\n');
}
function write(rel, src) {
  fs.writeFileSync(path.join(BASE, rel), src);
  console.log('Fixed:', rel);
}

// ─────────────────────────────────────────────────────────────────────────────
// Groupe 1 : fichiers qui se terminent par une fermeture JSX → ajouter  );\n};
// ─────────────────────────────────────────────────────────────────────────────
const group1 = [
  'src/screens/pro/ProAgendaScreen.tsx',
  'src/screens/profile/ChangePasswordScreen.tsx',
  'src/screens/profile/ChangePhoneScreen.tsx',
];
for (const rel of group1) {
  let src = read(rel);
  // Supprimer trailing whitespace/newlines
  src = src.trimEnd();
  src += '\n  );\n};\n';
  write(rel, src);
}

// ─────────────────────────────────────────────────────────────────────────────
// Groupe 2 : fichiers qui se terminent par "  }" → remplacer par "  );" + "};
// ─────────────────────────────────────────────────────────────────────────────
const group2 = [
  'src/screens/profile/AddressesScreen.tsx',
  'src/screens/profile/DriverDocumentsScreen.tsx',
  'src/screens/profile/EditProfileScreen.tsx',
  'src/screens/services/BookingTrackingScreen.tsx',
  'src/screens/transport/StripePaymentScreen.tsx',
  'src/screens/transport/TransportRequestStep1Screen.tsx',
  'src/screens/transport/TransportRequestStep2Screen.tsx',
];
for (const rel of group2) {
  let src = read(rel);
  // Remplacer la dernière ligne "  }" par "  );"
  src = src.trimEnd();
  if (src.endsWith('  }')) {
    src = src.slice(0, -3) + '  );';
  }
  src += '\n};\n';
  write(rel, src);
}

// ─────────────────────────────────────────────────────────────────────────────
// Groupe 3 : fichiers qui se terminent par "    }" (4 espaces)
// ─────────────────────────────────────────────────────────────────────────────
const group3 = [
  'src/screens/transport/TransportDetailsScreen.tsx',
  'src/screens/transport/TransportRequestStep3Screen.tsx',
  'src/screens/transport/TransportRequestStep5Screen.tsx',
];
for (const rel of group3) {
  let src = read(rel);
  src = src.trimEnd();
  // Remplacer "    }" par "  );"
  if (src.endsWith('    }')) {
    src = src.slice(0, -5) + '  );';
  } else if (src.endsWith('  }')) {
    src = src.slice(0, -3) + '  );';
  }
  src += '\n};\n';
  write(rel, src);
}

// ─────────────────────────────────────────────────────────────────────────────
// Groupe 4 : JSX corrompu (garbage mélangé avec des balises JSX de fermeture)
// ─────────────────────────────────────────────────────────────────────────────

// BookingDetailsScreen : ligne 850 "    </ScrollView>.3 }," → "    </ScrollView>"
{
  const rel = 'src/screens/services/BookingDetailsScreen.tsx';
  let src = read(rel);
  src = src.replace(/^\s*<\/ScrollView>[^<\n]+$/m, '    </ScrollView>');
  write(rel, src);
}

// ProDetailScreen : ligne 301 "    </V '700' }," → "    </View>"
{
  const rel = 'src/screens/services/ProDetailScreen.tsx';
  let src = read(rel);
  src = src.replace(/^\s*<\/V[^<\n]*$/m, '    </View>');
  write(rel, src);
}

// BookingRequestStep5Screen : ligne 275 "  </ 2 }," → "  </View>\n);"
{
  const rel = 'src/screens/services/BookingRequestStep5Screen.tsx';
  let src = read(rel);
  // Remplacer la ligne garbage par </View> + fermeture du SummaryRow
  src = src.replace(/^\s*<\/\s+\d[^<\n]*$/m, '  </View>\n);');
  src = src.trimEnd() + '\n';
  write(rel, src);
}

// PayoutAccountsScreen : "    </Vary," → "    </View>", "  }" → "  );", ajouter "};
{
  const rel = 'src/screens/profile/PayoutAccountsScreen.tsx';
  let src = read(rel);
  // Corriger </Vary, → </View>
  src = src.replace(/^\s*<\/Vary,\s*$/m, '    </View>');
  // Corriger "  }" en fin de fichier → "  );"
  src = src.trimEnd();
  if (src.endsWith('  }')) {
    src = src.slice(0, -3) + '  );';
  }
  src += '\n};\n';
  write(rel, src);
}

// BookingRequestStep4Screen : supprimer lignes garbage 909-910
{
  const rel = 'src/screens/services/BookingRequestStep4Screen.tsx';
  let src = read(rel);
  const lines = src.split('\n');
  // Trouver et supprimer les lignes avec "DOT_SI" et le "})" suivant
  const filtered = [];
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i];
    if (/DOT_SI/.test(t) || /^\}\);$/.test(t.trim()) && i >= lines.length - 5) {
      continue; // supprimer
    }
    filtered.push(t);
  }
  // S'assurer que le fichier se termine proprement
  let result = filtered.join('\n').trimEnd() + '\n';
  write(rel, result);
}

// ─────────────────────────────────────────────────────────────────────────────
// Groupe 5 : Correction ");' → "});" + return null placeholder
// ─────────────────────────────────────────────────────────────────────────────

// DriverDeliveryDetailsScreen : ligne 233 "  );" → "  });" + return null
{
  const rel = 'src/screens/driver/DriverDeliveryDetailsScreen.tsx';
  let src = read(rel);
  const lines = src.split('\n');
  // Trouver useGetTransportRequestQuery avec options non fermées
  for (let i = 0; i < lines.length; i++) {
    // Ligne "  );" après "pollingInterval:" ou "refetchOnMount"
    if (lines[i].trim() === ');' && i > 0 &&
        (lines[i-1].trim().startsWith('refetchOnMount') || lines[i-1].trim().startsWith('pollingInterval'))) {
      lines[i] = '  });';
    }
  }
  // Trouver la ligne '};' finale et insérer return null; avant elle
  let resultLines = lines.join('\n').trimEnd().split('\n');
  if (resultLines.at(-1) === '};') {
    resultLines.splice(-1, 0, '  // TODO: restore JSX content', '  return null;');
  }
  write(rel, resultLines.join('\n') + '\n');
}

// DriverTransportDetailsScreen : même correction
{
  const rel = 'src/screens/driver/DriverTransportDetailsScreen.tsx';
  let src = read(rel);
  const lines = src.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === ');' && i > 0 &&
        (lines[i-1].trim().startsWith('refetchOnMount') || lines[i-1].trim().startsWith('pollingInterval'))) {
      lines[i] = '  });';
    }
  }
  let resultLines = lines.join('\n').trimEnd().split('\n');
  if (resultLines.at(-1) === '};') {
    resultLines.splice(-1, 0, '  // TODO: restore JSX content', '  return null;');
  }
  write(rel, resultLines.join('\n') + '\n');
}

// PaymentDetailsScreen : ligne 83 "  );" dans formatDate → "    });"
{
  const rel = 'src/screens/payment/PaymentDetailsScreen.tsx';
  let src = read(rel);
  const lines = src.split('\n');
  // Trouver la ligne ");" après "minute: '2-digit'," dans formatDate
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === ');' && i > 0 &&
        lines[i-1].trim().includes("minute: '2-digit'")) {
      lines[i] = '    });';
    }
  }
  let resultLines = lines.join('\n').trimEnd().split('\n');
  if (resultLines.at(-1) === '};') {
    resultLines.splice(-1, 0, '  // TODO: restore JSX content', '  return null;');
  }
  write(rel, resultLines.join('\n') + '\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Groupe 6 : Fichiers sévèrement tronqués - fermeture minimale
// ─────────────────────────────────────────────────────────────────────────────

// DriverEarningsScreen : tronqué à l'intérieur d'un useMemo filter
{
  const rel = 'src/screens/driver/DriverEarningsScreen.tsx';
  let src = read(rel);
  src = src.trimEnd();
  // Fermer: le callback filter, le useMemo, puis le composant
  src += '\n    });\n  }, [deliveries, periodMode, period]);\n\n  // TODO: restore renderItem and JSX return\n  return null;\n};\n';
  write(rel, src);
}

// DriverNavigationScreen : tronqué à l'intérieur de handleCenterMap → setCamera({
{
  const rel = 'src/screens/driver/DriverNavigationScreen.tsx';
  let src = read(rel);
  src = src.trimEnd();
  // Fermer setCamera({ ... }), handleCenterMap, puis le composant
  src += '\n    });\n  };\n\n  // TODO: restore return JSX\n  return null;\n};\n';
  write(rel, src);
}

// MyBookingsScreen : tronqué à l'intérieur d'un filter callback
{
  const rel = 'src/screens/services/MyBookingsScreen.tsx';
  let src = read(rel);
  src = src.trimEnd();
  // Fermer: le callback filter, le if block, puis le composant
  src += '\n    });\n    }\n\n  // TODO: restore renderItem and JSX return\n  return null;\n};\n';
  write(rel, src);
}

console.log('\nDone!');
