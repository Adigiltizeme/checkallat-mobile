/**
 * Pipeline complet de génération des assets visuels.
 * Toujours exécuté depuis les ORIGINAUX pour éviter la dégradation itérative.
 *
 * Sources attendues dans mobile/assets/originals/ :
 *   icon-src.png          — icône seule, fond blanc (Image 6)
 *   adaptive-icon-src.png — icône seule, fond blanc (Image 6 ou même fichier)
 *   splash-src.png        — icône + "CheckAll@t", fond blanc (Image 5)
 *
 * Sorties dans mobile/assets/ :
 *   icon.png              1024×1024, fond #4A2710
 *   adaptive-icon.png     1024×1024, fond transparent
 *   splash.png            1024×1024, fond #FFFFFF
 *   notification-icon.png 96×96,     fond transparent (généré programmatiquement)
 *
 * Usage : node scripts/generate-assets-pipeline.js
 */

'use strict';

const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

const ORIGINALS = path.resolve(__dirname, '..', 'assets', 'originals');
const ASSETS    = path.resolve(__dirname, '..', 'assets');

// ─────────────────────────────────────────────────────────────────────────────
// UTILITAIRES PNG
// ─────────────────────────────────────────────────────────────────────────────

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
function mkChunk(type, data) {
  const t=Buffer.from(type,'ascii'), l=Buffer.allocUnsafe(4), q=Buffer.allocUnsafe(4);
  l.writeUInt32BE(data.length); q.writeUInt32BE(crc32(Buffer.concat([t,data])));
  return Buffer.concat([l,t,data,q]);
}
function paeth(a,b,c){ const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c); return(pa<=pb&&pa<=pc)?a:(pb<=pc)?b:c; }

function decodePNG(buf) {
  const SIG=[137,80,78,71,13,10,26,10];
  for(let i=0;i<8;i++) if(buf[i]!==SIG[i]) throw new Error('Not PNG');
  let ihdr=null; const idat=[]; let pos=8;
  while(pos<buf.length-4){
    const len=buf.readUInt32BE(pos), type=buf.slice(pos+4,pos+8).toString('ascii'), data=buf.slice(pos+8,pos+8+len);
    if(type==='IHDR') ihdr=data;
    if(type==='IDAT') idat.push(data);
    pos+=12+len;
  }
  const W=ihdr.readUInt32BE(0), H=ihdr.readUInt32BE(4), ct=ihdr[9];
  let ch; if(ct===2) ch=3; else if(ct===6) ch=4; else throw new Error(`colorType ${ct}`);
  const raw=zlib.inflateSync(Buffer.concat(idat)), stride=W*ch, pixels=new Uint8Array(W*H*ch); let rp=0;
  for(let y=0;y<H;y++){
    const f=raw[rp++],dst=y*stride,prv=(y-1)*stride;
    for(let x=0;x<stride;x++){
      const v=raw[rp++],a=x>=ch?pixels[dst+x-ch]:0,b=y>0?pixels[prv+x]:0,c=(x>=ch&&y>0)?pixels[prv+x-ch]:0;
      let r; switch(f){case 0:r=v;break;case 1:r=(v+a)&255;break;case 2:r=(v+b)&255;break;
                       case 3:r=(v+Math.floor((a+b)/2))&255;break;case 4:r=(v+paeth(a,b,c))&255;break;default:throw new Error(`filter ${f}`);}
      pixels[dst+x]=r;
    }
  }
  return {W,H,ch,colorType:ct,pixels};
}

function toRGBA(img) {
  if(img.ch===4) return img;
  const p=new Uint8Array(img.W*img.H*4);
  for(let i=0;i<img.W*img.H;i++){p[i*4]=img.pixels[i*3];p[i*4+1]=img.pixels[i*3+1];p[i*4+2]=img.pixels[i*3+2];p[i*4+3]=255;}
  return {...img,ch:4,colorType:6,pixels:p};
}

function encodePNG({W,H,ch,colorType,pixels}){
  const raw=[],stride=W*ch;
  for(let y=0;y<H;y++){raw.push(0);const row=y*stride;for(let i=0;i<stride;i++)raw.push(pixels[row+i]);}
  const ihdr=Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(W,0);ihdr.writeUInt32BE(H,4);ihdr[8]=8;ihdr[9]=colorType;ihdr[10]=ihdr[11]=ihdr[12]=0;
  return Buffer.concat([
    Buffer.from([137,80,78,71,13,10,26,10]),
    mkChunk('IHDR',ihdr),
    mkChunk('IDAT',zlib.deflateSync(Buffer.from(raw))),
    mkChunk('IEND',Buffer.alloc(0)),
  ]);
}

// ─────────────────────────────────────────────────────────────────────────────
// ÉTAPE 1 : Suppression fond + ombre (flood-fill + expansion)
// ─────────────────────────────────────────────────────────────────────────────

