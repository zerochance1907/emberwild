import { getSpecies, type BaseStats } from '../data/creatures';
import { getMove, type StatusId } from '../data/moves';
import type { Rng } from './rng';

export interface MoveSlot { id: string; pp: number; maxPp: number }

export interface Creature {
  uid: string;
  species: string;
  nickname?: string;
  level: number;
  xp: number;
  hp: number;
  ivs: BaseStats;
  moves: MoveSlot[];
  status: StatusId | null;
  statusTurns: number;
  /** Species id it is waiting to evolve into after battle. */
  pendingEvolution?: string;
  caughtAt?: string;
}

export type StatName = keyof BaseStats;

export const MAX_LEVEL = 50;

let uidCounter = 0;
export function newUid(rng?: Rng): string {
  uidCounter++;
  const r = rng ? Math.floor(rng.next() * 1e9) : Math.floor(Math.random() * 1e9);
  return `${Date.now().toString(36)}-${uidCounter.toString(36)}-${r.toString(36)}`;
}

/** Total XP needed to reach a level (cubic "medium" curve, scaled down so chapter one paces well). */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.floor((4 * level ** 3) / 5);
}

export function calcStat(base: number, iv: number, level: number, stat: StatName): number {
  const core = Math.floor(((2 * base + iv) * level) / 100);
  return stat === 'hp' ? core + level + 10 : core + 5;
}

export function stats(c: Creature): BaseStats {
  const b = getSpecies(c.species).base;
  return {
    hp: calcStat(b.hp, c.ivs.hp, c.level, 'hp'),
    atk: calcStat(b.atk, c.ivs.atk, c.level, 'atk'),
    def: calcStat(b.def, c.ivs.def, c.level, 'def'),
    spa: calcStat(b.spa, c.ivs.spa, c.level, 'spa'),
    spd: calcStat(b.spd, c.ivs.spd, c.level, 'spd'),
    spe: calcStat(b.spe, c.ivs.spe, c.level, 'spe'),
  };
}

export const maxHp = (c: Creature) => stats(c).hp;
export const displayName = (c: Creature) => c.nickname ?? getSpecies(c.species).name;

/** The latest four moves a species knows at a level. */
export function movesAtLevel(speciesId: string, level: number): string[] {
  const learned: string[] = [];
  for (const [lv, mv] of getSpecies(speciesId).learnset) {
    if (lv <= level && !learned.includes(mv)) learned.push(mv);
  }
  return learned.slice(-4);
}

export function slot(id: string): MoveSlot {
  const pp = getMove(id).pp;
  return { id, pp, maxPp: pp };
}

export function createCreature(speciesId: string, level: number, rng: Rng, ivs?: Partial<BaseStats>): Creature {
  const iv = () => rng.int(0, 15);
  const fullIvs: BaseStats = { hp: iv(), atk: iv(), def: iv(), spa: iv(), spd: iv(), spe: iv(), ...ivs };
  const c: Creature = {
    uid: newUid(rng),
    species: speciesId,
    level,
    xp: xpForLevel(level),
    hp: 1,
    ivs: fullIvs,
    moves: movesAtLevel(speciesId, level).map(slot),
    status: null,
    statusTurns: 0,
  };
  c.hp = maxHp(c);
  return c;
}

export function healFully(c: Creature): void {
  c.hp = maxHp(c);
  c.status = null;
  c.statusTurns = 0;
  for (const m of c.moves) m.pp = m.maxPp;
}

/** XP a defeated creature yields. Trainer battles give 50% more. */
export function xpYield(defeated: Creature, trainer: boolean): number {
  const sp = getSpecies(defeated.species);
  return Math.max(1, Math.floor(((sp.baseXp * defeated.level) / 8) * (trainer ? 1.5 : 1)));
}

export interface LevelUpResult {
  level: number;
  learned: string[]; // learned automatically
  wantsToLearn: string[]; // needs a replace prompt (already 4 moves)
  evolveTo?: string;
  hpGain: number;
}

/** Adds XP and processes any level-ups. Mutates the creature. */
export function gainXp(c: Creature, amount: number): LevelUpResult[] {
  const results: LevelUpResult[] = [];
  if (c.level >= MAX_LEVEL) return results;
  c.xp += amount;
  while (c.level < MAX_LEVEL && c.xp >= xpForLevel(c.level + 1)) {
    const oldMax = maxHp(c);
    c.level++;
    const newMax = maxHp(c);
    const hpGain = newMax - oldMax;
    if (c.hp > 0) c.hp = Math.min(newMax, c.hp + hpGain);
    const res: LevelUpResult = { level: c.level, learned: [], wantsToLearn: [], hpGain };
    for (const [lv, mv] of getSpecies(c.species).learnset) {
      if (lv !== c.level || c.moves.some((m) => m.id === mv)) continue;
      if (c.moves.length < 4) {
        c.moves.push(slot(mv));
        res.learned.push(mv);
      } else res.wantsToLearn.push(mv);
    }
    const evo = getSpecies(c.species).evolves;
    if (evo && c.level >= evo.level) {
      c.pendingEvolution = evo.to;
      res.evolveTo = evo.to;
    }
    results.push(res);
  }
  if (c.level >= MAX_LEVEL) c.xp = xpForLevel(MAX_LEVEL);
  return results;
}

/** Replace a move slot (or append if fewer than four). Returns false if the move is already known. */
export function learnMove(c: Creature, moveId: string, replaceIndex?: number): boolean {
  if (c.moves.some((m) => m.id === moveId)) return false;
  if (c.moves.length < 4) c.moves.push(slot(moveId));
  else if (replaceIndex !== undefined && replaceIndex >= 0 && replaceIndex < 4) c.moves[replaceIndex] = slot(moveId);
  else return false;
  return true;
}

/** Evolve into a new species. HP keeps the same missing amount. Returns moves the new form learns at this level. */
export function evolve(c: Creature, to?: string): { from: string; to: string; newMoves: string[] } {
  const target = to ?? c.pendingEvolution ?? getSpecies(c.species).evolves?.to;
  if (!target) throw new Error(`${c.species} cannot evolve`);
  const from = c.species;
  const missing = maxHp(c) - c.hp;
  c.species = target;
  c.pendingEvolution = undefined;
  c.hp = Math.max(c.hp > 0 ? 1 : 0, maxHp(c) - missing);
  const newMoves = getSpecies(target)
    .learnset.filter(([lv, mv]) => lv === c.level && !c.moves.some((m) => m.id === mv))
    .map(([, mv]) => mv);
  return { from, to: target, newMoves };
}

/** Wild/trainer creatures above the evolution level appear as their evolved form. */
export function speciesForLevel(speciesId: string, level: number): string {
  let id = speciesId;
  for (;;) {
    const evo = getSpecies(id).evolves;
    if (evo && level >= evo.level) id = evo.to;
    else return id;
  }
}
