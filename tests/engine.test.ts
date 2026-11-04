import { describe, expect, it } from 'vitest';
import { SPECIES_LIST, getSpecies } from '../src/data/creatures';
import { MOVES, getMove } from '../src/data/moves';
import { TYPES, effectiveness } from '../src/data/types';
import { scoreMove, chooseEnemyAction } from '../src/engine/ai';
import { Battle, calcDamage, captureChance, emptyStages, rollCapture, stageMultiplier } from '../src/engine/battle';
import {
  createCreature, evolve, gainXp, healFully, learnMove, maxHp, movesAtLevel, slot, speciesForLevel, xpForLevel, xpYield,
} from '../src/engine/creature';
import { createRng, fixedRng } from '../src/engine/rng';

const rng = () => createRng(1234);
const ivs0 = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };

describe('data integrity', () => {
  it('has 36 creatures, 8 types and 75+ moves', () => {
    expect(SPECIES_LIST).toHaveLength(36);
    expect(TYPES).toHaveLength(8);
    expect(Object.keys(MOVES).length).toBeGreaterThanOrEqual(75);
  });
  it('every learnset move and evolution target exists', () => {
    for (const sp of SPECIES_LIST) {
      for (const [, mv] of sp.learnset) expect(MOVES[mv], `${sp.id}:${mv}`).toBeDefined();
      if (sp.evolves) expect(getSpecies(sp.evolves.to)).toBeDefined();
      expect(sp.entry.length).toBeGreaterThan(20);
    }
  });
  it('every creature is part of an evolution line or is a deliberate single stage', () => {
    const inLine = new Set<string>();
    for (const sp of SPECIES_LIST) if (sp.evolves) { inLine.add(sp.id); inLine.add(sp.evolves.to); }
    expect(inLine.size).toBeGreaterThanOrEqual(30);
  });
});

describe('type effectiveness', () => {
  it('applies single and dual type multipliers', () => {
    expect(effectiveness('tide', ['ember'])).toBe(2);
    expect(effectiveness('ember', ['tide'])).toBe(0.5);
    expect(effectiveness('spark', ['stone'])).toBe(0);
    expect(effectiveness('ember', ['sprout', 'fae'])).toBe(4);
    expect(effectiveness('stone', ['fae', 'spark'])).toBe(2);
    expect(effectiveness('plain', ['stone'])).toBe(1);
  });
  it('every type has exactly two or three weaknesses', () => {
    for (const def of TYPES) {
      const weak = TYPES.filter((atk) => effectiveness(atk, [def]) > 1);
      expect(weak.length, def).toBeGreaterThanOrEqual(2);
      expect(weak.length, def).toBeLessThanOrEqual(3);
    }
  });
});

describe('damage formula', () => {
  const base = { level: 10, power: 40, attack: 20, defense: 20, stab: false, eff: 1, crit: false, random: 1 };
  it('computes the base value', () => {
    // floor(floor(2*10/5+2) * 40 * 20 / 20 / 50) + 2 = floor(6*40/50)+2 = 4+2 = 6
    expect(calcDamage(base)).toBe(6);
  });
  it('applies STAB, crits, effectiveness and burn', () => {
    expect(calcDamage({ ...base, stab: true })).toBe(9);
    expect(calcDamage({ ...base, crit: true })).toBe(9);
    expect(calcDamage({ ...base, eff: 2 })).toBe(12);
    expect(calcDamage({ ...base, eff: 0.5 })).toBe(3);
    expect(calcDamage({ ...base, eff: 0 })).toBe(0);
    expect(calcDamage({ ...base, burned: true })).toBe(3);
  });
  it('always deals at least 1 when it connects', () => {
    expect(calcDamage({ ...base, attack: 1, defense: 999, random: 0.85 })).toBeGreaterThanOrEqual(1);
  });
  it('stage multipliers follow the usual curve', () => {
    expect(stageMultiplier(0)).toBe(1);
    expect(stageMultiplier(2)).toBe(2);
    expect(stageMultiplier(-2)).toBe(0.5);
    expect(stageMultiplier(1, true)).toBeCloseTo(4 / 3);
  });
});

