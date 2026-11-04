import type { Dir } from '../engine/save';
import { Pen } from './pixels';
import { shade } from './raster';

export interface Look {
  hair: number;
  skin: number;
  shirt: number;
  pants: number;
  shoes: number;
  hat?: number; // cap/hat colour
  hood?: number; // hood replaces hair
  mask?: number; // face mask colour (Veil)
  coat?: number; // long coat over shirt
  longHair?: boolean;
  beard?: number;
  pack?: number; // backpack
  trim?: number;
}

const SKIN = 0xf6c8a0, SKIN2 = 0xd89a6a, SKIN3 = 0xa86a44;

export const LOOKS: Record<string, Look> = {
  player: { hair: 0x3a2622, skin: SKIN, shirt: 0xe8562a, pants: 0x34446a, shoes: 0x2a2030, hat: 0xffc23a, pack: 0x7a4f2a },
  mom: { hair: 0x8a4a2a, skin: SKIN, shirt: 0x6aa0d8, pants: 0x6aa0d8, shoes: 0x5a3a2a, longHair: true },
  mentor: { hair: 0xd8d8e8, skin: SKIN2, shirt: 0x6a8aa8, pants: 0x3a3a4a, shoes: 0x2a2a2a, coat: 0xf4f4f8, longHair: true },
  kip: { hair: 0x2a6aa8, skin: SKIN, shirt: 0x4fa860, pants: 0x4a3a2a, shoes: 0x2a2030 },
  oldman: { hair: 0xc8c8c8, skin: SKIN2, shirt: 0x8a6a4a, pants: 0x5a4a3a, shoes: 0x2a2020, beard: 0xe0e0e0 },
  bram: { hair: 0xb8b8b8, skin: SKIN3, shirt: 0x5a7a4a, pants: 0x4a3a2a, shoes: 0x2a2020, beard: 0xd8d8d8, hat: 0x6a4a2a },
  girl: { hair: 0xe07aa0, skin: SKIN, shirt: 0xffd0e0, pants: 0xb85a8a, shoes: 0x5a2a3a, longHair: true },
  boy: { hair: 0x6a3a1a, skin: SKIN3, shirt: 0xffd23f, pants: 0x3a5a8a, shoes: 0x2a2030 },
  scout: { hair: 0x4a2a1a, skin: SKIN2, shirt: 0x8aa04a, pants: 0x5a4a2a, shoes: 0x2a2020, hat: 0x5a7a2a },
  forager: { hair: 0x3a5a2a, skin: SKIN, shirt: 0x6a9a4a, pants: 0x4a3a2a, shoes: 0x2a2020, hood: 0x4a7a3a },
  hiker: { hair: 0x5a3a2a, skin: SKIN3, shirt: 0xc8703a, pants: 0x6a5a3a, shoes: 0x3a2a1a, hat: 0x8a6a3a, pack: 0x5a6a3a, beard: 0x5a3a2a },
  birder: { hair: 0xe8c870, skin: SKIN, shirt: 0x5cc8c8, pants: 0xe8e8e8, shoes: 0x3a3a3a, hat: 0xffffff },
  veil: { hair: 0x1a1428, skin: SKIN2, shirt: 0x3a2a5a, pants: 0x221a34, shoes: 0x141020, hood: 0x2e2248, mask: 0xd8d0e8, trim: 0x8f5ce0 },
  agent: { hair: 0x1a1428, skin: SKIN2, shirt: 0x2a1a3a, pants: 0x1a1224, shoes: 0x141020, hood: 0x40205a, mask: 0xf0e8ff, trim: 0xff5a7a, coat: 0x2a1a3a },
  nurse: { hair: 0xff9ab8, skin: SKIN, shirt: 0xffffff, pants: 0xffffff, shoes: 0xd8d8e0, longHair: true, trim: 0xff7a2f },
  clerk: { hair: 0x2a2a2a, skin: SKIN2, shirt: 0x4f78c8, pants: 0x3a3a4a, shoes: 0x2a2a2a, coat: 0x4f78c8 },
  warden: { hair: 0xd8402a, skin: SKIN2, shirt: 0x3a2a2a, pants: 0x2a2020, shoes: 0x1a1414, coat: 0x6a3a2a, trim: 0xffc23a, longHair: true },
  apprentice: { hair: 0x8a5a3a, skin: SKIN, shirt: 0xa06a4a, pants: 0x4a3a2a, shoes: 0x2a2020, hat: 0xc04a2a },
  miner: { hair: 0x3a3a3a, skin: SKIN3, shirt: 0x5a6a8a, pants: 0x3a3a4a, shoes: 0x2a2a2a, hat: 0xffc23a },
};

