/**
 * Migre les 8 composants/écrans restants :
 * - Si useAppTheme absent : ajoute l'import + le hook
 * - Déplace StyleSheet.create en useMemo avec tokens.primary/secondary
 */
const fs = require('fs');
const path = require('path');

const BASE = path.join(__dirname, '..');
const TARGETS = [
  'src/screens/profile/AppearanceScreen.tsx',
  'src/screens/profile/ProfileScreen.tsx',
  'src/components/DevDebugPanel.tsx',
  'src/components/ReviewCard.tsx',
  'src/components/shared/ModePickerCard.tsx',
  'src/components/shared/ThemeSwitcher.tsx',
  'src/components/shared/TimeSlotPicker.tsx',
  'src/components/shared/UnsupportedCountryModal.tsx',
];

function relImportPath(rel) {
  // src/screens/profile/X.tsx → ../../theme/ThemeProvider
  // src/components/X.tsx → ../theme/ThemeProvider
  // src/components/shared/X.tsx → ../../theme/ThemeProvider
  const parts = rel.split('/'); // ['src','screens','profile','X.tsx'] or ['src','components','X.tsx']
  const depth = parts.length - 2; // depth from src: screens/profile → 2, components → 1
  return '../'.repeat(depth) + 'theme/ThemeProvider';
}

function moveStyleSheetToMemo(src) {
  const ss = src.indexOf('\nconst styles = StyleSheet.create({');
  if (ss === -1) return src;

  let depth = 0, i = ss + 1, opened = false;
  while (i < src.length) {
    if (src[i] === '{') { depth++; opened = true; }
    if (src[i] === '}') { depth--; if (opened && depth === 0) break; }
    i++;
  }
  while (i < src.length && src[i] !== ';') i++;
  const styleEnd = i + 1;

  let block = src.slice(ss, styleEnd)
    .replace(/colors\.primary/g, 'tokens.primary')
    .replace(/colors\.secondary/g, 'tokens.secondary')
    .replace('\nconst styles = StyleSheet.create({', '\n  const styles = useMemo(() => StyleSheet.create({');

  const lastClose = block.lastIndexOf('\n});');
  if (lastClose !== -1) {
    block = block.slice(0, lastClose) + '\n  }), [tokens]);';
  }

  // Supprimer le bloc module-level
  src = src.slice(0, ss) + src.slice(styleEnd);

  // Insérer après le hook useAppTheme
  const hookMarker = '  const { tokens } = useAppTheme();';
  const hookPos = src.lastIndexOf(hookMarker);
  if (hookPos === -1) return src; // hook pas trouvé
  const after = hookPos + hookMarker.length;
  return src.slice(0, after) + '\n' + block + src.slice(after);
}

for (const rel of TARGETS) {
  const file = path.join(BASE, rel);
  let src = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');

  const hasHook = src.includes('useAppTheme');
  const hasTokens = src.includes('const { tokens } = useAppTheme()') ||
                    src.includes('const { mode, tokens } = useAppTheme()');

  // Étape 1 : ajouter import si absent
  if (!hasHook) {
    const ip = relImportPath(rel);
    const lastImportIdx = src.split('\n').reduce((acc, l, i) => /^import /.test(l) ? i : acc, -1);
    const lines = src.split('\n');
    lines.splice(lastImportIdx + 1, 0, `import { useAppTheme } from '${ip}';`);
    src = lines.join('\n');
  }

  // Étape 2 : ajouter useMemo à l'import React si absent
  if (!src.includes('useMemo')) {
    src = src
      .replace(/import React, \{ ([^}]+) \} from 'react';/, (_, inner) =>
        `import React, { ${inner}, useMemo } from 'react';`)
      .replace(/^import React from 'react';/, "import React, { useMemo } from 'react';");
  }

  // Étape 3 : ajouter le hook dans le composant si absent
  if (!hasTokens && !src.includes('const { tokens }')) {
    // Trouver la première déclaration export const/function X
    const lines = src.split('\n');
    const exportIdx = lines.findIndex(l =>
      /^export (?:const|function|default function) [A-Z]/.test(l)
    );
    if (exportIdx !== -1) {
      // Chercher la ligne => { (avec tolérance pour \r)
      for (let i = exportIdx; i < Math.min(exportIdx + 20, lines.length); i++) {
        if (/\)\s*=>\s*\{/.test(lines[i]) || /^export (?:default )?function \w+[^{]*\{/.test(lines[i])) {
          lines.splice(i + 1, 0, '  const { tokens } = useAppTheme();');
          break;
        }
      }
      src = lines.join('\n');
    }
  }

  // Étape 4 : déplacer StyleSheet
  src = moveStyleSheetToMemo(src);

  fs.writeFileSync(file, src);
  console.log('Done:', rel);
}
