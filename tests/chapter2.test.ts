import { describe, expect, it } from 'vitest';
import { ROAMER, SPECIES_LIST, getSpecies } from '../src/data/creatures';
import { ITEMS } from '../src/data/items';
import { MOVES } from '../src/data/moves';
import { Battle, heldBoost } from '../src/engine/battle';
import { createCreature, maxHp, slot } from '../src/engine/creature';
import { baseForm, compatible, daycareStep, EGG_CHECK_STEPS, EGG_HATCH_STEPS, makeEgg, trainStep } from '../src/engine/daycare';
import { createRng, fixedRng } from '../src/engine/rng';
import { moveRoamer, ROAM_MAPS, roamerHere } from '../src/engine/roamer';
import { newGameState } from '../src/engine/save';
import { TOWER_POOL, towerLevel, towerPrize, towerTeam } from '../src/engine/tower';

const rng = () => createRng(99);
const ivs = (n: number) => ({ hp: n, atk: n, def: n, spa: n, spd: n, spe: n });

describe('chapter two data', () => {
  const ch2 = SPECIES_LIST.filter((s) => s.num >= 19);
  it('adds 14+ new creatures and 25+ new moves', () => {
    expect(ch2.length).toBeGreaterThanOrEqual(14);
    expect(Object.keys(MOVES).length - 50).toBeGreaterThanOrEqual(25);
  });
  it('has at least two three-stage lines', () => {
    const threeStage = SPECIES_LIST.filter((s) => {
      const mid = s.evolves && getSpecies(s.evolves.to);
      return mid?.evolves && !SPECIES_LIST.some((p) => p.evolves?.to === s.id);
    });
    expect(threeStage.map((s) => s.id)).toEqual(expect.arrayContaining(['pipwhisk', 'fizzkid']));
  });
  it('the roaming creature is rare and stands alone', () => {
    const r = getSpecies(ROAMER);
    expect(r.catchRate).toBeLessThanOrEqual(10);
    expect(r.evolves).toBeUndefined();
    expect(SPECIES_LIST.some((s) => s.evolves?.to === ROAMER)).toBe(false);
  });
  it('species numbers are unique and sequential', () => {
    expect(SPECIES_LIST.map((s) => s.num)).toEqual(SPECIES_LIST.map((_, i) => i + 1));
  });
  it('evolution levels go up along each line', () => {
    for (const s of SPECIES_LIST) {
      const next = s.evolves && getSpecies(s.evolves.to);
      if (next?.evolves) expect(next.evolves.level, s.id).toBeGreaterThan(s.evolves!.level);
    }
  });
  it('held items are well formed', () => {
    const held = Object.values(ITEMS).filter((i) => i.kind === 'held');
    expect(held.length).toBeGreaterThanOrEqual(10);
    for (const h of held) {
      expect(h.held, h.id).toBeDefined();
      if (h.held === 'boost') expect(h.boost, h.id).toBeDefined();
    }
  });
});

