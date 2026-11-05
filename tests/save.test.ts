import { describe, expect, it } from 'vitest';
import { createCreature } from '../src/engine/creature';
import { createRng } from '../src/engine/rng';
import {
  deserialize, exportSave, importSave, latestSlot, MIGRATIONS, newGameState, readSlot, serialize, writeSlot, type SaveStore,
} from '../src/engine/save';

function memStore(): SaveStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) };
}

function sample() {
  const s = newGameState('Wren');
  s.party.push(createCreature('kindlet', 7, createRng(1)));
  s.storage.push(createCreature('mossgrub', 4, createRng(2)));
  s.bag = { bond_stone: 4, berry_tonic: 2 };
  s.flags = { gotStarter: true };
  s.seen = ['kindlet', 'mossgrub'];
  s.caught = ['kindlet'];
  s.money = 4321;
  s.map = 'route1';
  s.x = 9;
  s.y = 12;
  return s;
}

describe('save / load', () => {
  it('round-trips through JSON', () => {
    const s = sample();
    const back = deserialize(serialize(s));
    expect({ ...back, savedAt: 0 }).toEqual({ ...s, savedAt: 0 });
  });
  it('round-trips through the export code (including unicode names)', () => {
    const s = sample();
    s.playerName = 'Wrén ✦';
    const code = exportSave(s);
    expect(code.startsWith('EW1:')).toBe(true);
    const back = importSave(code);
    expect(back.playerName).toBe('Wrén ✦');
    expect(back.party[0].species).toBe('kindlet');
  });
  it('rejects garbage with a readable error', () => {
    expect(() => deserialize('nope')).toThrow(/JSON/);
    expect(() => deserialize('{"version":99}')).toThrow(/version/);
    expect(() => deserialize('{"version":1,"playerName":"a","map":"x","party":[{"species":1}]}')).toThrow(/team/);
    expect(() => importSave('EW1:%%%')).toThrow();
  });
  it('fills in fields missing from older saves', () => {
    const s = sample() as unknown as Record<string, unknown>;
    delete s.stats;
    delete s.storage;
    const back = deserialize(JSON.stringify(s));
    expect(back.stats.steps).toBe(0);
    expect(back.storage).toEqual([]);
  });
  it('writes slots and finds the most recent', async () => {
    const store = memStore();
    const a = sample();
    writeSlot(store, 'emberwild.slot1', a);
    await new Promise((r) => setTimeout(r, 5));
    a.money = 1;
    writeSlot(store, 'emberwild.auto', a);
    expect(readSlot(store, 'emberwild.slot1')?.money).toBe(4321);
    const latest = latestSlot(store);
    expect(latest?.key).toBe('emberwild.auto');
    expect(latest?.state.money).toBe(1);
    store.setItem('emberwild.slot2', '{broken');
    expect(readSlot(store, 'emberwild.slot2')).toBe(null);
  });
});

describe('save migration (Chapter One -> Chapter Two)', () => {
  /** A save exactly as Chapter One (version 1) wrote it: no surfing, day-care, eggs, roamer, tower or held items. */
  const v1 = {
    version: 1, playerName: 'Wren', rivalStarter: 'puddlop', starter: 'kindlet', map: 'warden_hall', x: 5, y: 3, dir: 'up',
    party: [
      { uid: 'a', species: 'pyrolynx', level: 15, xp: 2700, hp: 30, ivs: { hp: 10, atk: 10, def: 10, spa: 10, spd: 10, spe: 10 }, moves: [{ id: 'scratch', pp: 35, maxPp: 35 }], status: null, statusTurns: 0, caughtAt: 'lab' },
    ],
    storage: [],
    bag: { bond_stone: 3, wildlog: 1, glow_lantern: 1 },
    money: 2400,
    flags: { gotStarter: true, beatWarden: true, quest_lantern_done: true },
    seen: ['kindlet', 'pyrolynx'], caught: ['kindlet'], defeatedTrainers: ['wh_flint', 'wh_corra'],
    lastHearth: { map: 'hearth_cv', x: 6, y: 3 }, clock: 600, playTimeMs: 4_000_000,
    stats: { steps: 3000, battlesWon: 40, wildEncounters: 30, bonded: 4 }, savedAt: 1730000000000,
  };
  it('loads a version 1 save and fills in the new fields', () => {
    const st = deserialize(JSON.stringify(v1));
    expect(st.version).toBe(2);
    expect(st.surfing).toBe(false);
    expect(st.daycare).toEqual({ mons: [], steps: 0, egg: null });
    expect(st.eggs).toEqual([]);
    expect(st.roamer.active).toBe(false);
    expect(st.roamer.species).toBe('squallion');
    expect(st.tower).toEqual({ best: 0, streak: 0 });
  });
  it('keeps everything the old save had', () => {
    const st = deserialize(JSON.stringify(v1));
    expect(st.party[0].species).toBe('pyrolynx');
    expect(st.party[0].held).toBeUndefined();
    expect(st.flags.beatWarden).toBe(true);
    expect(st.bag).toEqual(v1.bag);
    expect(st.money).toBe(2400);
    expect(st.map).toBe('warden_hall');
    expect(st.stats.steps).toBe(3000);
  });
  it('loads a version 1 export code too', () => {
    const code = 'EW1:' + Buffer.from(JSON.stringify(v1)).toString('base64');
    const st = importSave(code);
    expect(st.version).toBe(2);
    expect(st.playerName).toBe('Wren');
  });
  it('the migration is a single, additive step', () => {
    const out = MIGRATIONS[1](structuredClone(v1) as unknown as Record<string, unknown>);
    expect(out.version).toBe(2);
    for (const k of Object.keys(v1)) if (k !== 'version') expect(out[k], k).toEqual((v1 as Record<string, unknown>)[k]);
  });
  it('round-trips a v2 save with day-care, eggs and held items', () => {
    const s = sample();
    s.party[0].held = 'coal_charm';
    s.daycare.mons.push(createCreature('flintle', 12, createRng(4)));
    s.eggs.push({ species: 'kindlet', ivs: { hp: 1, atk: 2, def: 3, spa: 4, spd: 5, spe: 6 }, steps: 300 });
    s.roamer.active = true;
    s.tower.best = 7;
    const back = deserialize(serialize(s));
    expect({ ...back, savedAt: 0 }).toEqual({ ...s, savedAt: 0 });
  });
});