function removeBackground(img, fillR, fillG, fillB, fillA) {
  const {W,H,ch,pixels} = img;
  const visited = new Uint8Array(W*H);

  // Fond/ombre : pixel clair désaturé OU semi-transparent
  function isBg(idx) {
    const i=idx*ch, r=pixels[i],g=pixels[i+1],b=pixels[i+2], a=ch===4?pixels[i+3]:255;
    if(a<200) return true;
    const bright=(r+g+b)/3, sat=Math.max(r,g,b)-Math.min(r,g,b);
    return bright>155 && sat<60;
  }

  function paint(idx){
    const i=idx*ch;
    if(fillA===0&&ch===4){pixels[i]=pixels[i+1]=pixels[i+2]=pixels[i+3]=0;}
    else{pixels[i]=fillR;pixels[i+1]=fillG;pixels[i+2]=fillB;if(ch===4)pixels[i+3]=255;}
  }

  const DX=[1,-1,0,0],DY=[0,0,1,-1];
  const queue=[];let qi=0;

  // Amorce depuis les bords
  function seed(x,y){
    const idx=y*W+x; if(visited[idx])return;
    if(!isBg(idx)){visited[idx]=2;return;}
    visited[idx]=1;paint(idx);queue.push(x,y);
  }
  for(let x=0;x<W;x++){seed(x,0);seed(x,H-1);}
  for(let y=1;y<H-1;y++){seed(0,y);seed(W-1,y);}

  while(qi<queue.length){
    const x=queue[qi++],y=queue[qi++];
    for(let d=0;d<4;d++){
      const nx=x+DX[d],ny=y+DY[d];
      if(nx<0||nx>=W||ny<0||ny>=H)continue;
      const idx=ny*W+nx; if(visited[idx])continue;
      if(!isBg(idx)){visited[idx]=2;continue;}
      visited[idx]=1;paint(idx);queue.push(nx,ny);
    }
  }
  const main=queue.length/2;

  // 15 passes d'expansion (seuil assoupli pour capturer tout le dégradé d'ombre)
  let exp=0;
  for(let pass=0;pass<15;pass++){
    const border=[];
    for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){
      if(visited[y*W+x]!==1)continue;
      for(let d=0;d<4;d++){
        const nx=x+DX[d],ny=y+DY[d],nidx=ny*W+nx;
        if(visited[nidx])continue;
        const ni=nidx*ch, r=pixels[ni],g=pixels[ni+1],b=pixels[ni+2],a=ch===4?pixels[ni+3]:255;
        const bright=(r+g+b)/3,sat=Math.max(r,g,b)-Math.min(r,g,b);
        if(a<230||(bright>95&&sat<70))border.push(nx,ny);
      }
    }
    for(let i=0;i<border.length;i+=2){
      const idx=border[i+1]*W+border[i]; if(visited[idx])continue;
      visited[idx]=1;paint(idx);
    }
    exp+=border.length/2; if(border.length===0)break;
  }

  console.log(`   fond : ${main.toLocaleString()} px | ombre étendue : ${exp.toLocaleString()} px`);
}

// ─────────────────────────────────────────────────────────────────────────────
// ÉTAPE 2 : Mise à l'échelle + centrage dans un canvas carré (bilinéaire)
// ─────────────────────────────────────────────────────────────────────────────

