import { hash, Pen } from './pixels';
import { shade } from './raster';

/** Colour palette for the overworld. */
export const PAL = {
  grass: 0x6cbf4f, grassD: 0x52a33f, grassL: 0x8ad86a,
  tall: 0x3f9a3c, tallD: 0x2c7a30, tallL: 0x6cc757,
  path: 0xe0c08a, pathD: 0xc4a06a, pathL: 0xf0d6a4,
  water: 0x3d8fdb, waterD: 0x2a6fbf, waterL: 0x8fcdf5,
  sand: 0xf0dca0, sandD: 0xd8c080,
  tree: 0x3a9a44, treeD: 0x25703a, treeL: 0x62c25a, trunk: 0x7a4f2a,
  pine: 0x2c7a56, pineD: 0x1c5640, pineL: 0x46a070,
  wall: 0xf3e6cc, wallD: 0xcdb894, wood: 0xa8703f, woodD: 0x7d5030,
  cliff: 0xa08868, cliffD: 0x6e5a44, cliffL: 0xc4ac88,
  cave: 0x4a4058, caveD: 0x2e2638, caveL: 0x665a78, caveWall: 0x6a5a7e,
  floor: 0xe8c890, floorD: 0xc8a06a,
};

const ROOF: Record<string, [number, number, number]> = {
  R: [0xd8503f, 0xa83a30, 0xf07a5a],
  B: [0x4f78c8, 0x3a5aa0, 0x7aa0e8],
  G: [0x4fa860, 0x3a8048, 0x7ac888],
  N: [0xb86a3a, 0x8a4a28, 0xd8905a],
  U: [0x8a5ab8, 0x63408a, 0xb088d8],
  Y: [0x3aa8a0, 0x2a807a, 0x6ad0c8],
};

// ---------- tile families ----------

function grassBase(p: Pen, seed: number) {
  p.fill(PAL.grass);
  for (let i = 0; i < 7; i++) {
    const x = Math.floor(hash(i, seed, 1) * 15), y = Math.floor(hash(i, seed, 2) * 15);
    p.set(x, y, PAL.grassD);
    p.set(x + 1, y - 1, PAL.grassD);
  }
  for (let i = 0; i < 3; i++) p.set(Math.floor(hash(i, seed, 3) * 16), Math.floor(hash(i, seed, 4) * 16), PAL.grassL);
}

function tallGrass(p: Pen, frame: number) {
  p.fill(PAL.tallD);
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 4; col++) {
      const bx = col * 4 + (row % 2) * 2 - 1;
      const by = row * 5 + 5;
      const sway = frame === 1 && (row + col) % 2 === 0 ? 1 : 0;
      p.vline(bx + 1, by - 3, 4, PAL.tall);
      p.set(bx + sway, by - 4, PAL.tallL);
      p.set(bx + 2 + sway, by - 3, PAL.tallL);
      p.vline(bx + 2, by - 2, 3, PAL.tall);
      p.set(bx + 1 + sway, by - 4, PAL.tallL);
    }
  }
}

function pathTile(p: Pen, mask: number, seed: number) {
  p.fill(PAL.path);
  for (let i = 0; i < 6; i++) p.set(Math.floor(hash(i, seed, 5) * 16), Math.floor(hash(i, seed, 6) * 16), i < 3 ? PAL.pathD : PAL.pathL);
  // grass creeping in on sides without path neighbours
  const g = (x: number, y: number) => p.set(x, y, PAL.grass);
  for (let i = 0; i < 16; i++) {
    const n = hash(i, seed, 7) > 0.5 ? 1 : 0;
    if (!(mask & 1)) { g(i, 0); if (n) g(i, 1); }
    if (!(mask & 4)) { g(i, 15); if (n) g(i, 14); }
    if (!(mask & 8)) { g(0, i); if (n) g(1, i); }
    if (!(mask & 2)) { g(15, i); if (n) g(14, i); }
  }
}

function waterTile(p: Pen, mask: number, frame: number) {
  p.fill(PAL.water);
  for (let i = 0; i < 3; i++) {
    const y = 3 + i * 5;
    const x0 = ((i * 5 + frame * 3) % 12) + 1;
    p.hline(x0, y, 4, PAL.waterL);
    p.hline(x0 + 1, y + 1, 2, PAL.waterD);
  }
  const foam = frame ? PAL.waterL : 0xc8e8ff;
  if (!(mask & 1)) { p.hline(0, 0, 16, PAL.grassD); p.hline(0, 1, 16, foam); }
  if (!(mask & 4)) { p.hline(0, 15, 16, foam); }
  if (!(mask & 8)) { p.vline(0, 0, 16, PAL.grassD); p.vline(1, 0, 16, foam); }
  if (!(mask & 2)) { p.vline(15, 0, 16, PAL.grassD); p.vline(14, 0, 16, foam); }
}

