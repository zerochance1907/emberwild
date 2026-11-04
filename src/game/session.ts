import { getSpecies } from '../data/creatures';
import { getItem } from '../data/items';
import { createCreature, healFully, speciesForLevel, type Creature } from '../engine/creature';
import { createRng } from '../engine/rng';
import { newGameState, writeSlot, type GameState, type SlotKey } from '../engine/save';

/** The live game session (current save + helpers). */
class Session {
  state: GameState = newGameState('Wren');
  rng = createRng();
  /** True when a game is in progress (new game or loaded). */
  active = false;

  start(state: GameState) {
    this.state = state;
    this.active = true;
  }

  flag(name: string): boolean {
    return !!this.state.flags[name];
  }

  setFlag(name: string, v = true) {
    this.state.flags[name] = v;
  }

  markSeen(species: string) {
    if (!this.state.seen.includes(species)) this.state.seen.push(species);
  }

  markCaught(species: string) {
    this.markSeen(species);
    if (!this.state.caught.includes(species)) this.state.caught.push(species);
  }

  /** Adds a creature to the party, or storage if full. Returns where it went. */
  addCreature(c: Creature): 'party' | 'storage' {
    c.caughtAt = this.state.map;
    this.markCaught(c.species);
    if (this.state.party.length < 6) {
      this.state.party.push(c);
      return 'party';
    }
    healFully(c);
    this.state.storage.push(c);
    return 'storage';
  }

  makeCreature(species: string, level: number): Creature {
    return createCreature(speciesForLevel(species, level), level, this.rng);
  }

  giveItem(id: string, qty = 1) {
    getItem(id);
    this.state.bag[id] = (this.state.bag[id] ?? 0) + qty;
  }

  takeItem(id: string, qty = 1): boolean {
    if ((this.state.bag[id] ?? 0) < qty) return false;
    this.state.bag[id] -= qty;
    if (this.state.bag[id] <= 0) delete this.state.bag[id];
    return true;
  }

  healParty() {
    for (const c of this.state.party) healFully(c);
  }

  firstHealthy(): number {
    return this.state.party.findIndex((c) => c.hp > 0);
  }

  partyName(i: number): string {
    const c = this.state.party[i];
    return c ? c.nickname ?? getSpecies(c.species).name : '';
  }

  save(slot: SlotKey): boolean {
    return writeSlot(localStorage, slot, this.state);
  }

  autosave() {
    if (this.active) this.save('emberwild.auto');
  }

  /** Cleans up bag entries that hit 0 during battle. */
  tidyBag() {
    for (const k of Object.keys(this.state.bag)) if (this.state.bag[k] <= 0) delete this.state.bag[k];
  }
}

export const session = new Session();

export function formatTime(ms: number): string {
  const m = Math.floor(ms / 60000);
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
}
