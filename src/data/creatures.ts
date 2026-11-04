import type { CreatureType } from './types';

export interface BaseStats { hp: number; atk: number; def: number; spa: number; spd: number; spe: number }

export interface Species {
  id: string;
  num: number;
  name: string;
  types: CreatureType[];
  base: BaseStats;
  catchRate: number; // 3..255
  baseXp: number;
  learnset: [number, string][];
  evolves?: { to: string; level: number };
  kind: string;
  entry: string;
}

const s = (d: Species) => d;

export const SPECIES_LIST: Species[] = [
  s({
    id: 'kindlet', num: 1, name: 'Kindlet', types: ['ember'], kind: 'Cinder Kit',
    base: { hp: 44, atk: 56, def: 42, spa: 60, spd: 46, spe: 64 }, catchRate: 45, baseXp: 64,
    learnset: [[1, 'scratch'], [1, 'growl'], [4, 'spark_flick'], [8, 'quickdash'], [11, 'flame_fang'], [15, 'heat_up'], [19, 'blaze_wave']],
    evolves: { to: 'pyrolynx', level: 13 },
    entry: 'Its tail tip glows like a coal. When it is happy, tiny sparks dance off its ears.',
  }),
  s({
    id: 'pyrolynx', num: 2, name: 'Pyrolynx', types: ['ember'], kind: 'Blaze Lynx',
    base: { hp: 62, atk: 76, def: 58, spa: 84, spd: 62, spe: 86 }, catchRate: 45, baseXp: 142,
    learnset: [[1, 'scratch'], [1, 'spark_flick'], [16, 'kindle'], [18, 'blaze_wave'], [22, 'night_claw'], [26, 'headlong']],
    entry: 'Prowls volcanic ridges at dusk. The flames of its mane burn hotter the more it trusts you.',
  }),
  s({
    id: 'puddlop', num: 3, name: 'Puddlop', types: ['tide'], kind: 'Puddle Newt',
    base: { hp: 52, atk: 50, def: 56, spa: 54, spd: 54, spe: 46 }, catchRate: 45, baseXp: 64,
    learnset: [[1, 'bump'], [1, 'growl'], [4, 'splash_shot'], [8, 'mist_veil'], [11, 'bubble_bounce'], [15, 'tidal_slam'], [19, 'riptide']],
    evolves: { to: 'torrentoad', level: 13 },
    entry: 'Loves to stomp in puddles. The frills on its head shiver when rain is on the way.',
  }),
  s({
    id: 'torrentoad', num: 4, name: 'Torrentoad', types: ['tide'], kind: 'Torrent Newt',
    base: { hp: 76, atk: 70, def: 78, spa: 74, spd: 72, spe: 60 }, catchRate: 45, baseXp: 142,
    learnset: [[1, 'bump'], [1, 'splash_shot'], [16, 'harden'], [18, 'riptide'], [22, 'quake_stomp'], [26, 'rest']],
    entry: 'It can fire water from its frills hard enough to carve stone. Calm, patient and proud.',
  }),
  s({
    id: 'sprigling', num: 5, name: 'Sprigling', types: ['sprout'], kind: 'Sprout Fawn',
    base: { hp: 48, atk: 58, def: 50, spa: 52, spd: 52, spe: 58 }, catchRate: 45, baseXp: 64,
    learnset: [[1, 'bump'], [1, 'glare'], [4, 'leaf_nick'], [8, 'sap_drain'], [11, 'vine_lash'], [15, 'thorn_guard'], [19, 'bloom_burst']],
    evolves: { to: 'thornstag', level: 13 },
    entry: 'A tiny sapling grows between its ears. It naps in sunbeams to help the leaves grow.',
  }),
  s({
    id: 'thornstag', num: 6, name: 'Thornstag', types: ['sprout', 'fae'], kind: 'Thicket Stag',
    base: { hp: 66, atk: 80, def: 70, spa: 70, spd: 70, spe: 74 }, catchRate: 45, baseXp: 142,
    learnset: [[1, 'bump'], [1, 'leaf_nick'], [13, 'twinkle'], [16, 'spore_puff'], [18, 'bloom_burst'], [22, 'pixie_wind'], [26, 'starfall']],
    entry: 'Flowers bloom wherever it walks. Its antlers are woven from living, flowering branches.',
  }),
  s({
    id: 'fluffinch', num: 7, name: 'Fluffinch', types: ['gale'], kind: 'Puffball Bird',
    base: { hp: 40, atk: 45, def: 38, spa: 40, spd: 38, spe: 62 }, catchRate: 220, baseXp: 50,
    learnset: [[1, 'bump'], [1, 'gust'], [5, 'quickdash'], [9, 'feather_dart'], [12, 'tailwind'], [15, 'wing_cut']],
    evolves: { to: 'galecrest', level: 12 },
    entry: 'So fluffy it bounces when it lands. Flocks of them sound like a distant giggling choir.',
  }),
  s({
    id: 'galecrest', num: 8, name: 'Galecrest', types: ['gale'], kind: 'Crested Bird',
    base: { hp: 60, atk: 68, def: 55, spa: 60, spd: 55, spe: 88 }, catchRate: 90, baseXp: 125,
    learnset: [[1, 'gust'], [1, 'quickdash'], [12, 'wing_cut'], [17, 'cyclone'], [22, 'headlong']],
    entry: 'Rides mountain updrafts for hours. The long crest feathers point the way home.',
  }),
  s({
    id: 'bitzel', num: 9, name: 'Bitzel', types: ['spark'], kind: 'Static Squirrel',
    base: { hp: 38, atk: 44, def: 36, spa: 52, spd: 40, spe: 70 }, catchRate: 190, baseXp: 55,
    learnset: [[1, 'scratch'], [1, 'zap'], [6, 'quickdash'], [9, 'static_field'], [13, 'charge_up'], [16, 'volt_tackle']],
    evolves: { to: 'voltail', level: 14 },
    entry: 'Rubs its tail on tree bark to build up static. Touching one feels like a tiny hug and a big shock.',
  }),
  s({
    id: 'voltail', num: 10, name: 'Voltail', types: ['spark'], kind: 'Storm Squirrel',
    base: { hp: 58, atk: 62, def: 52, spa: 82, spd: 60, spe: 96 }, catchRate: 75, baseXp: 130,
    learnset: [[1, 'zap'], [1, 'quickdash'], [14, 'volt_tackle'], [18, 'arc_bolt'], [23, 'tailwind']],
    entry: 'Its tail crackles like a storm cloud. It leaps between treetops faster than the eye can follow.',
  }),
  s({
    id: 'mossgrub', num: 11, name: 'Mossgrub', types: ['sprout'], kind: 'Moss Larva',
    base: { hp: 45, atk: 35, def: 50, spa: 30, spd: 40, spe: 30 }, catchRate: 255, baseXp: 40,
    learnset: [[1, 'bump'], [1, 'harden'], [5, 'leaf_nick'], [8, 'spore_puff']],
    evolves: { to: 'budwing', level: 9 },
    entry: 'Wraps itself in moss to stay cool. It munches leaves all day and dreams of flying.',
  }),
  s({
    id: 'budwing', num: 12, name: 'Budwing', types: ['sprout', 'fae'], kind: 'Blossom Moth',
    base: { hp: 58, atk: 40, def: 50, spa: 78, spd: 70, spe: 68 }, catchRate: 120, baseXp: 118,
    learnset: [[1, 'leaf_nick'], [1, 'spore_puff'], [9, 'twinkle'], [12, 'sap_drain'], [15, 'pixie_wind'], [19, 'lullaby']],
    entry: 'Its petal wings scatter sweet pollen. Gardens visited by Budwing bloom twice as bright.',
  }),
  s({
    id: 'pebblit', num: 13, name: 'Pebblit', types: ['stone'], kind: 'Pebble Golem',
    base: { hp: 50, atk: 64, def: 74, spa: 30, spd: 40, spe: 22 }, catchRate: 180, baseXp: 60,
    learnset: [[1, 'bump'], [1, 'harden'], [6, 'pebble_toss'], [10, 'glare'], [13, 'rock_slam'], [17, 'quake_stomp']],
    evolves: { to: 'bouldrum', level: 15 },
    entry: 'Rolls downhill for fun, then sulks because it cannot roll back up.',
  }),
  s({
    id: 'bouldrum', num: 14, name: 'Bouldrum', types: ['stone'], kind: 'Boulder Golem',
    base: { hp: 72, atk: 88, def: 100, spa: 42, spd: 58, spe: 30 }, catchRate: 60, baseXp: 140,
    learnset: [[1, 'pebble_toss'], [1, 'harden'], [13, 'rock_slam'], [14, 'crystal_beam'], [17, 'quake_stomp'], [21, 'headlong']],
    entry: 'Beats its chest like a drum. The rumble can be heard echoing across whole canyons.',
  }),
  s({
    id: 'gloomling', num: 15, name: 'Gloomling', types: ['shade'], kind: 'Wisp',
    base: { hp: 40, atk: 40, def: 40, spa: 62, spd: 55, spe: 58 }, catchRate: 150, baseXp: 62,
    learnset: [[1, 'shadow_nip'], [1, 'glare'], [6, 'eerie_hum'], [10, 'blight_mist'], [14, 'gloom_orb']],
    evolves: { to: 'duskwraith', level: 16 },
    entry: 'A shy wisp that hides in hollow logs. It giggles softly at travellers, then vanishes.',
  }),
  s({
    id: 'duskwraith', num: 16, name: 'Duskwraith', types: ['shade'], kind: 'Twilight Wraith',
    base: { hp: 60, atk: 58, def: 58, spa: 92, spd: 78, spe: 76 }, catchRate: 60, baseXp: 145,
    learnset: [[1, 'shadow_nip'], [1, 'eerie_hum'], [16, 'night_claw'], [20, 'gloom_orb']],
    entry: 'Appears only at twilight. Its lantern eyes are said to show lost travellers the way home.',
  }),
  s({
    id: 'shroomp', num: 17, name: 'Shroomp', types: ['sprout', 'fae'], kind: 'Toadstool',
    base: { hp: 62, atk: 50, def: 58, spa: 56, spd: 62, spe: 34 }, catchRate: 160, baseXp: 70,
    learnset: [[1, 'bump'], [1, 'spore_puff'], [5, 'sap_drain'], [9, 'twinkle'], [13, 'moon_kiss'], [17, 'bloom_burst']],
    entry: 'Hops around on one foot after rain. Its cap releases sleepy spores when it is startled.',
  }),
  s({
    id: 'lumimoth', num: 18, name: 'Lumimoth', types: ['fae', 'spark'], kind: 'Lantern Moth',
    base: { hp: 52, atk: 38, def: 46, spa: 76, spd: 66, spe: 72 }, catchRate: 90, baseXp: 105,
    learnset: [[1, 'twinkle'], [1, 'zap'], [9, 'lullaby'], [12, 'pixie_wind'], [15, 'charge_up'], [19, 'arc_bolt']],
    entry: 'Its glowing wings light up dark caves. Miners follow them to find glimmer crystals.',
  }),
];

export const SPECIES: Record<string, Species> = Object.fromEntries(SPECIES_LIST.map((sp) => [sp.id, sp]));

export function getSpecies(id: string): Species {
  const sp = SPECIES[id];
  if (!sp) throw new Error(`Unknown species ${id}`);
  return sp;
}

export const STARTERS = ['kindlet', 'puddlop', 'sprigling'] as const;
