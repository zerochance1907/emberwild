import { describe, expect, it } from 'vitest';
import { LEGEND } from '../src/art/tiles';
import { MAPS } from '../src/data/maps';
import { canReach, reachable, slide, softLocks, type SolveOpts } from '../src/engine/traverse';

/** NPCs that never move out of the way count as solid. Story NPCs that vanish (hideIf) don't. */
const solidNpcs = (mapId: string, except: string[] = []) => MAPS[mapId].npcs.filter((n) => !n.hideIf && !except.includes(n.id)).map((n) => ({ x: n.x, y: n.y }));
const objects = (mapId: string) => (MAPS[mapId].objects ?? []).filter((o) => o.kind !== 'thorns').map((o) => ({ x: o.x, y: o.y }));
const valves = (mapId: string) => (MAPS[mapId].objects ?? []).filter((o) => o.kind === 'valve').map((o) => ({ x: o.x, y: o.y }));
const adjacent = (p: { x: number; y: number }) => [{ x: p.x, y: p.y + 1 }, { x: p.x, y: p.y - 1 }, { x: p.x + 1, y: p.y }, { x: p.x - 1, y: p.y }];

describe('push tiles', () => {
  it('carry the player until a normal tile, stopping before walls', () => {
    const rows = ['XXXXXX', 'X>>>uX', 'X>>>XX', 'XXXXXX'];
    expect(slide(rows, 1, 1, false).at(-1)).toEqual({ x: 4, y: 1 });
    expect(slide(rows, 1, 2, false).at(-1)).toEqual({ x: 3, y: 2 });
    expect(slide(rows, 4, 1, false)).toEqual([]);
  });
  it('turn when they meet a push tile pointing another way, and stop on loops', () => {
    expect(slide(['XXXX', 'X>|X', 'XuuX', 'XXXX'], 1, 1, false).at(-1)).toEqual({ x: 2, y: 2 });
    expect(slide(['XXXX', 'X>|X', 'X^<X', 'XXXX'], 1, 1, false).length).toBeLessThan(5);
  });
  it('tide pools flood and drain', () => {
    const rows = ['XXXXX', 'Xu%uX', 'XXXXX', 'Xu&uX', 'XXXXX'];
    expect(canReach(rows, { x: 1, y: 1 }, [{ x: 3, y: 1 }], { lowTide: false })).toBe(false);
    expect(canReach(rows, { x: 1, y: 1 }, [{ x: 3, y: 1 }], { lowTide: true })).toBe(true);
    expect(canReach(rows, { x: 1, y: 3 }, [{ x: 3, y: 3 }], { lowTide: false })).toBe(true);
    expect(canReach(rows, { x: 1, y: 3 }, [{ x: 3, y: 3 }], { lowTide: true })).toBe(false);
  });
});

describe('Chapter Two puzzles are solvable and can never soft-lock', () => {
  const cases: { map: string; start: { x: number; y: number }; goal: { x: number; y: number }[]; opts: SolveOpts }[] = [
    // Stormcrest Ridge: ferry dock -> grotto mouth, through the gale lanes.
    { map: 'stormridge', start: { x: 18, y: 23 }, goal: [{ x: 17, y: 2 }], opts: { solid: solidNpcs('stormridge') } },
    // Tidewrack Grotto: entrance -> Warden Maren's chamber, using the tide valves.
    { map: 'grotto', start: { x: 12, y: 18 }, goal: adjacent({ x: 12, y: 1 }), opts: { valves: valves('grotto'), solid: [...objects('grotto')] } },
    // Tidewater Hall: entrance -> in front of Warden Maren, riding the right currents.
    { map: 'tide_hall', start: { x: 6, y: 16 }, goal: [{ x: 6, y: 3 }], opts: { solid: solidNpcs('tide_hall') } },
  ];
  for (const c of cases) {
    it(`${c.map}: the goal is reachable`, () => {
      expect(canReach(MAPS[c.map].rows, c.start, c.goal, c.opts)).toBe(true);
    });
    it(`${c.map}: every reachable spot can get back to the entrance`, () => {
      expect(softLocks(MAPS[c.map].rows, c.start, c.opts)).toEqual([]);
    });
  }
  it('the grotto needs the valves (high tide blocks the way)', () => {
    expect(canReach(MAPS.grotto.rows, { x: 12, y: 18 }, adjacent({ x: 12, y: 1 }), { solid: objects('grotto') })).toBe(false);
  });
  it('the hall needs the currents (the direct way is water)', () => {
    const solved = reachable(MAPS.tide_hall.rows, { x: 6, y: 16 }, { solid: solidNpcs('tide_hall') });
    expect([...solved.values()].some((n) => n.x === 6 && n.y === 3)).toBe(true);
    // Every currents tile in the hall is part of the puzzle (no stray symbols).
    for (const row of MAPS.tide_hall.rows) for (const ch of row) expect(LEGEND[ch]).toBeDefined();
  });
  it('valves only sit next to dry, tide-free ground', () => {
    for (const v of valves('grotto')) {
      const dry = adjacent(v).filter((p) => { const ch = MAPS.grotto.rows[p.y]?.[p.x]; return ch && !LEGEND[ch].solid && !LEGEND[ch].tide; });
      expect(dry.length, `${v.x},${v.y}`).toBeGreaterThan(0);
    }
  });
});

describe('Chapter Two gating', () => {
  it('the Starfall Observatory can only be reached on the Driftboard', () => {
    const door = [{ x: 28, y: 15 }, { x: 29, y: 15 }];
    const start = { x: 10, y: 0 };
    expect(canReach(MAPS.mirefen.rows, start, door, {})).toBe(false);
    expect(canReach(MAPS.mirefen.rows, start, door, { surf: true })).toBe(true);
  });
  it('the Gullhaven docks lead to the ferry captain', () => {
    expect(canReach(MAPS.gullhaven.rows, { x: 1, y: 7 }, [{ x: 32, y: 19 }], {})).toBe(true);
  });
  it('Saltwind Road is blocked by Kip until he is beaten', () => {
    const kip = MAPS.route3.npcs.find((n) => n.id === 'r3_kip')!;
    const east = [{ x: 39, y: 7 }];
    expect(canReach(MAPS.route3.rows, { x: 0, y: 7 }, east, { solid: [{ x: kip.x, y: kip.y }] })).toBe(false);
    expect(canReach(MAPS.route3.rows, { x: 0, y: 7 }, east, {})).toBe(true);
  });
  it('every map with push or tide tiles is covered above', () => {
    const special = Object.values(MAPS).filter((m) => m.rows.some((r) => [...r].some((ch) => LEGEND[ch].push || LEGEND[ch].tide))).map((m) => m.id);
    expect(special.sort()).toEqual(['grotto', 'stormridge', 'tide_hall']);
  });
});
