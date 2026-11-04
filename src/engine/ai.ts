import { getSpecies } from '../data/creatures';
import { getMove, type MoveDef } from '../data/moves';
import { effectiveness } from '../data/types';
import type { Battle, EnemyAction, Stages } from './battle';
import { expectedDamage } from './battle';
import { maxHp, type Creature } from './creature';
import type { Rng } from './rng';

/** 0 = wild (random), 1 = trainer (sensible), 2 = Warden / rival (sharp). */
export type AiLevel = 0 | 1 | 2;

export interface MoveScoreContext {
  user: Creature;
  userStages: Stages;
  target: Creature;
  targetStages: Stages;
  userFaster: boolean;
}

/** Scores a move from the attacker's point of view. Higher is better. */
export function scoreMove(move: MoveDef, ctx: MoveScoreContext): number {
  const { user, target } = ctx;
  const fx = move.effect ?? {};
  const acc = move.accuracy > 0 ? move.accuracy / 100 : 1;
  if (move.category !== 'status') {
    const eff = effectiveness(move.type, getSpecies(target.species).types);
    if (eff === 0) return -50;
    const dmg = expectedDamage(user, ctx.userStages, target, ctx.targetStages, move);
    let score = (Math.min(dmg, target.hp) / Math.max(1, target.hp)) * 100;
    if (dmg >= target.hp) {
      score = 130;
      if ((move.priority ?? 0) > 0 && !ctx.userFaster) score += 30; // finish before it moves
    }
    if (fx.recoilPct) score -= 8;
    if (fx.drainPct && user.hp < maxHp(user) / 2) score += 10;
    return score * acc;
  }
  if (fx.healPct) return user.hp < maxHp(user) * 0.45 ? 85 : user.hp < maxHp(user) * 0.7 ? 25 : -20;
  if (fx.status) {
    if (target.status) return -20;
    const types = getSpecies(target.species).types;
    if ((fx.status === 'burn' && types.includes('ember')) || (fx.status === 'jolt' && types.includes('spark')) || (fx.status === 'blight' && types.includes('shade'))) return -20;
    const base = fx.status === 'drowsy' ? 55 : fx.status === 'burn' && statsPhysical(target) ? 50 : 38;
    return base * acc;
  }
  let score = 0;
  if (fx.self) for (const [k, v] of Object.entries(fx.self)) score += ctx.userStages[k as keyof Stages] < 2 ? 14 * (v ?? 0) : 0;
  if (fx.target) for (const [k, v] of Object.entries(fx.target)) score += ctx.targetStages[k as keyof Stages] > -2 ? 10 * -(v ?? 0) : 0;
  if (user.hp < maxHp(user) * 0.4) score *= 0.3; // no time for set-up when nearly fainted
  return score * acc;
}

function statsPhysical(c: Creature): boolean {
  const b = getSpecies(c.species).base;
  return b.atk >= b.spa;
}

/** Highest effectiveness the foe's own types have against a creature (a cheap "threat" estimate). */
export function threatAgainst(foe: Creature, me: Creature): number {
  const myTypes = getSpecies(me.species).types;
  const moveTypes = new Set(foe.moves.map((m) => getMove(m.id)).filter((m) => m.category !== 'status').map((m) => m.type));
  for (const t of getSpecies(foe.species).types) moveTypes.add(t);
  let worst = 0;
  for (const t of moveTypes) worst = Math.max(worst, effectiveness(t, myTypes));
  return worst;
}

export function bestMoveIndex(b: Battle, rng: Rng, level: AiLevel): number {
  const user = b.mon(1);
  const usable = user.moves.map((m, i) => ({ m, i })).filter(({ m }) => m.pp > 0);
  if (!usable.length) return 0;
  if (level === 0) return rng.pick(usable).i;
  const ctx: MoveScoreContext = {
    user, userStages: b.stages[1], target: b.mon(0), targetStages: b.stages[0], userFaster: b.speed(1) >= b.speed(0),
  };
  const noise = level === 1 ? 25 : 8;
  let best = usable[0].i;
  let bestScore = -Infinity;
  for (const { m, i } of usable) {
    const score = scoreMove(getMove(m.id), ctx) + rng.next() * noise;
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  }
  return best;
}

export function chooseEnemyAction(b: Battle, level: AiLevel, rng: Rng, switchedLastTurn: boolean): EnemyAction {
  const me = b.mon(1);
  if (b.kind === 'trainer' && level >= 1) {
    // Heal when in danger.
    const tonic = Object.keys(b.enemyItems).find((k) => b.enemyItems[k] > 0);
    if (tonic && me.hp > 0 && me.hp < maxHp(me) * 0.25 && rng.chance(level === 2 ? 80 : 50)) return { kind: 'item', item: tonic };
    // Switch out of a bad matchup.
    if (!switchedLastTurn) {
      const foe = b.mon(0);
      const threat = threatAgainst(foe, me);
      const myBest = Math.max(...me.moves.map((m) => effectiveness(getMove(m.id).type, getSpecies(foe.species).types) * (getMove(m.id).power > 0 ? 1 : 0)));
      if (threat >= 2 && myBest <= 1) {
        let bestIdx = -1;
        let bestThreat = threat;
        b.party[1].forEach((c, i) => {
          if (i === b.active[1] || c.hp < maxHp(c) * 0.4) return;
          const t = threatAgainst(foe, c);
          if (t < bestThreat) {
            bestThreat = t;
            bestIdx = i;
          }
        });
        if (bestIdx >= 0 && bestThreat <= 1 && rng.chance(level === 2 ? 70 : 35)) return { kind: 'switch', index: bestIdx };
      }
    }
  }
  return { kind: 'move', index: bestMoveIndex(b, rng, level) };
}
