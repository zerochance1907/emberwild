import type { Dir } from '../engine/save';
import type { TrackId } from '../audio/tracks';

export interface Warp { x: number; y: number; to: string; tx: number; ty: number; dir?: Dir }
export interface NpcDef {
  id: string;
  x: number;
  y: number;
  dir: Dir;
  look: string;
  /** Plain dialogue. Use a script for anything interactive. */
  text?: string[];
  script?: string;
  trainer?: string;
  sight?: number;
  wander?: boolean;
  showIf?: string;
  hideIf?: string;
}
export interface Pickup { id: string; x: number; y: number; item: string; qty: number; hidden?: boolean }
export interface MapObject { id: string; kind: 'lantern' | 'thorns'; x: number; y: number }
export interface Trigger { x: number; y: number; w?: number; h?: number; script: string }
export interface EncounterEntry { species: string; min: number; max: number; weight: number }

export interface MapDef {
  id: string;
  name: string;
  music: TrackId;
  kind: 'town' | 'route' | 'forest' | 'cave' | 'interior';
  weather?: 'rain';
  dark?: boolean;
  rows: string[];
  warps: Warp[];
  connections?: Partial<Record<'north' | 'south' | 'east' | 'west', { map: string; offset: number }>>;
  encounters?: { rate: number; table: EncounterEntry[] };
  npcs: NpcDef[];
  signs: { x: number; y: number; text: string[] }[];
  items: Pickup[];
  objects?: MapObject[];
  triggers?: Trigger[];
  /** Where the player stands after a Hearth heal / blackout. */
  hearth?: { x: number; y: number };
}

const hollowbrook: MapDef = {
  id: 'hollowbrook', name: 'Hollowbrook', music: 'town', kind: 'town',
  rows: [
    'TTTTTTTTTTTT::TTTTTTTTTTTTT',
    'TTTTTTTTTTT.::.TTTTTTTTTTTT',
    'TT.........::.........ffTTT',
    'TT..f......::.....f...ffTTT',
    'TT..NNNNN..::..BBBBBBB...TT',
    'TT..NNNNN..::..BBBBBBB...TT',
    'TT..WOWOW..::..WOWOWOW...TT',
    'TT..WWDWW..::..WOWDWOW...TT',
    'TT....:....::.....:......TT',
    'TT....::::::::::::::.....TT',
    'TT.S..::.....::...:......TT',
    'TT....::.f...::...:...f..TT',
    'TT..RRRRR....::..GGGGG...TT',
    'TT..RRRRR....::..GGGGG...TT',
    'TT..WOWOW....::..WOWOW...TT',
    'TT..WWDWW....::..WWDWW...TT',
    'TT....:......::....:.....TT',
    'TT....::::::::::::::...~~TT',
    'TTK.f.........S....f..~~~TT',
    'TT..##########.......~~~~TT',
    'TTTTTTTTTTTTTTTTTTTTTTTTTTT',
    'TTTTTTTTTTTTTTTTTTTTTTTTTTT',
  ],
  warps: [
    { x: 6, y: 7, to: 'home', tx: 4, ty: 6, dir: 'up' },
    { x: 18, y: 7, to: 'lab', tx: 5, ty: 8, dir: 'up' },
    { x: 6, y: 15, to: 'hearth_hb', tx: 5, ty: 7, dir: 'up' },
    { x: 19, y: 15, to: 'shop_hb', tx: 4, ty: 6, dir: 'up' },
  ],
  connections: { north: { map: 'route1', offset: 0 } },
  npcs: [
    { id: 'hb_girl', x: 9, y: 11, dir: 'down', look: 'girl', wander: true, text: ['Mentor Rowan studies how creatures and people bond.', 'She says every bond starts with a little bit of trust!'] },
    { id: 'hb_old', x: 21, y: 9, dir: 'left', look: 'oldman', text: ['Strange folk in grey cloaks passed through last night...', 'Heading north toward Whisperwood, they were. Up to no good, I\'d wager.'] },
    { id: 'hb_kip', x: 13, y: 3, dir: 'down', look: 'kip', script: 'kipVillage', hideIf: 'gotStarter' },
  ],
  signs: [
    { x: 3, y: 10, text: ['HOLLOWBROOK', 'Where every journey starts small.'] },
    { x: 14, y: 18, text: ['Mill Pond', 'Please don\'t feed the Puddlop.'] },
  ],
  items: [{ id: 'hb_tonic', x: 3, y: 18, item: 'berry_tonic', qty: 1, hidden: true }],
  triggers: [{ x: 11, y: 1, w: 4, h: 1, script: 'noStarterBlock' }],
  hearth: { x: 6, y: 16 },
};

