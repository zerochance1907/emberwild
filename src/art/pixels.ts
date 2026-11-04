import { shade, type Pixels } from './raster';

export function makePixels(w: number, h: number): Pixels {
  return { w, h, data: new Uint8ClampedArray(w * h * 4) };
}

/** A drawing window into a Pixels buffer (for tiles inside a sheet). */
export class Pen {
  constructor(public px: Pixels, public ox = 0, public oy = 0, public w = 16, public h = 16) {}
  set(x: number, y: number, c: number, a = 255) {
    x = Math.floor(x); y = Math.floor(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = ((this.oy + y) * this.px.w + this.ox + x) * 4;
    if (a < 255) {
      const t = a / 255;
      this.px.data[i] = this.px.data[i] * (1 - t) + ((c >> 16) & 255) * t;
      this.px.data[i + 1] = this.px.data[i + 1] * (1 - t) + ((c >> 8) & 255) * t;
      this.px.data[i + 2] = this.px.data[i + 2] * (1 - t) + (c & 255) * t;
      this.px.data[i + 3] = Math.max(this.px.data[i + 3], a);
      return;
    }
    this.px.data[i] = (c >> 16) & 255;
    this.px.data[i + 1] = (c >> 8) & 255;
    this.px.data[i + 2] = c & 255;
    this.px.data[i + 3] = 255;
  }
  get(x: number, y: number): number {
    const i = ((this.oy + y) * this.px.w + this.ox + x) * 4;
    return this.px.data[i + 3] ? (this.px.data[i] << 16) | (this.px.data[i + 1] << 8) | this.px.data[i + 2] : -1;
  }
  rect(x: number, y: number, w: number, h: number, c: number, a = 255) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c, a);
  }
  fill(c: number) {
    this.rect(0, 0, this.w, this.h, c);
  }
  hline(x: number, y: number, w: number, c: number) { this.rect(x, y, w, 1, c); }
  vline(x: number, y: number, h: number, c: number) { this.rect(x, y, 1, h, c); }
  circle(cx: number, cy: number, r: number, c: number) {
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++)
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++)
        if ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r) this.set(x, y, c);
  }
  ellipse(cx: number, cy: number, rx: number, ry: number, c: number) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++)
        if (((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1) this.set(x, y, c);
  }
  /** Draw a dark outline around all opaque pixels inside this window. */
  outline(color?: number) {
    const opaque: boolean[] = [];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) opaque.push(this.get(x, y) >= 0);
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        if (opaque[y * this.w + x]) continue;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= this.w || ny >= this.h || !opaque[ny * this.w + nx]) continue;
          this.set(x, y, color ?? shade(this.get(nx, ny), 0.3));
          break;
        }
      }
  }
}

/** Deterministic hash noise in [0,1). */
export function hash(x: number, y: number, s = 0): number {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
