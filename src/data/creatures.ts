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
  // ---------------- Chapter Two: the Brinemark Coast ----------------
  s({
    id: 'pipwhisk', num: 19, name: 'Pipwhisk', types: ['gale', 'tide'], kind: 'Sandpiper Chick',
    base: { hp: 40, atk: 48, def: 36, spa: 44, spd: 38, spe: 66 }, catchRate: 200, baseXp: 52,
    learnset: [[1, 'bump'], [1, 'gust'], [5, 'splash_shot'], [9, 'quickdash'], [12, 'feather_dart'], [15, 'brine_spray']],
    evolves: { to: 'wadewing', level: 16 },
    entry: 'Scurries after retreating waves to snatch tiny shrimp, then panics and runs from the next one.',
  }),
  s({
    id: 'wadewing', num: 20, name: 'Wadewing', types: ['gale', 'tide'], kind: 'Marsh Wader',
    base: { hp: 58, atk: 66, def: 52, spa: 60, spd: 55, spe: 82 }, catchRate: 120, baseXp: 112,
    learnset: [[1, 'gust'], [1, 'splash_shot'], [16, 'wing_cut'], [20, 'brine_spray'], [24, 'updraft'], [27, 'dive_bomb']],
    evolves: { to: 'galeheron', level: 30 },
    entry: 'Stands on one leg in the shallows for hours. Its stillness is a trick: it strikes faster than a blink.',
  }),
  s({
    id: 'galeheron', num: 21, name: 'Galeheron', types: ['gale', 'tide'], kind: 'Storm Heron',
    base: { hp: 78, atk: 92, def: 70, spa: 80, spd: 72, spe: 98 }, catchRate: 45, baseXp: 205,
    learnset: [[1, 'wing_cut'], [1, 'brine_spray'], [30, 'squall'], [33, 'dive_bomb'], [37, 'breaker_crash']],
    entry: 'When it spreads its wings over the bay, sailors know a storm is coming and haul in their nets.',
  }),
  s({
    id: 'fizzkid', num: 22, name: 'Fizzkid', types: ['spark'], kind: 'Static Kid',
    base: { hp: 46, atk: 56, def: 44, spa: 46, spd: 40, spe: 58 }, catchRate: 190, baseXp: 56,
    learnset: [[1, 'bump'], [1, 'growl'], [5, 'zap'], [9, 'pounce'], [13, 'static_field'], [16, 'volt_tackle']],
    evolves: { to: 'ramblast', level: 18 },
    entry: 'Its fluffy fleece crackles with static. Butting heads with a friend makes both of their coats stand on end.',
  }),
  s({
    id: 'ramblast', num: 23, name: 'Ramblast', types: ['spark', 'stone'], kind: 'Storm Ram',
    base: { hp: 66, atk: 82, def: 72, spa: 54, spd: 56, spe: 64 }, catchRate: 100, baseXp: 128,
    learnset: [[1, 'pounce'], [1, 'volt_tackle'], [18, 'rock_slam'], [22, 'storm_lance'], [26, 'harden'], [29, 'thunder_ram']],
    evolves: { to: 'cragthunder', level: 32 },
    entry: 'Herds of Ramblast climb ridges during storms. Lightning that strikes their stone horns only makes them stronger.',
  }),
  s({
    id: 'cragthunder', num: 24, name: 'Cragthunder', types: ['spark', 'stone'], kind: 'Thunderpeak',
    base: { hp: 88, atk: 108, def: 96, spa: 66, spd: 70, spe: 72 }, catchRate: 45, baseXp: 212,
    learnset: [[1, 'storm_lance'], [1, 'rock_slam'], [32, 'landslide'], [36, 'thunder_ram']],
    entry: 'Its hooves strike sparks on bare rock. The roar of a Cragthunder sounds exactly like a rolling thunderclap.',
  }),
  s({
    id: 'bogbloop', num: 25, name: 'Bogbloop', types: ['tide', 'shade'], kind: 'Bog Blob',
    base: { hp: 60, atk: 44, def: 52, spa: 58, spd: 56, spe: 30 }, catchRate: 170, baseXp: 66,
    learnset: [[1, 'bump'], [1, 'mist_veil'], [6, 'splash_shot'], [10, 'shadow_nip'], [14, 'bog_curse'], [18, 'dusk_sip'], [22, 'mire_slap']],
    evolves: { to: 'fenwraith', level: 24 },
    entry: 'A wobbly glob of marsh water with a sleepy face. It bubbles contentedly when stepped on by mistake.',
  }),
  s({
    id: 'fenwraith', num: 26, name: 'Fenwraith', types: ['tide', 'shade'], kind: 'Fen Spirit',
    base: { hp: 80, atk: 58, def: 70, spa: 92, spd: 82, spe: 52 }, catchRate: 70, baseXp: 160,
    learnset: [[1, 'dusk_sip'], [1, 'bog_curse'], [24, 'riptide'], [28, 'murk_wave'], [32, 'eerie_hum']],
    entry: 'Drifts over misty fens carrying a pale glow. Travellers who follow it end up exactly where they meant to go.',
  }),
  s({
    id: 'owlune', num: 27, name: 'Owlune', types: ['fae', 'gale'], kind: 'Moon Owlet',
    base: { hp: 50, atk: 40, def: 46, spa: 64, spd: 60, spe: 56 }, catchRate: 140, baseXp: 70,
    learnset: [[1, 'gust'], [1, 'twinkle'], [7, 'star_glint'], [11, 'lullaby'], [15, 'pixie_wind'], [19, 'aurora_ward']],
    evolves: { to: 'nocturnelle', level: 26 },
    entry: 'Nests in old towers and counts the stars every night. If you interrupt it, it starts again from one.',
  }),
  s({
    id: 'nocturnelle', num: 28, name: 'Nocturnelle', types: ['fae', 'gale'], kind: 'Starwing Owl',
    base: { hp: 72, atk: 52, def: 64, spa: 96, spd: 84, spe: 82 }, catchRate: 60, baseXp: 165,
    learnset: [[1, 'star_glint'], [1, 'pixie_wind'], [26, 'lunar_lance'], [30, 'squall'], [34, 'aurora_ward']],
    entry: 'The pattern on its wings is a map of the night sky. Each one shows the sky from the night it hatched.',
  }),
  s({
    id: 'glimmerfin', num: 29, name: 'Glimmerfin', types: ['tide'], kind: 'Glint Minnow',
    base: { hp: 36, atk: 40, def: 40, spa: 44, spd: 40, spe: 70 }, catchRate: 230, baseXp: 45,
    learnset: [[1, 'splash_shot'], [1, 'quickdash'], [8, 'bubble_bounce'], [14, 'zap'], [18, 'brine_spray']],
    evolves: { to: 'ribboneel', level: 22 },
    entry: 'Schools of Glimmerfin flash like dropped coins in the shallows. Anglers prize the shiniest ones.',
  }),
  s({
    id: 'ribboneel', num: 30, name: 'Ribboneel', types: ['tide', 'spark'], kind: 'Ribbon Eel',
    base: { hp: 70, atk: 78, def: 62, spa: 84, spd: 66, spe: 80 }, catchRate: 75, baseXp: 155,
    learnset: [[1, 'bubble_bounce'], [1, 'zap'], [22, 'ion_pulse'], [26, 'undertow_bite'], [30, 'arc_bolt'], [34, 'riptide']],
    entry: 'Ripples through deep channels like a glowing ribbon. Its fins give off a gentle tingle, never a nasty shock.',
  }),
  s({
    id: 'flintle', num: 31, name: 'Flintle', types: ['ember', 'stone'], kind: 'Flint Beetle',
    base: { hp: 50, atk: 62, def: 70, spa: 40, spd: 46, spe: 34 }, catchRate: 160, baseXp: 64,
    learnset: [[1, 'bump'], [1, 'harden'], [6, 'spark_flick'], [10, 'pebble_toss'], [15, 'forge_rush'], [20, 'shale_shards']],
    evolves: { to: 'forgeback', level: 26 },
    entry: 'Clicks its flint shell together to start tiny fires, then sits by them to keep warm on windy ridges.',
  }),
  s({
    id: 'forgeback', num: 32, name: 'Forgeback', types: ['ember', 'stone'], kind: 'Furnace Beetle',
    base: { hp: 74, atk: 94, def: 100, spa: 60, spd: 66, spe: 40 }, catchRate: 60, baseXp: 162,
    learnset: [[1, 'forge_rush'], [1, 'harden'], [26, 'molten_shell'], [30, 'kiln_blast'], [34, 'landslide']],
    entry: 'Its back glows like an open furnace. Smiths in Cindervale once kept them to keep the forges burning.',
  }),
  s({
    id: 'drowsea', num: 33, name: 'Drowsea', types: ['tide', 'fae'], kind: 'Drift Jelly',
    base: { hp: 74, atk: 44, def: 58, spa: 78, spd: 86, spe: 50 }, catchRate: 110, baseXp: 120,
    learnset: [[1, 'splash_shot'], [1, 'lullaby'], [12, 'moon_kiss'], [18, 'bubble_bounce'], [24, 'aurora_ward'], [28, 'lunar_lance']],
    entry: 'Floats wherever the current takes it, humming a lullaby. Whole bays fall asleep when a swarm drifts by.',
  }),
  s({
    id: 'reedkin', num: 34, name: 'Reedkin', types: ['sprout', 'tide'], kind: 'Reed Sprite',
    base: { hp: 56, atk: 68, def: 60, spa: 52, spd: 56, spe: 62 }, catchRate: 150, baseXp: 90,
    learnset: [[1, 'leaf_nick'], [1, 'growl'], [8, 'mire_slap'], [12, 'reed_whip'], [16, 'sap_drain'], [21, 'peat_bomb']],
    entry: 'Hides among cattails by swaying with them. Only its two blinking eyes give it away.',
  }),
  s({
    id: 'shellstack', num: 35, name: 'Shellstack', types: ['stone', 'tide'], kind: 'Hermit Stack',
    base: { hp: 60, atk: 72, def: 92, spa: 40, spd: 52, spe: 30 }, catchRate: 140, baseXp: 95,
    learnset: [[1, 'bump'], [1, 'harden'], [7, 'pebble_toss'], [12, 'bubble_bounce'], [17, 'rock_slam'], [22, 'undertow_bite'], [27, 'shale_shards']],
    entry: 'Carries a tower of borrowed shells. When it finds a nicer one it adds it to the top, so it keeps getting taller.',
  }),
  s({
    id: 'squallion', num: 36, name: 'Squallion', types: ['gale', 'spark'], kind: 'Tempest Steed',
    base: { hp: 82, atk: 96, def: 72, spa: 100, spd: 78, spe: 118 }, catchRate: 8, baseXp: 235,
    learnset: [[1, 'squall'], [1, 'storm_lance'], [1, 'tailwind'], [1, 'arc_bolt'], [40, 'meteor_rush']],
    entry: 'A wild steed born from a thunderhead. It never stays in one place, and gallops off at the first flash of lightning.',
  }),
];

export const SPECIES: Record<string, Species> = Object.fromEntries(SPECIES_LIST.map((sp) => [sp.id, sp]));

export function getSpecies(id: string): Species {
  const sp = SPECIES[id];
  if (!sp) throw new Error(`Unknown species ${id}`);
  return sp;
}

export const STARTERS = ['kindlet', 'puddlop', 'sprigling'] as const;

/** The rare creature that roams the Brinemark Coast. */
export const ROAMER = 'squallion';