function treeTile(p: Pen, pine: boolean, seed: number) {
  if (pine) {
    p.fill(PAL.pineD);
    const c = PAL.pine, d = PAL.pineD, l = PAL.pineL;
    p.rect(7, 12, 2, 4, PAL.trunk);
    for (let row = 0; row < 3; row++) {
      const top = row * 4, half = 3 + row * 2;
      for (let y = 0; y < 5; y++) {
        const hw = Math.floor((half * (y + 1)) / 5);
        p.hline(8 - hw, top + y, hw * 2, y === 4 ? d : c);
        p.set(8 - hw, top + y, l);
      }
    }
    if (hash(seed, 1) > 0.6) p.set(5, 9, l);
    return;
  }
  grassBase(p, seed);
  p.rect(6, 11, 4, 5, PAL.trunk);
  p.vline(9, 11, 5, shade(PAL.trunk, 0.7));
  p.ellipse(8, 7, 7.5, 6.5, PAL.treeD);
  p.ellipse(7.5, 6.5, 6.5, 5.5, PAL.tree);
  p.ellipse(6, 4.5, 3, 2, PAL.treeL);
  p.set(10, 8, PAL.treeD);
  p.set(4, 9, PAL.treeD);
  p.set(11, 5, PAL.treeL);
}

function roofTile(p: Pen, color: string, mask: number) {
  const [c, d, l] = ROOF[color] ?? ROOF.R;
  p.fill(c);
  for (let y = 2; y < 16; y += 4) p.hline(0, y, 16, d);
  for (let y = 0; y < 16; y += 4) for (let x = (y / 4) % 2 ? 0 : 4; x < 16; x += 8) p.vline(x, y + 3, 1, d);
  if (!(mask & 1)) { p.hline(0, 0, 16, l); p.hline(0, 1, 16, l); }
  if (!(mask & 4)) { p.hline(0, 14, 16, d); p.hline(0, 15, 16, shade(d, 0.6)); }
  if (!(mask & 8)) p.vline(0, 0, 16, shade(d, 0.6));
  if (!(mask & 2)) p.vline(15, 0, 16, shade(d, 0.6));
}

function wallTile(p: Pen, kind: 'wall' | 'window' | 'door', mask: number) {
  p.fill(PAL.wall);
  for (let y = 3; y < 16; y += 4) p.hline(0, y, 16, PAL.wallD);
  if (!(mask & 8)) p.vline(0, 0, 16, PAL.woodD);
  if (!(mask & 2)) p.vline(15, 0, 16, PAL.woodD);
  p.hline(0, 15, 16, shade(PAL.wallD, 0.8));
  if (kind === 'window') {
    p.rect(3, 3, 10, 9, PAL.woodD);
    p.rect(4, 4, 8, 7, 0x8fd0f5);
    p.rect(4, 4, 3, 2, 0xe0f4ff);
    p.vline(8, 4, 7, PAL.woodD);
    p.hline(4, 7, 8, PAL.woodD);
    p.hline(2, 12, 12, PAL.wood);
  } else if (kind === 'door') {
    p.rect(3, 2, 10, 14, PAL.woodD);
    p.rect(4, 3, 8, 13, PAL.wood);
    p.vline(8, 3, 13, PAL.woodD);
    p.set(10, 10, 0xffd23f);
    p.set(6, 10, 0xffd23f);
    p.rect(4, 3, 8, 1, shade(PAL.wood, 1.2));
  }
}

function fenceTile(p: Pen, seed: number, mask: number) {
  grassBase(p, seed);
  const w = PAL.wood, d = PAL.woodD;
  p.rect(6, 3, 4, 12, w);
  p.vline(9, 3, 12, d);
  p.hline(6, 3, 4, shade(w, 1.2));
  const x0 = mask & 8 ? 0 : 6, x1 = mask & 2 ? 16 : 10;
  p.rect(x0, 6, x1 - x0, 2, w);
  p.rect(x0, 11, x1 - x0, 2, w);
  p.hline(x0, 8, x1 - x0, d);
  p.hline(x0, 13, x1 - x0, d);
}

function ledgeTile(p: Pen, seed: number) {
  grassBase(p, seed);
  p.rect(0, 9, 16, 4, PAL.cliffL);
  p.rect(0, 12, 16, 2, PAL.cliffD);
  p.hline(0, 9, 16, PAL.grassD);
  for (let x = 1; x < 16; x += 4) p.set(x, 11, PAL.cliffD);
}

function cliffTile(p: Pen, mask: number, seed: number) {
  p.fill(PAL.cliff);
  for (let i = 0; i < 6; i++) {
    const x = Math.floor(hash(i, seed, 9) * 13), y = Math.floor(hash(i, seed, 10) * 13);
    p.hline(x, y, 3, PAL.cliffD);
    p.hline(x, y - 1, 3, PAL.cliffL);
  }
  if (!(mask & 1)) { p.hline(0, 0, 16, PAL.grassD); p.hline(0, 1, 16, PAL.cliffL); }
  if (!(mask & 4)) { p.hline(0, 14, 16, PAL.cliffD); p.hline(0, 15, 16, shade(PAL.cliffD, 0.6)); }
  if (!(mask & 8)) p.vline(0, 0, 16, PAL.cliffD);
  if (!(mask & 2)) p.vline(15, 0, 16, PAL.cliffD);
}

