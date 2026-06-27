/**
 * Migre les 6 écrans restants sans useAppTheme mais avec colors.primary.
 * Approche sûre : cherche la ligne "=> {" de fin de déclaration du composant.
 */
const fs = require('fs');
const path = require('path');

const BASE = path.join(__dirname, '..');
const TARGETS = [
  'src/screens/auth/LanguagePickerModal.tsx',
  'src/screens/onboarding/OnboardingScreen.tsx',
  'src/screens/pro/MyProposalsScreen.tsx',
  'src/screens/pro/SubmitProposalScreen.tsx',
  'src/screens/profile/LanguageScreen.tsx',
  'src/screens/transport/CashValidationScreen.tsx',
];

// Détermine le bon chemin d'import relatif depuis src/screens/xxx/
function importPath(rel) {
  const depth = rel.split('/').length - 2; // ex: screens/auth/X.tsx → depth=1 → ../..
  return '../'.repeat(depth) + 'theme/ThemeProvider';
}

for (const rel of TARGETS) {
  const file = path.join(BASE, rel);
  let src = fs.readFileSync(file, 'utf8');
  let lines = src.split('\n');

  // Étape 1 : ajouter l'import useAppTheme si absent
  if (!src.includes('useAppTheme')) {
    const ip = importPath(rel);
    // Insérer après le dernier import existant
    let lastImportIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (/^import /.test(lines[i])) lastImportIdx = i;
    }
    const importLine = `import { useAppTheme } from '${ip}';`;
    lines.splice(lastImportIdx + 1, 0, importLine);
  }

  // Étape 2 : trouver la fin de la déclaration du composant (ligne finissant par '=> {')
  // Cherche "export const/function Xxx" puis la première ligne finissant par ') => {'
  const exportIdx = lines.findIndex(l => /^export (?:const|function) [A-Z]/.test(l));
  if (exportIdx === -1) { console.log(rel + ': no export found'); continue; }

  let bodyOpenIdx = -1;
  for (let i = exportIdx; i < Math.min(exportIdx + 20, lines.length); i++) {
    if (/\)\s*=>\s*\{$/.test(lines[i]) || /^export function \w+[^{]*\{$/.test(lines[i])) {
      bodyOpenIdx = i;
      break;
    }
  }
  if (bodyOpenIdx === -1) { console.log(rel + ': no body open found'); continue; }

  // Étape 3 : insérer const { tokens } = useAppTheme(); après la ligne bodyOpenIdx
  // Seulement si pas déjà présent
  if (!lines[bodyOpenIdx + 1]?.includes('useAppTheme')) {
    lines.splice(bodyOpenIdx + 1, 0, '  const { tokens } = useAppTheme();');
  }

  // Étape 4 : ajouter useMemo à l'import React si absent
  if (!src.includes('useMemo')) {
    const riIdx = lines.findIndex(l => /^import React/.test(l));
    if (riIdx !== -1) {
      lines[riIdx] = lines[riIdx]
        .replace(/import React, \{ ([^}]+) \}/, (_, inner) => `import React, { ${inner}, useMemo }`)
        .replace(/^import React from/, "import React, { useMemo } from");
    }
  }

  src = lines.join('\n');

  // Étape 5 : déplacer StyleSheet.create en useMemo
  // Trouver le bloc module-level
  const styleStart = src.indexOf('\nconst styles = StyleSheet.create({');
  if (styleStart === -1) {
    // Pas de StyleSheet à déplacer, sauver quand même
    fs.writeFileSync(file, src);
    console.log('Saved (no StyleSheet):', rel);
    continue;
  }

  // Trouver la fin du bloc
  let depth = 0, i = styleStart + 1, opened = false;
  while (i < src.length) {
    if (src[i] === '{') { depth++; opened = true; }
    if (src[i] === '}') { depth--; if (opened && depth === 0) break; }
    i++;
  }
  while (i < src.length && src[i] !== ';') i++;
  const styleEnd = i + 1;

  let block = src.slice(styleStart, styleEnd);

  // Remplacer colors.primary/secondary dans le bloc
  block = block
    .replace(/colors\.primary/g, 'tokens.primary')
    .replace(/colors\.secondary/g, 'tokens.secondary');

  // Transformer en useMemo
  block = block
    .replace('\nconst styles = StyleSheet.create({', '\n  const styles = useMemo(() => StyleSheet.create({')
    .replace(/\n\}\);$/, '\n  }), [tokens]);');

  // Supprimer le bloc module-level
  src = src.slice(0, styleStart) + src.slice(styleEnd);

  // Insérer après const { tokens } = useAppTheme();
  const hookPos = src.lastIndexOf('  const { tokens } = useAppTheme();');
  if (hookPos === -1) { console.log(rel + ': hook not found after insertion'); continue; }
  const after = hookPos + '  const { tokens } = useAppTheme();'.length;
  src = src.slice(0, after) + '\n' + block + src.slice(after);

  fs.writeFileSync(file, src);
  console.log('Migrated:', rel);
}

console.log('\nDone.');
