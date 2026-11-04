import Phaser from 'phaser';
import { audio } from '../audio/audio';
import { input } from '../game/input';
import { settings } from '../game/settings';

export const W = 960;
export const H = 540;
export const FONT = '"Trebuchet MS", "Segoe UI", "Helvetica Neue", Arial, sans-serif';

export const C = {
  panel: 0x1d1830,
  panel2: 0x2a2244,
  edge: 0xffa25a,
  edgeDim: 0x5a4a7a,
  hi: 0x3d325f,
  text: '#fff4e2',
  dim: '#b4a8cc',
  accent: '#ffb46b',
  good: '#7ee08a',
  bad: '#ff7a7a',
  hpGreen: 0x5fd46a,
  hpYellow: 0xf2c94c,
  hpRed: 0xf0564a,
};

export function text(scene: Phaser.Scene, x: number, y: number, str: string, size = 22, color = C.text, extra: Phaser.Types.GameObjects.Text.TextStyle = {}) {
  return scene.add.text(x, y, str, {
    fontFamily: FONT, fontSize: `${size}px`, color, fontStyle: 'bold',
    shadow: { offsetX: 0, offsetY: 2, color: '#0008', blur: 0, fill: true },
    ...extra,
  });
}

export function panel(scene: Phaser.Scene, x: number, y: number, w: number, h: number, opts: { fill?: number; edge?: number; alpha?: number; radius?: number } = {}) {
  const g = scene.add.graphics();
  drawPanel(g, 0, 0, w, h, opts);
  g.setPosition(x, y);
  return g;
}

export function drawPanel(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, opts: { fill?: number; edge?: number; alpha?: number; radius?: number } = {}) {
  const r = opts.radius ?? 12;
  g.fillStyle(0x000000, 0.35);
  g.fillRoundedRect(x + 3, y + 5, w, h, r);
  g.fillStyle(opts.fill ?? C.panel, opts.alpha ?? 0.96);
  g.fillRoundedRect(x, y, w, h, r);
  g.lineStyle(3, opts.edge ?? C.edge, 1);
  g.strokeRoundedRect(x + 1.5, y + 1.5, w - 3, h - 3, r);
  g.lineStyle(1, 0xffffff, 0.08);
  g.strokeRoundedRect(x + 6, y + 6, w - 12, h - 12, Math.max(2, r - 5));
}

/** Text reveal rate (chars per second) by setting. */
export function charsPerSecond(): number {
  return [30, 55, 110, 100000][settings.textSpeed];
}

export const wait = (scene: Phaser.Scene, ms: number) => new Promise<void>((r) => scene.time.delayedCall(ms, r));

export interface MenuItem { label: string; right?: string; enabled?: boolean; color?: string; icon?: string; iconFrame?: number }

export interface MenuOpts {
  rows?: number;
  rowH?: number;
  title?: string;
  cancelable?: boolean;
  start?: number;
  size?: number;
  depth?: number;
  onMove?: (i: number) => void;
  /** Extra keys: returns true if handled (e.g. left/right to change values). */
  onKey?: (i: number, key: 'left' | 'right') => void;
}

/** A vertical list menu that works with keys, gamepad and touch. */
export class ListMenu {
  readonly root: Phaser.GameObjects.Container;
  index = 0;
  private top = 0;
  private rowsVisible: number;
  private rowH: number;
  private labels: Phaser.GameObjects.Text[] = [];
  private rights: Phaser.GameObjects.Text[] = [];
  private icons: Phaser.GameObjects.Image[] = [];
  private cursor: Phaser.GameObjects.Graphics;
  private arrowUp: Phaser.GameObjects.Text;
  private arrowDown: Phaser.GameObjects.Text;
  private resolve: ((i: number) => void) | null = null;
  private active = false;
  private hitZones: Phaser.GameObjects.Zone[] = [];
  readonly h: number;

