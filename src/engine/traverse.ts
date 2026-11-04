import { LEGEND, type PushDir } from '../art/tiles';

/**
 * Pure movement rules for Chapter Two's puzzle tiles, shared by the overworld and the tests.
 * - Push tiles (wind gusts '<>^|', water currents '[]{}') carry the player until they land on a normal
 *   tile or hit something solid.
 * - Tide tiles: '%' is flooded at high tide, '&' is flooded at low tide. Valves toggle the tide.
 */
export const STEP: Record<PushDir, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
export const DIRS4: PushDir[] = ['up', 'down', 'left', 'right'];

export function tileAt(rows: string[], x: number, y: number): string | undefined {
  return rows[y]?.[x];
}

/** Is a tide tile currently underwater? */
export function flooded(ch: string, lowTide: boolean): boolean {
  const t = LEGEND[ch]?.tide;
  if (!t) return false;
  return t === 'A' ? !lowTide : lowTide;
}

/** Can the player stand on this tile (ignoring NPCs and objects)? Ledges count as solid here. */
export function standable(rows: string[], x: number, y: number, lowTide: boolean): boolean {
  const ch = tileAt(rows, x, y);
  if (ch === undefined) return false;
  const spec = LEGEND[ch];
  if (!spec || spec.solid) return false;
  return !flooded(ch, lowTide);
}

export function pushOf(rows: string[], x: number, y: number): PushDir | undefined {
  const ch = tileAt(rows, x, y);
  return ch ? LEGEND[ch]?.push : undefined;
}

/**
 * Follows push tiles from (x, y). Returns every tile the player is carried through (not including the start).
 * Stops on the first non-push tile, or on a push tile whose next tile is blocked. Loops are cut off.
 */
export function slide(rows: string[], x: number, y: number, lowTide: boolean, blocked: (x: number, y: number) => boolean = () => false): { x: number; y: number }[] {
  const path: { x: number; y: number }[] = [];
  const seen = new Set<string>();
  let cx = x, cy = y;
  for (let guard = 0; guard < 400; guard++) {
    const d = pushOf(rows, cx, cy);
    if (!d) break;
    const key = `${cx},${cy}`;
    if (seen.has(key)) break;
    seen.add(key);
    const [dx, dy] = STEP[d];
    const nx = cx + dx, ny = cy + dy;
    if (!standable(rows, nx, ny, lowTide) || blocked(nx, ny)) break;
    cx = nx;
    cy = ny;
    path.push({ x: cx, y: cy });
  }
  return path;
}

export interface SolveOpts {
  /** Tiles where a tide valve can be turned from (adjacent floor tiles). */
  valves?: { x: number; y: number }[];
  /** Extra solid tiles (NPCs, objects). */
  solid?: { x: number; y: number }[];
  lowTide?: boolean;
}

export interface Node { x: number; y: number; low: boolean }

const key = (n: Node) => `${n.x},${n.y},${n.low ? 1 : 0}`;

/** All moves from a state: step in four directions (then slide), or turn an adjacent valve. */
export function neighbours(rows: string[], n: Node, o: SolveOpts): Node[] {
  const solid = new Set((o.solid ?? []).map((p) => `${p.x},${p.y}`));
  const blocked = (x: number, y: number) => solid.has(`${x},${y}`);
  const out: Node[] = [];
  for (const d of DIRS4) {
    const [dx, dy] = STEP[d];
    const nx = n.x + dx, ny = n.y + dy;
    if (!standable(rows, nx, ny, n.low) || blocked(nx, ny)) continue;
    const path = slide(rows, nx, ny, n.low, blocked);
    const end = path.length ? path[path.length - 1] : { x: nx, y: ny };
    out.push({ x: end.x, y: end.y, low: n.low });
  }
  for (const v of o.valves ?? []) {
    if (Math.abs(v.x - n.x) + Math.abs(v.y - n.y) !== 1) continue;
    if (standable(rows, n.x, n.y, !n.low)) out.push({ x: n.x, y: n.y, low: !n.low });
  }
  return out;
}

/** Every state reachable from a start (breadth-first). */
export function reachable(rows: string[], start: { x: number; y: number }, o: SolveOpts = {}): Map<string, Node> {
  const first: Node = { ...start, low: !!o.lowTide };
  const seen = new Map<string, Node>([[key(first), first]]);
  const queue = [first];
  while (queue.length) {
    const n = queue.shift()!;
    for (const m of neighbours(rows, n, o)) {
      const k = key(m);
      if (!seen.has(k)) {
        seen.set(k, m);
        queue.push(m);
      }
    }
  }
  return seen;
}

/** Can the player get from start to any of the goal tiles? */
export function canReach(rows: string[], start: { x: number; y: number }, goals: { x: number; y: number }[], o: SolveOpts = {}): boolean {
  const g = new Set(goals.map((p) => `${p.x},${p.y}`));
  for (const n of reachable(rows, start, o).values()) if (g.has(`${n.x},${n.y}`)) return true;
  return false;
}

/** States from which the player can never get back to the start: a soft-lock. */
export function softLocks(rows: string[], start: { x: number; y: number }, o: SolveOpts = {}): Node[] {
  const all = reachable(rows, start, o);
  const bad: Node[] = [];
  for (const n of all.values()) {
    if (!canReach(rows, n, [start], { ...o, lowTide: n.low })) bad.push(n);
  }
  return bad;
}
