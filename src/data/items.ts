import type { MoveType } from './types';

export type ItemKind = 'heal' | 'status' | 'stone' | 'revive' | 'key' | 'pp' | 'held';

/** What a held item does in battle (see engine/battle.ts). */
export type HeldFx = 'boost' | 'regen' | 'berry' | 'cure' | 'sturdy' | 'speed' | 'xp';

export interface ItemDef {
  id: string;
  name: string;
  kind: ItemKind;
  price: number; // 0 = cannot be bought
  desc: string;
  heal?: number; // HP restored (9999 = full)
  cures?: 'all' | string;
  catchBonus?: number;
  /** Held items only. */
  held?: HeldFx;
  boost?: MoveType;
}

const i = (d: ItemDef) => d;
const charm = (id: string, name: string, type: MoveType, flavour: string) =>
  i({ id, name, kind: 'held', held: 'boost', boost: type, price: 0, desc: `${flavour} Held: ${type[0].toUpperCase() + type.slice(1)} moves hit 20% harder.` });

export const ITEMS: Record<string, ItemDef> = Object.fromEntries(
  [
    i({ id: 'bond_stone', name: 'Bond Stone', kind: 'stone', price: 200, catchBonus: 1, desc: 'A warm stone that forms a bond with a weakened wild creature.' }),
    i({ id: 'kin_stone', name: 'Kin Stone', kind: 'stone', price: 600, catchBonus: 1.5, desc: 'A polished Bond Stone. Bonds form more easily.' }),
    i({ id: 'storm_stone', name: 'Storm Stone', kind: 'stone', price: 1200, catchBonus: 2, desc: 'A Bond Stone charged in a thunderstorm. Bonds form far more easily.' }),
    i({ id: 'berry_tonic', name: 'Berry Tonic', kind: 'heal', price: 150, heal: 25, desc: 'A sweet tonic. Restores 25 HP.' }),
    i({ id: 'honey_tonic', name: 'Honey Tonic', kind: 'heal', price: 450, heal: 60, desc: 'Thick and golden. Restores 60 HP.' }),
    i({ id: 'kelp_tonic', name: 'Kelp Tonic', kind: 'heal', price: 900, heal: 120, desc: 'Salty and strong. Restores 120 HP.' }),
    i({ id: 'ember_tea', name: 'Ember Tea', kind: 'heal', price: 0, heal: 9999, desc: 'A rare brew. Fully restores HP.' }),
    i({ id: 'clear_drop', name: 'Clear Drop', kind: 'status', price: 200, cures: 'all', desc: 'Cures any status condition.' }),
    i({ id: 'rekindle', name: 'Rekindle Ash', kind: 'revive', price: 900, heal: 50, desc: 'Revives a fainted creature with half HP.' }),
    i({ id: 'pp_dew', name: 'Focus Dew', kind: 'pp', price: 0, desc: 'Restores 10 PP to every move of one creature.' }),
    // held items
    charm('coal_charm', 'Coal Charm', 'ember', 'A lump of coal that never cools.'),
    charm('sea_glass', 'Sea Glass', 'tide', 'Frosted glass worn smooth by the waves.'),
    charm('seed_locket', 'Seed Locket', 'sprout', 'A locket with a sleeping seed inside.'),
    charm('plume_pin', 'Plume Pin', 'gale', 'A pin made from a single storm feather.'),
    charm('grit_idol', 'Grit Idol', 'stone', 'A tiny, stubborn stone figure.'),
    charm('copper_coil', 'Copper Coil', 'spark', 'A springy coil that hums faintly.'),
    charm('dusk_bead', 'Dusk Bead', 'shade', 'A bead that is darker than its shadow.'),
    charm('fae_ribbon', 'Fae Ribbon', 'fae', 'A ribbon that shimmers in moonlight.'),
    i({ id: 'moss_wrap', name: 'Moss Wrap', kind: 'held', held: 'regen', price: 0, desc: 'Soft, healing moss. Held: restores a little HP every turn.' }),
    i({ id: 'mend_berry', name: 'Mend Berry', kind: 'held', held: 'berry', price: 300, desc: 'Held: eaten at half HP or less to restore 30% of max HP. Used up.' }),
    i({ id: 'clear_leaf', name: 'Clear Leaf', kind: 'held', held: 'cure', price: 250, desc: 'Held: cures a status condition the moment it strikes. Used up.' }),
    i({ id: 'stubborn_shell', name: 'Stubborn Shell', kind: 'held', held: 'sturdy', price: 0, desc: 'Held: at full HP, survives a knockout blow with 1 HP. Once per battle.' }),
    i({ id: 'swift_feather', name: 'Swift Feather', kind: 'held', held: 'speed', price: 0, desc: 'Held: a light feather that raises Speed by 15%.' }),
    i({ id: 'lucky_scale', name: 'Lucky Scale', kind: 'held', held: 'xp', price: 0, desc: 'Held: the holder earns 50% more XP.' }),
    // key items
    i({ id: 'glow_lantern', name: 'Glowmoth Lantern', kind: 'key', price: 0, desc: 'Old Bram\'s lantern. Lights up dark places.' }),
    i({ id: 'wildlog', name: 'Wildlog', kind: 'key', price: 0, desc: 'Records creatures you have seen and bonded with.' }),
    i({ id: 'lure_reed', name: 'Lure Reed', kind: 'key', price: 0, desc: 'A springy fishing reed. Face water and press Confirm to cast.' }),
    i({ id: 'driftboard', name: 'Driftboard', kind: 'key', price: 0, desc: 'A buoyant board of woven reed. Face deep water and press Confirm to paddle out.' }),
    i({ id: 'star_page', name: 'Star Log Page', kind: 'key', price: 0, desc: 'A torn page from an old star log. Keeper Ysolde would want it.' }),
    i({ id: 'ferry_pass', name: 'Ferry Pass', kind: 'key', price: 0, desc: 'A brass token for the Gullhaven ferry.' }),
  ].map((it) => [it.id, it]),
);

export function getItem(id: string): ItemDef {
  const it = ITEMS[id];
  if (!it) throw new Error(`Unknown item ${id}`);
  return it;
}

export const SHOP_STOCK: Record<string, string[]> = {
  hollowbrook: ['bond_stone', 'berry_tonic', 'clear_drop'],
  cindervale: ['bond_stone', 'kin_stone', 'berry_tonic', 'honey_tonic', 'clear_drop', 'rekindle'],
  gullhaven: ['bond_stone', 'kin_stone', 'storm_stone', 'honey_tonic', 'kelp_tonic', 'clear_drop', 'rekindle', 'mend_berry', 'clear_leaf'],
};
