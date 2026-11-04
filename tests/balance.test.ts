import { expect, it } from 'vitest';

// Simulated playthrough: a player who catches two creatures, uses no items and never switches
// should reach the Warden with a lead around level 12-14 and win.
import { MAPS } from '../src/data/maps';
import { TRAINERS, RIVAL_COUNTER } from '../src/data/trainers';
import { getMove } from '../src/data/moves';
import { Battle } from '../src/engine/battle';
import { scoreMove } from '../src/engine/ai';
import { createCreature, healFully, speciesForLevel, slot, evolve, type Creature } from '../src/engine/creature';
import { createRng } from '../src/engine/rng';

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
function fight(party: Creature[], enemy: Creature[], kind: 'wild' | 'trainer', rng: any, ai: any = 1) {
  const b = new Battle({ kind, player: party, enemy, rng, ai, bag: {} });
  b.start();
  for (let t = 0; t < 80 && !b.over; t++) {
    if (b.awaitingSwitch) { b.forceSwitch(party.findIndex((c, i) => c.hp > 0 && i !== b.active[0])); continue; }
    b.turn({ kind: 'move', index: playerMove(b) });
  }
  for (const c of party) if (c.pendingEvolution) evolve(c);
  return b.over;
}
for (const starter of ['kindlet', 'puddlop', 'sprigling']) it(`chapter one is beatable without grinding (${starter})`, () => {
  const rng = createRng(42);
  const party: Creature[] = [createCreature(starter, 6, rng)];
  const team = (id: string) => TRAINERS[id].team.map((m) => { const sp = m.species === 'RIVAL' ? RIVAL_COUNTER[starter] : m.species; const c = createCreature(speciesForLevel(sp, m.level), m.level, rng); if (m.moves) c.moves = m.moves.map(slot); return c; });
  const wild = (map: string, n: number) => { for (let i = 0; i < n; i++) { const t = MAPS[map].encounters!.table; const e = t[rng.int(0, t.length - 1)]; fight(party, [createCreature(speciesForLevel(e.species, rng.int(e.min, e.max)), rng.int(e.min, e.max), rng)], 'wild', rng, 0); party.forEach(healFully); } };
  const tr = (id: string) => { const r = fight(party, team(id), 'trainer', rng, TRAINERS[id].ai); party.forEach(healFully); return r; };
  const log: string[] = [];
  tr('kip1');
  wild('route1', 6); party.push(createCreature('fluffinch', 4, rng));
  tr('scout_tomas'); tr('picnicker_ada');
  wild('whisperwood', 8); party.push(createCreature('shroomp', 6, rng));
  tr('forager_lia'); tr('scout_rhea'); tr('veil_grunt_1');
  wild('route2', 6);
  tr('hiker_doran'); tr('birder_sol'); log.push('kip2 ' + tr('kip2'));
  wild('glimmer', 6);
  tr('veil_grunt_2'); tr('veil_grunt_3'); log.push('nyx ' + tr('agent_nyx'));
  tr('apprentice_flint');
  const lv = party.map((c) => `${c.species}:${c.level}`).join(' ');
  const lead = Math.max(...party.map((c) => c.level));
  const result = tr('warden_corra');
  void lv; void log;
  expect(lead).toBeGreaterThanOrEqual(12);
  expect(lead).toBeLessThanOrEqual(15);
  expect(result).toBe('win');
});
