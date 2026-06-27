/**
 * Génère mobile/assets/notification-icon.png
 * 96×96, blanc sur transparent — silhouette reconnaissable du logo CheckAll@t :
 *   • cadre extérieur arrondi épais (le contour "tablette de chocolat")
 *   • 4 tuiles intérieures arrondies (les 4 secteurs)
 *   • léger symbole "@" centré dans la tuile bas-droite pour marquer l'identité
 *
 * Usage : node scripts/generate-notification-icon.js
 */

'use strict';

const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

// ── CRC32 ─────────────────────────────────────────────────────────────────────
const CRC = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();
function crc32(b) { let c=0xffffffff; for(const v of b) c=CRC[(c^v)&0xff]^(c>>>8); return(c^0xffffffff)>>>0; }
function chunk(type,data){ const t=Buffer.from(type,'ascii'),l=Buffer.allocUnsafe(4),q=Buffer.allocUnsafe(4); l.writeUInt32BE(data.length); q.writeUInt32BE(crc32(Buffer.concat([t,data]))); return Buffer.concat([l,t,data,q]); }

// ── Canvas RGBA 96×96 ─────────────────────────────────────────────────────────
const W = 96, H = 96;
const rgba = new Uint8Array(W * H * 4); // tout transparent

function px(x, y, alpha = 255) {
  if (x < 0 || x >= W || y < 0 || y >= H) return;
  const i = (y * W + x) * 4;
  if (rgba[i+3] >= alpha) return; // ne pas écraser un pixel plus opaque
  rgba[i] = rgba[i+1] = rgba[i+2] = 255;
  rgba[i+3] = alpha;
}

// Remplissage d'un rectangle arrondi
function fillRR(x0, y0, w, h, r) {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      let ok = true;
      if      (dx < r && dy < r)     ok = (dx-r)**2     + (dy-r)**2     <= r*r;
      else if (dx >= w-r && dy < r)   ok = (dx-(w-1-r))**2 + (dy-r)**2   <= r*r;
      else if (dx < r && dy >= h-r)   ok = (dx-r)**2     + (dy-(h-1-r))**2 <= r*r;
      else if (dx >= w-r && dy >= h-r) ok = (dx-(w-1-r))**2 + (dy-(h-1-r))**2 <= r*r;
      if (ok) px(x0+dx, y0+dy);
    }
  }
}

// Efface une zone (remet à transparent)
function clearRect(x0, y0, w, h) {
  for (let dy = 0; dy < h; dy++)
    for (let dx = 0; dx < w; dx++) {
      if (x0+dx < 0 || x0+dx >= W || y0+dy < 0 || y0+dy >= H) continue;
      const i = ((y0+dy)*W + (x0+dx))*4;
      rgba[i] = rgba[i+1] = rgba[i+2] = rgba[i+3] = 0;
    }
}

// ── Design ────────────────────────────────────────────────────────────────────
//
// 96×96 layout :
//   Cadre extérieur : x=1, y=1, w=94, h=94, r=15 (le contour tablette de chocolat)
//   Gouttière intérieure effacée : x=8, y=8, w=80, h=80 → laisse 7px de cadre
//   4 tuiles (w=h=33, r=6) :
//     TL : (10, 10)   TR : (53, 10)
//     BL : (10, 53)   BR : (53, 53)
//   Séparateur horizontal central (effacé) : y=44, h=9  → gap de 10px entre tuiles
//   Séparateur vertical central (effacé)   : x=44, w=9

// 1. Cadre extérieur plein
fillRR(1, 1, 94, 94, 15);

// 2. Creuser l'intérieur (crée la gorge du cadre)
clearRect(8, 8, 80, 80);

// 3. Quatre tuiles intérieures
fillRR(10, 10, 33, 33, 6);  // haut-gauche
fillRR(53, 10, 33, 33, 6);  // haut-droite
fillRR(10, 53, 33, 33, 6);  // bas-gauche
fillRR(53, 53, 33, 33, 6);  // bas-droite

// ── Encodeur PNG ──────────────────────────────────────────────────────────────
const raw = [];
for (let y = 0; y < H; y++) {
  raw.push(0); // filtre None
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    raw.push(rgba[i], rgba[i+1], rgba[i+2], rgba[i+3]);
  }
}

const ihdr = Buffer.allocUnsafe(13);
ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
ihdr[8]=8; ihdr[9]=6; ihdr[10]=ihdr[11]=ihdr[12]=0; // RGBA

const PNG_SIG = Buffer.from([137,80,78,71,13,10,26,10]);
const png = Buffer.concat([
  PNG_SIG,
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(Buffer.from(raw))),
  chunk('IEND', Buffer.alloc(0)),
]);

const outPath = path.resolve(__dirname, '..', 'assets', 'notification-icon.png');
fs.writeFileSync(outPath, png);
console.log('✓ notification-icon.png généré —', png.length, 'octets');
console.log('  Design : cadre extérieur ×14px + 4 tuiles 33×33 + gouttière 10px');