describe('creatures, XP and levelling', () => {
  it('creates creatures with full HP and level-appropriate moves', () => {
    const c = createCreature('kindlet', 5, rng());
    expect(c.hp).toBe(maxHp(c));
    expect(c.moves.map((m) => m.id)).toEqual(['scratch', 'growl', 'spark_flick']);
    expect(c.xp).toBe(xpForLevel(5));
  });
  it('xp curve is increasing', () => {
    for (let l = 2; l < 50; l++) expect(xpForLevel(l + 1)).toBeGreaterThan(xpForLevel(l));
  });
  it('levels up, learns moves and flags evolution', () => {
    const c = createCreature('kindlet', 10, rng());
    const res = gainXp(c, xpForLevel(13) - c.xp);
    expect(c.level).toBe(13);
    expect(res.map((r) => r.level)).toEqual([11, 12, 13]);
    expect(res[0].learned.length + res[0].wantsToLearn.length).toBe(1); // flame_fang at 11
    expect(c.pendingEvolution).toBe('pyrolynx');
  });
  it('asks to replace a move when four are known', () => {
    const c = createCreature('kindlet', 10, rng());
    expect(c.moves).toHaveLength(4);
    const res = gainXp(c, xpForLevel(11) - c.xp);
    expect(res[0].wantsToLearn).toEqual(['flame_fang']);
    expect(learnMove(c, 'flame_fang', 1)).toBe(true);
    expect(c.moves[1].id).toBe('flame_fang');
    expect(learnMove(c, 'flame_fang', 0)).toBe(false);
  });
  it('evolves and keeps missing HP', () => {
    const c = createCreature('mossgrub', 9, rng(), ivs0);
    c.hp -= 5;
    const out = evolve(c, 'budwing');
    expect(out.to).toBe('budwing');
    expect(c.species).toBe('budwing');
    expect(maxHp(c) - c.hp).toBe(5);
    expect(out.newMoves).toEqual(['twinkle']);
  });
  it('maps levels to evolved species for trainer teams', () => {
    expect(speciesForLevel('fluffinch', 11)).toBe('fluffinch');
    expect(speciesForLevel('fluffinch', 12)).toBe('galecrest');
  });
  it('xp yield is higher for trainers', () => {
    const c = createCreature('fluffinch', 5, rng());
    expect(xpYield(c, true)).toBeGreaterThan(xpYield(c, false));
  });
  it('movesAtLevel returns at most four', () => {
    expect(movesAtLevel('kindlet', 50).length).toBe(4);
  });
});

describe('capture odds', () => {
  it('is easier at low HP and with status', () => {
    const c = createCreature('fluffinch', 5, rng());
    const full = captureChance(c, 1);
    c.hp = 1;
    const low = captureChance(c, 1);
    c.status = 'drowsy';
    const asleep = captureChance(c, 1);
    expect(low).toBeGreaterThan(full);
    expect(asleep).toBeGreaterThan(low);
    expect(captureChance(c, 1.5)).toBeGreaterThanOrEqual(asleep);
  });
  it('rare creatures are hard to bond at full HP', () => {
    const c = createCreature('kindlet', 5, rng());
    expect(captureChance(c, 1)).toBeLessThan(0.25);
  });
  it('rolls shakes deterministically', () => {
    const c = createCreature('mossgrub', 3, rng());
    expect(rollCapture(c, 1, fixedRng([0])).success).toBe(true);
    const fail = rollCapture(c, 1, fixedRng([0, 0.999]));
    expect(fail.success).toBe(false);
    expect(fail.shakes).toBe(1);
  });
});