function signTile(p: Pen, seed: number, base: 'grass' | 'path' | 'cave' | 'ruin' | 'rock') {
  if (base === 'grass') grassBase(p, seed);
  else if (base === 'cave') caveFloor(p, seed);
  else if (base === 'ruin') ruinFloor(p, seed, false);
  else if (base === 'rock') rockTile(p, seed);
  else pathTile(p, 15, seed);
  p.rect(7, 9, 2, 6, PAL.woodD);
  p.rect(2, 3, 12, 7, PAL.woodD);
  p.rect(3, 4, 10, 5, PAL.wood);
  p.hline(4, 5, 8, PAL.woodD);
  p.hline(4, 7, 6, PAL.woodD);
}

function flowerTile(p: Pen, seed: number, frame: number) {
  grassBase(p, seed);
  const cols = [0xff7a9a, 0xffe14a, 0xffffff, 0xb08aff];
  for (let i = 0; i < 4; i++) {
    const x = 2 + (i % 2) * 8 + (frame && i % 2 === 0 ? 1 : 0), y = 2 + Math.floor(i / 2) * 8;
    const c = cols[Math.floor(hash(i, seed, 11) * cols.length)];
    p.set(x + 1, y, c); p.set(x, y + 1, c); p.set(x + 2, y + 1, c); p.set(x + 1, y + 2, c);
    p.set(x + 1, y + 1, 0xffd23f);
    p.set(x + 1, y + 3, PAL.grassD);
  }
}

function sandTile(p: Pen, seed: number) {
  p.fill(PAL.sand);
  for (let i = 0; i < 6; i++) p.set(Math.floor(hash(i, seed, 12) * 16), Math.floor(hash(i, seed, 13) * 16), PAL.sandD);
}

function bushTile(p: Pen, seed: number) {
  grassBase(p, seed);
  p.ellipse(8, 9, 7, 6, PAL.treeD);
  p.ellipse(7.5, 8.5, 6, 5, PAL.tree);
  p.ellipse(6, 6.5, 2.5, 1.6, PAL.treeL);
  p.set(10, 10, 0xff6a7a);
  p.set(5, 11, 0xff6a7a);
}

function lampTile(p: Pen, seed: number) {
  pathTile(p, 15, seed);
  p.rect(7, 5, 2, 10, 0x3a3a48);
  p.rect(5, 1, 6, 5, 0x3a3a48);
  p.rect(6, 2, 4, 3, 0xffe58a);
  p.rect(5, 14, 6, 2, 0x2a2a38);
}

function caveFloor(p: Pen, seed: number) {
  p.fill(PAL.cave);
  for (let i = 0; i < 6; i++) {
    const x = Math.floor(hash(i, seed, 14) * 15), y = Math.floor(hash(i, seed, 15) * 15);
    p.set(x, y, i % 2 ? PAL.caveD : PAL.caveL);
  }
}

function caveWall(p: Pen, mask: number, seed: number) {
  p.fill(PAL.caveWall);
  for (let i = 0; i < 5; i++) {
    const x = Math.floor(hash(i, seed, 16) * 12), y = Math.floor(hash(i, seed, 17) * 12);
    p.hline(x, y, 4, shade(PAL.caveWall, 0.75));
    p.hline(x + 1, y + 1, 2, shade(PAL.caveWall, 1.15));
  }
  if (!(mask & 4)) { p.rect(0, 12, 16, 4, shade(PAL.caveWall, 0.6)); p.hline(0, 15, 16, PAL.caveD); }
  if (!(mask & 1)) p.hline(0, 0, 16, shade(PAL.caveWall, 1.25));
  if (!(mask & 8)) p.vline(0, 0, 16, shade(PAL.caveWall, 0.7));
  if (!(mask & 2)) p.vline(15, 0, 16, shade(PAL.caveWall, 0.7));
}

function boulderTile(p: Pen, seed: number, cave: boolean) {
  if (cave) caveFloor(p, seed); else grassBase(p, seed);
  p.ellipse(8, 9.5, 7, 6, 0x6e6478);
  p.ellipse(7.5, 9, 6, 5, 0x9a90a8);
  p.ellipse(5.5, 7, 2.5, 1.5, 0xc0b8cc);
  p.hline(4, 14, 9, 0x2e2638);
}

function crystalTile(p: Pen, seed: number, frame: number) {
  caveFloor(p, seed);
  const c = frame ? 0x9ff0ff : 0x7fd8ff;
  const d = 0x3a8ab8;
  for (const [x, h] of [[4, 8], [8, 12], [12, 7]] as const) {
    for (let y = 0; y < h; y++) {
      const w = y < 2 ? 1 : 2;
      p.hline(x - (w > 1 ? 1 : 0), 15 - h + y, w + 1, y < 2 ? 0xffffff : c);
      p.set(x + 1, 15 - h + y, d);
    }
  }
}

function caveEntrance(p: Pen, seed: number) {
  cliffTile(p, 15, seed);
  p.ellipse(8, 12, 7, 10, 0x1a1420);
  p.rect(1, 12, 14, 4, 0x1a1420);
}

function bridgeTile(p: Pen) {
  p.fill(PAL.water);
  p.rect(1, 0, 14, 16, PAL.wood);
  for (let y = 0; y < 16; y += 4) p.hline(1, y + 3, 14, PAL.woodD);
  p.vline(1, 0, 16, PAL.woodD);
  p.vline(14, 0, 16, PAL.woodD);
}