function fitToSquare(img, size, bgR, bgG, bgB, bgA, fill) {
  const {W,H,ch,pixels}=img;
  const maxDim=Math.round(size*fill), scale=Math.min(maxDim/W,maxDim/H);
  const sW=Math.round(W*scale), sH=Math.round(H*scale);
  const ox=Math.round((size-sW)/2), oy=Math.round((size-sH)/2);
  const out=new Uint8Array(size*size*4);

  // Fond
  for(let i=0;i<size*size;i++){out[i*4]=bgR;out[i*4+1]=bgG;out[i*4+2]=bgB;out[i*4+3]=bgA;}

  // Interpolation bilinéaire
  for(let dy=0;dy<sH;dy++){
    for(let dx=0;dx<sW;dx++){
      const px2=ox+dx,py=oy+dy; if(px2<0||px2>=size||py<0||py>=size)continue;
      const sx=(dx/(sW-1))*(W-1), sy=(dy/(sH-1))*(H-1);
      const x0=Math.max(0,Math.min(W-1,Math.floor(sx))), y0=Math.max(0,Math.min(H-1,Math.floor(sy)));
      const x1=Math.min(x0+1,W-1), y1=Math.min(y0+1,H-1);
      const fx=sx-x0,fy=sy-y0;
      const oi=(py*size+px2)*4;
      for(let c=0;c<ch;c++){
        const tl=pixels[(y0*W+x0)*ch+c],tr=pixels[(y0*W+x1)*ch+c];
        const bl=pixels[(y1*W+x0)*ch+c],br=pixels[(y1*W+x1)*ch+c];
        const v=Math.round(tl*(1-fx)*(1-fy)+tr*fx*(1-fy)+bl*(1-fx)*fy+br*fx*fy);
        const srcA=ch===4?Math.round(pixels[(y0*W+x0)*ch+3]*(1-fx)*(1-fy)+pixels[(y0*W+x1)*ch+3]*fx*(1-fy)+pixels[(y1*W+x0)*ch+3]*(1-fx)*fy+pixels[(y1*W+x1)*ch+3]*fx*fy):255;
        if(c<3){
          const a=srcA/255,bg=bgA/255;
          const oa=a+bg*(1-a);
          if(oa>0) out[oi+c]=Math.round((v*a+[bgR,bgG,bgB][c]*bg*(1-a))/oa);
        } else out[oi+3]=Math.round(Math.max(srcA,(oi+3<out.length?out[oi+3]:0)));
      }
      if(ch===3) out[oi+3]=255;
    }
  }

  return {W:size,H:size,ch:4,colorType:6,pixels:out};
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATION ICON (96×96, généré programmatiquement)
// ─────────────────────────────────────────────────────────────────────────────

function generateNotificationIcon() {
  const W=96, H=96;
  const rgba=new Uint8Array(W*H*4); // tout transparent

  function dot(x,y){
    if(x<0||x>=W||y<0||y>=H) return;
    const i=(y*W+x)*4; rgba[i]=rgba[i+1]=rgba[i+2]=255; rgba[i+3]=255;
  }
  function line(x0,y0,x1,y1){
    let dx=Math.abs(x1-x0),dy=Math.abs(y1-y0),sx=x0<x1?1:-1,sy=y0<y1?1:-1,err=dx-dy;
    while(true){dot(x0,y0);if(x0===x1&&y0===y1)break;const e2=2*err;if(e2>-dy){err-=dy;x0+=sx;}if(e2<dx){err+=dx;y0+=sy;}}
  }
  function thickLine(x0,y0,x1,y1,t){
    const dx=x1-x0,dy=y1-y0,len=Math.sqrt(dx*dx+dy*dy)||1,nx=dy/len,ny=-dx/len;
    for(let i=-Math.floor(t/2);i<=Math.floor(t/2);i++) line(x0+Math.round(nx*i),y0+Math.round(ny*i),x1+Math.round(nx*i),y1+Math.round(ny*i));
  }
  function fillRect(x,y,w,h){ for(let dy=0;dy<h;dy++) for(let dx=0;dx<w;dx++) dot(x+dx,y+dy); }
  function circle(cx,cy,r){ for(let dy=-r;dy<=r;dy++) for(let dx=-r;dx<=r;dx++) if(dx*dx+dy*dy<=r*r) dot(cx+dx,cy+dy); }
  function fillRR(x0,y0,w,h,r){
    for(let dy=0;dy<h;dy++) for(let dx=0;dx<w;dx++){
      let ok=true;
      if(dx<r&&dy<r)           ok=(dx-r)**2+(dy-r)**2<=r*r;
      else if(dx>=w-r&&dy<r)   ok=(dx-(w-1-r))**2+(dy-r)**2<=r*r;
      else if(dx<r&&dy>=h-r)   ok=(dx-r)**2+(dy-(h-1-r))**2<=r*r;
      else if(dx>=w-r&&dy>=h-r) ok=(dx-(w-1-r))**2+(dy-(h-1-r))**2<=r*r;
      if(ok) dot(x0+dx,y0+dy);
    }
  }
  function clearRR(x0,y0,w,h,r){
    for(let dy=0;dy<h;dy++) for(let dx=0;dx<w;dx++){
      let ok=true;
      if(dx<r&&dy<r)           ok=(dx-r)**2+(dy-r)**2<=r*r;
      else if(dx>=w-r&&dy<r)   ok=(dx-(w-1-r))**2+(dy-r)**2<=r*r;
      else if(dx<r&&dy>=h-r)   ok=(dx-r)**2+(dy-(h-1-r))**2<=r*r;
      else if(dx>=w-r&&dy>=h-r) ok=(dx-(w-1-r))**2+(dy-(h-1-r))**2<=r*r;
      if(!ok) continue;
      const x=x0+dx,y=y0+dy;
      if(x<0||x>=W||y<0||y>=H) continue;
      const i=(y*W+x)*4; rgba[i]=rgba[i+1]=rgba[i+2]=rgba[i+3]=0;
    }
  }

  // ── Tablette pleine (cadre + séparateurs) ────────────────
  // Layout : tablette 2→93, bordure 10px, séparateur 8px
  // Tuiles 32×32 aux positions : TL(12,12) TR(52,12) BL(12,52) BR(52,52)
  fillRR(2, 2, 92, 92, 14);

  // ── Découpe des 4 tuiles ────────────────────────────────
  clearRR(12,12,32,32,7);  // TL
  clearRR(52,12,32,32,7);  // TR
  clearRR(12,52,32,32,7);  // BL
  clearRR(52,52,32,32,7);  // BR

  // ── Icônes blanches dans chaque tuile ───────────────────
  // Centres : TL=(28,28)  TR=(68,28)  BL=(28,68)  BR=(68,68)

  // TL — Camion (transport)
  fillRect(17,23,10,8);    // cargo box
  fillRect(27,25, 5,6);    // cabine avant
  circle(21,33,2);          // roue gauche
  circle(29,33,2);          // roue droite
  line(14,25,16,25);        // trait de vitesse 1
  line(13,28,15,28);        // trait de vitesse 2
  line(14,31,16,31);        // trait de vitesse 3

  // TR — Outils croisés (services)
  thickLine(61,36,75,22,3); // outil gauche-bas → droite-haut
  thickLine(61,22,75,36,3); // outil gauche-haut → droite-bas

  // BL — Panier (marketplace)
  fillRect(19,62,15,9);    // panier
  line(19,62,17,57);       // poignée gauche
  line(17,57,33,57);       // poignée haut
  line(33,57,33,62);       // poignée droite
  circle(22,74,2);          // roue gauche
  circle(30,74,2);          // roue droite

  // BR — Nœuds / hub (connectivité)
  circle(68,68,3);                           // hub central
  line(68,63,68,58); circle(68,56,2);       // nœud haut
  line(63,68,58,68); circle(56,68,2);       // nœud gauche
  line(73,68,78,68); circle(80,68,2);       // nœud droite
  line(68,73,68,78); circle(68,80,2);       // nœud bas

  const raw=[]; for(let y=0;y<H;y++){raw.push(0);for(let x=0;x<W;x++){const i=(y*W+x)*4;raw.push(rgba[i],rgba[i+1],rgba[i+2],rgba[i+3]);}}
  const ihdr=Buffer.allocUnsafe(13); ihdr.writeUInt32BE(W,0);ihdr.writeUInt32BE(H,4);ihdr[8]=8;ihdr[9]=6;ihdr[10]=ihdr[11]=ihdr[12]=0;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),mkChunk('IHDR',ihdr),mkChunk('IDAT',zlib.deflateSync(Buffer.from(raw))),mkChunk('IEND',Buffer.alloc(0))]);
}

