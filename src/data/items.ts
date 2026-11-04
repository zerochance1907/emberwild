export type ItemKind = 'heal' | 'status' | 'stone' | 'revive' | 'key' | 'pp';

export interface ItemDef {
  id: string;
  name: string;
  kind: ItemKind;
  price: number; // 0 = cannot be bought
  desc: string;
  heal?: number; // HP restored (9999 = full)
  cures?: 'all' | string;
  catchBonus?: number;
}

const i = (d: ItemDef) => d;

export const ITEMS: Record<string, ItemDef> = Object.fromEntries(
  [
    i({ id: 'bond_stone', name: 'Bond Stone', kind: 'stone', price: 200, catchBonus: 1, desc: 'A warm stone that forms a bond with a weakened wild creature.' }),
    i({ id: 'kin_stone', name: 'Kin Stone', kind: 'stone', price: 600, catchBonus: 1.5, desc: 'A polished Bond Stone. Bonds form more easily.' }),
    i({ id: 'berry_tonic', name: 'Berry Tonic', kind: 'heal', price: 150, heal: 25, desc: 'A sweet tonic. Restores 25 HP.' }),
    i({ id: 'honey_tonic', name: 'Honey Tonic', kind: 'heal', price: 450, heal: 60, desc: 'Thick and golden. Restores 60 HP.' }),
    i({ id: 'ember_tea', name: 'Ember Tea', kind: 'heal', price: 0, heal: 9999, desc: 'A rare brew. Fully restores HP.' }),
    i({ id: 'clear_drop', name: 'Clear Drop', kind: 'status', price: 200, cures: 'all', desc: 'Cures any status condition.' }),
    i({ id: 'rekindle', name: 'Rekindle Ash', kind: 'revive', price: 900, heal: 50, desc: 'Revives a fainted creature with half HP.' }),
    i({ id: 'pp_dew', name: 'Focus Dew', kind: 'pp', price: 0, desc: 'Restores 10 PP to every move of one creature.' }),
    i({ id: 'glow_lantern', name: 'Glowmoth Lantern', kind: 'key', price: 0, desc: 'Old Bram\'s lantern. Lights up dark places.' }),
    i({ id: 'wildlog', name: 'Wildlog', kind: 'key', price: 0, desc: 'Records creatures you have seen and bonded with.' }),
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
};