const home: MapDef = {
  id: 'home', name: 'Your House', music: 'town', kind: 'interior',
  rows: [
    'wwiwwwwiww',
    'bbFFFFFFkz',
    'FFFFFFFFFF',
    'FFtFFFFFeF',
    'FFFFaaFFFF',
    'FFFFaaFFFF',
    'zFFFFFFFFz',
    'FFFFMMFFFF',
  ],
  warps: [
    { x: 4, y: 7, to: 'hollowbrook', tx: 6, ty: 8, dir: 'down' },
    { x: 5, y: 7, to: 'hollowbrook', tx: 6, ty: 8, dir: 'down' },
  ],
  npcs: [{ id: 'mom', x: 3, y: 2, dir: 'down', look: 'mom', script: 'mom' }],
  signs: [{ x: 9, y: 1, text: ['A happy little fern. It seems well loved.'] }],
  items: [],
};

const lab: MapDef = {
  id: 'lab', name: 'Rowan Lab', music: 'town', kind: 'interior',
  rows: [
    'wwwiwwwwiwww',
    'bbbQQQQQQbbb',
    'QQQQQQQQQQQQ',
    'ZZQQQyyyQQZZ',
    'QQQQQQQQQQQQ',
    'QQQQQQQQQQQQ',
    'pQQQQQQQQQQz',
    'QQQQQQQQQQQQ',
    'zQQQQQQQQQQz',
    'QQQQQMMQQQQQ',
  ],
  warps: [
    { x: 5, y: 9, to: 'hollowbrook', tx: 18, ty: 8, dir: 'down' },
    { x: 6, y: 9, to: 'hollowbrook', tx: 18, ty: 8, dir: 'down' },
  ],
  npcs: [
    { id: 'mentor', x: 6, y: 2, dir: 'down', look: 'mentor', script: 'mentor' },
    { id: 'lab_kip', x: 8, y: 5, dir: 'left', look: 'kip', script: 'kipLab', showIf: 'gotStarter', hideIf: 'kipLeftLab' },
    { id: 'lab_aide', x: 10, y: 7, dir: 'left', look: 'boy', text: ['I\'m one of Mentor Rowan\'s aides.', 'Creatures you bond with are recorded in your Wildlog automatically.', 'Try to see them all!'] },
  ],
  signs: [
    { x: 0, y: 6, text: ['A storage terminal. Lab use only.'] },
    { x: 0, y: 1, text: ['Books about creature habitats. "Bonds, Not Bindings" by I. Rowan.'] },
  ],
  items: [],
};

function hearthInterior(id: string, outMap: string, ox: number, oy: number): MapDef {
  return {
    id, name: 'Hearth', music: 'hearth', kind: 'interior',
    rows: [
      'wwwiwwwwiwww',
      'zQQQQhQQQQQz',
      'QQQCCCCCCQQQ',
      'QQQQQQQQQQQQ',
      'pQQQQQQQQQQQ',
      'QQQaaaaaaQQQ',
      'QQQaaaaaaQQQ',
      'zQQQQQQQQQQz',
      'QQQQQMMQQQQQ',
    ],
    warps: [
      { x: 5, y: 8, to: outMap, tx: ox, ty: oy, dir: 'down' },
      { x: 6, y: 8, to: outMap, tx: ox, ty: oy, dir: 'down' },
    ],
    npcs: [
      { id: `${id}_nurse`, x: 6, y: 1, dir: 'down', look: 'nurse', script: 'nurse' },
      { id: `${id}_visitor`, x: 9, y: 6, dir: 'left', look: id === 'hearth_hb' ? 'boy' : 'miner', text: id === 'hearth_hb' ? ['The terminal by the wall stores creatures when your team is full.', 'You can carry six at a time!'] : ['They say Warden Corra trained in Glimmer Cave for years.', 'Her creatures are as hard as the cave walls!'] },
    ],
    signs: [{ x: 0, y: 4, text: [] }],
    items: [],
  };
}

