/**
 * Tiny vector-to-pixel rasterizer used for every creature sprite.
 * Creatures are described as layered shapes on a 64x64 grid. The rasterizer
 * adds per-part shading (light from the top-left), inner contour lines and a
 * soft coloured outline, which gives a consistent hand-pixelled look.
 * Pure TS (no DOM) so it can run in tests or Node scripts too.
 */

export type Tag = 'front' | 'back';

export interface ShapeBase {
  c: number; // base colour 0xRRGGBB
  flat?: boolean; // no shading
  noLine?: boolean; // no inner contour
  only?: Tag; // only drawn in that view
}
export type Shape =
  | (ShapeBase & { k: 'e'; x: number; y: number; rx: number; ry: number; rot?: number })
  | (ShapeBase & { k: 'p'; pts: number[] })
  | (ShapeBase & { k: 'l'; x1: number; y1: number; x2: number; y2: number; w: number })
  | (ShapeBase & { k: 'eye'; x: number; y: number; r: number; flat: true });

export const E = (x: number, y: number, rx: number, ry: number, c: number, o: Partial<ShapeBase> & { rot?: number } = {}): Shape => ({ k: 'e', x, y, rx, ry, c, ...o });
export const P = (pts: number[], c: number, o: Partial<ShapeBase> = {}): Shape => ({ k: 'p', pts, c, ...o });
export const L = (x1: number, y1: number, x2: number, y2: number, w: number, c: number, o: Partial<ShapeBase> = {}): Shape => ({ k: 'l', x1, y1, x2, y2, w, c, ...o });
/** A cute glossy eye (only drawn on the front view). */
export const EYE = (x: number, y: number, r: number, c = 0x1d1530): Shape => ({ k: 'eye', x, y, r, c, flat: true, only: 'front' });

export interface Pixels {
  w: number;
  h: number;
  data: Uint8ClampedArray; // RGBA
}

function inside(s: Shape, px: number, py: number): boolean {
  switch (s.k) {
    case 'e':
    case 'eye': {
      const rx = s.k === 'eye' ? s.r * 0.8 : s.rx;
      const ry = s.k === 'eye' ? s.r : s.ry;
      let dx = px - s.x;
      let dy = py - s.y;
      if (s.k === 'e' && s.rot) {
        const a = (-s.rot * Math.PI) / 180;
        const nx = dx * Math.cos(a) - dy * Math.sin(a);
        dy = dx * Math.sin(a) + dy * Math.cos(a);
        dx = nx;
      }
      return (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1;
    }
    case 'p': {
      let c = false;
      const p = s.pts;
      for (let i = 0, j = p.length - 2; i < p.length; j = i, i += 2) {
        const xi = p[i], yi = p[i + 1], xj = p[j], yj = p[j + 1];
        if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) c = !c;
      }
      return c;
    }
    case 'l': {
      const vx = s.x2 - s.x1, vy = s.y2 - s.y1;
      const len2 = vx * vx + vy * vy || 1;
      const t = Math.max(0, Math.min(1, ((px - s.x1) * vx + (py - s.y1) * vy) / len2));
      const dx = px - (s.x1 + t * vx), dy = py - (s.y1 + t * vy);
      return dx * dx + dy * dy <= (s.w / 2) * (s.w / 2);
    }
  }
}

function bbox(s: Shape): [number, number, number, number] {
  switch (s.k) {
    case 'e': {
      const r = Math.max(s.rx, s.ry);
      return s.rot ? [s.x - r, s.y - r, s.x + r, s.y + r] : [s.x - s.rx, s.y - s.ry, s.x + s.rx, s.y + s.ry];
    }
    case 'eye':
      return [s.x - s.r, s.y - s.r, s.x + s.r, s.y + s.r];
    case 'p': {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (let i = 0; i < s.pts.length; i += 2) {
        x0 = Math.min(x0, s.pts[i]); x1 = Math.max(x1, s.pts[i]);
        y0 = Math.min(y0, s.pts[i + 1]); y1 = Math.max(y1, s.pts[i + 1]);
      }
      return [x0, y0, x1, y1];
    }
    case 'l':
      return [Math.min(s.x1, s.x2) - s.w / 2, Math.min(s.y1, s.y2) - s.w / 2, Math.max(s.x1, s.x2) + s.w / 2, Math.max(s.y1, s.y2) + s.w / 2];
  }
}