// ---------- interiors ----------
function woodFloor(p: Pen, seed: number) {
  p.fill(PAL.floor);
  for (let y = 0; y < 16; y += 4) {
    p.hline(0, y + 3, 16, PAL.floorD);
    p.vline(((y / 4) % 2) * 8 + Math.floor(hash(y, seed, 20) * 4), y, 3, PAL.floorD);
  }
}
function tileFloor(p: Pen) {
  p.fill(0xe8eef4);
  p.rect(0, 0, 8, 8, 0xd4dee8);
  p.rect(8, 8, 8, 8, 0xd4dee8);
}
function iwall(p: Pen, window: boolean) {
  p.fill(0xb8d0a8);
  for (let x = 0; x < 16; x += 4) p.vline(x, 0, 12, 0xa4bc94);
  p.rect(0, 12, 16, 4, PAL.woodD);
  p.hline(0, 12, 16, PAL.wood);
  if (window) {
    p.rect(3, 2, 10, 8, PAL.woodD);
    p.rect(4, 3, 8, 6, 0x9fd8f8);
    p.rect(4, 3, 3, 2, 0xe8f6ff);
  }
}
function furniture(p: Pen, kind: string, seed: number) {
  woodFloor(p, seed);
  switch (kind) {
    case 'bookshelf':
      p.rect(1, 0, 14, 16, PAL.woodD);
      for (let s = 0; s < 3; s++) {
        p.rect(2, 1 + s * 5, 12, 4, 0x4a3020);
        for (let b = 0; b < 6; b++) p.rect(2 + b * 2, 1 + s * 5 + (b % 3 === 0 ? 1 : 0), 2, 4 - (b % 3 === 0 ? 1 : 0), [0xd8503f, 0x4f78c8, 0x4fa860, 0xffd23f, 0x8a5ab8, 0xf0f0f0][(b + s + seed) % 6]);
      }
      break;
    case 'counter':
      p.rect(0, 3, 16, 13, PAL.woodD);
      p.rect(0, 3, 16, 4, 0xe8d8b8);
      p.hline(0, 7, 16, PAL.wood);
      break;
    case 'pc':
      p.rect(2, 2, 12, 13, 0x58607a);
      p.rect(3, 3, 10, 7, 0x2a3a5a);
      p.rect(4, 4, 8, 5, 0x5ae0c0);
      p.rect(4, 4, 3, 1, 0xc0fff0);
      p.rect(3, 11, 10, 2, 0x3a4058);
      break;
    case 'table':
      p.rect(1, 4, 14, 8, PAL.woodD);
      p.rect(1, 3, 14, 7, PAL.wood);
      p.rect(2, 12, 2, 4, PAL.woodD);
      p.rect(12, 12, 2, 4, PAL.woodD);
      p.rect(6, 4, 4, 3, 0xffffff);
      break;
    case 'bed':
      p.rect(1, 0, 14, 16, PAL.woodD);
      p.rect(2, 1, 12, 14, 0xf0f0f8);
      p.rect(2, 6, 12, 9, 0x5a8ad8);
      p.hline(2, 6, 12, 0x88b0f0);
      p.rect(4, 2, 8, 3, 0xffffff);
      break;
    case 'heal':
      p.rect(1, 2, 14, 13, 0xe8e0f0);
      p.rect(2, 3, 12, 6, 0x5a4870);
      for (let i = 0; i < 3; i++) p.ellipse(4 + i * 4, 6, 1.6, 1.6, 0xff8a5a);
      p.rect(2, 10, 12, 4, 0xd0c8dc);
      p.rect(6, 11, 4, 2, 0xff7a2f);
      break;
    case 'plant':
      p.rect(5, 10, 6, 6, 0xc0703a);
      p.hline(5, 10, 6, 0xe0905a);
      p.ellipse(8, 6, 5, 5, PAL.treeD);
      p.ellipse(7.5, 5.5, 4, 4, PAL.tree);
      p.set(6, 4, PAL.treeL);
      break;
    case 'crate':
      p.rect(1, 2, 14, 13, PAL.woodD);
      p.rect(2, 3, 12, 11, PAL.wood);
      p.hline(2, 8, 12, PAL.woodD);
      p.vline(8, 3, 11, PAL.woodD);
      break;
    case 'shelf':
      p.rect(0, 0, 16, 16, PAL.woodD);
      for (let s = 0; s < 3; s++) {
        p.rect(1, 1 + s * 5, 14, 4, 0x4a3020);
        for (let b = 0; b < 4; b++) p.ellipse(3 + b * 3.4, 3 + s * 5, 1.4, 1.6, [0xff7a9a, 0x8fd0f5, 0xffe14a, 0x6fd64a][(b + s) % 4]);
      }
      break;
    case 'machine':
      p.rect(1, 1, 14, 14, 0x7a8098);
      p.rect(2, 2, 12, 5, 0x2a3048);
      p.hline(3, 4, 8, 0x6aff9a);
      p.set(12, 4, 0xff5a5a);
      p.rect(3, 9, 4, 4, 0xa0a8c0);
      p.rect(9, 9, 4, 4, 0xa0a8c0);
      break;
    case 'rug':
      p.rect(0, 1, 16, 14, 0xc04a5a);
      p.rect(2, 3, 12, 10, 0xd86a6a);
      p.rect(5, 6, 6, 4, 0xffd23f);
      break;
    case 'mat':
      p.rect(2, 4, 12, 10, 0x8a5a3a);
      p.rect(3, 5, 10, 8, 0xb07a4a);
      p.hline(4, 9, 8, 0x8a5a3a);
      break;
    case 'pedestal':
      p.rect(3, 6, 10, 10, 0xb0a8c0);
      p.rect(2, 5, 12, 3, 0xd8d0e8);
      p.ellipse(8, 4, 3.4, 3.4, 0xff7a2f);
      p.ellipse(7, 3, 1.2, 1.2, 0xffe0a0);
      break;
    case 'stove':
      p.rect(1, 2, 14, 14, 0x585868);
      p.rect(2, 3, 12, 4, 0x3a3a48);
      p.ellipse(5, 5, 2, 1.4, 0xff6a3a);
      p.ellipse(11, 5, 2, 1.4, 0xff6a3a);
      p.rect(3, 9, 10, 5, 0x3a3a48);
      break;
  }
}