function shopInterior(id: string, outMap: string, ox: number, oy: number): MapDef {
  return {
    id, name: 'Trading Post', music: 'hearth', kind: 'interior',
    rows: [
      'wwiwwwwiww',
      'qqqqFFFFqq',
      'FFFFFFFFFF',
      'CCCFFFFFFF',
      'FFFFFFFqqF',
      'FFFFFFFFFF',
      'jFFFFFFFFj',
      'FFFFMMFFFF',
    ],
    warps: [
      { x: 4, y: 7, to: outMap, tx: ox, ty: oy, dir: 'down' },
      { x: 5, y: 7, to: outMap, tx: ox, ty: oy, dir: 'down' },
    ],
    npcs: [
      { id: `${id}_clerk`, x: 1, y: 2, dir: 'down', look: 'clerk', script: 'shop' },
      { id: `${id}_shopper`, x: 6, y: 5, dir: 'up', look: 'girl', text: ['Bond Stones work best when a wild creature is tired out.', 'Drowsy creatures are the easiest of all!'] },
    ],
    signs: [],
    items: [],
  };
}

const route1: MapDef = {
  id: 'route1', name: 'Route 1', music: 'route', kind: 'route',
  rows: [
    'TTTTTTTTTT::TTTTTTTTTTTT',
    'TTTTTTTTT.::.TTTTTTTTTTT',
    'TT,,,,,...::.......,,,TT',
    'TT,,,,,...::.......,,,TT',
    'TT,,,,,...::...TT..,,,TT',
    'TT........::...TT.....TT',
    'TTvvvvvvv.::.vvvvvvvvvTT',
    'TT........::..........TT',
    'TT..TT....::....,,,,..TT',
    'TT..TT..S.::....,,,,..TT',
    'TT,,,,....::....,,,,..TT',
    'TT,,,,....:::::::.....TT',
    'TT,,,,..........:.....TT',
    'TT.....TTTTTT...:..TT.TT',
    'TT.....TTTTTT...:..TT.TT',
    'TTvvvv.........::.....TT',
    'TT.......,,,,,,:......TT',
    'TT.......,,,,,,:..f...TT',
    'TT..f....,,,,,,:......TT',
    'TT.......,,,,,,:..TT..TT',
    'TT~~~.....::::::..TT..TT',
    'TT~~~.....:...........TT',
    'TT~~~..TT.:..vvvvvvvvvTT',
    'TT.....TT.:...........TT',
    'TT,,,,....:....,,,,,..TT',
    'TT,,,,....:....,,,,,..TT',
    'TT,,,,....::::.,,,,,..TT',
    'TT...........:........TT',
    'TT..f....S...::...f...TT',
    'TT...........::.......TT',
    'TTTTTTTTTT...::..TTTTTTT',
    'TTTTTTTTTTT..::.TTTTTTTT',
    'TTTTTTTTTTTT.::TTTTTTTTT',
    'TTTTTTTTTTTT::TTTTTTTTTT',
  ],
  warps: [],
  connections: { south: { map: 'hollowbrook', offset: 0 }, north: { map: 'whisperwood', offset: -3 } },
  encounters: {
    rate: 10,
    table: [
      { species: 'fluffinch', min: 2, max: 4, weight: 40 },
      { species: 'mossgrub', min: 2, max: 4, weight: 35 },
      { species: 'bitzel', min: 3, max: 4, weight: 25 },
    ],
  },
  npcs: [
    { id: 'r1_scout', x: 17, y: 12, dir: 'left', look: 'scout', trainer: 'scout_tomas', sight: 4 },
    { id: 'r1_picnic', x: 5, y: 7, dir: 'right', look: 'girl', trainer: 'picnicker_ada', sight: 4 },
    { id: 'r1_guide', x: 11, y: 27, dir: 'down', look: 'boy', text: ['Tall grass is where wild creatures hide!', 'Hop down the ledges to get back to town quicker.'] },
  ],
  signs: [
    { x: 9, y: 28, text: ['ROUTE 1', 'North: Whisperwood    South: Hollowbrook'] },
    { x: 8, y: 9, text: ['TRAINER TIP', 'Hold the run button (Shift / B) to dash!'] },
  ],
  items: [
    { id: 'r1_stone', x: 21, y: 2, item: 'bond_stone', qty: 2 },
    { id: 'r1_tonic', x: 2, y: 12, item: 'berry_tonic', qty: 1 },
    { id: 'r1_hidden', x: 21, y: 19, item: 'clear_drop', qty: 1, hidden: true },
  ],
};

