import { getSpecies } from '../data/creatures';
import { createCreature, speciesForLevel, type Creature } from './creature';
import type { Rng } from './rng';

/** Battles per round of the Tidewatch Spire. Every round adds a level. */
export const TOWER_ROUND = 5;
export const TOWER_MIN_LEVEL = 30;
export const TOWER_TEAM = 3;

/** Strong fully evolved (or single-stage) creatures the Spire's trainers use. */
export const TOWER_POOL = [
  'pyrolynx', 'torrentoad', 'thornstag', 'galecrest', 'voltail', 'budwing', 'bouldrum', 'duskwraith', 'shroomp', 'lumimoth',
  'galeheron', 'cragthunder', 'fenwraith', 'nocturnelle', 'ribboneel', 'forgeback', 'drowsea', 'reedkin', 'shellstack',
] as const;

/** Held items Spire trainers may carry. */
const TOWER_HELD = ['mend_berry', 'clear_leaf', 'moss_wrap', 'stubborn_shell', 'swift_feather'];

/** Prize for each win; a held item every third win. */
export const TOWER_PRIZES = ['moss_wrap', 'stubborn_shell', 'swift_feather', 'lucky_scale', 'coal_charm', 'sea_glass', 'seed_locket', 'plume_pin', 'grit_idol', 'copper_coil', 'dusk_bead', 'fae_ribbon'];

export function towerLevel(partyTop: number, streak: number): number {
  return Math.min(50, Math.max(TOWER_MIN_LEVEL, partyTop) + Math.floor(streak / TOWER_ROUND));
}

/** Builds a Spire opponent's team: no repeated species, stronger IVs the longer the streak. */
export function towerTeam(level: number, streak: number, rng: Rng): Creature[] {
  const picks: string[] = [];
  while (picks.length < TOWER_TEAM) {
    const id = rng.pick(TOWER_POOL);
    if (!picks.includes(id)) picks.push(id);
  }
  const iv = Math.min(15, 6 + streak);
  return picks.map((id) => {
    const c = createCreature(speciesForLevel(id, level), level, rng, { hp: iv, atk: iv, def: iv, spa: iv, spd: iv, spe: iv });
    if (streak >= 3 && rng.chance(50)) c.held = rng.pick(TOWER_HELD);
    getSpecies(c.species);
    return c;
  });
}

export function towerPrize(wins: number): string | null {
  return wins > 0 && wins % 3 === 0 ? TOWER_PRIZES[(wins / 3 - 1) % TOWER_PRIZES.length] : null;
}