/** Draw a 16x16 overworld character. frame 0 = stand, 1/2 = walk steps. */
export function drawCharacter(p: Pen, look: Look, dir: Dir, frame: number) {
  const L = look;
  const top = L.hood ?? L.hair;
  const bob = frame === 0 ? 0 : 1;
  const y0 = 1 + bob; // head top
  const body = L.coat ?? L.shirt;
  const side = dir === 'left' || dir === 'right';
  const flip = dir === 'right';
  const P = (x: number, y: number, c: number) => p.set(flip ? 15 - x : x, y, c);
  const R = (x: number, y: number, w: number, h: number, c: number) => {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) P(x + i, y + j, c);
  };

  // legs
  if (!side) {
    const lOff = frame === 1 ? -1 : 0, rOff = frame === 2 ? -1 : 0;
    R(5, 12 + lOff + bob, 2, 3 - bob, L.pants);
    R(9, 12 + rOff + bob, 2, 3 - bob, L.pants);
    R(5, 14 + lOff, 2, 1, L.shoes);
    R(9, 14 + rOff, 2, 1, L.shoes);
  } else {
    if (frame === 0) {
      R(6, 12, 4, 2, L.pants);
      R(6, 14, 4, 1, L.shoes);
    } else {
      const a = frame === 1 ? 0 : 1;
      R(5 + a * 3, 12 + bob, 2, 2, L.pants);
      R(8 - a * 3, 12 + bob, 2, 2, shade(L.pants, 0.8));
      R(4 + a * 4, 14, 3, 1, L.shoes);
      R(8 - a * 3, 14, 2, 1, shade(L.shoes, 0.8));
    }
  }
  // backpack (visible from up/side)
  if (L.pack && dir === 'up') R(4, 8 + bob, 8, 4, L.pack);
  if (L.pack && side) R(10, 8 + bob, 3, 4, L.pack);
  // body
  if (!side) {
    R(4, 8 + bob, 8, 4, body);
    R(4, 11 + bob, 8, 1, shade(body, 0.8));
    if (L.coat && dir === 'down') R(6, 8 + bob, 4, 4, L.shirt);
    if (L.trim) { R(4, 8 + bob, 1, 4, L.trim); R(11, 8 + bob, 1, 4, L.trim); }
    // arms swing
    const sw = frame === 1 ? 1 : frame === 2 ? -1 : 0;
    R(3, 8 + bob + Math.max(0, sw), 1, 3, body);
    R(12, 8 + bob + Math.max(0, -sw), 1, 3, body);
    P(3, 11 + bob + Math.max(0, sw), L.skin);
    P(12, 11 + bob + Math.max(0, -sw), L.skin);
    if (L.coat) { R(4, 12 + bob, 2, 1, L.coat); R(10, 12 + bob, 2, 1, L.coat); }
  } else {
    R(5, 8 + bob, 6, 4, body);
    R(5, 11 + bob, 6, 1, shade(body, 0.8));
    if (L.trim) R(5, 8 + bob, 1, 4, L.trim);
    const sw = frame === 0 ? 0 : frame === 1 ? -1 : 1;
    R(7 + sw, 9 + bob, 2, 3, shade(body, 0.85));
    P(7 + sw, 11 + bob, L.skin);
    if (L.coat) R(5, 12 + bob, 6, 1, L.coat);
  }
  // head
  R(4, y0 + 1, 8, 6, L.skin);
  R(5, y0, 6, 1, top);
  if (dir === 'down') {
    R(4, y0 + 1, 8, 2, top);
    P(4, y0 + 3, top);
    P(11, y0 + 3, top);
    if (L.hood) { R(3, y0 + 1, 1, 6, top); R(12, y0 + 1, 1, 6, top); }
    if (L.mask) { R(5, y0 + 3, 6, 3, L.mask); P(6, y0 + 4, 0x2a1a3a); P(9, y0 + 4, 0x2a1a3a); }
    else {
      P(6, y0 + 4, 0x2a1a24); P(6, y0 + 3, 0x2a1a24);
      P(9, y0 + 4, 0x2a1a24); P(9, y0 + 3, 0x2a1a24);
      P(5, y0 + 5, shade(L.skin, 0.92)); P(10, y0 + 5, shade(L.skin, 0.92));
    }
    if (L.beard) R(5, y0 + 5, 6, 2, L.beard);
    if (L.longHair) { R(3, y0 + 2, 1, 6, L.hair); R(12, y0 + 2, 1, 6, L.hair); }
  } else if (dir === 'up') {
    R(4, y0 + 1, 8, 6, top);
    R(5, y0 + 6, 6, 1, shade(top, 0.8));
    if (L.longHair) R(4, y0 + 6, 8, 2, L.hair);
    if (L.hood) { R(3, y0 + 1, 1, 6, top); R(12, y0 + 1, 1, 6, top); }
  } else {
    // facing left (mirrored for right)
    R(6, y0 + 1, 6, 3, top);
    R(9, y0 + 1, 3, 6, top);
    if (L.hood) R(12, y0 + 1, 1, 6, top);
    if (L.mask) { R(4, y0 + 3, 4, 3, L.mask); P(5, y0 + 4, 0x2a1a3a); }
    else { P(5, y0 + 4, 0x2a1a24); P(5, y0 + 3, 0x2a1a24); }
    if (L.beard) R(4, y0 + 5, 4, 2, L.beard);
    if (L.longHair) R(10, y0 + 2, 3, 7, L.hair);
  }
  if (L.hat) {
    R(4, y0 - 1, 8, 2, L.hat);
    R(5, y0 - 1, 6, 1, shade(L.hat, 1.2));
    if (dir === 'down') R(4, y0 + 1, 8, 1, shade(L.hat, 0.8));
    if (side) R(2, y0 + 1, 4, 1, shade(L.hat, 0.8));
  }
  p.outline(0x1a1424);
}

export const DIRS: Dir[] = ['down', 'up', 'left', 'right'];
/** Frame layout in a character sheet: row = dir, col = frame (0..2). */
export const charFrame = (dir: Dir, frame: number) => DIRS.indexOf(dir) * 3 + frame;
