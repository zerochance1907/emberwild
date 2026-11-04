import type { MoveType } from './types';

export type Category = 'physical' | 'special' | 'status';
export type StatusId = 'burn' | 'blight' | 'jolt' | 'drowsy' | 'dazed';
export type StatKey = 'atk' | 'def' | 'spa' | 'spd' | 'spe' | 'acc';

export interface MoveEffect {
  status?: StatusId;
  statusChance?: number; // 0..100, default 100 for status moves
  target?: Partial<Record<StatKey, number>>; // stage changes on the target
  self?: Partial<Record<StatKey, number>>; // stage changes on the user
  statChance?: number; // 0..100
  healPct?: number; // heal user by % of max HP
  drainPct?: number; // heal user by % of damage dealt
  recoilPct?: number; // user takes % of damage dealt
  highCrit?: boolean;
  cureSelf?: boolean;
}

export interface MoveDef {
  id: string;
  name: string;
  type: MoveType;
  category: Category;
  power: number;
  accuracy: number; // 0..100; 0 = never misses
  pp: number;
  priority?: number;
  effect?: MoveEffect;
  desc: string;
}

const m = (d: MoveDef): MoveDef => d;

export const MOVES: Record<string, MoveDef> = Object.fromEntries(
  [
    // Plain
    m({ id: 'bump', name: 'Bump', type: 'plain', category: 'physical', power: 40, accuracy: 100, pp: 35, desc: 'A sturdy body bump.' }),
    m({ id: 'scratch', name: 'Scratch', type: 'plain', category: 'physical', power: 40, accuracy: 100, pp: 35, desc: 'Rakes the foe with claws.' }),
    m({ id: 'quickdash', name: 'Quick Dash', type: 'plain', category: 'physical', power: 40, accuracy: 100, pp: 30, priority: 1, desc: 'Always strikes first.' }),
    m({ id: 'growl', name: 'Low Growl', type: 'plain', category: 'status', power: 0, accuracy: 100, pp: 40, effect: { target: { atk: -1 } }, desc: 'Lowers the foe\'s Attack.' }),
    m({ id: 'glare', name: 'Stern Glare', type: 'plain', category: 'status', power: 0, accuracy: 100, pp: 30, effect: { target: { def: -1 } }, desc: 'Lowers the foe\'s Defense.' }),
    m({ id: 'focus', name: 'Focus', type: 'plain', category: 'status', power: 0, accuracy: 0, pp: 20, effect: { self: { atk: 1, spa: 1 } }, desc: 'Raises Attack and Sp. Attack.' }),
    m({ id: 'rest', name: 'Cozy Nap', type: 'plain', category: 'status', power: 0, accuracy: 0, pp: 10, effect: { healPct: 50 }, desc: 'Restores half of max HP.' }),
    m({ id: 'headlong', name: 'Headlong', type: 'plain', category: 'physical', power: 90, accuracy: 90, pp: 15, effect: { recoilPct: 25 }, desc: 'Reckless charge. Hurts the user too.' }),
    // Ember
    m({ id: 'spark_flick', name: 'Cinder Flick', type: 'ember', category: 'special', power: 40, accuracy: 100, pp: 25, effect: { status: 'burn', statusChance: 10 }, desc: 'Flicks hot cinders. May burn.' }),
    m({ id: 'flame_fang', name: 'Flame Fang', type: 'ember', category: 'physical', power: 65, accuracy: 95, pp: 15, effect: { status: 'burn', statusChance: 10 }, desc: 'A searing bite. May burn.' }),
    m({ id: 'blaze_wave', name: 'Blaze Wave', type: 'ember', category: 'special', power: 80, accuracy: 100, pp: 10, effect: { status: 'burn', statusChance: 10 }, desc: 'A rolling wall of fire.' }),
    m({ id: 'kindle', name: 'Kindle', type: 'ember', category: 'status', power: 0, accuracy: 85, pp: 15, effect: { status: 'burn' }, desc: 'Sets the foe smouldering.' }),
    m({ id: 'heat_up', name: 'Heat Up', type: 'ember', category: 'status', power: 0, accuracy: 0, pp: 20, effect: { self: { spa: 2 } }, desc: 'Sharply raises Sp. Attack.' }),
    // Tide
    m({ id: 'splash_shot', name: 'Splash Shot', type: 'tide', category: 'special', power: 40, accuracy: 100, pp: 25, desc: 'Spits a jet of water.' }),
    m({ id: 'tidal_slam', name: 'Tidal Slam', type: 'tide', category: 'physical', power: 70, accuracy: 95, pp: 15, desc: 'Crashes down like a wave.' }),
    m({ id: 'riptide', name: 'Riptide', type: 'tide', category: 'special', power: 85, accuracy: 95, pp: 10, desc: 'A powerful undertow.' }),
    m({ id: 'mist_veil', name: 'Mist Veil', type: 'tide', category: 'status', power: 0, accuracy: 100, pp: 20, effect: { target: { acc: -1 } }, desc: 'Lowers the foe\'s accuracy.' }),
    m({ id: 'bubble_bounce', name: 'Bubble Bounce', type: 'tide', category: 'special', power: 55, accuracy: 100, pp: 20, effect: { target: { spe: -1 }, statChance: 30 }, desc: 'Sticky bubbles. May slow the foe.' }),
    // Sprout
    m({ id: 'leaf_nick', name: 'Leaf Nick', type: 'sprout', category: 'physical', power: 40, accuracy: 100, pp: 25, desc: 'Slices with a sharp leaf.' }),
    m({ id: 'vine_lash', name: 'Vine Lash', type: 'sprout', category: 'physical', power: 65, accuracy: 100, pp: 15, desc: 'Whips with thorny vines.' }),
    m({ id: 'sap_drain', name: 'Sap Drain', type: 'sprout', category: 'special', power: 50, accuracy: 100, pp: 15, effect: { drainPct: 50 }, desc: 'Absorbs half the damage dealt.' }),
    m({ id: 'bloom_burst', name: 'Bloom Burst', type: 'sprout', category: 'special', power: 85, accuracy: 95, pp: 10, desc: 'An explosive burst of petals.' }),
    m({ id: 'spore_puff', name: 'Spore Puff', type: 'sprout', category: 'status', power: 0, accuracy: 75, pp: 15, effect: { status: 'drowsy' }, desc: 'Sleepy spores make the foe drowsy.' }),
    m({ id: 'thorn_guard', name: 'Thorn Guard', type: 'sprout', category: 'status', power: 0, accuracy: 0, pp: 20, effect: { self: { def: 2 } }, desc: 'Sharply raises Defense.' }),
    // Gale
    m({ id: 'gust', name: 'Gust', type: 'gale', category: 'special', power: 40, accuracy: 100, pp: 35, desc: 'Whips up a little wind.' }),
    m({ id: 'wing_cut', name: 'Wing Cut', type: 'gale', category: 'physical', power: 60, accuracy: 100, pp: 20, desc: 'Slices with sharp wings.' }),
    m({ id: 'cyclone', name: 'Cyclone', type: 'gale', category: 'special', power: 80, accuracy: 95, pp: 10, effect: { target: { acc: -1 }, statChance: 20 }, desc: 'A howling spiral of air.' }),
    m({ id: 'tailwind', name: 'Tailwind', type: 'gale', category: 'status', power: 0, accuracy: 0, pp: 20, effect: { self: { spe: 2 } }, desc: 'Sharply raises Speed.' }),
    m({ id: 'feather_dart', name: 'Feather Dart', type: 'gale', category: 'physical', power: 45, accuracy: 100, pp: 25, effect: { highCrit: true }, desc: 'A precise dart. High crit ratio.' }),
    // Stone
    m({ id: 'pebble_toss', name: 'Pebble Toss', type: 'stone', category: 'physical', power: 40, accuracy: 100, pp: 25, desc: 'Hurls a handful of pebbles.' }),
    m({ id: 'rock_slam', name: 'Rock Slam', type: 'stone', category: 'physical', power: 75, accuracy: 90, pp: 10, desc: 'Slams with a heavy boulder.' }),
    m({ id: 'crystal_beam', name: 'Crystal Beam', type: 'stone', category: 'special', power: 65, accuracy: 100, pp: 15, desc: 'Refracted light from crystals.' }),
    m({ id: 'harden', name: 'Harden', type: 'stone', category: 'status', power: 0, accuracy: 0, pp: 30, effect: { self: { def: 1, spd: 1 } }, desc: 'Raises Defense and Sp. Defense.' }),
    m({ id: 'quake_stomp', name: 'Quake Stomp', type: 'stone', category: 'physical', power: 90, accuracy: 85, pp: 10, desc: 'A ground-shaking stomp.' }),
    // Spark
    m({ id: 'zap', name: 'Zap', type: 'spark', category: 'special', power: 40, accuracy: 100, pp: 30, effect: { status: 'jolt', statusChance: 10 }, desc: 'A small shock. May jolt.' }),
    m({ id: 'volt_tackle', name: 'Volt Rush', type: 'spark', category: 'physical', power: 70, accuracy: 95, pp: 15, effect: { status: 'jolt', statusChance: 10 }, desc: 'A charged rush. May jolt.' }),
    m({ id: 'arc_bolt', name: 'Arc Bolt', type: 'spark', category: 'special', power: 85, accuracy: 95, pp: 10, effect: { status: 'jolt', statusChance: 15 }, desc: 'Lightning arcs to the foe.' }),
    m({ id: 'static_field', name: 'Static Field', type: 'spark', category: 'status', power: 0, accuracy: 90, pp: 20, effect: { status: 'jolt' }, desc: 'Jolts the foe, slowing it.' }),
    m({ id: 'charge_up', name: 'Charge Up', type: 'spark', category: 'status', power: 0, accuracy: 0, pp: 20, effect: { self: { spa: 1, spd: 1 } }, desc: 'Raises Sp. Atk and Sp. Def.' }),
    // Shade
    m({ id: 'shadow_nip', name: 'Shadow Nip', type: 'shade', category: 'physical', power: 40, accuracy: 100, pp: 25, desc: 'Nips from the shadows.' }),
    m({ id: 'night_claw', name: 'Night Claw', type: 'shade', category: 'physical', power: 70, accuracy: 100, pp: 15, effect: { highCrit: true }, desc: 'A shadowy slash. High crit ratio.' }),
    m({ id: 'gloom_orb', name: 'Gloom Orb', type: 'shade', category: 'special', power: 75, accuracy: 100, pp: 10, effect: { target: { spd: -1 }, statChance: 20 }, desc: 'An orb of gloom.' }),
    m({ id: 'blight_mist', name: 'Blight Mist', type: 'shade', category: 'status', power: 0, accuracy: 90, pp: 20, effect: { status: 'blight' }, desc: 'A choking mist that blights the foe.' }),
    m({ id: 'eerie_hum', name: 'Eerie Hum', type: 'shade', category: 'status', power: 0, accuracy: 85, pp: 15, effect: { status: 'dazed' }, desc: 'An unsettling hum. Dazes the foe.' }),
    // Fae
    m({ id: 'twinkle', name: 'Twinkle', type: 'fae', category: 'special', power: 40, accuracy: 100, pp: 30, desc: 'A flash of fairy light.' }),
    m({ id: 'pixie_wind', name: 'Pixie Wind', type: 'fae', category: 'special', power: 65, accuracy: 100, pp: 15, effect: { target: { spa: -1 }, statChance: 20 }, desc: 'A glittering breeze.' }),
    m({ id: 'moon_kiss', name: 'Moon Kiss', type: 'fae', category: 'special', power: 50, accuracy: 100, pp: 15, effect: { drainPct: 50 }, desc: 'A gentle kiss that drains vigour.' }),
    m({ id: 'lullaby', name: 'Lullaby', type: 'fae', category: 'status', power: 0, accuracy: 70, pp: 15, effect: { status: 'drowsy' }, desc: 'A soft song that lulls the foe.' }),
    m({ id: 'charm', name: 'Charm', type: 'fae', category: 'status', power: 0, accuracy: 100, pp: 20, effect: { target: { atk: -2 } }, desc: 'Sharply lowers the foe\'s Attack.' }),
    m({ id: 'starfall', name: 'Starfall', type: 'fae', category: 'special', power: 85, accuracy: 95, pp: 10, desc: 'Calls down glittering stars.' }),
  ].map((mv) => [mv.id, mv]),
);

export function getMove(id: string): MoveDef {
  const mv = MOVES[id];
  if (!mv) throw new Error(`Unknown move ${id}`);
  return mv;
}

export const STATUS_INFO: Record<StatusId, { name: string; short: string; color: number }> = {
  burn: { name: 'burned', short: 'BRN', color: 0xff6a2f },
  blight: { name: 'blighted', short: 'BLT', color: 0x9b5cd6 },
  jolt: { name: 'jolted', short: 'JLT', color: 0xe8c020 },
  drowsy: { name: 'drowsy', short: 'DRW', color: 0x8aa0c8 },
  dazed: { name: 'dazed', short: 'DZD', color: 0xd88aa8 },
};