describe('battle engine', () => {
  it('runs a wild battle to a win and awards XP', () => {
    const me = createCreature('kindlet', 12, rng());
    const wild = createCreature('mossgrub', 2, rng());
    const b = new Battle({ kind: 'wild', player: [me], enemy: [wild], rng: rng() });
    b.start();
    const xp0 = me.xp;
    let guard = 0;
    while (!b.over && guard++ < 20) b.turn({ kind: 'move', index: 2 }); // Cinder Flick, super effective
    expect(b.over).toBe('win');
    expect(me.xp).toBeGreaterThan(xp0);
  });
  it('faster creature moves first and priority beats speed', () => {
    const slow = createCreature('pebblit', 10, rng());
    slow.moves = [slot('bump')];
    const fast = createCreature('bitzel', 10, rng());
    fast.moves = [slot('bump')];
    const b = new Battle({ kind: 'wild', player: [slow], enemy: [fast], rng: rng() });
    b.start();
    const ev = b.turn({ kind: 'move', index: 0 });
    const firstMove = ev.find((e) => e.t === 'move');
    expect(firstMove && 'side' in firstMove && firstMove.side).toBe(1);
    slow.moves = [slot('quickdash')];
    const ev2 = b.turn({ kind: 'move', index: 0 });
    const first2 = ev2.find((e) => e.t === 'move');
    expect(first2 && 'side' in first2 && first2.side).toBe(0);
  });
  it('status effects: burn ticks, drowsy blocks, spark is immune to jolt', () => {
    const a = createCreature('kindlet', 10, rng());
    a.moves = [slot('kindle')];
    const e = createCreature('pebblit', 10, rng());
    e.moves = [slot('harden')];
    const b = new Battle({ kind: 'wild', player: [a], enemy: [e], rng: fixedRng([0.01]) });
    b.start();
    const ev = b.turn({ kind: 'move', index: 0 });
    expect(e.status).toBe('burn');
    expect(ev.some((x) => x.t === 'damage' && x.side === 1 && x.self)).toBe(true);
    const z = createCreature('bitzel', 10, rng());
    const b2 = new Battle({ kind: 'wild', player: [a], enemy: [z], rng: fixedRng([0.01]) });
    b2.inflict(1, 'jolt', true);
    expect(z.status).toBe(null);
    const s = createCreature('fluffinch', 10, rng());
    s.status = 'drowsy';
    s.statusTurns = 3;
    s.moves = [slot('bump')];
    const b3 = new Battle({ kind: 'wild', player: [s], enemy: [createCreature('mossgrub', 3, rng())], rng: rng() });
    b3.start();
    const ev3 = b3.turn({ kind: 'move', index: 0 });
    expect(ev3.some((x) => x.t === 'text' && x.text.includes('fast asleep'))).toBe(true);
  });
  it('switching resets stages and gives the foe a free hit', () => {
    const a = createCreature('kindlet', 10, rng());
    const c = createCreature('puddlop', 10, rng());
    const e = createCreature('pebblit', 10, rng());
    const b = new Battle({ kind: 'wild', player: [a, c], enemy: [e], rng: rng() });
    b.start();
    b.stages[0].atk = 2;
    const ev = b.turn({ kind: 'switch', index: 1 });
    expect(b.active[0]).toBe(1);
    expect(b.stages[0].atk).toBe(0);
    expect(ev.some((x) => x.t === 'move' && x.side === 1)).toBe(true);
  });
  it('items heal and consume from the bag; stones fail on trainers', () => {
    const a = createCreature('kindlet', 10, rng());
    a.hp = 5;
    const bag = { berry_tonic: 1, bond_stone: 2 };
    const b = new Battle({ kind: 'trainer', player: [a], enemy: [createCreature('mossgrub', 3, rng())], rng: rng(), bag });
    b.start();
    b.turn({ kind: 'item', item: 'berry_tonic' });
    expect(bag.berry_tonic).toBe(0);
    expect(a.hp).toBeGreaterThan(5);
    const ev = b.turn({ kind: 'item', item: 'bond_stone' });
    expect(bag.bond_stone).toBe(2);
    expect(ev.some((x) => x.t === 'text' && x.text.includes('can\'t bond'))).toBe(true);
  });
  it('can bond with a wild creature', () => {
    const a = createCreature('kindlet', 10, rng());
    const w = createCreature('mossgrub', 3, rng());
    w.hp = 1;
    const bag = { bond_stone: 1 };
    const b = new Battle({ kind: 'wild', player: [a], enemy: [w], rng: fixedRng([0.0]), bag });
    b.start();
    b.turn({ kind: 'item', item: 'bond_stone' });
    expect(b.over).toBe('caught');
    expect(b.caught).toBe(w);
  });
  it('fleeing works against wild and not trainers', () => {
    const a = createCreature('bitzel', 10, rng());
    const b = new Battle({ kind: 'wild', player: [a], enemy: [createCreature('pebblit', 3, rng())], rng: rng() });
    b.start();
    b.turn({ kind: 'run' });
    expect(b.over).toBe('fled');
    const t = new Battle({ kind: 'trainer', player: [a], enemy: [createCreature('pebblit', 3, rng())], rng: rng() });
    t.start();
    t.turn({ kind: 'run' });
    expect(t.over).toBe(null);
  });
  it('asks for a switch when the active creature faints and ends on a full wipe', () => {
    const weak = createCreature('mossgrub', 2, rng());
    weak.hp = 1;
    const back = createCreature('mossgrub', 2, rng());
    back.hp = 1;
    const foe = createCreature('pyrolynx', 20, rng());
    foe.moves = [slot('blaze_wave')];
    const b = new Battle({ kind: 'trainer', player: [weak, back], enemy: [foe], rng: rng(), ai: 1 });
    b.start();
    const ev = b.turn({ kind: 'move', index: 0 });
    expect(ev.some((e) => e.t === 'needSwitch')).toBe(true);
    expect(b.awaitingSwitch).toBe(true);
    b.forceSwitch(1);
    b.turn({ kind: 'move', index: 0 });
    expect(b.over).toBe('lose');
  });
  it('trainer sends out the next creature after a faint', () => {
    const me = createCreature('pyrolynx', 25, rng());
    me.moves = [slot('blaze_wave')];
    const e1 = createCreature('mossgrub', 3, rng());
    const e2 = createCreature('mossgrub', 3, rng());
    const b = new Battle({ kind: 'trainer', player: [me], enemy: [e1, e2], rng: rng(), ai: 1 });
    b.start();
    b.turn({ kind: 'move', index: 0 });
    expect(b.active[1]).toBe(1);
    b.turn({ kind: 'move', index: 0 });
    expect(b.over).toBe('win');
  });
});

