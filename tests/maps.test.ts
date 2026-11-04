import { describe, expect, it } from 'vitest';
import { MAPS } from '../src/data/maps';
import { LEGEND } from '../src/art/tiles';
import { SPECIES } from '../src/data/creatures';
import { ITEMS } from '../src/data/items';
import { TRAINERS } from '../src/data/trainers';

const walkable = (mapId: string, x: number, y: number) => {
  const m = MAPS[mapId];
  const row = m.rows[y];
  if (!row || x < 0 || x >= row.length) return false;
  return !LEGEND[row[x]].solid || row[x] === 'v';
};

describe('maps', () => {
  for (const m of Object.values(MAPS)) {
    describe(m.id, () => {
      it('has a rectangular grid of known tiles', () => {
        const w = m.rows[0].length;
        m.rows.forEach((r, y) => {
          expect(r.length, `${m.id} row ${y}`).toBe(w);
          for (const ch of r) expect(LEGEND[ch], `${m.id} '${ch}' row ${y}`).toBeDefined();
        });
      });
      it('warps land on walkable tiles of real maps', () => {
        for (const w of m.warps) {
          expect(MAPS[w.to], w.to).toBeDefined();
          expect(walkable(w.to, w.tx, w.ty), `${m.id} -> ${w.to} ${w.tx},${w.ty}`).toBe(true);
        }
      });
      it('npcs, items and objects are inside the map', () => {
        for (const n of m.npcs) {
          expect(walkable(m.id, n.x, n.y) || m.rows[n.y]?.[n.x] !== undefined, `${n.id}`).toBe(true);
          if (n.trainer) expect(TRAINERS[n.trainer], n.trainer).toBeDefined();
        }
        for (const it of m.items) {
          expect(ITEMS[it.item], it.item).toBeDefined();
          expect(walkable(m.id, it.x, it.y), `${it.id} at ${it.x},${it.y}`).toBe(true);
        }
        for (const o of m.objects ?? []) expect(m.rows[o.y]?.[o.x], o.id).toBeDefined();
      });
      it('encounter tables reference real species', () => {
        for (const e of m.encounters?.table ?? []) expect(SPECIES[e.species]).toBeDefined();
      });
      it('edge connections line up with walkable tiles on both sides', () => {
        const h = m.rows.length, w = m.rows[0].length;
        for (const [side, c] of Object.entries(m.connections ?? {})) {
          const t = MAPS[c!.map];
          expect(t, c!.map).toBeDefined();
          const th = t.rows.length, tw = t.rows[0].length;
          const edge: [number, number][] = [];
          if (side === 'north') for (let x = 0; x < w; x++) edge.push([x, 0]);
          if (side === 'south') for (let x = 0; x < w; x++) edge.push([x, h - 1]);
          if (side === 'west') for (let y = 0; y < h; y++) edge.push([0, y]);
          if (side === 'east') for (let y = 0; y < h; y++) edge.push([w - 1, y]);
          let open = 0;
          for (const [x, y] of edge) {
            if (!walkable(m.id, x, y)) continue;
            open++;
            const tx = side === 'east' ? 0 : side === 'west' ? tw - 1 : x + c!.offset;
            const ty = side === 'north' ? th - 1 : side === 'south' ? 0 : y + c!.offset;
            expect(walkable(t.id, tx, ty), `${m.id} ${side} ${x},${y} -> ${t.id} ${tx},${ty}`).toBe(true);
          }
          expect(open, `${m.id} ${side} has an opening`).toBeGreaterThan(0);
        }
      });
    });
  }
});
