import { describe, expect, it } from 'vitest';
import { MAPS, type MapDef } from '../src/data/maps';
import { LEGEND } from '../src/art/tiles';
import { neighbours, type Node } from '../src/engine/traverse';
import { newGameState } from '../src/engine/save';

/**
 * Walks the whole world as one graph: steps, ledges, push tiles and tides inside a map (the same
 * rules the overworld uses), plus doors and map edges between maps. Story gates are treated as
 * open, so this checks the layout itself: nothing is walled off, and no spot is a one-way trap.
 */
interface State { map: string; x: number; y: number; low: boolean }
const key = (s: State) => `${s.map}|${s.x},${s.y},${s.low ? 1 : 0}`;
const spot = (s: { map: string; x: number; y: number }) => `${s.map} ${s.x},${s.y}`;

/** People who never move and are never removed by the story are walls. */
function fixedSolids(m: MapDef) {
  return m.npcs.filter((n) => !n.hideIf && !n.showIf && !n.wander).map((n) => ({ x: n.x, y: n.y }));
}

function valveSpots(m: MapDef) {
  return (m.objects ?? []).filter((o) => o.kind === 'valve').map((o) => ({ x: o.x, y: o.y }));
}

/** Where each ferry script puts the player (see the 'ferry' and 'ferryBack' scripts). */
const FERRY: Record<string, { map: string; x: number; y: number }> = {
  ferry: { map: 'stormridge', x: 18, y: 23 },
  ferryBack: { map: 'gullhaven', x: 32, y: 19 },
};

function moves(s: State, surf: boolean): State[] {
  const m = MAPS[s.map];
  const w = m.rows[0].length, h = m.rows.length;
  const out: State[] = [];
  const canSurf = surf && !m.noSurf;
  const n: Node = { x: s.x, y: s.y, low: s.low };
  for (const t of neighbours(m.rows, n, { valves: valveSpots(m), solid: fixedSolids(m), surf: canSurf })) {
    out.push({ map: s.map, ...t });
  }
  // the ferry: talk to a captain from the tile next to them
  for (const n of m.npcs) {
    const dock = FERRY[n.script ?? ''];
    if (dock && Math.abs(n.x - s.x) + Math.abs(n.y - s.y) === 1) out.push({ ...dock, low: s.low });
  }
  // doors and stairs
  for (const wp of m.warps) if (wp.x === s.x && wp.y === s.y) out.push({ map: wp.to, x: wp.tx, y: wp.ty, low: s.low });
  // walking off an open edge
  for (const [side, c] of Object.entries(m.connections ?? {})) {
    const onEdge = (side === 'north' && s.y === 0) || (side === 'south' && s.y === h - 1) || (side === 'west' && s.x === 0) || (side === 'east' && s.x === w - 1);
    if (!onEdge || !c) continue;
    const t = MAPS[c.map];
    const tx = side === 'east' ? 0 : side === 'west' ? t.rows[0].length - 1 : s.x + c.offset;
    const ty = side === 'north' ? t.rows.length - 1 : side === 'south' ? 0 : s.y + c.offset;
    const spec = LEGEND[t.rows[ty]?.[tx] ?? ''];
    if (!spec || (spec.solid && !(spec.water && surf))) continue;
    out.push({ map: c.map, x: tx, y: ty, low: s.low });
  }
  return out;
}

function explore(start: State, surf: boolean) {
  const seen = new Map<string, State>([[key(start), start]]);
  const edges = new Map<string, string[]>();
  const queue = [start];
  while (queue.length) {
    const s = queue.shift()!;
    const next = moves(s, surf);
    edges.set(key(s), next.map(key));
    for (const t of next) {
      if (!seen.has(key(t))) {
        seen.set(key(t), t);
        queue.push(t);
      }
    }
  }
  return { seen, edges };
}

const g = newGameState('Tester');
const START: State = { map: g.map, x: g.x, y: g.y, low: false };
const world = explore(START, true);
const tiles = new Set([...world.seen.values()].map(spot));
const nextTo = (map: string, x: number, y: number) =>
  [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => tiles.has(spot({ map, x: x + dx, y: y + dy })));

describe('the world as a whole', () => {
  it('every map can be reached from the starting room', () => {
    const visited = new Set([...world.seen.values()].map((s) => s.map));
    expect(Object.keys(MAPS).filter((id) => !visited.has(id))).toEqual([]);
  });

  it('every item, person, sign, object, door and trigger can be reached', () => {
    const missing: string[] = [];
    for (const m of Object.values(MAPS)) {
      for (const it of m.items) if (!tiles.has(spot({ map: m.id, x: it.x, y: it.y }))) missing.push(`item ${it.id} at ${spot({ map: m.id, ...it })}`);
      for (const n of m.npcs) if (!nextTo(m.id, n.x, n.y)) missing.push(`npc ${n.id} at ${spot({ map: m.id, ...n })}`);
      for (const s of m.signs) if (!nextTo(m.id, s.x, s.y)) missing.push(`sign at ${spot({ map: m.id, ...s })}`);
      for (const o of m.objects ?? []) if (!nextTo(m.id, o.x, o.y)) missing.push(`object ${o.id} at ${spot({ map: m.id, ...o })}`);
      for (const w of m.warps) if (!tiles.has(spot({ map: m.id, x: w.x, y: w.y }))) missing.push(`door at ${spot({ map: m.id, ...w })} to ${w.to}`);
      for (const t of m.triggers ?? []) {
        let hit = false;
        for (let dx = 0; dx < (t.w ?? 1); dx++) for (let dy = 0; dy < (t.h ?? 1); dy++) hit ||= tiles.has(spot({ map: m.id, x: t.x + dx, y: t.y + dy }));
        if (!hit) missing.push(`trigger ${t.script} at ${spot({ map: m.id, ...t })}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('there is no spot you can walk into but never walk back from', () => {
    // On foot only: the Driftboard is found late, so a trap that needs it to escape is still a trap.
    const foot = explore(START, false);
    const back = new Map<string, string[]>();
    for (const [from, tos] of foot.edges) for (const to of tos) back.set(to, [...(back.get(to) ?? []), from]);
    const canReturn = new Set([key(START)]);
    const queue = [key(START)];
    while (queue.length) {
      for (const p of back.get(queue.shift()!) ?? []) {
        if (!canReturn.has(p)) {
          canReturn.add(p);
          queue.push(p);
        }
      }
    }
    const traps = [...new Set([...foot.seen.entries()].filter(([k]) => !canReturn.has(k)).map(([, s]) => spot(s)))];
    expect(traps).toEqual([]);
  });
});