const whisperwood: MapDef = {
  id: 'whisperwood', name: 'Whisperwood', music: 'forest', kind: 'forest', weather: 'rain',
  rows: [
    'PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP',
    'PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP',
    'PP,,,,PP......PPPP,,,,,,,PPPPPPP',
    'PP,,,,PP..::..PPPP,,,,,,,..PPPPP',
    'PP,,,,....::......,,,,,,,..PPPPP',
    'PP....PP..::..PP...........PPPPP',
    'PPPP..PP..::..PP..PPPPP.....PPPP',
    'PPPP......::......PPPPP........:',
    'PP,,,,....:::::::::::::::::::::P',
    'PP,,,,..PP..........PP.....:PPPP',
    'PP,,,,..PP..,,,,....PP.....:PPPP',
    'PP......PP..,,,,..PPPP..~~~:..PP',
    'PPPP....PP..,,,,..PPPP..~~~:..PP',
    'PPPP........,,,,........~~~:..PP',
    'PP....PPPPPP........,,,,,..:..PP',
    'PP,,,,PPPPPP..PPPP..,,,,,..:..PP',
    'PP,,,,........PPPP..,,,,,..:.PPP',
    'PP,,,,..::::::::::::::::::::.PPP',
    'PPPP....:.....PPPP.:...PP....PPP',
    'PPPP....:.....PPPP.:...PP.,,,PPP',
    'PP,,,...:..,,,,....:......,,,PPP',
    'PP,,,...:..,,,,....:..PP..,,,PPP',
    'PP,,,...:..,,,,....:..PP......PP',
    'PP......:..........:..........PP',
    'PPPPPP..:..PPPPPP..:..PPPPPP..PP',
    'PPPPPP..:..PPPPPP.....PPPPPP..PP',
    'PPPPPP.::..PPPPPPPPPPPPPPPPPPPPP',
    'PPPPPPP::.PPPPPPPPPPPPPPPPPPPPPP',
    'PPPPPPP::PPPPPPPPPPPPPPPPPPPPPPP',
    'PPPPPPP::PPPPPPPPPPPPPPPPPPPPPPP',
  ],
  warps: [],
  connections: { south: { map: 'route1', offset: 3 }, east: { map: 'route2', offset: 0 } },
  encounters: {
    rate: 11,
    table: [
      { species: 'mossgrub', min: 4, max: 6, weight: 30 },
      { species: 'shroomp', min: 5, max: 7, weight: 30 },
      { species: 'gloomling', min: 5, max: 7, weight: 20 },
      { species: 'fluffinch', min: 5, max: 6, weight: 20 },
    ],
  },
  npcs: [
    { id: 'ww_forager', x: 12, y: 20, dir: 'up', look: 'forager', trainer: 'forager_lia', sight: 3 },
    { id: 'ww_veil', x: 20, y: 7, dir: 'down', look: 'veil', trainer: 'veil_grunt_1', sight: 1 },
    { id: 'ww_scout', x: 4, y: 23, dir: 'right', look: 'scout', trainer: 'scout_rhea', sight: 4 },
    { id: 'ww_sage', x: 9, y: 4, dir: 'down', look: 'oldman', text: ['The forest wisps sleep in the old lanterns.', 'Light all three and the forest will open its eastern path.'] },
  ],
  signs: [
    { x: 7, y: 25, text: ['WHISPERWOOD', 'Keep to the path. The forest remembers.'] },
  ],
  items: [
    { id: 'ww_lantern_item', x: 28, y: 19, item: 'glow_lantern', qty: 1, hidden: true },
    { id: 'ww_stone', x: 2, y: 2, item: 'bond_stone', qty: 3 },
    { id: 'ww_tonic', x: 29, y: 11, item: 'honey_tonic', qty: 1 },
    { id: 'ww_hidden1', x: 16, y: 9, item: 'kin_stone', qty: 1, hidden: true },
    { id: 'ww_hidden2', x: 2, y: 20, item: 'pp_dew', qty: 1, hidden: true },
    { id: 'ww_hidden3', x: 24, y: 3, item: 'rekindle', qty: 1, hidden: true },
  ],
  objects: [
    { id: 'ww_l1', kind: 'lantern', x: 3, y: 5 },
    { id: 'ww_l2', kind: 'lantern', x: 26, y: 22 },
    { id: 'ww_l3', kind: 'lantern', x: 16, y: 13 },
    { id: 'ww_thorn1', kind: 'thorns', x: 29, y: 7 },
    { id: 'ww_thorn2', kind: 'thorns', x: 29, y: 8 },
  ],
};

