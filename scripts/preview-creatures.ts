// Renders every creature (front, back, icon) to a preview sheet: npx vite-node scripts/preview-creatures.ts out.png
import { writeFileSync } from 'node:fs';
import { CREATURE_ART } from '../src/art/creatureArt';
import { rasterize } from '../src/art/raster';
import { encodePng } from './png';

const ids = Object.keys(CREATURE_ART);
const S = 3; // upscale
const cell = 64 * S + 8;
const cols = 6;
const rows = Math.ceil(ids.length / cols) * 2;
const W = cols * cell, H = rows * cell;
const img = new Uint8ClampedArray(W * H * 4);
for (let i = 0; i < W * H; i++) { img[i * 4] = 236; img[i * 4 + 1] = 232; img[i * 4 + 2] = 220; img[i * 4 + 3] = 255; }
ids.forEach((id, n) => {
  const views = [rasterize(CREATURE_ART[id], { size: 64, view: 'front' }), rasterize(CREATURE_ART[id], { size: 64, view: 'back', mirror: true })];
  const icon = rasterize(CREATURE_ART[id], { size: 32, view: 'front' });
  views.forEach((px, v) => {
    const ox = (n % cols) * cell + 4, oy = (Math.floor(n / cols) * 2 + v) * cell + 4;
    for (let y = 0; y < 64 * S; y++) for (let x = 0; x < 64 * S; x++) {
      const si = (Math.floor(y / S) * 64 + Math.floor(x / S)) * 4;
      if (!px.data[si + 3]) continue;
      const di = ((oy + y) * W + ox + x) * 4;
      img[di] = px.data[si]; img[di + 1] = px.data[si + 1]; img[di + 2] = px.data[si + 2];
    }
    if (v === 0) for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
      const si = (Math.floor(y / 2) * 32 + Math.floor(x / 2)) * 4;
      if (!icon.data[si + 3]) continue;
      const di = ((oy + y) * W + ox + 64 * S - 64 + x) * 4;
      img[di] = icon.data[si]; img[di + 1] = icon.data[si + 1]; img[di + 2] = icon.data[si + 2];
    }
  });
});
writeFileSync(process.argv[2] ?? 'creatures.png', encodePng(W, H, img));
