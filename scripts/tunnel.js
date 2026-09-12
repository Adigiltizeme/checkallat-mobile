/**
 * Démarre ngrok v3 (global) sur le tunnel "expo" (port 8081)
 * puis lance Expo avec le bon hostname pour Expo Go.
 *
 * Usage : npm run tunnel
 */

const { spawn, execSync } = require('child_process');
const http = require('http');
const path = require('path');

// ── Helpers ────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function getNgrokUrl(tunnelName = 'expo', timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const url = await new Promise((resolve, reject) => {
        const req = http.get('http://localhost:4040/api/tunnels', res => {
          let data = '';
          res.on('data', c => { data += c; });
          res.on('end', () => {
            try {
              const json = JSON.parse(data);
              const t = (json.tunnels || []).find(t => t.name === tunnelName);
              resolve(t ? t.public_url : null);
            } catch { reject(new Error('JSON parse error')); }
          });
        });
        req.on('error', reject);
        req.setTimeout(2000, () => { req.destroy(); reject(new Error('timeout')); });
      });
      if (url) return url;
    } catch { /* pas encore prêt */ }
    await sleep(500);
  }
  throw new Error(`Le tunnel ngrok "${tunnelName}" n'a pas démarré à temps.`);
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  // 1. Tuer un éventuel ngrok déjà en cours
  try {
    execSync('taskkill /F /IM ngrok.exe', { stdio: 'ignore' });
    await sleep(500);
  } catch { /* rien à tuer */ }

  // 2. Démarrer ngrok v3 avec le tunnel "expo" configuré dans ngrok.yml
  console.log('\n▶  Démarrage du tunnel ngrok (expo → 8081)...\n');
  const ngrokProc = spawn('ngrok', ['start', 'expo'], {
    detached: true,
    stdio: 'ignore',
    shell: true,
  });
  ngrokProc.unref();

  // 3. Attendre que l'API ngrok soit prête
  await sleep(2000);
  let publicUrl;
  try {
    publicUrl = await getNgrokUrl('expo', 15000);
  } catch (err) {
    console.error('\n✗  ', err.message);
    console.error('   Vérifiez que ngrok est bien installé et authentifié :');
    console.error('   ngrok config check\n');
    process.exit(1);
  }

  // Extraire le hostname (sans https://)
  const hostname = publicUrl.replace(/^https?:\/\//, '');
  const expoUrl  = `exp://${hostname}`;

  console.log(`✅  Tunnel actif : ${publicUrl}`);
  console.log(`📱  URL Expo Go  : ${expoUrl}`);
  console.log(`\n▶  Démarrage d'Expo...\n`);

  // 4. Démarrer Expo en passant le hostname ngrok
  const env = {
    ...process.env,
    NODE_OPTIONS: '--max-old-space-size=8192',
    REACT_NATIVE_PACKAGER_HOSTNAME: hostname,
  };

  const expoProc = spawn('npx', ['expo', 'start'], {
    stdio: 'inherit',
    shell: true,
    env,
  });

  // Propager Ctrl+C
  process.on('SIGINT', () => {
    expoProc.kill('SIGINT');
    try { execSync('taskkill /F /IM ngrok.exe', { stdio: 'ignore' }); } catch {}
    process.exit(0);
  });

  expoProc.on('close', code => {
    try { execSync('taskkill /F /IM ngrok.exe', { stdio: 'ignore' }); } catch {}
    process.exit(code ?? 0);
  });
}

main().catch(err => {
  console.error('\n✗  Erreur inattendue :', err.message);
  process.exit(1);
});
