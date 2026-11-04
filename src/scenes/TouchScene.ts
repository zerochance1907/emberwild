import Phaser from 'phaser';
import { input } from '../game/input';
import { settings, type Action } from '../game/settings';
import { H, text, W } from '../ui/kit';

/** On-screen D-pad and buttons for touch devices. Always on top. */
export class TouchScene extends Phaser.Scene {
  private root!: Phaser.GameObjects.Container;
  private touchSeen = false;

  constructor() {
    super('Touch');
  }

  create() {
    this.input.addPointer(3);
    this.touchSeen = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0) && matchMedia('(pointer: coarse)').matches;
    this.root = this.add.container(0, 0).setDepth(5000);
    const pad = { x: 120, y: H - 120 };
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.28).fillCircle(pad.x, pad.y, 96);
    g.fillStyle(0xffffff, 0.16);
    g.fillRoundedRect(pad.x - 30, pad.y - 88, 60, 176, 12);
    g.fillRoundedRect(pad.x - 88, pad.y - 30, 176, 60, 12);
    this.root.add(g);
    const dirs: [Action, number, number, string][] = [['up', 0, -58, '▲'], ['down', 0, 58, '▼'], ['left', -58, 0, '◀'], ['right', 58, 0, '▶']];
    for (const [, dx, dy, label] of dirs) {
      this.root.add(text(this, pad.x + dx, pad.y + dy, label, 26, '#ffffffaa').setOrigin(0.5));
    }
    // one zone for the whole pad so sliding a thumb changes direction
    const zone = this.add.zone(pad.x, pad.y, 220, 220).setInteractive();
    let padPointer: Phaser.Input.Pointer | null = null;
    let current: Action | null = null;
    const setDir = (p: Phaser.Input.Pointer | null) => {
      let next: Action | null = null;
      if (p) {
        const dx = p.x - pad.x, dy = p.y - pad.y;
        if (Math.hypot(dx, dy) >= 14) next = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
      }
      if (next === current) return;
      if (current) input.setVirtual(current, false);
      if (next) input.setVirtual(next, true);
      current = next;
    };
    zone.on('pointerdown', (p: Phaser.Input.Pointer) => { padPointer = p; this.touchSeen = true; setDir(p); });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => { if (padPointer && p.id === padPointer.id) setDir(p); });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => { if (padPointer && p.id === padPointer.id) { padPointer = null; setDir(null); } });
    this.root.add(zone);

    const button = (a: Action, x: number, y: number, r: number, label: string, color: number) => {
      const bg = this.add.graphics();
      bg.fillStyle(color, 0.45).fillCircle(x, y, r);
      bg.lineStyle(3, 0xffffff, 0.35).strokeCircle(x, y, r);
      const t = text(this, x, y, label, r > 30 ? 26 : 16, '#ffffffdd').setOrigin(0.5);
      const z = this.add.zone(x, y, r * 2.2, r * 2.2).setInteractive();
      z.on('pointerdown', () => { this.touchSeen = true; input.setVirtual(a, true); bg.setAlpha(0.6); });
      const up = () => { input.setVirtual(a, false); bg.setAlpha(1); };
      z.on('pointerup', up);
      z.on('pointerout', up);
      this.root.add([bg, t, z]);
    };
    button('a', W - 90, H - 140, 46, 'A', 0xe8562a);
    button('b', W - 190, H - 80, 40, 'B', 0x4f78c8);
    button('menu', W - 70, 50, 30, 'MENU', 0x3a3050);
    button('run', W - 190, H - 190, 30, 'RUN', 0x3a6a4a);
    this.refresh();
    window.addEventListener('touchstart', () => { this.touchSeen = true; }, { passive: true });
  }

  refresh() {
    const show = settings.touch === 'on' || (settings.touch === 'auto' && this.touchSeen);
    this.root.setVisible(show);
  }

  update() {
    this.refresh();
  }
}