function stoneFloor(p: Pen, seed: number) {
  p.fill(0xb8a890);
  for (let y = 0; y < 16; y += 8) {
    p.hline(0, y + 7, 16, 0x8a7a64);
    p.vline((y / 8) % 2 ? 4 : 12, y, 7, 0x8a7a64);
  }
  if (hash(seed, 3) > 0.7) p.set(6, 3, 0xd8c8b0);
}

function lavaTile(p: Pen, frame: number) {
  p.fill(0xe0501f);
  for (let i = 0; i < 4; i++) p.ellipse((i * 5 + frame * 2) % 16, 4 + (i % 2) * 8, 2.5, 1.5, 0xffb03a);
  p.set((7 + frame * 5) % 16, 9, 0xfff0a0);
}

// ---------- Chapter Two ----------
const MUD = 0x7a6448, MUD_D = 0x5e4a34, MUD_L = 0x947c5c;
const RUIN = 0x8a8ea8, RUIN_D = 0x5e6280, RUIN_L = 0xb4b8cc;
const ROCK = 0x9a8c80, ROCK_D = 0x75685e, ROCK_L = 0xbcae9e;

function mudTile(p: Pen, seed: number) {
  p.fill(MUD);
  for (let i = 0; i < 6; i++) p.set(Math.floor(hash(i, seed, 30) * 16), Math.floor(hash(i, seed, 31) * 16), i % 2 ? MUD_D : MUD_L);
  if (hash(seed, 32) > 0.4) { p.ellipse(4 + hash(seed, 33) * 8, 9, 3, 1.4, 0x5a7a8a); p.hline(4, 9, 3, 0x8aaabb); }
}

function reedTile(p: Pen, seed: number, frame: number) {
  mudTile(p, seed);
  for (let i = 0; i < 5; i++) {
    const x = 1 + i * 3, h = 9 + ((i * 7 + seed) % 4);
    const sway = frame && i % 2 ? 1 : 0;
    p.vline(x + sway, 16 - h, h, i % 2 ? 0x6a9a3a : 0x86b84a);
    if (i % 2 === 0) { p.rect(x - 1 + sway, 16 - h - 1, 3, 4, 0x8a5a2a); p.set(x + sway, 16 - h - 2, 0xb8d890); }
  }
}

function dockTile(p: Pen) {
  p.fill(0x9a6a3a);
  for (let y = 0; y < 16; y += 4) { p.hline(0, y + 3, 16, 0x6a4424); p.set((y * 3) % 16, y + 1, 0x5a3a20); }
  p.hline(0, 0, 16, 0xb88a52);
}

function ruinWall(p: Pen, mask: number, seed: number) {
  p.fill(RUIN);
  for (let y = 0; y < 16; y += 5) {
    p.hline(0, y + 4, 16, RUIN_D);
    for (let x = (y / 5) % 2 ? 2 : 6; x < 16; x += 8) p.vline(x, y, 4, RUIN_D);
    p.hline(0, y, 16, RUIN_L);
  }
  if (hash(seed, 40) > 0.55) { p.ellipse(4 + hash(seed, 41) * 8, 13, 3, 2, 0x5a8a4a); p.set(5, 12, 0x7ab85a); }
  if (!(mask & 4)) { p.rect(0, 13, 16, 3, RUIN_D); p.hline(0, 15, 16, 0x3a3e58); }
  if (!(mask & 8)) p.vline(0, 0, 16, RUIN_D);
  if (!(mask & 2)) p.vline(15, 0, 16, RUIN_D);
}

