// Renders every map (with characters) to PNGs: npx vite-node scripts/preview-maps.ts <outdir>
import { writeFileSync } from 'node:fs';
import { MAPS } from '../src/data/maps';
import { buildTileset, mapLayer, TILE } from '../src/art/tileset';
import { makePixels, Pen } from '../src/art/pixels';
import { drawCharacter, LOOKS } from '../src/art/characters';
import { encodePng } from './png';

const out = process.argv[2] ?? '.';
const ts = buildTileset(Object.values(MAPS));
console.log('tiles:', ts.index.size);
const S = 2;
for (const m of Object.values(MAPS)) {
  const { base } = mapLayer(m, ts);
  const W = m.rows[0].length * TILE, H = m.rows.length * TILE;
  const img = makePixels(W * S, H * S);
  const cols = ts.pixels.w / TILE;
  const blit = (sx: number, sy: number, dx: number, dy: number, src = ts.pixels, w = TILE) => {
    for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) {
      const si = ((sy + y) * src.w + sx + x) * 4;
      if (!src.data[si + 3]) continue;
      for (let a = 0; a < S; a++) for (let b = 0; b < S; b++) {
        const di = (((dy + y) * S + a) * img.w + (dx + x) * S + b) * 4;
        img.data.set(src.data.subarray(si, si + 4), di);
      }
    }
  };
  base.forEach((row, y) => row.forEach((t, x) => blit((t % cols) * TILE, Math.floor(t / cols) * TILE, x * TILE, y * TILE)));
  for (const n of m.npcs) {
    const c = makePixels(16, 16);
    drawCharacter(new Pen(c), LOOKS[n.look], n.dir, 0);
    blit(0, 0, n.x * TILE, n.y * TILE, c);
  }
  writeFileSync(`${out}/map-${m.id}.png`, encodePng(img.w, img.h, img.data));
}
// character sheet
const sheet = makePixels(16 * 12, 16 * Object.keys(LOOKS).length);
Object.values(LOOKS).forEach((look, r) => {
  (['down', 'up', 'left', 'right'] as const).forEach((d, di) => [0, 1, 2].forEach((f) => drawCharacter(new Pen(sheet, (di * 3 + f) * 16, r * 16), look, d, f)));
});
const big = makePixels(sheet.w * 3, sheet.h * 3);
for (let y = 0; y < big.h; y++) for (let x = 0; x < big.w; x++) {
  const si = (Math.floor(y / 3) * sheet.w + Math.floor(x / 3)) * 4;
  big.data.set(sheet.data[si + 3] ? sheet.data.subarray(si, si + 4) : [220, 220, 210, 255], (y * big.w + x) * 4);
}
writeFileSync(`${out}/chars.png`, encodePng(big.w, big.h, big.data));
