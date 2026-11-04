import { getSpecies, SPECIES_LIST, type BaseStats } from '../data/creatures';
import { createCreature, gainXp, slot, type Creature } from './creature';
import type { Rng } from './rng';
import type { DaycareState, Egg } from './save';

/** Steps between egg checks, chance per check, and steps for an egg to hatch. */
export const EGG_CHECK_STEPS = 128;
export const EGG_CHANCE = 50;
export const EGG_HATCH_STEPS = 600;
export const HATCH_LEVEL = 5;
export const DAYCARE_SLOTS = 2;

/** The first stage of a creature's evolution line. */
export function baseForm(speciesId: string): string {
  let id = speciesId;
  for (let guard = 0; guard < 8; guard++) {
    const prev = SPECIES_LIST.find((sp) => sp.evolves?.to === id);
    if (!prev) return id;
    id = prev.id;
  }
  return id;
}

/** Two creatures can share a nest if they have a type in common. The roaming creature never nests. */
export function compatible(a: Creature, b: Creature): boolean {
  if (a.species === 'squallion' || b.species === 'squallion') return false;
  const ta = getSpecies(a.species).types;
  return getSpecies(b.species).types.some((t) => ta.includes(t));
}

/** The egg two parents would make: the first parent's base form, inheriting the better IV for every stat. */
export function makeEgg(a: Creature, b: Creature): Egg {
  const ivs = {} as BaseStats;
  for (const k of Object.keys(a.ivs) as (keyof BaseStats)[]) ivs[k] = Math.max(a.ivs[k], b.ivs[k]);
  return { species: baseForm(a.species), ivs, steps: EGG_HATCH_STEPS };
}

/** Day-care creatures gain 1 XP per step and learn new moves on their own (forgetting the oldest). */
export function trainStep(c: Creature): void {
  for (const r of gainXp(c, 1)) {
    for (const mv of r.wantsToLearn) {
      c.moves.shift();
      c.moves.push(slot(mv));
    }
  }
  c.pendingEvolution = undefined; // no evolving while in the nest
}

export interface StepResult {
  eggFound?: boolean;
  hatched?: Creature[];
}

/** Advances the day-care and any carried eggs by one step. */
export function daycareStep(dc: DaycareState, eggs: Egg[], rng: Rng): StepResult {
  const out: StepResult = {};
  for (const c of dc.mons) trainStep(c);
  if (dc.mons.length === 2 && !dc.egg && compatible(dc.mons[0], dc.mons[1])) {
    dc.steps++;
    if (dc.steps >= EGG_CHECK_STEPS) {
      dc.steps = 0;
      if (rng.chance(EGG_CHANCE)) {
        dc.egg = makeEgg(dc.mons[0], dc.mons[1]);
        out.eggFound = true;
      }
    }
  }
  for (let i = eggs.length - 1; i >= 0; i--) {
    eggs[i].steps--;
    if (eggs[i].steps <= 0) {
      const e = eggs.splice(i, 1)[0];
      (out.hatched ??= []).push(hatch(e, rng));
    }
  }
  return out;
}

export function hatch(e: Egg, rng: Rng): Creature {
  return createCreature(e.species, HATCH_LEVEL, rng, e.ivs);
}
