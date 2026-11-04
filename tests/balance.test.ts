import { describe, expect, it } from 'vitest';

// Simulated playthrough: a player who catches a few creatures, uses no items and never switches
// should reach each Warden with a sensible lead level and win.
import { MAPS } from '../src/data/maps';
import { TRAINERS, RIVAL_COUNTER } from '../src/data/trainers';
import { getMove } from '../src/data/moves';
import { Battle, emptyStages, expectedDamage } from '../src/engine/battle';
import { threatAgainst } from '../src/engine/ai';
import { scoreMove } from '../src/engine/ai';
import { createCreature, healFully, movesAtLevel, speciesForLevel, slot, evolve, type Creature } from '../src/engine/creature';
import { createRng, type Rng } from '../src/engine/rng';

function playerMove(b: Battle) {
  const me = b.mon(0);
  let best = 0, bs = -1e9;
  me.moves.forEach((m, i) => {
    if (m.pp <= 0) return;
    const s = scoreMove(getMove(m.id), { user: me, userStages: b.stages[0], target: b.mon(1), targetStages: b.stages[1], userFaster: true });
    if (s > bs) { bs = s; best = i; }
  });
  return best;
}
/** How well a creature matches up against a foe (higher is better). */
function matchup(c: Creature, foe: Creature) {
  return Math.max(...c.moves.map((m) => expectedDamage(c, emptyStages(), foe, emptyStages(), getMove(m.id)))) / Math.max(1, foe.hp) - threatAgainst(foe, c) * 0.25 + c.level / 100;
}

function fight(party: Creature[], enemy: Creature[], kind: 'wild' | 'trainer', rng: Rng, ai: 0 | 1 | 2 = 1, smart = false) {
  const b = new Battle({ kind, player: party, enemy, rng, ai, bag: {} });
  const ev0 = b.start();
  const trace = process.env.SIM_TRACE && enemy.some((e) => e.species === process.env.SIM_TRACE);
  if (trace) for (const e of ev0) if (e.t === 'text') console.log('  ', e.text);
  for (let t = 0; t < 80 && !b.over; t++) {
    if (b.awaitingSwitch) {
      const options = party.map((c, i) => ({ c, i })).filter(({ c, i }) => c.hp > 0 && i !== b.active[0]);
      const pick = smart ? options.reduce((best, o) => (matchup(o.c, b.mon(1)) > matchup(best.c, b.mon(1)) ? o : best)) : options[0];
      b.forceSwitch(pick.i);
      continue;
    }
    const ev = b.turn({ kind: 'move', index: playerMove(b) });
    if (trace) for (const e of ev) if (e.t === 'text' && /used|fainted|super|sent out|Go,/.test(e.text)) console.log('  ', e.text);
  }
  for (const c of party) if (c.pendingEvolution) evolve(c);
  return b.over;
}

/** A simulated run. Each step heals the team afterwards, like a player visiting a Hearth between fights. */
class Run {
  party: Creature[];
  log: string[] = [];
  /** Put the strongest creature first before each fight (what players do once their team grows). */
  leadWithBest = false;
  constructor(public starter: string, public rng = createRng(42)) {
    this.party = [createCreature(starter, 6, rng)];
  }
  team(id: string) {
    return TRAINERS[id].team.map((m) => {
      const sp = m.species === 'RIVAL' ? RIVAL_COUNTER[this.starter] : m.species;
      const c = createCreature(speciesForLevel(sp, m.level), m.level, this.rng);
      if (m.moves) c.moves = m.moves.map(slot);
      return c;
    });
  }
  wild(map: string, n: number) {
    for (let i = 0; i < n; i++) {
      const t = MAPS[map].encounters!.table;
      const e = t[this.rng.int(0, t.length - 1)];
      this.order();
      fight(this.party, [createCreature(speciesForLevel(e.species, this.rng.int(e.min, e.max)), this.rng.int(e.min, e.max), this.rng)], 'wild', this.rng, 0);
      this.party.forEach(healFully);
    }
  }
  /** Strongest first; against a trainer, lead with whoever matches up best against their first creature. */
  /** Chapter Two players say yes to new moves: everyone knows the latest four moves for their level. */
  learn() {
    if (!this.leadWithBest) return;
    for (const c of this.party) c.moves = movesAtLevel(c.species, c.level).map(slot);
  }
  order(foe?: Creature) {
    if (!this.leadWithBest) return;
    this.learn();
    this.party.sort((a, b) => b.level - a.level);
    if (!foe) return;
    const best = this.party.reduce((bi, c, i) => (matchup(c, foe) > matchup(this.party[bi], foe) ? i : bi), 0);
    this.party.unshift(...this.party.splice(best, 1));
  }
  tr(id: string) {
    const team = this.team(id);
    this.order(team[0]);
    const r = fight(this.party, team, 'trainer', this.rng, TRAINERS[id].ai, this.leadWithBest);
    this.party.forEach(healFully);
    this.log.push(`${id}:${r}`);
    if (process.env.SIM_DEBUG) console.log(this.starter, id, r, this.summary());
    return r;
  }
  /** A boss the player may need a second go at (healed, no extra training in between). */
  boss(id: string) {
    const first = this.tr(id);
    return first === 'win' ? first : this.tr(id);
  }
  catch(species: string, level: number) {
    this.party.push(createCreature(speciesForLevel(species, level), level, this.rng));
  }
  get lead() {
    return Math.max(...this.party.map((c) => c.level));
  }
  summary() {
    return this.party.map((c) => `${c.species}:${c.level}`).join(' ');
  }
}