describe('held items in battle', () => {
  it('type charms boost matching moves only', () => {
    const c = createCreature('kindlet', 10, rng());
    expect(heldBoost(c, 'ember')).toBe(1);
    c.held = 'coal_charm';
    expect(heldBoost(c, 'ember')).toBe(1.2);
    expect(heldBoost(c, 'tide')).toBe(1);
  });
  it('a charm makes the same hit stronger', () => {
    const hit = (held?: string) => {
      const a = createCreature('kindlet', 20, rng(), ivs(8));
      a.moves = [slot('spark_flick')];
      a.held = held;
      const e = createCreature('bouldrum', 30, rng(), ivs(8));
      e.moves = [slot('harden')];
      const b = new Battle({ kind: 'wild', player: [a], enemy: [e], rng: fixedRng([0.5]) });
      b.start();
      const before = e.hp;
      b.turn({ kind: 'move', index: 0 });
      return before - e.hp;
    };
    expect(hit('coal_charm')).toBeGreaterThan(hit());
  });
  it('Stubborn Shell survives a knockout from full HP once', () => {
    const a = createCreature('pyrolynx', 40, rng(), ivs(15));
    a.moves = [slot('blaze_wave')];
    const e = createCreature('mossgrub', 5, rng(), ivs(0));
    e.moves = [slot('harden')];
    e.held = 'stubborn_shell';
    const b = new Battle({ kind: 'wild', player: [a], enemy: [e], rng: fixedRng([0.5]) });
    b.start();
    b.turn({ kind: 'move', index: 0 });
    expect(e.hp).toBe(1);
    b.turn({ kind: 'move', index: 0 });
    expect(b.over).toBe('win');
  });
  it('Mend Berry is eaten at half HP and used up', () => {
    const a = createCreature('bouldrum', 20, rng(), ivs(8));
    a.moves = [slot('rock_slam')];
    const e = createCreature('bouldrum', 30, rng(), ivs(8));
    e.moves = [slot('harden')];
    e.held = 'mend_berry';
    e.hp = Math.floor(maxHp(e) * 0.55);
    const b = new Battle({ kind: 'wild', player: [a], enemy: [e], rng: fixedRng([0.5]) });
    b.start();
    const ev = b.turn({ kind: 'move', index: 0 });
    expect(e.held).toBeUndefined();
    expect(ev.some((x) => x.t === 'text' && x.text.includes('Mend Berry'))).toBe(true);
  });
  it('Clear Leaf cures a status straight away', () => {
    const a = createCreature('kindlet', 10, rng());
    a.moves = [slot('kindle')];
    const e = createCreature('pebblit', 10, rng());
    e.moves = [slot('harden')];
    e.held = 'clear_leaf';
    const b = new Battle({ kind: 'wild', player: [a], enemy: [e], rng: fixedRng([0.01]) });
    b.start();
    b.turn({ kind: 'move', index: 0 });
    expect(e.status).toBe(null);
    expect(e.held).toBeUndefined();
  });
  it('Moss Wrap heals at the end of each turn', () => {
    const a = createCreature('pebblit', 10, rng());
    a.moves = [slot('harden')];
    a.held = 'moss_wrap';
    a.hp = 5;
    const e = createCreature('mossgrub', 3, rng());
    e.moves = [slot('harden')];
    const b = new Battle({ kind: 'wild', player: [a], enemy: [e], rng: rng() });
    b.start();
    b.turn({ kind: 'move', index: 0 });
    expect(a.hp).toBeGreaterThan(5);
  });
  it('Lucky Scale gives more XP', () => {
    const run = (held?: string) => {
      const a = createCreature('pyrolynx', 30, rng(), ivs(8));
      a.moves = [slot('blaze_wave')];
      a.held = held;
      const xp0 = a.xp;
      const b = new Battle({ kind: 'wild', player: [a], enemy: [createCreature('mossgrub', 8, rng())], rng: rng() });
      b.start();
      b.turn({ kind: 'move', index: 0 });
      return a.xp - xp0;
    };
    expect(run('lucky_scale')).toBeGreaterThan(run());
  });
});

describe('roaming creature', () => {
  it('can flee from battle', () => {
    const a = createCreature('kindlet', 30, rng());
    a.moves = [slot('growl')];
    const r = createCreature(ROAMER, 30, rng());
    r.moves = [slot('tailwind')];
    const b = new Battle({ kind: 'wild', player: [a], enemy: [r], rng: fixedRng([0.01]), fleeChance: 45 });
    b.start();
    const ev = b.turn({ kind: 'move', index: 0 });
    expect(b.over).toBe('fled');
    expect(ev.some((x) => x.t === 'text' && x.text.includes('fled'))).toBe(true);
  });
  it('moves to a different map each time', () => {
    const st = newGameState('T');
    st.roamer.active = true;
    const r = createRng(5);
    for (let i = 0; i < 20; i++) {
      const before = st.roamer.map;
      moveRoamer(st.roamer, r);
      expect(st.roamer.map).not.toBe(before);
      expect(ROAM_MAPS).toContain(st.roamer.map);
    }
    expect(roamerHere(st.roamer, st.roamer.map)).toBe(true);
    st.roamer.caught = true;
    expect(roamerHere(st.roamer, st.roamer.map)).toBe(false);
  });
});

