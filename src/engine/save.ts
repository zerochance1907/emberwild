import type { BaseStats } from '../data/creatures';
import type { Creature } from './creature';

/**
 * v1: Chapter One.
 * v2: Chapter Two (surfing, day-care, eggs, roaming creature, Tidewatch Spire record, held items on creatures).
 */
export const SAVE_VERSION = 2;

export type Dir = 'up' | 'down' | 'left' | 'right';

/** An egg from the day-care. Hatches after `steps` more steps. */
export interface Egg { species: string; ivs: BaseStats; steps: number }

export interface DaycareState {
  mons: Creature[];
  /** Steps walked since the last egg check. */
  steps: number;
  /** An egg waiting to be collected from the Nestkeeper. */
  egg: Egg | null;
}

export interface RoamerState {
  species: string;
  level: number;
  /** Current HP, or -1 for full. */
  hp: number;
  map: string;
  active: boolean;
  caught: boolean;
}

export interface GameState {
  version: number;
  playerName: string;
  rivalStarter?: string;
  starter?: string;
  map: string;
  x: number;
  y: number;
  dir: Dir;
  party: Creature[];
  storage: Creature[];
  bag: Record<string, number>;
  money: number;
  flags: Record<string, boolean>;
  seen: string[];
  caught: string[];
  defeatedTrainers: string[];
  /** Map + tile to return to after blacking out. */
  lastHearth: { map: string; x: number; y: number };
  /** In-game minutes since midnight (0..1439). */
  clock: number;
  playTimeMs: number;
  stats: { steps: number; battlesWon: number; wildEncounters: number; bonded: number };
  savedAt: number;
  // ---- v2 ----
  /** Riding the Driftboard on water. */
  surfing: boolean;
  daycare: DaycareState;
  eggs: Egg[];
  roamer: RoamerState;
  tower: { best: number; streak: number };
}

export function newGameState(playerName: string): GameState {
  return {
    version: SAVE_VERSION,
    playerName,
    map: 'home',
    x: 4,
    y: 5,
    dir: 'up',
    party: [],
    storage: [],
    bag: {},
    money: 1500,
    flags: {},
    seen: [],
    caught: [],
    defeatedTrainers: [],
    lastHearth: { map: 'home', x: 4, y: 5 },
    clock: 8 * 60,
    playTimeMs: 0,
    stats: { steps: 0, battlesWon: 0, wildEncounters: 0, bonded: 0 },
    savedAt: 0,
    ...v2Defaults(),
  };
}

function v2Defaults(): Pick<GameState, 'surfing' | 'daycare' | 'eggs' | 'roamer' | 'tower'> {
  return {
    surfing: false,
    daycare: { mons: [], steps: 0, egg: null },
    eggs: [],
    roamer: { species: 'squallion', level: 30, hp: -1, map: 'mirefen', active: false, caught: false },
    tower: { best: 0, streak: 0 },
  };
}

export function serialize(state: GameState): string {
  return JSON.stringify({ ...state, savedAt: Date.now() });
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function validCreature(c: unknown): c is Creature {
  return (
    isObj(c) && typeof c.species === 'string' && typeof c.level === 'number' && typeof c.hp === 'number' &&
    typeof c.xp === 'number' && Array.isArray(c.moves) && isObj(c.ivs)
  );
}

type RawSave = Record<string, unknown>;

/** Upgrades a save one version at a time. Each step only adds or fills fields, so old data is never lost. */
export const MIGRATIONS: Record<number, (raw: RawSave) => RawSave> = {
  1: (raw) => {
    const d = v2Defaults();
    const out: RawSave = { ...raw, version: 2 };
    if (typeof raw.surfing !== 'boolean') out.surfing = false;
    const dc = isObj(raw.daycare) ? raw.daycare : {};
    out.daycare = {
      mons: Array.isArray(dc.mons) ? (dc.mons as unknown[]).filter(validCreature) : [],
      steps: typeof dc.steps === 'number' ? dc.steps : 0,
      egg: isObj(dc.egg) ? dc.egg : null,
    };
    out.eggs = Array.isArray(raw.eggs) ? raw.eggs : [];
    out.roamer = { ...d.roamer, ...(isObj(raw.roamer) ? raw.roamer : {}) };
    out.tower = { ...d.tower, ...(isObj(raw.tower) ? raw.tower : {}) };
    return out;
  },
};

export function migrate(raw: RawSave): RawSave {
  let cur = raw;
  while ((cur.version as number) < SAVE_VERSION) {
    const step = MIGRATIONS[cur.version as number];
    if (!step) throw new Error(`No migration from save version ${cur.version}.`);
    cur = step(cur);
  }
  return cur;
}

/** Parses and validates a save. Throws a readable error on bad data. Older versions are migrated. */
export function deserialize(json: string): GameState {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new Error('Save data is not valid JSON.');
  }
  if (!isObj(raw)) throw new Error('Save data is malformed.');
  if (typeof raw.version !== 'number' || raw.version > SAVE_VERSION) throw new Error('Save data is from an unknown version.');
  if (typeof raw.playerName !== 'string' || typeof raw.map !== 'string') throw new Error('Save data is missing player info.');
  if (!Array.isArray(raw.party) || !raw.party.every(validCreature)) throw new Error('Save data has an invalid team.');
  if (raw.version < 1) throw new Error('Save data is from an unknown version.');
  raw = migrate(raw);
  if (!isObj(raw) || typeof raw.playerName !== 'string') throw new Error('Save data is malformed.');
  const base = newGameState(raw.playerName);
  const state = { ...base, ...raw } as GameState;
  state.storage = Array.isArray(raw.storage) ? (raw.storage as unknown[]).filter(validCreature) : [];
  state.stats = { ...base.stats, ...(isObj(raw.stats) ? (raw.stats as GameState['stats']) : {}) };
  state.version = SAVE_VERSION;
  return state;
}

/** Export format: base64 of the JSON so it can be pasted easily. */
export function exportSave(state: GameState): string {
  const json = serialize(state);
  const bytes = new TextEncoder().encode(json);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return 'EW1:' + btoa(bin);
}

export function importSave(text: string): GameState {
  const t = text.trim();
  if (t.startsWith('{')) return deserialize(t);
  const body = t.startsWith('EW1:') ? t.slice(4) : t;
  let json: string;
  try {
    const bin = atob(body);
    json = new TextDecoder().decode(Uint8Array.from(bin, (ch) => ch.charCodeAt(0)));
  } catch {
    throw new Error('That does not look like an Emberwild save code.');
  }
  return deserialize(json);
}

export interface SaveStore {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

export const SLOT_KEYS = ['emberwild.auto', 'emberwild.slot1', 'emberwild.slot2', 'emberwild.slot3'] as const;
export type SlotKey = (typeof SLOT_KEYS)[number];

export function writeSlot(store: SaveStore, key: SlotKey, state: GameState): boolean {
  try {
    store.setItem(key, serialize(state));
    return true;
  } catch {
    return false;
  }
}

export function readSlot(store: SaveStore, key: SlotKey): GameState | null {
  try {
    const raw = store.getItem(key);
    return raw ? deserialize(raw) : null;
  } catch {
    return null;
  }
}

export function latestSlot(store: SaveStore): { key: SlotKey; state: GameState } | null {
  let best: { key: SlotKey; state: GameState } | null = null;
  for (const key of SLOT_KEYS) {
    const st = readSlot(store, key);
    if (st && (!best || st.savedAt > best.state.savedAt)) best = { key, state: st };
  }
  return best;
}