function chapterOne(run: Run) {
  run.tr('kip1');
  run.wild('route1', 6); run.catch('fluffinch', 4);
  run.tr('scout_tomas'); run.tr('picnicker_ada');
  run.wild('whisperwood', 8); run.catch('shroomp', 6);
  run.tr('forager_lia'); run.tr('scout_rhea'); run.tr('veil_grunt_1');
  run.wild('route2', 6);
  run.tr('hiker_doran'); run.tr('birder_sol'); run.tr('kip2');
  run.wild('glimmer', 6);
  run.tr('veil_grunt_2'); run.tr('veil_grunt_3'); run.tr('agent_nyx');
  run.tr('apprentice_flint');
}

/** Chapter Two in story order, catching one new creature per area like a typical player. */
function chapterTwo(run: Run) {
  run.leadWithBest = true;
  run.wild('route3', 6); run.catch('pipwhisk', 15);
  run.tr('sailor_brann'); run.tr('birder_isa'); run.tr('hiker_moss');
  const kip = run.boss('kip3');
  run.tr('veil_grunt_4'); run.tr('veil_grunt_5');
  run.wild('mirefen', 6); run.catch('reedkin', 19);
  run.tr('angler_pim'); run.tr('forager_tansy'); run.tr('swimmer_coral'); run.tr('swimmer_jun');
  run.wild('observatory', 4);
  run.tr('veil_grunt_6'); run.tr('veil_grunt_7');
  const vesper = run.boss('admin_vesper');
  run.wild('stormridge', 6); run.catch('fizzkid', 22);
  run.tr('hiker_tor'); run.tr('scout_kesh'); run.tr('birder_vale');
  const nyx = run.boss('agent_nyx2');
  run.wild('grotto', 5);
  run.tr('veil_grunt_8'); run.tr('veil_grunt_9');
  const vesper2 = run.boss('admin_vesper2');
  run.tr('apprentice_nell'); run.tr('apprentice_ottar');
  return { kip, vesper, nyx, vesper2 };
}

const STARTERS = ['kindlet', 'puddlop', 'sprigling'];

describe('chapter one', () => {
  for (const starter of STARTERS) it(`is beatable without grinding (${starter})`, () => {
    const run = new Run(starter);
    chapterOne(run);
    const lead = run.lead;
    const result = run.tr('warden_corra');
    expect(lead).toBeGreaterThanOrEqual(12);
    expect(lead).toBeLessThanOrEqual(15);
    expect(result).toBe('win');
  });
});

describe('chapter two', () => {
  // A single seed flips on tiny content changes, so Chapter Two checks a majority over several seeds.
  // For calibration: under this same no-items player, Warden Corra wins 7, 9 and 20 of 20 seeds.
  const SEEDS = [1, 2, 3, 4, 5, 6, 7];
  for (const starter of STARTERS) it(`is beatable through Warden Maren without grinding (${starter})`, () => {
    const wins = { kip: 0, vesper: 0, nyx: 0, vesper2: 0, maren: 0 };
    const notes: string[] = [];
    for (const seed of SEEDS) {
      const run = new Run(starter, createRng(seed));
      chapterOne(run);
      run.tr('warden_corra');
      const bosses = chapterTwo(run);
      const lead = run.lead;
      expect(lead, `seed ${seed}: ${run.summary()}`).toBeGreaterThanOrEqual(24);
      expect(lead, `seed ${seed}: ${run.summary()}`).toBeLessThanOrEqual(30);
      const maren = run.tr('warden_maren');
      for (const [k, v] of Object.entries({ ...bosses, maren })) if (v === 'win') wins[k as keyof typeof wins]++;
      notes.push(`seed ${seed}: maren ${maren}, lead ${lead}`);
    }
    const info = `${JSON.stringify(wins)} | ${notes.join('; ')}`;
    if (process.env.SIM_DEBUG) console.log(starter, info);
    // At least as winnable as Corra is in Chapter One for the same baseline player (worst case ~35%, Kindlet).
    expect(wins.maren, info).toBeGreaterThanOrEqual(3);
    expect(wins.vesper, info).toBeGreaterThanOrEqual(6);
    expect(wins.nyx, info).toBeGreaterThanOrEqual(6);
    expect(wins.vesper2, info).toBeGreaterThanOrEqual(6);
    expect(wins.kip, info).toBeGreaterThanOrEqual(4);
  });
  it.skipIf(!process.env.SIM_SWEEP)('win-rate sweep across seeds (set SIM_SWEEP=1)', () => {
    for (const starter of STARTERS) {
      const res: Record<string, number> = {};
      const leads: number[] = [];
      for (let seed = 1; seed <= 20; seed++) {
        const run = new Run(starter, createRng(seed));
        chapterOne(run);
        const corra = run.tr('warden_corra');
        res.corra = (res.corra ?? 0) + (corra === 'win' ? 1 : 0);
        const b = chapterTwo(run);
        leads.push(run.lead);
        const m = run.tr('warden_maren');
        for (const [k, v] of Object.entries({ ...b, maren: m })) res[k] = (res[k] ?? 0) + (v === 'win' ? 1 : 0);
      }
      console.log(starter, JSON.stringify(res), 'leads', leads.join(','));
    }
  });
  it('the Warden is a real test: an under-levelled team loses', () => {
    const run = new Run('kindlet');
    chapterOne(run);
    run.tr('warden_corra');
    // skip all of Chapter Two's training
    expect(run.tr('warden_maren')).toBe('lose');
  });
});