export function shade(c: number, f: number): number {
  let r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255;
  if (f >= 1) {
    const t = f - 1;
    r += (255 - r) * t; g += (255 - g) * t; b += (255 - b) * t;
  } else {
    // darken with a slight hue shift toward purple for nicer shadows
    r = r * f; g = g * f * 0.96; b = b * f + (1 - f) * 30;
  }
  return (Math.round(Math.min(255, r)) << 16) | (Math.round(Math.min(255, g)) << 8) | Math.round(Math.min(255, b));
}

export interface RasterOptions {
  size: number; // output size in pixels (sprite is square)
  view: Tag;
  mirror?: boolean;
  outline?: boolean;
}

/** Rasterize shapes (on a 64x64 design grid) into RGBA pixels. */
export function rasterize(shapes: Shape[], opt: RasterOptions): Pixels {
  const N = opt.size;
  const scale = 64 / N;
  const part = new Int16Array(N * N).fill(-1);
  const col = new Int32Array(N * N);
  const list = shapes.filter((s) => !s.only || s.only === opt.view);
  list.forEach((s, idx) => {
    const [x0, y0, x1, y1] = bbox(s);
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const hw = Math.max(1, (x1 - x0) / 2), hh = Math.max(1, (y1 - y0) / 2);
    const px0 = Math.max(0, Math.floor(x0 / scale) - 1), px1 = Math.min(N - 1, Math.ceil(x1 / scale) + 1);
    const py0 = Math.max(0, Math.floor(y0 / scale) - 1), py1 = Math.min(N - 1, Math.ceil(y1 / scale) + 1);
    for (let py = py0; py <= py1; py++) {
      for (let px = px0; px <= px1; px++) {
        const dx = opt.mirror ? N - 1 - px : px;
        const sx = (px + 0.5) * scale, sy = (py + 0.5) * scale;
        if (!inside(s, sx, sy)) continue;
        const i = py * N + dx;
        let c = s.c;
        if (s.k === 'eye') {
          // glossy eye: dark body, big highlight top-left, small one bottom-right
          const ex = (sx - s.x) / s.r, ey = (sy - s.y) / s.r;
          c = s.c;
          if (ey > 0.35) c = shade(s.c, 1.25);
          if ((ex + 0.3) ** 2 + (ey + 0.4) ** 2 < 0.16) c = 0xffffff;
          else if ((ex - 0.3) ** 2 + (ey - 0.45) ** 2 < 0.04) c = 0xffffff;
        } else if (!s.flat) {
          const nx = (sx - cx) / hw, ny = (sy - cy) / hh;
          const light = -(nx * 0.55 + ny * 0.85);
          if (light > 0.55) c = shade(s.c, 1.22);
          else if (light < -0.6) c = shade(s.c, 0.72);
          else if (light < -0.15) c = shade(s.c, 0.87);
        }
        part[i] = s.noLine ? -2 - idx : idx;
        col[i] = c;
      }
    }
  });
  const out = new Uint8ClampedArray(N * N * 4);
  const partIdx = (i: number) => (part[i] <= -2 ? -2 - part[i] : part[i]);
  for (let i = 0; i < N * N; i++) {
    if (part[i] === -1) continue;
    let c = col[i];
    // inner contour: this pixel's part sits on top of a different, lower part
    if (part[i] >= 0 && list[part[i]].k !== 'eye') {
      const x = i % N, y = (i / N) | 0;
      for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + ox, ny = y + oy;
        if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
        const j = ny * N + nx;
        if (part[j] === -1) continue;
        const pj = partIdx(j);
        if (pj < part[i] && list[pj].c !== list[part[i]].c) {
          c = shade(list[part[i]].c, 0.62);
          break;
        }
      }
    }
    out[i * 4] = (c >> 16) & 255;
    out[i * 4 + 1] = (c >> 8) & 255;
    out[i * 4 + 2] = c & 255;
    out[i * 4 + 3] = 255;
  }
  if (opt.outline !== false) {
    const copy = out.slice();
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const i = y * N + x;
        if (copy[i * 4 + 3]) continue;
        let found = -1;
        for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + ox, ny = y + oy;
          if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
          const j = ny * N + nx;
          if (copy[j * 4 + 3]) { found = j; break; }
        }
        if (found < 0) continue;
        const base = (copy[found * 4] << 16) | (copy[found * 4 + 1] << 8) | copy[found * 4 + 2];
        const oc = shade(base, 0.3);
        out[i * 4] = (oc >> 16) & 255;
        out[i * 4 + 1] = (oc >> 8) & 255;
        out[i * 4 + 2] = oc & 255;
        out[i * 4 + 3] = 255;
      }
    }
  }
  return { w: N, h: N, data: out };
}
