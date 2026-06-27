const fs = require('fs');

const fixes = [
  {
    file: 'src/screens/driver/DriverProofPhotosScreen.tsx',
    name: 'DriverProofPhotosScreen',
    params: 'navigation, route',
  },
  {
    file: 'src/screens/pro/ProProofPhotosScreen.tsx',
    name: 'ProProofPhotosScreen',
    params: 'navigation, route',
  },
  {
    file: 'src/screens/transport/DisputeScreen.tsx',
    name: 'DisputeScreen',
    params: 'route, navigation',
  },
  {
    file: 'src/screens/transport/TransportCompletionScreen.tsx',
    name: 'TransportCompletionScreen',
    params: 'route, navigation',
  },
];

const BASE = require('path').join(__dirname, '..');

for (const { file, name, params } of fixes) {
  const fullPath = require('path').join(BASE, file);
  let src = fs.readFileSync(fullPath, 'utf8');
  const lines = src.split('\n');

  const marker = 'export const ' + name + ' = ({   const { tokens } = useAppTheme();';
  const ci = lines.findIndex(l => l.includes(marker));
  if (ci === -1) { console.log(name + ': not found, skipping'); continue; }

  const newDecl = 'export const ' + name + ' = ({ ' + params + ' }: Props) => {';
  const hookLine = '  const { tokens } = useAppTheme();';

  lines.splice(ci, 2, newDecl, hookLine);

  let newSrc = lines.join('\n');
  newSrc = newSrc.replace(
    "import { useAppTheme } from '../theme/ThemeProvider';",
    "import { useAppTheme } from '../../theme/ThemeProvider';"
  );

  fs.writeFileSync(fullPath, newSrc);
  console.log('Fixed:', name);
}
