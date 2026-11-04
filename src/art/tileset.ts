import type { MapDef } from '../data/maps';
import { LEGEND, drawTileKey, tileKey } from './tiles';
import { makePixels, Pen } from './pixels';
import type { Pixels } from './raster';

export const TILE = 16;
const COLS = 32;

export interface Tileset {
  pixels: Pixels;
  index: Map<string, number>;
}

/** Collect every tile key used by the given maps and draw them all into one sheet. */
export function buildTileset(maps: MapDef[]): Tileset {
  const keys = new Set<string>();
  for (const m of maps) {
    for (let y = 0; y < m.rows.length; y++)
      for (let x = 0; x < m.rows[0].length; x++) {
        const anim = LEGEND[m.rows[y][x]].anim ?? 1;
        for (let f = 0; f < anim; f++) keys.add(tileKey(m.rows, x, y, f));
      }
  }
  const list = [...keys];
  const rows = Math.ceil(list.length / COLS);
  const pixels = makePixels(COLS * TILE, rows * TILE);
  const index = new Map<string, number>();
  list.forEach((k, i) => {
    index.set(k, i);
    drawTileKey(new Pen(pixels, (i % COLS) * TILE, Math.floor(i / COLS) * TILE), k);
  });
  return { pixels, index };
}

/** Per-cell tile indexes for frame 0 and the animated alternates. */
export function mapLayer(m: MapDef, ts: Tileset): { base: number[][]; anim: { x: number; y: number; frames: number[] }[] } {
  const base: number[][] = [];
  const anim: { x: number; y: number; frames: number[] }[] = [];
  for (let y = 0; y < m.rows.length; y++) {
    const row: number[] = [];
    for (let x = 0; x < m.rows[0].length; x++) {
      const n = LEGEND[m.rows[y][x]].anim ?? 1;
      const frames = Array.from({ length: n }, (_, f) => ts.index.get(tileKey(m.rows, x, y, f))!);
      row.push(frames[0]);
      if (n > 1) anim.push({ x, y, frames });
    }
    base.push(row);
  }
  return { base, anim };
}
