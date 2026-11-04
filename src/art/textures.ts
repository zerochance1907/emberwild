import Phaser from 'phaser';
import { SPECIES_LIST } from '../data/creatures';
import { MAPS } from '../data/maps';
import { CREATURE_ART } from './creatureArt';
import { charFrame, DIRS, drawCharacter, LOOKS } from './characters';
import { makePixels, Pen } from './pixels';
import { rasterize, type Pixels } from './raster';
import { buildTileset, type Tileset } from './tileset';

export let TILESET: Tileset;

function toCanvas(px: Pixels): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = px.w;
  c.height = px.h;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(px.w, px.h);
  img.data.set(px.data);
  ctx.putImageData(img, 0, 0);
  return c;
}

export function addPixels(scene: Phaser.Scene, key: string, px: Pixels, frameW?: number, frameH?: number) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.addCanvas(key, toCanvas(px))!;
  if (frameW && frameH) {
    let i = 0;
    for (let y = 0; y + frameH <= px.h; y += frameH)
      for (let x = 0; x + frameW <= px.w; x += frameW) tex.add(i++, 0, x, y, frameW, frameH);
  }
  return tex;
}

function draw(scene: Phaser.Scene, key: string, w: number, h: number, fn: (p: Pen) => void, frames = 1) {
  const px = makePixels(w * frames, h);
  for (let f = 0; f < frames; f++) fn(new Pen(px, f * w, 0, w, h));
  addPixels(scene, key, px, frames > 1 ? w : undefined, frames > 1 ? h : undefined);
}

