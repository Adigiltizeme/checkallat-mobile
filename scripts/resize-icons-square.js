/**
 * Centre et met à l'échelle les assets d'icône dans un canvas carré.
 *
 *   icon.png          → 1024×1024, fond #4A2710 (marron chocolat)
 *   adaptive-icon.png → 1024×1024, fond transparent
 *   splash.png        → 1024×1024, fond #FFFFFF  (Expo center-crops au runtime)
 *
 * L'image source est mise à l'échelle pour remplir 85 % du canvas cible
 * (15 % de marge totale), puis centrée. Interpolation bilinéaire.
 *
 * Usage : node scripts/resize-icons-square.js
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
function mkChunk(type,data){ const t=Buffer.from(type,'ascii'),l=Buffer.allocUnsafe(4),q=Buffer.allocUnsafe(4); l.writeUInt32BE(data.length); q.writeUInt32BE(crc32(Buffer.concat([t,data]))); return Buffer.concat([l,t,data,q]); }

// ── Paeth ─────────────────────────────────────────────────────────────────────
function paeth(a,b,c){ const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c); return(pa<=pb&&pa<=pc)?a:(pb<=pc)?b:c; }

// ── Décodeur PNG ──────────────────────────────────────────────────────────────
function decodePNG(buf) {
  const SIG=[137,80,78,71,13,10,26,10];
  for(let i=0;i<8;i++) if(buf[i]!==SIG[i]) throw new Error('Not PNG');
  let ihdrData=null; const idatParts=[]; let pos=8;
  while(pos<buf.length-4){
    const len=buf.readUInt32BE(pos), type=buf.slice(pos+4,pos+8).toString('ascii'), data=buf.slice(pos+8,pos+8+len);
    if(type==='IHDR') ihdrData=data;
    if(type==='IDAT') idatParts.push(data);
    pos+=12+len;
  }
  const W=ihdrData.readUInt32BE(0), H=ihdrData.readUInt32BE(4);
  const bitDepth=ihdrData[8], colorType=ihdrData[9];
  if(bitDepth!==8) throw new Error('Only 8-bit PNG');
  let ch; if(colorType===2) ch=3; else if(colorType===6) ch=4; else throw new Error(`colorType ${colorType}`);
  const raw=zlib.inflateSync(Buffer.concat(idatParts));
  const stride=W*ch, pixels=new Uint8Array(W*H*ch); let rp=0;
  for(let y=0;y<H;y++){
    const f=raw[rp++],dst=y*stride,prv=(y-1)*stride;
    for(let x=0;x<stride;x++){
      const v=raw[rp++],a=x>=ch?pixels[dst+x-ch]:0,b=y>0?pixels[prv+x]:0,c=(x>=ch&&y>0)?pixels[prv+x-ch]:0;
      let r;
      switch(f){ case 0:r=v;break; case 1:r=(v+a)&0xff;break; case 2:r=(v+b)&0xff;break;
                 case 3:r=(v+Math.floor((a+b)/2))&0xff;break; case 4:r=(v+paeth(a,b,c))&0xff;break;
                 default:throw new Error(`filter ${f}`); }
      pixels[dst+x]=r;
    }
  }
  return {W,H,ch,colorType,pixels};
}

// ── RGB → RGBA ────────────────────────────────────────────────────────────────
function toRGBA(img){
  if(img.ch===4) return img;
  const p=new Uint8Array(img.W*img.H*4);
  for(let i=0;i<img.W*img.H;i++){ p[i*4]=img.pixels[i*3]; p[i*4+1]=img.pixels[i*3+1]; p[i*4+2]=img.pixels[i*3+2]; p[i*4+3]=255; }
  return {...img,ch:4,colorType:6,pixels:p};
}

// ── Encodeur PNG ──────────────────────────────────────────────────────────────
function encodePNG({W,H,ch,colorType,pixels}){
  const raw=[]; const stride=W*ch;
  for(let y=0;y<H;y++){ raw.push(0); const row=y*stride; for(let i=0;i<stride;i++) raw.push(pixels[row+i]); }
  const ihdr=Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(W,0); ihdr.writeUInt32BE(H,4);
  ihdr[8]=8; ihdr[9]=colorType; ihdr[10]=ihdr[11]=ihdr[12]=0;
  return Buffer.concat([
    Buffer.from([137,80,78,71,13,10,26,10]),
    mkChunk('IHDR',ihdr),
    mkChunk('IDAT',zlib.deflateSync(Buffer.from(raw))),
    mkChunk('IEND',Buffer.alloc(0)),
  ]);
}

// ── Interpolation bilinéaire ──────────────────────────────────────────────────
function sampleBilinear(src, srcW, srcH, ch, sx, sy) {
  const x0=Math.max(0,Math.min(srcW-1,Math.floor(sx)));
  const y0=Math.max(0,Math.min(srcH-1,Math.floor(sy)));
  const x1=Math.min(x0+1,srcW-1), y1=Math.min(y0+1,srcH-1);
  const fx=sx-x0, fy=sy-y0;
  const out=new Array(ch);
  for(let c=0;c<ch;c++){
    const tl=src[(y0*srcW+x0)*ch+c], tr=src[(y0*srcW+x1)*ch+c];
    const bl=src[(y1*srcW+x0)*ch+c], br=src[(y1*srcW+x1)*ch+c];
    out[c]=Math.round(tl*(1-fx)*(1-fy)+tr*fx*(1-fy)+bl*(1-fx)*fy+br*fx*fy);
  }
  return out;
}

// ── Mise à l'échelle + centrage dans un canvas carré ─────────────────────────
//
//   bgR/G/B/A : couleur du fond du canvas (bgA=0 → transparent)
//   fill      : 0.0–1.0, portion du canvas utilisée par l'image (0.85 = 85%)
//
function fitToSquare(img, targetSize, bgR, bgG, bgB, bgA, fill = 0.85) {
  const {W, H, ch, pixels} = img;

  // Espace disponible pour l'image
  const maxDim  = Math.round(targetSize * fill);
  const scale   = Math.min(maxDim / W, maxDim / H);
  const scaledW = Math.round(W * scale);
  const scaledH = Math.round(H * scale);
  const offX    = Math.round((targetSize - scaledW) / 2);
  const offY    = Math.round((targetSize - scaledH) / 2);

  const outCh     = 4; // toujours RGBA en sortie
  const outPixels = new Uint8Array(targetSize * targetSize * outCh);

  // Remplir le fond
  for (let i = 0; i < targetSize * targetSize; i++) {
    outPixels[i*4]   = bgR;
    outPixels[i*4+1] = bgG;
    outPixels[i*4+2] = bgB;
    outPixels[i*4+3] = bgA;
  }

  // Peindre les pixels de l'image redimensionnée
  for (let dy = 0; dy < scaledH; dy++) {
    for (let dx = 0; dx < scaledW; dx++) {
      const px = offX + dx, py = offY + dy;
      if (px < 0 || px >= targetSize || py < 0 || py >= targetSize) continue;

      const sx = (dx / (scaledW - 1)) * (W - 1);
      const sy = (dy / (scaledH - 1)) * (H - 1);
      const sample = sampleBilinear(pixels, W, H, ch, sx, sy);

      const oi = (py * targetSize + px) * outCh;
      const srcA = ch === 4 ? sample[3] : 255;

      if (srcA === 0) continue; // pixel source transparent → garder le fond

      // Alpha compositing (source over background)
      const alpha  = srcA / 255;
      const bgAlph = outPixels[oi+3] / 255;
      const outA   = alpha + bgAlph * (1 - alpha);
      if (outA > 0) {
        outPixels[oi]   = Math.round((sample[0] * alpha + bgR * bgAlph * (1-alpha)) / outA);
        outPixels[oi+1] = Math.round((sample[1] * alpha + bgG * bgAlph * (1-alpha)) / outA);
        outPixels[oi+2] = Math.round((sample[2] * alpha + bgB * bgAlph * (1-alpha)) / outA);
        outPixels[oi+3] = Math.round(outA * 255);
      }
    }
  }

  return { W: targetSize, H: targetSize, ch: outCh, colorType: 6, pixels: outPixels };
}

// ── Configuration ─────────────────────────────────────────────────────────────
const ASSETS = path.resolve(__dirname, '..', 'assets');
const TARGET  = 1024;

const FILES = [
  { name: 'icon.png',
    bgR: 0x4A, bgG: 0x27, bgB: 0x10, bgA: 255,  // fond chocolat foncé opaque
    fill: 0.82 },
  { name: 'adaptive-icon.png',
    bgR: 0,    bgG: 0,    bgB: 0,    bgA: 0,     // transparent (Android applique #00B8A9)
    fill: 0.75 },                                  // plus de marge pour le masque Android
  { name: 'splash.png',
    bgR: 0xFF, bgG: 0xFF, bgB: 0xFF, bgA: 255,   // fond blanc
    fill: 0.70 },
];

for (const {name, bgR, bgG, bgB, bgA, fill} of FILES) {
  const src = path.join(ASSETS, name);
  console.log(`\n→ ${name}`);

  let img = decodePNG(fs.readFileSync(src));
  console.log(`   source : ${img.W}×${img.H}  ch=${img.ch}`);

  if (img.ch === 3) img = toRGBA(img); // convertir RGB→RGBA si besoin

  const out = fitToSquare(img, TARGET, bgR, bgG, bgB, bgA, fill);
  fs.writeFileSync(src, encodePNG(out));

  const bg = bgA === 0 ? 'transparent' : `#${bgR.toString(16).padStart(2,'0')}${bgG.toString(16).padStart(2,'0')}${bgB.toString(16).padStart(2,'0')}`;
  console.log(`   ✓ ${TARGET}×${TARGET}  fond=${bg}  fill=${(fill*100).toFixed(0)}%`);
}

console.log('\n✓ Terminé');