const route2: MapDef = {
  id: 'route2', name: 'Route 2', music: 'route', kind: 'route',
  rows: [
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTXXXXXX',
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTXXXXXXX',
    'TT,,,,,,...TT......,,,,,..TTTXXXXXXX',
    'TT,,,,,,...TT......,,,,,....XXXXXXXX',
    'TT,,,,,,..........f,,,,,....XXXXXXXX',
    'TT.......f....TT...,,,,,.....XXcXXXX',
    'TT............TT.............:::XXXX',
    '::::::::::::::::::::::::::::::::..XX',
    'TT........:........:.......,,,,...XX',
    'TT~~~~....:...TT...:..TT...,,,,...XX',
    'TT~~~~....:...TT...:..TT...,,,,..TTT',
    'TT~~~~..,,,,,,.....:.......,,,,..TTT',
    'TT......,,,,,,.....:......f......TTT',
    'TT..f...,,,,,,..TT.:.............TTT',
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
  ],
  warps: [{ x: 31, y: 5, to: 'glimmer', tx: 2, ty: 19, dir: 'up' }],
  connections: { west: { map: 'whisperwood', offset: 0 } },
  encounters: {
    rate: 10,
    table: [
      { species: 'bitzel', min: 7, max: 9, weight: 30 },
      { species: 'pebblit', min: 7, max: 9, weight: 30 },
      { species: 'fluffinch', min: 7, max: 9, weight: 25 },
      { species: 'shroomp', min: 7, max: 8, weight: 15 },
    ],
  },
  npcs: [
    { id: 'r2_hiker', x: 16, y: 11, dir: 'left', look: 'hiker', trainer: 'hiker_doran', sight: 4 },
    { id: 'r2_birder', x: 24, y: 3, dir: 'down', look: 'birder', trainer: 'birder_sol', sight: 3 },
    { id: 'r2_bram', x: 31, y: 7, dir: 'left', look: 'bram', script: 'bram' },
    { id: 'r2_kip', x: 22, y: 7, dir: 'left', look: 'kip', script: 'kipRoute2', hideIf: 'beatKip2' },
  ],
  signs: [{ x: 29, y: 6, text: ['GLIMMER CAVE', 'Beyond lies Cindervale. Bring a light!'] }],
  items: [
    { id: 'r2_tonic', x: 2, y: 2, item: 'honey_tonic', qty: 1 },
    { id: 'r2_stone', x: 32, y: 12, item: 'bond_stone', qty: 2 },
    { id: 'r2_hidden', x: 4, y: 12, item: 'ember_tea', qty: 1, hidden: true },
  ],
  triggers: [{ x: 20, y: 6, w: 1, h: 3, script: 'kipRoute2' }],
};