// ─────────────────────────────────────────────────────────────────────────────
// PIPELINE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

const FILES = [
  { src: 'icon-src.png',          dst: 'icon.png',          fillR:0xFF,fillG:0xFF,fillB:0xFF,fillA:255, fill:0.82 },
  { src: 'adaptive-icon-src.png', dst: 'adaptive-icon.png', fillR:0,   fillG:0,   fillB:0,   fillA:0,   fill:0.75 },
  { src: 'splash-src.png',        dst: 'splash.png',        fillR:0xFF,fillG:0xFF,fillB:0xFF,fillA:255, fill:0.70 },
];

let allPresent = true;
for(const {src} of FILES) {
  if(!fs.existsSync(path.join(ORIGINALS, src))) {
    console.error(`✗ Source manquante : assets/originals/${src}`);
    allPresent = false;
  }
}

if(!allPresent) {
  console.error('\nDéposez les fichiers sources dans mobile/assets/originals/ et relancez.');
  process.exit(1);
}

// Notification icon (généré programmatiquement)
const notifPath = path.join(ASSETS,'notification-icon.png');
fs.writeFileSync(notifPath, generateNotificationIcon());
console.log('✓ notification-icon.png  96×96  cadre + 4 tuiles');

// Images depuis les originaux
for(const {src,dst,fillR,fillG,fillB,fillA,fill} of FILES) {
  console.log(`\n→ ${dst}`);
  let img = decodePNG(fs.readFileSync(path.join(ORIGINALS, src)));
  console.log(`   source : ${img.W}×${img.H}  ch=${img.ch}`);
  if(fillA===0) img=toRGBA(img);
  removeBackground(img, fillR, fillG, fillB, fillA);
  const out = fitToSquare(img, 1024, fillR, fillG, fillB, fillA, fill);
  fs.writeFileSync(path.join(ASSETS, dst), encodePNG(out));
  const bg=fillA===0?'transparent':`#${fillR.toString(16).padStart(2,'0')}${fillG.toString(16).padStart(2,'0')}${fillB.toString(16).padStart(2,'0')}`;
  console.log(`   ✓ 1024×1024  fond=${bg}  fill=${(fill*100).toFixed(0)}%`);
}

console.log('\n✓ Pipeline terminé');