  constructor(private scene: Phaser.Scene, x: number, y: number, public w: number, public items: MenuItem[], private opts: MenuOpts = {}) {
    this.rowsVisible = Math.min(opts.rows ?? 8, Math.max(1, items.length));
    this.rowH = opts.rowH ?? 40;
    const titleH = opts.title ? 36 : 0;
    this.h = this.rowsVisible * this.rowH + 24 + titleH;
    this.root = scene.add.container(x, y).setDepth(opts.depth ?? 1000);
    this.root.add(panel(scene, 0, 0, w, this.h));
    if (opts.title) this.root.add(text(scene, 18, 12, opts.title, 20, C.accent));
    this.cursor = scene.add.graphics();
    this.root.add(this.cursor);
    for (let r = 0; r < this.rowsVisible; r++) {
      const yy = 12 + titleH + r * this.rowH;
      const icon = scene.add.image(30, yy + this.rowH / 2, '__WHITE').setVisible(false);
      const lbl = text(scene, 20, yy + this.rowH / 2, '', opts.size ?? 22).setOrigin(0, 0.5);
      const rt = text(scene, w - 20, yy + this.rowH / 2, '', (opts.size ?? 22) - 2, C.dim).setOrigin(1, 0.5);
      const zone = scene.add.zone(w / 2, yy + this.rowH / 2, w - 16, this.rowH).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => this.tap(r));
      this.root.add([icon, lbl, rt, zone]);
      this.icons.push(icon);
      this.labels.push(lbl);
      this.rights.push(rt);
      this.hitZones.push(zone);
    }
    this.arrowUp = text(scene, w - 26, 6 + titleH, '▲', 14, C.accent).setVisible(false);
    this.arrowDown = text(scene, w - 26, this.h - 22, '▼', 14, C.accent).setVisible(false);
    this.root.add([this.arrowUp, this.arrowDown]);
    this.index = Math.min(opts.start ?? 0, items.length - 1);
    this.render();
    scene.events.on('update', this.update, this);
  }

  setItems(items: MenuItem[]) {
    this.items = items;
    this.index = Math.min(this.index, items.length - 1);
    this.render();
  }

  private tap(r: number) {
    if (!this.active) return;
    const i = this.top + r;
    if (i >= this.items.length) return;
    this.index = i;
    this.render();
    this.choose();
  }

  private render() {
    if (this.index < this.top) this.top = this.index;
    if (this.index >= this.top + this.rowsVisible) this.top = this.index - this.rowsVisible + 1;
    const titleH = this.opts.title ? 36 : 0;
    for (let r = 0; r < this.rowsVisible; r++) {
      const it = this.items[this.top + r];
      const lbl = this.labels[r];
      const icon = this.icons[r];
      lbl.setText(it ? it.label : '');
      lbl.setColor(it && it.enabled === false ? '#7a7090' : it?.color ?? C.text);
      this.rights[r].setText(it?.right ?? '');
      if (it?.icon) {
        icon.setTexture(it.icon, it.iconFrame).setVisible(true).setScale(1);
        lbl.setX(60);
      } else {
        icon.setVisible(false);
        lbl.setX(26);
      }
    }
    this.cursor.clear();
    if (this.items.length) {
      const r = this.index - this.top;
      this.cursor.fillStyle(C.hi, 1);
      this.cursor.fillRoundedRect(8, 12 + titleH + r * this.rowH + 2, this.w - 16, this.rowH - 4, 8);
      this.cursor.fillStyle(C.edge, 1);
      this.cursor.fillRoundedRect(10, 12 + titleH + r * this.rowH + 8, 5, this.rowH - 16, 2);
    }
    this.arrowUp.setVisible(this.top > 0);
    this.arrowDown.setVisible(this.top + this.rowsVisible < this.items.length);
  }

  open(): Promise<number> {
    this.active = true;
    this.root.setVisible(true);
    input.clear();
    return new Promise((r) => (this.resolve = r));
  }

  private choose() {
    const it = this.items[this.index];
    if (!it || it.enabled === false) {
      audio.sfx('error');
      return;
    }
    audio.sfx('confirm');
    this.finish(this.index);
  }

  private finish(i: number) {
    this.active = false;
    const r = this.resolve;
    this.resolve = null;
    r?.(i);
  }

  private update() {
    if (!this.active || !this.items.length) return;
    const n = this.items.length;
    if (input.pressed('up')) {
      this.index = (this.index - 1 + n) % n;
      audio.sfx('select');
      this.render();
      this.opts.onMove?.(this.index);
    } else if (input.pressed('down')) {
      this.index = (this.index + 1) % n;
      audio.sfx('select');
      this.render();
      this.opts.onMove?.(this.index);
    } else if (input.pressed('left') && this.opts.onKey) {
      this.opts.onKey(this.index, 'left');
      this.render();
    } else if (input.pressed('right') && this.opts.onKey) {
      this.opts.onKey(this.index, 'right');
      this.render();
    } else if (input.pressed('a')) {
      input.consume('a');
      this.choose();
    } else if (input.pressed('b') && this.opts.cancelable !== false) {
      input.consume('b');
      audio.sfx('cancel');
      this.finish(-1);
    }
  }

  destroy() {
    this.active = false;
    this.scene.events.off('update', this.update, this);
    this.root.destroy();
  }
}

/** Typewriter dialogue box anchored to the bottom of the screen. */
export class DialogBox {
  readonly root: Phaser.GameObjects.Container;
  private body: Phaser.GameObjects.Text;
  private nameTag: Phaser.GameObjects.Container;
  private nameText: Phaser.GameObjects.Text;
  private arrow: Phaser.GameObjects.Text;
  private full = '';
  private shown = 0;
  private typing = false;
  private waiting: (() => void) | null = null;
  private tapped = false;

