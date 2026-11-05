import type { Rng } from './rng';
import type { RoamerState } from './save';

/** Outdoor Chapter Two maps the roaming creature wanders between. */
export const ROAM_MAPS = ['route3', 'mirefen', 'stormridge'] as const;
/** Chance (out of 100) that a wild encounter on the roamer's map is the roamer instead. */
export const ROAM_ENCOUNTER = 18;
/** Chance (out of 100) per turn that it gallops away. */
export const ROAM_FLEE = 45;

/** Moves the roamer to a different map. Called whenever the player changes map. */
export function moveRoamer(r: RoamerState, rng: Rng): void {
  if (!r.active || r.caught) return;
  const options = ROAM_MAPS.filter((m) => m !== r.map);
  r.map = rng.pick(options);
}

export function roamerHere(r: RoamerState, map: string): boolean {
  return r.active && !r.caught && r.map === map;
}
