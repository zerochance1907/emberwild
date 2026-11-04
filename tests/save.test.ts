import { describe, expect, it } from 'vitest';
import { createCreature } from '../src/engine/creature';
import { createRng } from '../src/engine/rng';
import {
  deserialize, exportSave, importSave, latestSlot, newGameState, readSlot, serialize, writeSlot, type SaveStore,
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