describe('day-care and eggs', () => {
  it('finds the base form of a line', () => {
    expect(baseForm('galeheron')).toBe('pipwhisk');
    expect(baseForm('wadewing')).toBe('pipwhisk');
    expect(baseForm('drowsea')).toBe('drowsea');
  });
  it('only creatures sharing a type can nest', () => {
    const a = createCreature('kindlet', 10, rng());
    const b = createCreature('flintle', 10, rng());
    const c = createCreature('puddlop', 10, rng());
    expect(compatible(a, b)).toBe(true);
    expect(compatible(a, c)).toBe(false);
    expect(compatible(createCreature(ROAMER, 30, rng()), createCreature('galecrest', 30, rng()))).toBe(false);
  });
  it('eggs inherit the better IV of each parent', () => {
    const a = createCreature('wadewing', 20, rng(), { hp: 15, atk: 0, def: 3, spa: 0, spd: 0, spe: 0 });
    const b = createCreature('fluffinch', 10, rng(), { hp: 1, atk: 12, def: 2, spa: 5, spd: 0, spe: 9 });
    const egg = makeEgg(a, b);
    expect(egg.species).toBe('pipwhisk');
    expect(egg.ivs).toEqual({ hp: 15, atk: 12, def: 3, spa: 5, spd: 0, spe: 9 });
  });
  it('day-care creatures gain XP and learn moves without evolving', () => {
    const c = createCreature('pipwhisk', 15, rng());
    const lv = c.level;
    for (let i = 0; i < 2000; i++) trainStep(c);
    expect(c.level).toBeGreaterThan(lv);
    expect(c.species).toBe('pipwhisk');
    expect(c.pendingEvolution).toBeUndefined();
    expect(c.moves.length).toBeLessThanOrEqual(4);
  });
  it('a compatible pair makes an egg, which hatches after enough steps', () => {
    const st = newGameState('T');
    st.daycare.mons = [createCreature('kindlet', 10, rng()), createCreature('flintle', 10, rng())];
    const r = fixedRng([0.01]);
    let found = false;
    for (let i = 0; i < EGG_CHECK_STEPS; i++) found = !!daycareStep(st.daycare, st.eggs, r).eggFound || found;
    expect(found).toBe(true);
    expect(st.daycare.egg?.species).toBe('kindlet');
    st.eggs.push(st.daycare.egg!);
    st.daycare.egg = null;
    st.daycare.mons = [];
    let hatched: string[] = [];
    for (let i = 0; i < EGG_HATCH_STEPS; i++) hatched = hatched.concat((daycareStep(st.daycare, st.eggs, r).hatched ?? []).map((c) => c.species));
    expect(hatched).toEqual(['kindlet']);
    expect(st.eggs).toHaveLength(0);
  });
});

describe('Tidewatch Spire', () => {
  it('builds three-creature teams from the pool with no repeats', () => {
    const r = createRng(3);
    for (let i = 0; i < 20; i++) {
      const team = towerTeam(30, i, r);
      expect(team).toHaveLength(3);
      expect(new Set(team.map((c) => c.species)).size).toBe(3);
      for (const c of team) expect(c.level).toBe(30);
    }
    for (const id of TOWER_POOL) expect(getSpecies(id)).toBeDefined();
  });
  it('gets harder as the streak grows and pays out every third win', () => {
    expect(towerLevel(20, 0)).toBe(30);
    expect(towerLevel(34, 10)).toBe(36);
    expect(towerLevel(50, 99)).toBe(50);
    expect(towerPrize(1)).toBe(null);
    expect(towerPrize(3)).toBe('moss_wrap');
    for (const n of [3, 6, 9, 12]) expect(ITEMS[towerPrize(n)!]).toBeDefined();
  });
});