function ruinFloor(p: Pen, seed: number, tufts: boolean) {
  p.fill(0xa8a4b8);
  p.hline(0, 7, 16, 0x8a86a0);
  p.hline(0, 15, 16, 0x8a86a0);
  p.vline(Math.floor(hash(seed, 42) * 8) + 2, 0, 7, 0x8a86a0);
  p.vline(Math.floor(hash(seed, 43) * 8) + 6, 8, 7, 0x8a86a0);
  if (hash(seed, 44) > 0.6) { p.set(10, 4, 0x6a6680); p.set(11, 5, 0x6a6680); p.set(12, 5, 0x6a6680); }
  if (tufts) for (let i = 0; i < 3; i++) {
    const x = Math.floor(hash(i, seed, 45) * 13) + 1, y = Math.floor(hash(i, seed, 46) * 12) + 2;
    p.vline(x, y, 3, 0x5aa048); p.vline(x + 2, y + 1, 2, 0x5aa048); p.set(x + 1, y, 0x86c860);
  }
}

function rockTile(p: Pen, seed: number) {
  p.fill(ROCK);
  for (let i = 0; i < 7; i++) {
    const x = Math.floor(hash(i, seed, 47) * 14), y = Math.floor(hash(i, seed, 48) * 14) + 1;
    p.set(x, y, ROCK_D); p.set(x + 1, y, ROCK_D); p.set(x, y - 1, ROCK_L);
  }
}

const ARROW: Record<string, [number, number]> = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };

/** Chevron arrows used by gust and current tiles. */
function chevrons(p: Pen, dir: string, frame: number, c: number) {
  const [dx, dy] = ARROW[dir];
  for (let k = 0; k < 2; k++) {
    const centre = 4 + k * 8 + (frame ? 2 : 0);
    for (let t = -3; t <= 3; t++) {
      const along = centre - Math.abs(t);
      const x = dx ? (dx > 0 ? along : 15 - along) : 8 + t;
      const y = dy ? (dy > 0 ? along : 15 - along) : 8 + t;
      if (x >= 0 && x < 16 && y >= 0 && y < 16) p.set(x, y, c);
      const x2 = dx ? x - dx : x, y2 = dy ? y - dy : y;
      if (x2 >= 0 && x2 < 16 && y2 >= 0 && y2 < 16) p.set(x2, y2, c);
    }
  }
}

function gustTile(p: Pen, dir: string, frame: number) {
  rockTile(p, 7);
  const [dx] = ARROW[dir];
  for (let i = 0; i < 3; i++) {
    if (dx) p.hline((i * 5 + frame * 3) % 12, 2 + i * 5, 4, 0xd8e4f0);
    else p.vline(2 + i * 5, (i * 5 + frame * 3) % 12, 4, 0xd8e4f0);
  }
  chevrons(p, dir, frame, 0xffffff);
}

function currentTile(p: Pen, dir: string, frame: number) {
  p.fill(0x3a9ad8);
  p.hline(0, 0, 16, 0x2a7ab8);
  for (let i = 0; i < 3; i++) p.hline((i * 6 + frame * 4) % 14, 2 + i * 5, 3, 0x8fd4ff);
  chevrons(p, dir, frame, 0xd8f4ff);
}

function tideTile(p: Pen, wet: boolean, seed: number) {
  if (wet) {
    p.fill(0x3a82c8);
    p.hline(2 + Math.floor(hash(seed, 50) * 6), 4, 4, 0x7ac0f0);
    p.hline(6 + Math.floor(hash(seed, 51) * 5), 11, 4, 0x7ac0f0);
    p.hline(0, 0, 16, 0x2a62a0);
    return;
  }
  p.fill(0x6a6884);
  for (let i = 0; i < 6; i++) p.set(Math.floor(hash(i, seed, 52) * 16), Math.floor(hash(i, seed, 53) * 16), i % 2 ? 0x54526c : 0x84829c);
  p.ellipse(5 + hash(seed, 54) * 6, 9, 2.4, 1.2, 0x4a6a9a);
  p.set(3, 12, 0xe8a0b0);
}

function hallFloor(p: Pen) {
  p.fill(0x7ac8c8);
  p.rect(0, 0, 8, 8, 0x6ab4b8);
  p.rect(8, 8, 8, 8, 0x6ab4b8);
  p.set(7, 7, 0xd8f8f8);
}

function pillarTile(p: Pen) {
  p.fill(0x7ac8c8);
  p.rect(3, 1, 10, 15, 0xc8d0e0);
  p.rect(3, 1, 10, 2, 0xe8eef8);
  p.vline(10, 3, 12, 0x9aa4b8);
  p.vline(6, 3, 12, 0xdde4f0);
  p.rect(2, 14, 12, 2, 0x8a94a8);
}

function telescopeTile(p: Pen) {
  ruinFloor(p, 3, false);
  p.rect(6, 10, 4, 5, 0x5a4a3a);
  p.rect(4, 14, 8, 2, 0x3a2e24);
  for (let i = 0; i < 9; i++) p.rect(3 + i, 9 - i, 3, 3, i < 2 ? 0x8a6a2a : 0xd8a84a);
  p.rect(11, 0, 4, 3, 0x3a5a8a);
  p.set(12, 1, 0xa8d8ff);
}

// ---------- registry ----------

export type PushDir = 'up' | 'down' | 'left' | 'right';

export interface TileSpec {
  solid: boolean;
  family: string;
  anim?: number;
  encounter?: boolean;
  ledge?: boolean;
  water?: boolean;
  /** Wind gusts and water currents carry the player this way. */
  push?: PushDir;
  /** Tide pools: 'A' is flooded at high tide, 'B' is flooded at low tide. */
  tide?: 'A' | 'B';
}

