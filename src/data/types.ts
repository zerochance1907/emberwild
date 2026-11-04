/** The eight elemental types of Emberwild, plus a typeless "Plain" used only by moves. */
export const TYPES = ['ember', 'tide', 'sprout', 'gale', 'stone', 'spark', 'shade', 'fae'] as const;
export type CreatureType = (typeof TYPES)[number];
export type MoveType = CreatureType | 'plain';

export const TYPE_INFO: Record<MoveType, { name: string; color: number; dark: number }> = {
  ember: { name: 'Ember', color: 0xff7a2f, dark: 0xa83a12 },
  tide: { name: 'Tide', color: 0x3fa7ff, dark: 0x1d5ea8 },
  sprout: { name: 'Sprout', color: 0x6fd64a, dark: 0x2f7d2a },
  gale: { name: 'Gale', color: 0x9fe3e0, dark: 0x4a8f9c },
  stone: { name: 'Stone', color: 0xc09a6b, dark: 0x6e5236 },
  spark: { name: 'Spark', color: 0xffd93b, dark: 0xb08a10 },
  shade: { name: 'Shade', color: 0x8a5cd6, dark: 0x45297a },
  fae: { name: 'Fae', color: 0xff8fd0, dark: 0xb24a8c },
  plain: { name: 'Plain', color: 0xd8d2c4, dark: 0x837d70 },
};

/**
 * Attacker -> defender multipliers. Anything not listed is 1x.
 * Each type is weak to exactly two others (Stone to three, but it is immune to Spark).
 */
export const TYPE_CHART: Record<CreatureType, Partial<Record<CreatureType, number>>> = {
  ember: { sprout: 2, fae: 2, tide: 0.5, stone: 0.5, ember: 0.5 },
  tide: { ember: 2, stone: 2, tide: 0.5, sprout: 0.5 },
  sprout: { tide: 2, stone: 2, ember: 0.5, sprout: 0.5, gale: 0.5 },
  gale: { sprout: 2, shade: 2, stone: 0.5, spark: 0.5 },
  stone: { ember: 2, gale: 2, spark: 2, sprout: 0.5, stone: 0.5 },
  spark: { tide: 2, gale: 2, stone: 0, sprout: 0.5, spark: 0.5 },
  shade: { fae: 2, spark: 2, shade: 0.5, stone: 0.5 },
  fae: { shade: 2, stone: 2, ember: 0.5, fae: 0.5 },
};

export function effectiveness(moveType: MoveType, defender: readonly CreatureType[]): number {
  if (moveType === 'plain') return 1;
  let m = 1;
  for (const t of defender) m *= TYPE_CHART[moveType][t] ?? 1;
  return m;
}
