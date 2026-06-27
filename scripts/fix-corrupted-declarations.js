const fs = require('fs');
const path = require('path');

const CORRUPTED = [
  'src/screens/driver/DriverAvailableRequestsScreen.tsx',
  'src/screens/driver/DriverDeliveryDetailsScreen.tsx',
  'src/screens/driver/DriverEarningsScreen.tsx',
  'src/screens/driver/DriverNavigationScreen.tsx',
  'src/screens/driver/DriverProofPhotosScreen.tsx',
  'src/screens/driver/DriverReviewsScreen.tsx',
  'src/screens/driver/DriverTransportDetailsScreen.tsx',
  'src/screens/payment/PaymentDetailsScreen.tsx',
  'src/screens/pro/ProBookingDetailsScreen.tsx',
  'src/screens/pro/ProNavigationScreen.tsx',
  'src/screens/pro/ProposalDetailScreen.tsx',
  'src/screens/pro/ProProofPhotosScreen.tsx',
  'src/screens/profile/ChangePasswordScreen.tsx',
  'src/screens/profile/ChangePhoneScreen.tsx',
  'src/screens/profile/DriverApplicationScreen.tsx',
  'src/screens/profile/DriverDocumentsScreen.tsx',
  'src/screens/profile/EditProfileScreen.tsx',
  'src/screens/services/BookingChatScreen.tsx',
  'src/screens/services/BookingDetailsScreen.tsx',
  'src/screens/services/BookingDisputeScreen.tsx',
  'src/screens/services/BookingRequestStep4Screen.tsx',
  'src/screens/services/BookingTrackingScreen.tsx',
  'src/screens/services/CreateBookingScreen.tsx',
  'src/screens/services/MyBookingsScreen.tsx',
  'src/screens/services/ProDetailScreen.tsx',
  'src/screens/services/SearchProsScreen.tsx',
  'src/screens/transport/DisputeScreen.tsx',
  'src/screens/transport/PaymentHistoryScreen.tsx',
  'src/screens/transport/StripePaymentScreen.tsx',
  'src/screens/transport/TransportCompletionScreen.tsx',
  'src/screens/transport/TransportDetailsScreen.tsx',
  'src/screens/transport/TransportListScreen.tsx',
  'src/screens/transport/TransportRequestStep1Screen.tsx',
  'src/screens/transport/TransportRequestStep2Screen.tsx',
  'src/screens/transport/TransportRequestStep3Screen.tsx',
  'src/screens/transport/TransportRequestStep4Screen.tsx',
  'src/screens/transport/TransportRequestStep5Screen.tsx',
  'src/screens/transport/TransportTrackingScreen.tsx',
];

const BASE = path.join(__dirname, '..');
let fixed = 0;
const errors = [];

for (const rel of CORRUPTED) {
  const file = path.join(BASE, rel);
  let src = fs.readFileSync(file, 'utf8');
  const lines = src.split('\n');

  // 1) Trouver la ligne corrompue
  const corruptedIdx = lines.findIndex(l =>
    /export const \w+ = \(\{   const \{ tokens \} = useAppTheme\(\);/.test(l)
  );
  if (corruptedIdx === -1) { errors.push(rel + ' (no corrupted line)'); continue; }

  const nameMatch = lines[corruptedIdx].match(/export const (\w+) = \(\{/);
  if (!nameMatch) { errors.push(rel + ' (no name)'); continue; }
  const compName = nameMatch[1];

  // 2) Trouver la fin du useMemo
  let useMemoEndIdx = -1;
  for (let i = corruptedIdx + 1; i < lines.length; i++) {
    if (/^\s*\}\), \[tokens\]\);/.test(lines[i])) { useMemoEndIdx = i; break; }
  }
  if (useMemoEndIdx === -1) { errors.push(rel + ' (no useMemo end)'); continue; }

  // 3) Collecter les fragments de paramètres après le useMemo
  const paramFragments = [];
  let bodyStartIdx = useMemoEndIdx + 1;

  for (let i = useMemoEndIdx + 1; i < Math.min(useMemoEndIdx + 15, lines.length); i++) {
    const trimmed = lines[i].trim();
    if (trimmed === '') { continue; }
    // Fragment final: contient "} : TypeName) => {"
    if (/\}\s*:\s*[\w<>, |&[\]?]+\s*\)\s*=>\s*\{/.test(trimmed)) {
      paramFragments.push(trimmed);
      bodyStartIdx = i + 1;
      break;
    }
    // Param intermédiaire
    if (/^[\w,\s?]+,?$/.test(trimmed)) {
      paramFragments.push(trimmed);
      continue;
    }
    // Corps du composant
    bodyStartIdx = i;
    break;
  }

  // 4) Reconstruire la déclaration
  let paramsStr;
  if (paramFragments.length === 0) {
    paramsStr = '() => {';
  } else if (paramFragments.length === 1) {
    paramsStr = '({ ' + paramFragments[0];
  } else {
    const lastFrag = paramFragments[paramFragments.length - 1];
    const midParams = paramFragments.slice(0, -1).map(p => '  ' + p.trim()).join('\n');
    paramsStr = '({\n' + midParams + '\n' + lastFrag;
  }

  const newDeclaration = 'export const ' + compName + ' = ' + paramsStr;
  const hookLine = '  const { tokens } = useAppTheme();';

  // Les lignes du useMemo (corruptedIdx+1 .. useMemoEndIdx)
  const useMemoLines = lines.slice(corruptedIdx + 1, useMemoEndIdx + 1);
  // Corps du composant (bodyStartIdx .. fin)
  const bodyLines = lines.slice(bodyStartIdx);

  const newLines = [
    ...lines.slice(0, corruptedIdx),
    newDeclaration,
    hookLine,
    '',
    ...useMemoLines,
    '',
    ...bodyLines,
  ];

  let newSrc = newLines.join('\n');

  // Corriger le mauvais chemin d'import
  newSrc = newSrc.replace(
    "import { useAppTheme } from '../theme/ThemeProvider';",
    "import { useAppTheme } from '../../theme/ThemeProvider';"
  );

  fs.writeFileSync(file, newSrc);
  fixed++;
  console.log('Fixed:', rel);
}

console.log('\nTotal corrigés:', fixed);
if (errors.length) { console.log('Erreurs:'); errors.forEach(e => console.log(' -', e)); }