/** Map legend: character -> behaviour. Visual variants are chosen by `tileKey`. */
export const LEGEND: Record<string, TileSpec> = {
  '.': { solid: false, family: 'grass' },
  ',': { solid: false, family: 'tall', anim: 2, encounter: true },
  ':': { solid: false, family: 'path' },
  'f': { solid: false, family: 'flowers', anim: 2 },
  's': { solid: false, family: 'sand' },
  'T': { solid: true, family: 'tree' },
  'P': { solid: true, family: 'pine' },
  'K': { solid: true, family: 'bush' },
  '~': { solid: true, family: 'water', anim: 2, water: true },
  '=': { solid: false, family: 'bridge' },
  '#': { solid: true, family: 'fence' },
  'v': { solid: true, family: 'ledge', ledge: true },
  'S': { solid: true, family: 'sign' },
  'X': { solid: true, family: 'cliff' },
  'R': { solid: true, family: 'roofR' },
  'B': { solid: true, family: 'roofB' },
  'G': { solid: true, family: 'roofG' },
  'N': { solid: true, family: 'roofN' },
  'U': { solid: true, family: 'roofU' },
  'W': { solid: true, family: 'wall' },
  'O': { solid: true, family: 'window' },
  'D': { solid: false, family: 'door' },
  'l': { solid: true, family: 'lamp' },
  'c': { solid: false, family: 'caveEntrance' },
  // cave
  '_': { solid: false, family: 'caveFloor', encounter: true },
  '-': { solid: false, family: 'caveSafe' },
  'x': { solid: true, family: 'caveWall' },
  'o': { solid: true, family: 'boulder' },
  'm': { solid: true, family: 'crystal', anim: 2 },
  'L': { solid: true, family: 'lava', anim: 2 },
  // interiors
  'F': { solid: false, family: 'woodFloor' },
  'Q': { solid: false, family: 'tileFloor' },
  'g': { solid: false, family: 'stoneFloor' },
  'w': { solid: true, family: 'iwall' },
  'i': { solid: true, family: 'iwindow' },
  'b': { solid: true, family: 'bookshelf' },
  'C': { solid: true, family: 'counter' },
  'p': { solid: true, family: 'pc' },
  't': { solid: true, family: 'table' },
  'e': { solid: true, family: 'bed' },
  'h': { solid: true, family: 'heal' },
  'z': { solid: true, family: 'plant' },
  'j': { solid: true, family: 'crate' },
  'q': { solid: true, family: 'shelf' },
  'Z': { solid: true, family: 'machine' },
  'a': { solid: false, family: 'rug' },
  'M': { solid: false, family: 'mat' },
  'y': { solid: true, family: 'pedestal' },
  'k': { solid: true, family: 'stove' },
  // Chapter Two
  'r': { solid: false, family: 'reeds', anim: 2, encounter: true },
  'n': { solid: false, family: 'mud' },
  'd': { solid: false, family: 'dock' },
  'Y': { solid: true, family: 'roofY' },
  'A': { solid: true, family: 'ruinWall' },
  'E': { solid: false, family: 'ruinFloor', encounter: true },
  'I': { solid: false, family: 'ruinSafe' },
  'J': { solid: true, family: 'telescope' },
  'u': { solid: false, family: 'rock' },
  'H': { solid: false, family: 'hallFloor' },
  '0': { solid: true, family: 'pillar' },
  '<': { solid: false, family: 'gust', push: 'left', anim: 2 },
  '>': { solid: false, family: 'gust', push: 'right', anim: 2 },
  '^': { solid: false, family: 'gust', push: 'up', anim: 2 },
  '|': { solid: false, family: 'gust', push: 'down', anim: 2 },
  '[': { solid: false, family: 'current', push: 'left', anim: 2 },
  ']': { solid: false, family: 'current', push: 'right', anim: 2 },
  '{': { solid: false, family: 'current', push: 'up', anim: 2 },
  '}': { solid: false, family: 'current', push: 'down', anim: 2 },
  '%': { solid: false, family: 'tideA', tide: 'A', anim: 2 },
  '&': { solid: false, family: 'tideB', tide: 'B', anim: 2 },
};

const SAME: Record<string, string> = { roofR: 'roof', roofB: 'roof', roofG: 'roof', roofN: 'roof', roofU: 'roof', roofY: 'roof', wall: 'wall', window: 'wall', door: 'wall', caveEntrance: 'cliff' };
const fam = (ch: string | undefined) => {
  const f = ch ? LEGEND[ch]?.family : undefined;
  return f ? SAME[f] ?? f : 'edge';
};