const glimmer: MapDef = {
  id: 'glimmer', name: 'Glimmer Cave', music: 'cave', kind: 'cave', dark: true,
  rows: [
    'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    'xxxxxxxxxxxxxxxxxxxxxxxxx--xxxxx',
    'xx____m______xxxx______x_-_xxxxx',
    'xx___________xxxx__o___x___xxxxx',
    'xx__o___xx___________________xxx',
    'xx______xx___m___xx____o_____xxx',
    'xxxx__xxxx_______xx__xxxxx___xxx',
    'xxxx__xxxx__o____xx__xxxxx___xxx',
    'xx_______________________m___xxx',
    'xx___m___xxxxxx______________xxx',
    'xx_______xxxxxx___xxxxxx__o__xxx',
    'xxxx__o__xx_______xxxxxx_____xxx',
    'xxxx_____xx___m_______xx_____xxx',
    'xx_______xx___________xx__xxxxxx',
    'xx__xxxxxxx______o____________xx',
    'xx__xxxxxxx___________________xx',
    'xx_____________xxxxxx____m____xx',
    'xx__m__________xxxxxx_________xx',
    'xx-----___o____________xxxxxxxxx',
    'xx-----________________xxxxxxxxx',
    'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  ],
  warps: [
    { x: 2, y: 19, to: 'route2', tx: 31, ty: 6, dir: 'down' },
    { x: 3, y: 19, to: 'route2', tx: 31, ty: 6, dir: 'down' },
    { x: 25, y: 1, to: 'cindervale', tx: 1, ty: 7, dir: 'right' },
    { x: 26, y: 1, to: 'cindervale', tx: 1, ty: 7, dir: 'right' },
  ],
  encounters: {
    rate: 8,
    table: [
      { species: 'pebblit', min: 9, max: 11, weight: 40 },
      { species: 'gloomling', min: 9, max: 11, weight: 30 },
      { species: 'lumimoth', min: 10, max: 11, weight: 20 },
      { species: 'bitzel', min: 9, max: 10, weight: 10 },
    ],
  },
  npcs: [
    { id: 'gc_veil1', x: 12, y: 8, dir: 'left', look: 'veil', trainer: 'veil_grunt_2', sight: 4 },
    { id: 'gc_veil2', x: 21, y: 14, dir: 'down', look: 'veil', trainer: 'veil_grunt_3', sight: 3 },
    { id: 'gc_nyx', x: 25, y: 3, dir: 'down', look: 'agent', script: 'nyx', hideIf: 'beatNyx' },
    { id: 'gc_miner', x: 5, y: 17, dir: 'right', look: 'miner', text: ['Those cloaked Veil folk are chipping out glimmer crystals!', 'They say the crystals hold the cave\'s old ember-light.'] },
  ],
  signs: [],
  items: [
    { id: 'gc_stone', x: 2, y: 2, item: 'kin_stone', qty: 2 },
    { id: 'gc_tonic', x: 27, y: 10, item: 'honey_tonic', qty: 2 },
    { id: 'gc_revive', x: 12, y: 11, item: 'rekindle', qty: 1 },
    { id: 'gc_hidden', x: 28, y: 16, item: 'ember_tea', qty: 1, hidden: true },
  ],
  triggers: [{ x: 22, y: 4, w: 7, h: 1, script: 'nyx' }],
};

const cindervale: MapDef = {
  id: 'cindervale', name: 'Cindervale', music: 'town', kind: 'town',
  rows: [
    'XXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    'XX......................l.XX',
    'XX..NNNNN....UUUUUUU......XX',
    'XX..NNNNN....UUUUUUU..LL..XX',
    'XX..WOWOW....WOWOWOW..LL..XX',
    'XX..WWDWW....WOWDWOW......XX',
    'XX....:.........:.........XX',
    'c:::::::::::::::::::::::..XX',
    'XX....:.....:.......:.....XX',
    'XX.S..:.....:.......:...f.XX',
    'XX..RRRRR...:...GGGGG.....XX',
    'XX..RRRRR...:...GGGGG..K..XX',
    'XX..WOWOW...:...WOWOW.....XX',
    'XX..WWDWW...:...WWDWW.....XX',
    'XX....:.....:.....:.......XX',
    'XX....:::::::::::::...LLL.XX',
    'XX.f..................LLL.XX',
    'XX.....K.....f....l.......XX',
    'XXXXXXXXXXXXXXXXXXXXXXXXXXXX',
  ],
  warps: [
    { x: 0, y: 7, to: 'glimmer', tx: 25, ty: 2, dir: 'down' },
    { x: 6, y: 5, to: 'cv_house', tx: 4, ty: 6, dir: 'up' },
    { x: 16, y: 5, to: 'warden_hall', tx: 5, ty: 12, dir: 'up' },
    { x: 6, y: 13, to: 'hearth_cv', tx: 5, ty: 7, dir: 'up' },
    { x: 18, y: 13, to: 'shop_cv', tx: 4, ty: 6, dir: 'up' },
  ],
  npcs: [
    { id: 'cv_boy', x: 10, y: 9, dir: 'down', look: 'boy', wander: true, text: ['Cindervale was built around the old forges.', 'The Warden Hall is the big purple building up north!'] },
    { id: 'cv_miner', x: 22, y: 8, dir: 'left', look: 'miner', text: ['Warden Corra uses Stone creatures. Tough as anvils!', 'Tide and Sprout moves will crack them, though.'] },
    { id: 'cv_guard', x: 16, y: 6, dir: 'down', look: 'apprentice', script: 'hallGuard', hideIf: 'hallOpen' },
  ],
  signs: [
    { x: 3, y: 9, text: ['CINDERVALE', 'The town that never lets its fires go out.'] },
  ],
  items: [{ id: 'cv_hidden', x: 25, y: 17, item: 'kin_stone', qty: 1, hidden: true }],
  hearth: { x: 6, y: 14 },
};

const cvHouse: MapDef = {
  id: 'cv_house', name: 'Forge Cottage', music: 'hearth', kind: 'interior',
  rows: [
    'wwiwwwwiww',
    'kFFFFFFFbb',
    'FFFFFFFFFF',
    'FFtFFFFFFF',
    'FFFFaaFFFF',
    'zFFFaaFFFz',
    'FFFFFFFFFF',
    'FFFFMMFFFF',
  ],
  warps: [
    { x: 4, y: 7, to: 'cindervale', tx: 6, ty: 6, dir: 'down' },
    { x: 5, y: 7, to: 'cindervale', tx: 6, ty: 6, dir: 'down' },
  ],
  npcs: [{ id: 'cv_smith', x: 6, y: 2, dir: 'down', look: 'hiker', script: 'smith' }],
  signs: [],
  items: [],
};

const wardenHall: MapDef = {
  id: 'warden_hall', name: 'Warden Hall', music: 'warden', kind: 'interior',
  rows: [
    'wwwwwwwwwwww',
    'LmggggggggmL',
    'LggggggggggL',
    'LLggggggggLL',
    'LLggLLLLggLL',
    'LLggLLLLggLL',
    'LLggggggggLL',
    'LLggggggggLL',
    'LmggLLLLggmL',
    'LLggLLLLggLL',
    'LLggggggggLL',
    'zggggggggggz',
    'gggggggggggg',
    'zggggMMggggz',
  ],
  warps: [
    { x: 5, y: 13, to: 'cindervale', tx: 16, ty: 6, dir: 'down' },
    { x: 6, y: 13, to: 'cindervale', tx: 16, ty: 6, dir: 'down' },
  ],
  npcs: [
    { id: 'wh_corra', x: 5, y: 2, dir: 'down', look: 'warden', script: 'warden' },
    { id: 'wh_flint', x: 9, y: 10, dir: 'left', look: 'apprentice', trainer: 'apprentice_flint', sight: 7 },
  ],
  signs: [],
  items: [],
};

export const MAPS: Record<string, MapDef> = Object.fromEntries(
  [
    hollowbrook, home, lab, hearthInterior('hearth_hb', 'hollowbrook', 6, 16), shopInterior('shop_hb', 'hollowbrook', 19, 16),
    route1, whisperwood, route2, glimmer, cindervale, cvHouse, hearthInterior('hearth_cv', 'cindervale', 6, 14),
    shopInterior('shop_cv', 'cindervale', 18, 14), wardenHall,
  ].map((m) => [m.id, m]),
);

export function getMap(id: string): MapDef {
  const m = MAPS[id];
  if (!m) throw new Error(`Unknown map ${id}`);
  return m;
}