  constructor(private scene: Phaser.Scene, depth = 900) {
    const x = 24, y = H - 150, w = W - 48, h = 130;
    this.root = scene.add.container(0, 0).setDepth(depth).setScrollFactor(0).setVisible(false);
    const bg = panel(scene, x, y, w, h);
    this.body = text(scene, x + 28, y + 22, '', 26, C.text, { wordWrap: { width: w - 70 }, lineSpacing: 8 });
    this.arrow = text(scene, x + w - 40, y + h - 40, '▼', 18, C.accent);
    this.nameTag = scene.add.container(x + 24, y - 22);
    const tagBg = scene.add.graphics();
    this.nameText = text(scene, 16, 6, '', 20, C.accent);
    this.nameTag.add([tagBg, this.nameText]);
    const zone = scene.add.zone(x, y, w, h).setOrigin(0).setInteractive();
    zone.on('pointerdown', () => (this.tapped = true));
    this.root.add([bg, this.body, this.arrow, this.nameTag, zone]);
    scene.events.on('update', this.update, this);
    scene.tweens.add({ targets: this.arrow, y: '+=5', yoyo: true, repeat: -1, duration: 400 });
  }

  get visible() {
    return this.root.visible;
  }

  private setName(name?: string) {
    this.nameTag.setVisible(!!name);
    if (!name) return;
    this.nameText.setText(name);
    const g = this.nameTag.list[0] as Phaser.GameObjects.Graphics;
    g.clear();
    drawPanel(g, 0, 0, this.nameText.width + 32, 36, { radius: 10, fill: C.panel2 });
  }

  /** Shows one or more lines; resolves after the player dismisses the last. */
  async say(lines: string | string[], name?: string, keepOpen = false) {
    const list = typeof lines === 'string' ? [lines] : lines;
    this.root.setVisible(true);
    this.setName(name);
    for (const line of list) await this.line(line);
    if (!keepOpen) this.hide();
  }

  /** Types a line and waits for confirmation. */
  private line(str: string, waitForInput = true): Promise<void> {
    this.full = str;
    this.shown = 0;
    this.typing = true;
    this.body.setText('');
    this.arrow.setVisible(false);
    input.clear();
    this.tapped = false;
    return new Promise((r) => {
      this.waiting = () => r();
      if (!waitForInput) this.waiting = null;
      if (!waitForInput) r();
    });
  }

  /** Types a line without waiting for input (used before showing a choice). */
  async prompt(str: string, name?: string) {
    this.root.setVisible(true);
    this.setName(name);
    await this.line(str, false);
    await new Promise<void>((r) => {
      const check = () => {
        if (!this.typing) {
          this.scene.events.off('update', check);
          r();
        }
      };
      this.scene.events.on('update', check);
    });
  }

  hide() {
    this.root.setVisible(false);
    this.waiting = null;
  }

  private update(_t: number, dt: number) {
    if (!this.root.visible) return;
    const advance = input.pressed('a') || this.tapped;
    const skip = input.isDown('b');
    if (this.typing) {
      const before = Math.floor(this.shown);
      this.shown += (charsPerSecond() * (skip ? 4 : 1) * dt) / 1000;
      if (advance) this.shown = this.full.length;
      const n = Math.min(this.full.length, Math.floor(this.shown));
      if (n > before && n < this.full.length && this.full[n] !== ' ') audio.sfx('text');
      this.body.setText(this.full.slice(0, n));
      if (n >= this.full.length) {
        this.typing = false;
        this.arrow.setVisible(!!this.waiting);
      }
      if (advance) input.consume('a');
      this.tapped = false;
      return;
    }
    if (this.waiting && advance) {
      input.consume('a');
      this.tapped = false;
      audio.sfx('select');
      const w = this.waiting;
      this.waiting = null;
      w();
    }
    this.tapped = false;
  }

  destroy() {
    this.scene.events.off('update', this.update, this);
    this.root.destroy();
  }
}

/** Ask a yes/no (or multi) question using the dialog box plus a small menu. */
export async function ask(scene: Phaser.Scene, box: DialogBox, question: string, options: string[], name?: string, depth = 1000): Promise<number> {
  await box.prompt(question, name);
  const w = 220;
  const menu = new ListMenu(scene, W - w - 30, H - 160 - (options.length * 40 + 24), w, options.map((o) => ({ label: o })), { depth, cancelable: true });
  menu.root.setScrollFactor(0);
  const i = await menu.open();
  menu.destroy();
  box.hide();
  return i;
}

export function toast(scene: Phaser.Scene, msg: string, ms = 1600) {
  const t = text(scene, W / 2, 40, msg, 22, C.text).setOrigin(0.5).setDepth(2000).setScrollFactor(0);
  const bg = panel(scene, W / 2 - t.width / 2 - 24, 18, t.width + 48, 46, { radius: 22 }).setDepth(1999).setScrollFactor(0);
  scene.tweens.add({ targets: [t, bg], alpha: 0, delay: ms, duration: 400, onComplete: () => { t.destroy(); bg.destroy(); } });
}

/** HP bar colour by fraction. */
export function hpColor(frac: number): number {
  return frac > 0.5 ? C.hpGreen : frac > 0.2 ? C.hpYellow : C.hpRed;
}