describe('AI move choice', () => {
  it('prefers super-effective and KO moves', () => {
    const user = createCreature('puddlop', 12, rng());
    user.moves = [slot('bump'), slot('splash_shot'), slot('growl')];
    const target = createCreature('kindlet', 12, rng());
    const ctx = { user, userStages: emptyStages(), target, targetStages: emptyStages(), userFaster: true };
    const scores = user.moves.map((m) => scoreMove(getMove(m.id), ctx));
    expect(scores[1]).toBeGreaterThan(scores[0]);
    expect(scores[1]).toBeGreaterThan(scores[2]);
  });
  it('never picks a move the target is immune to', () => {
    const user = createCreature('bitzel', 12, rng());
    user.moves = [slot('zap'), slot('scratch')];
    const target = createCreature('pebblit', 12, rng());
    const ctx = { user, userStages: emptyStages(), target, targetStages: emptyStages(), userFaster: true };
    expect(scoreMove(getMove('zap'), ctx)).toBeLessThan(scoreMove(getMove('scratch'), ctx));
  });
  it('avoids status moves on an already-statused target', () => {
    const user = createCreature('shroomp', 12, rng());
    const target = createCreature('kindlet', 12, rng());
    const ctx = { user, userStages: emptyStages(), target, targetStages: emptyStages(), userFaster: true };
    const fresh = scoreMove(getMove('spore_puff'), ctx);
    target.status = 'burn';
    expect(scoreMove(getMove('spore_puff'), ctx)).toBeLessThan(fresh);
  });
  it('switches out of a bad matchup when it has a better option', () => {
    const me = createCreature('puddlop', 12, rng());
    me.moves = [slot('riptide')];
    const weakMon = createCreature('pebblit', 12, rng());
    weakMon.moves = [slot('bump')];
    const resist = createCreature('shroomp', 12, rng());
    let switched = 0;
    for (let s = 0; s < 40; s++) {
      const b = new Battle({ kind: 'trainer', player: [me], enemy: [weakMon, resist], rng: createRng(s), ai: 2 });
      if (chooseEnemyAction(b, 2, createRng(s), false).kind === 'switch') switched++;
    }
    expect(switched).toBeGreaterThan(15);
  });
});

describe('healing', () => {
  it('healFully restores HP, PP and status', () => {
    const c = createCreature('kindlet', 8, rng());
    c.hp = 1;
    c.status = 'burn';
    c.moves[0].pp = 0;
    healFully(c);
    expect(c.hp).toBe(maxHp(c));
    expect(c.status).toBe(null);
    expect(c.moves[0].pp).toBe(c.moves[0].maxPp);
  });
});
