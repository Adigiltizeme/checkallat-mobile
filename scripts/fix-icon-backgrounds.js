/**
 * Supprime le fond blanc ET les ombres portées des icônes.
 *
 *   icon.png          → fond #4A2710 (marron chocolat, opaque)
 *   adaptive-icon.png → fond transparent
 *   splash.png        → fond #FFFFFF (blanc, suppression ombre)
 *
 * Algorithme en 2 étapes :
 *   1. Flood-fill BFS depuis les bords (seuil RGB > 180)
 *   2. 4 passes d'expansion pour effacer le dégradé d'ombre
 *      (pixels gris/semi-transparents adjacents au fond)
 *
 * Usage : node scripts/fix-icon-backgrounds.js
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
function crc32(buf) { let c=0xffffffff; for(const b of buf) c=CRC[(c^b)&0xff]^(c>>>8); return(c^0xffffffff)>>>0; }
function makeChunk(type,data){
  const t=Buffer.from(type,'ascii'),l=Buffer.allocUnsafe(4),q=Buffer.allocUnsafe(4);
  l.writeUInt32BE(data.length); q.writeUInt32BE(crc32(Buffer.concat([t,data])));
  return Buffer.concat([l,t,data,q]);
}

// ── Paeth ─────────────────────────────────────────────────────────────────────
function paeth(a,b,c){ const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c); return(pa<=pb&&pa<=pc)?a:(pb<=pc)?b:c; }

// ── Décodeur PNG ──────────────────────────────────────────────────────────────
function decodePNG(buf) {
  const SIG=[137,80,78,71,13,10,26,10];
  for(let i=0;i<8;i++) if(buf[i]!==SIG[i]) throw new Error('Not PNG');
  let ihdrData=null; const idatParts=[]; let pos=8;
  while(pos<buf.length-4){
    const len=buf.readUInt32BE(pos),type=buf.slice(pos+4,pos+8).toString('ascii'),data=buf.slice(pos+8,pos+8+len);
    if(type==='IHDR') ihdrData=data;
    if(type==='IDAT') idatParts.push(data);
    pos+=12+len;
  }
  const W=ihdrData.readUInt32BE(0),H=ihdrData.readUInt32BE(4),bitDepth=ihdrData[8],colorType=ihdrData[9];
  if(bitDepth!==8) throw new Error('Only 8-bit PNG');
  let ch; if(colorType===2) ch=3; else if(colorType===6) ch=4; else throw new Error(`colorType ${colorType}`);
  const raw=zlib.inflateSync(Buffer.concat(idatParts));
  const stride=W*ch,pixels=new Uint8Array(W*H*ch); let rp=0;
  for(let y=0;y<H;y++){
    const f=raw[rp++],dst=y*stride,prv=(y-1)*stride;
    for(let x=0;x<stride;x++){
      const v=raw[rp++],a=x>=ch?pixels[dst+x-ch]:0,b=y>0?pixels[prv+x]:0,c=(x>=ch&&y>0)?pixels[prv+x-ch]:0;
      let r; switch(f){ case 0:r=v;break; case 1:r=(v+a)&0xff;break; case 2:r=(v+b)&0xff;break;
                        case 3:r=(v+Math.floor((a+b)/2))&0xff;break; case 4:r=(v+paeth(a,b,c))&0xff;break;
                        default:throw new Error(`filter ${f}`); }
      pixels[dst+x]=r;
    }
  }
  return {W,H,ch,colorType,pixels};
}

// ── RGB → RGBA ─────────────────────────────────────────────────────────────────
function toRGBA(img){
  if(img.ch===4) return img;
  const p=new Uint8Array(img.W*img.H*4);
  for(let i=0;i<img.W*img.H;i++){ p[i*4]=img.pixels[i*3]; p[i*4+1]=img.pixels[i*3+1]; p[i*4+2]=img.pixels[i*3+2]; p[i*4+3]=255; }
  return {...img,ch:4,colorType:6,pixels:p};
}

// ── Encodeur PNG ──────────────────────────────────────────────────────────────
function encodePNG({W,H,ch,colorType,pixels}){
  const raw=[],stride=W*ch;
  for(let y=0;y<H;y++){ raw.push(0); const row=y*stride; for(let i=0;i<stride;i++) raw.push(pixels[row+i]); }
  const ihdr=Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(W,0); ihdr.writeUInt32BE(H,4);
  ihdr[8]=8; ihdr[9]=colorType; ihdr[10]=ihdr[11]=ihdr[12]=0;
  return Buffer.concat([
    Buffer.from([137,80,78,71,13,10,26,10]),
    makeChunk('IHDR',ihdr),
    makeChunk('IDAT',zlib.deflateSync(Buffer.from(raw))),
    makeChunk('IEND',Buffer.alloc(0)),
  ]);
}

// ── Suppression fond + ombre ──────────────────────────────────────────────────
//
//  fillA = 255  → remplace par la couleur opaque (fillR/G/B)
//  fillA = 0    → rend transparent
//
//  Étape 1 : flood-fill depuis les bords (seuil RGB > 180)
//  Étape 2 : 4 passes d'expansion sur pixels gris/semi-transparents adjacents
//             (seuil élargi RGB > 150 OU alpha < 180) pour effacer l'ombre portée
//
function removeBackgroundAndShadow(img, fillR, fillG, fillB, fillA) {
  const {W, H, ch, pixels} = img;
  const visited = new Uint8Array(W * H); // 0=non visité, 1=fond/ombre, 2=logo

  // ── Classifie un pixel : est-ce du fond/ombre ?
  // Fond pur : R,G,B > 180 (blanc ou gris très clair)
  // Semi-transparent : alpha < 180 (dégradé d'ombre)
  function isBgOrShadow(idx) {
    const i = idx * ch;
    const r = pixels[i], g = pixels[i+1], b = pixels[i+2];
    const a = ch === 4 ? pixels[i+3] : 255;
    // Pixel semi-transparent → ombre portée
    if (a < 180) return true;
    // Pixel gris/blanc clair ET faible saturation
    const bright = (r + g + b) / 3;
    const sat    = Math.max(r, g, b) - Math.min(r, g, b);
    return bright > 180 && sat < 50;
  }

  function paint(idx) {
    const i = idx * ch;
    if (fillA === 0 && ch === 4) {
      pixels[i] = pixels[i+1] = pixels[i+2] = pixels[i+3] = 0;
    } else {
      pixels[i] = fillR; pixels[i+1] = fillG; pixels[i+2] = fillB;
      if (ch === 4) pixels[i+3] = 255;
    }
  }

  const DX=[1,-1,0,0], DY=[0,0,1,-1];
  const queue=[]; let qi=0;

  // ── ÉTAPE 1 : Flood-fill BFS depuis les 4 bords ──────────────────────────
  function seed(x, y) {
    const idx = y * W + x;
    if (visited[idx]) return;
    if (!isBgOrShadow(idx)) { visited[idx]=2; return; }
    visited[idx]=1; paint(idx); queue.push(x, y);
  }
  for(let x=0;x<W;x++){ seed(x,0); seed(x,H-1); }
  for(let y=1;y<H-1;y++){ seed(0,y); seed(W-1,y); }

  while(qi<queue.length){
    const x=queue[qi++], y=queue[qi++];
    for(let d=0;d<4;d++){
      const nx=x+DX[d], ny=y+DY[d];
      if(nx<0||nx>=W||ny<0||ny>=H) continue;
      const idx=ny*W+nx;
      if(visited[idx]) continue;
      if(!isBgOrShadow(idx)){ visited[idx]=2; continue; }
      visited[idx]=1; paint(idx); queue.push(nx,ny);
    }
  }

  const step1Count = queue.length / 2;

  // ── ÉTAPE 2 : 4 passes d'expansion pour effacer le dégradé d'ombre ───────
  // Seuil plus permissif : RGB > 150 OU alpha < 220
  function isShadowGradient(idx) {
    const i = idx * ch;
    const r = pixels[i], g = pixels[i+1], b = pixels[i+2];
    const a = ch === 4 ? pixels[i+3] : 255;
    if (a < 220) return true; // semi-transparent résiduel
    const bright = (r + g + b) / 3;
    const sat    = Math.max(r, g, b) - Math.min(r, g, b);
    return bright > 150 && sat < 60; // gris clair à faible saturation
  }

  let expansionTotal = 0;
  for (let pass = 0; pass < 4; pass++) {
    const border = [];
    // Trouver les pixels logo/non-visités adjacents à un pixel fond
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const idx = y * W + x;
        if (visited[idx] === 1) {
          for (let d = 0; d < 4; d++) {
            const nx = x + DX[d], ny = y + DY[d];
            const nidx = ny * W + nx;
            if (visited[nidx] === 0 && isShadowGradient(nidx)) {
              border.push(nx, ny);
            }
          }
        }
      }
    }
    for (let i = 0; i < border.length; i += 2) {
      const bx = border[i], by = border[i+1];
      const bidx = by * W + bx;
      if (visited[bidx]) continue;
      visited[bidx] = 1; paint(bidx);
    }
    expansionTotal += border.length / 2;
    if (border.length === 0) break;
  }

  console.log(`   flood-fill : ${step1Count.toLocaleString()} px  |  expansion ombre : ${expansionTotal.toLocaleString()} px`);
}

// ── Pipeline ──────────────────────────────────────────────────────────────────
const ASSETS = path.resolve(__dirname, '..', 'assets');

const FILES = [
  { name: 'icon.png',          fillR: 0x4A, fillG: 0x27, fillB: 0x10, fillA: 255 },
  { name: 'adaptive-icon.png', fillR: 0,    fillG: 0,    fillB: 0,    fillA: 0   },
  { name: 'splash.png',        fillR: 0xFF, fillG: 0xFF, fillB: 0xFF, fillA: 255 },
];

for (const {name, fillR, fillG, fillB, fillA} of FILES) {
  const src = path.join(ASSETS, name);
  console.log(`\n→ ${name}`);
  let img = decodePNG(fs.readFileSync(src));
  console.log(`   source : ${img.W}×${img.H}  ch=${img.ch}`);
  if (fillA === 0) img = toRGBA(img);
  removeBackgroundAndShadow(img, fillR, fillG, fillB, fillA);
  fs.writeFileSync(src, encodePNG(img));
  const bg = fillA===0 ? 'transparent' : `#${fillR.toString(16).padStart(2,'0')}${fillG.toString(16).padStart(2,'0')}${fillB.toString(16).padStart(2,'0')}`;
  console.log(`   ✓ fond + ombre supprimés → ${bg}`);
}

console.log('\n✓ Terminé');
