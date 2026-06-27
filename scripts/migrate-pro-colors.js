const fs = require('fs');
const path = require('path');

function extractBlock(src, markerIdx) {
  let i = markerIdx;
  while (i < src.length && src[i] !== '{') i++;
  let depth = 1; i++;
  while (i < src.length) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') {
      depth--;
      if (depth === 0) {
        let end = i + 1;
        while (end < src.length && (src[end] === ')' || src[end] === ';')) end++;
        return { start: markerIdx, end: end, inner: src.slice(markerIdx, end) };
      }
    }
    i++;
  }
  return null;
}

const BASE = 'c:/Users/VICTUS/Desktop/checkallat_project/mobile/src/';
const FILES = {
  'screens/pro/ProHomeScreen.tsx':         { varName: 'ProHomeScreen',        proConst: ['PRO_GREEN', 'PRO_GREEN_COLOR'] },
  'screens/pro/ProEarningsScreen.tsx':     { varName: 'ProEarningsScreen',    proConst: ['PRO_GREEN'] },
  'screens/pro/ProReviewsScreen.tsx':      { varName: 'ProReviewsScreen',     proConst: ['PRO_GREEN'] },
  'screens/pro/ProOfferingsScreen.tsx':    { varName: 'ProOfferingsScreen',   proConst: ['PRO_COLOR'] },
  'screens/profile/ProApplicationScreen.tsx': { varName: 'ProApplicationScreen', proConst: ['PRO_COLOR'] },
};

Object.entries(FILES).forEach(([file, { varName, proConst }]) => {
  let src = fs.readFileSync(path.join(BASE, file), 'utf8');

  // 1. Add useAppTheme import after colors import
  if (!src.includes('useAppTheme')) {
    src = src.replace(
      /import \{ colors \} from ['"]\.\.\/\.\.\/theme\/colors['"];/,
      (m) => m + "\nimport { useAppTheme } from '../../theme/ThemeProvider';"
    );
  }

  // 2. Remove PRO_COLOR/PRO_GREEN module-level constants
  proConst.forEach(c => {
    const re = new RegExp('\nconst ' + c + " = ['\"][^'\"]+['\"];");
    src = src.replace(re, '');
  });
  // Also handle PRO_GREEN_COLOR separately if needed
  src = src.replace(/\nconst PRO_GREEN_COLOR = '[^']+';/, '');

  // 3. Replace all PRO_COLOR/PRO_GREEN/PRO_GREEN_COLOR with tokens.primary
  proConst.forEach(c => {
    src = src.replace(new RegExp(c, 'g'), 'tokens.primary');
  });
  src = src.replace(/PRO_GREEN_COLOR/g, 'tokens.primary');

  // 4. Find the module-level styles block and extract it
  const stylesMarker = '\nconst styles = StyleSheet.create(';
  const stylesIdx = src.lastIndexOf(stylesMarker);
  if (stylesIdx === -1) { console.error('STYLES NOT FOUND IN', file); return; }

  const block = extractBlock(src, stylesIdx + 1);
  if (!block) { console.error('BLOCK EXTRACTION FAILED IN', file); return; }

  const stylesContent = src.slice(block.start, block.end);

  // 5. Build useMemo version of the styles
  const memoStyles = 'const styles = useMemo(() => StyleSheet' +
    stylesContent.slice('const styles = StyleSheet'.length) +
    ', [tokens])';

  // 6. Remove the styles block from module level (including the leading newline)
  src = src.replace('\n' + stylesContent, '');

  // 7. Inject into the exported component
  const compPattern = new RegExp('export const ' + varName + ' = \\([^)]*\\) => \\{');
  const compMatch = src.match(compPattern);
  if (!compMatch) { console.error('COMPONENT NOT FOUND IN', file); return; }

  const insertPos = compMatch.index + compMatch[0].length;
  const injection = '\n  const { tokens } = useAppTheme();\n\n  ' + memoStyles + ';\n';
  src = src.slice(0, insertPos) + injection + src.slice(insertPos);

  fs.writeFileSync(path.join(BASE, file), src, 'utf8');
  console.log('DONE:', file);
});