/** Visual key for the tile at (x, y). Neighbour-aware families get a 4-bit mask. */
export function tileKey(rows: string[], x: number, y: number, frame = 0): string {
  const ch = rows[y][x];
  const spec = LEGEND[ch];
  if (!spec) throw new Error(`Unknown tile '${ch}' at ${x},${y}`);
  const f = spec.family;
  const me = fam(ch);
  const at = (xx: number, yy: number) => (yy < 0 || yy >= rows.length || xx < 0 || xx >= rows[0].length ? undefined : rows[yy][xx]);
  const same = (xx: number, yy: number) => {
    const c = at(xx, yy);
    if (c === undefined) return true; // map edge counts as same so borders look continuous
    const nf = fam(c);
    if (me === 'water') return nf === 'water' || nf === 'bridge';
    if (me === 'path') return nf === 'path' || nf === 'door' || nf === 'wall' || nf === 'sign' || nf === 'bridge' || nf === 'lamp' || nf === 'caveEntrance';
    return nf === me;
  };
  const mask = (same(x, y - 1) ? 1 : 0) | (same(x + 1, y) ? 2 : 0) | (same(x, y + 1) ? 4 : 0) | (same(x - 1, y) ? 8 : 0);
  const v = Math.floor(hash(x, y, 99) * 4);
  switch (f) {
    case 'grass': case 'sand': case 'tree': case 'pine': case 'bush': case 'boulder': case 'caveFloor': case 'caveSafe': case 'woodFloor': case 'stoneFloor': case 'lamp':
      return `${f}:${v}`;
    case 'tall': case 'flowers': case 'crystal': case 'lava':
      return `${f}:${v}:${frame}`;
    case 'path': case 'cliff': case 'caveWall': case 'fence': case 'ruinWall':
      return `${f}:${mask}:${v}`;
    case 'reeds':
      return `${f}:${v}:${frame}`;
    case 'mud': case 'ruinFloor': case 'ruinSafe': case 'rock':
      return `${f}:${v}`;
    case 'gust': case 'current':
      return `${f}:${spec.push}:${frame}`;
    case 'tideA': case 'tideB': {
      // frame 0 = high tide, frame 1 = low tide
      const wet = (f === 'tideA') === (frame === 0);
      return `tide:${wet ? 1 : 0}:${v}`;
    }
    case 'water':
      return `${f}:${mask}:${frame}`;
    case 'roofR': case 'roofB': case 'roofG': case 'roofN': case 'roofU': case 'roofY': case 'wall': case 'window': case 'door':
      return `${f}:${mask}`;
    case 'sign': {
      const below = fam(at(x, y + 1));
      const base = below === 'caveFloor' || below === 'caveSafe' ? 'cave' : below === 'path' || below === 'dock' ? 'path' : below === 'ruinFloor' || below === 'ruinSafe' ? 'ruin' : below === 'rock' || below === 'mud' ? 'rock' : 'grass';
      return `sign:${base}`;
    }
    default:
      return f;
  }
}

/** Draws the tile for a key into a pen. */
export function drawTileKey(p: Pen, key: string) {
  const [f, a, b] = key.split(':');
  const n = Number(a ?? 0), m = Number(b ?? 0);
  switch (f) {
    case 'grass': return grassBase(p, n);
    case 'tall': return tallGrass(p, m);
    case 'path': return pathTile(p, n, m);
    case 'flowers': return flowerTile(p, n, m);
    case 'sand': return sandTile(p, n);
    case 'tree': return treeTile(p, false, n);
    case 'pine': return treeTile(p, true, n);
    case 'bush': return bushTile(p, n);
    case 'water': return waterTile(p, n, m);
    case 'bridge': return bridgeTile(p);
    case 'fence': return fenceTile(p, m, n);
    case 'ledge': return ledgeTile(p, 3);
    case 'sign': return signTile(p, 5, (a as 'grass' | 'path' | 'cave' | 'ruin' | 'rock') ?? 'grass');
    case 'cliff': return cliffTile(p, n, m);
    case 'roofR': case 'roofB': case 'roofG': case 'roofN': case 'roofU': case 'roofY': return roofTile(p, f.slice(4), n);
    case 'reeds': return reedTile(p, n, m);
    case 'mud': return mudTile(p, n);
    case 'dock': return dockTile(p);
    case 'ruinWall': return ruinWall(p, n, m);
    case 'ruinFloor': return ruinFloor(p, n, true);
    case 'ruinSafe': return ruinFloor(p, n, false);
    case 'rock': return rockTile(p, n);
    case 'gust': return gustTile(p, a, m);
    case 'current': return currentTile(p, a, m);
    case 'tide': return tideTile(p, n === 1, m);
    case 'hallFloor': return hallFloor(p);
    case 'pillar': return pillarTile(p);
    case 'telescope': return telescopeTile(p);
    case 'wall': return wallTile(p, 'wall', n);
    case 'window': return wallTile(p, 'window', n);
    case 'door': return wallTile(p, 'door', n);
    case 'lamp': return lampTile(p, n);
    case 'caveEntrance': return caveEntrance(p, 4);
    case 'caveFloor': return caveFloor(p, n);
    case 'caveSafe': { caveFloor(p, n); p.set(3, 3, PAL.caveL); return; }
    case 'caveWall': return caveWall(p, n, m);
    case 'boulder': return boulderTile(p, n, true);
    case 'crystal': return crystalTile(p, n, m);
    case 'lava': return lavaTile(p, m);
    case 'woodFloor': return woodFloor(p, n);
    case 'tileFloor': return tileFloor(p);
    case 'stoneFloor': return stoneFloor(p, n);
    case 'iwall': return iwall(p, false);
    case 'iwindow': return iwall(p, true);
    default: return furniture(p, f, 1);
  }
}