/** Generates every texture in the game from code. */
export function generateTextures(scene: Phaser.Scene) {
  TILESET = buildTileset(Object.values(MAPS));
  addPixels(scene, 'tiles', TILESET.pixels);
  // the front blades of tall grass, drawn over the player's legs
  const tallIdx = [...TILESET.index.entries()].find(([k]) => k.startsWith('tall:'))?.[1] ?? 0;
  const over = makePixels(16, 16);
  const cols = TILESET.pixels.w / 16;
  for (let y = 9; y < 16; y++) for (let x = 0; x < 16; x++) {
    const si = (((Math.floor(tallIdx / cols) * 16) + y) * TILESET.pixels.w + (tallIdx % cols) * 16 + x) * 4;
    over.data.set(TILESET.pixels.data.subarray(si, si + 4), (y * 16 + x) * 4);
  }
  addPixels(scene, 'grass_over', over);

  for (const [id, look] of Object.entries(LOOKS)) {
    const px = makePixels(16 * 3, 16 * 4);
    for (const d of DIRS) for (let f = 0; f < 3; f++) {
      const i = charFrame(d, f);
      drawCharacter(new Pen(px, (i % 3) * 16, Math.floor(i / 3) * 16), look, d, f);
    }
    addPixels(scene, `char_${id}`, px, 16, 16);
  }

  for (const sp of SPECIES_LIST) {
    const art = CREATURE_ART[sp.id];
    addPixels(scene, `cf_${sp.id}`, rasterize(art, { size: 64, view: 'front' }));
    addPixels(scene, `cb_${sp.id}`, rasterize(art, { size: 64, view: 'back', mirror: true }));
    addPixels(scene, `ci_${sp.id}`, rasterize(art, { size: 32, view: 'front' }));
  }

  // Bond Stone (and Kin Stone) — a warm glowing pebble with a band
  const stone = (body: number, band: number) => (p: Pen) => {
    p.ellipse(6, 6.5, 5.5, 5, body);
    p.ellipse(4.5, 4.5, 2, 1.5, 0xffffff);
    p.rect(1, 6, 11, 2, band);
    p.circle(6, 7, 1.6, 0xfff4d0);
    p.outline(0x2a1a24);
  };
  draw(scene, 'bond_stone', 13, 14, stone(0xff8a3a, 0x8a3a2a));
  draw(scene, 'kin_stone', 13, 14, stone(0x7ab8ff, 0x2a4a8a));

  draw(scene, 'shadow', 14, 6, (p) => p.ellipse(7, 3, 7, 3, 0x000000));
  draw(scene, 'emote', 10, 14, (p) => {
    p.rect(1, 0, 8, 12, 0xffffff);
    p.rect(4, 2, 2, 5, 0xe8402a);
    p.rect(4, 8, 2, 2, 0xe8402a);
    p.outline(0x1a1424);
  });
  draw(scene, 'lantern', 16, 16, (p) => {
    const lit = p.ox > 0;
    p.rect(7, 9, 2, 7, 0x3a3048);
    p.rect(4, 2, 8, 8, 0x3a3048);
    p.rect(5, 3, 6, 6, lit ? 0xffd86a : 0x5a5070);
    if (lit) { p.rect(6, 4, 4, 4, 0xfff4c0); p.set(7, 5, 0xffffff); }
    p.rect(3, 1, 10, 2, 0x5a4a6a);
    p.outline(0x140f1c);
  }, 2);
  draw(scene, 'thorns', 16, 16, (p) => {
    for (let i = 0; i < 5; i++) {
      const x = 1 + i * 3;
      p.vline(x, 4 + (i % 2) * 2, 12, 0x4a2a3a);
      p.set(x - 1, 6 + i, 0x7a3a5a);
      p.set(x + 1, 9 - (i % 3), 0x7a3a5a);
    }
    p.ellipse(8, 10, 7, 5, 0x5a2a4a);
    for (let i = 0; i < 9; i++) p.set(2 + ((i * 5) % 12), 6 + ((i * 7) % 9), 0xb85a8a);
    p.outline(0x1a0f18);
  });
  draw(scene, 'item_ball', 12, 12, (p) => {
    p.circle(6, 6, 5, 0xffb03a);
    p.rect(1, 5, 10, 2, 0xa8502a);
    p.circle(6, 6, 1.6, 0xffffff);
    p.set(4, 3, 0xfff4c0);
    p.outline(0x2a1a24);
  });
  draw(scene, 'sparkle', 7, 7, (p) => {
    p.vline(3, 0, 7, 0xffffff);
    p.hline(0, 3, 7, 0xffffff);
    p.set(3, 3, 0xffffaa);
  });

  // particle shapes (white, tinted at runtime)
  draw(scene, 'px', 3, 3, (p) => p.fill(0xffffff));
  draw(scene, 'drop', 2, 9, (p) => p.fill(0xffffff));
  draw(scene, 'flame', 8, 10, (p) => { p.ellipse(4, 6.5, 3.5, 3.5, 0xffffff); p.ellipse(4, 3, 2, 3, 0xffffff); });
  draw(scene, 'leaf', 8, 5, (p) => { p.ellipse(4, 2.5, 4, 2.2, 0xffffff); });
  draw(scene, 'rock', 7, 6, (p) => { p.rect(1, 0, 5, 6, 0xffffff); p.rect(0, 1, 7, 4, 0xffffff); });
  draw(scene, 'orb', 9, 9, (p) => p.circle(4.5, 4.5, 4.5, 0xffffff));
  draw(scene, 'star', 9, 9, (p) => { p.vline(4, 0, 9, 0xffffff); p.hline(0, 4, 9, 0xffffff); p.rect(3, 3, 3, 3, 0xffffff); });
  draw(scene, 'bolt', 8, 14, (p) => {
    for (let y = 0; y < 14; y++) { const x = y < 7 ? 5 - Math.floor(y / 2) : 1 + Math.floor((y - 7) / 2); p.hline(x, y, 3, 0xffffff); }
  });
  draw(scene, 'ring', 24, 24, (p) => {
    for (let a = 0; a < 64; a++) p.set(12 + Math.cos((a / 64) * Math.PI * 2) * 11, 12 + Math.sin((a / 64) * Math.PI * 2) * 11, 0xffffff);
  });

  // soft round glow for darkness masks and lights
  const glow = document.createElement('canvas');
  glow.width = glow.height = 256;
  const g = glow.getContext('2d')!;
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.55, 'rgba(255,255,255,0.85)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  scene.textures.addCanvas('glow', glow);
}
