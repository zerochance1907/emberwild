import Phaser from 'phaser';
import { audio } from '../audio/audio';
import type { TrackId } from '../audio/tracks';
import { charFrame } from '../art/characters';
import { getSpecies } from '../data/creatures';
import { getMap } from '../data/maps';
import { getMove, STATUS_INFO } from '../data/moves';
import { TRAINERS } from '../data/trainers';
import { effectiveness, TYPE_INFO, type MoveType } from '../data/types';
import { Battle, type BattleEvent, type BattleResult, type PlayerAction, type Side } from '../engine/battle';
import { displayName, learnMove, maxHp, xpForLevel, type Creature } from '../engine/creature';
import { input } from '../game/input';
import { session } from '../game/session';
import { settings } from '../game/settings';
import { C, H, hpColor, ListMenu, panel, text, W } from '../ui/kit';
import { bagMenu, partyMenu } from '../ui/menus';

export interface BattleSceneData {
  kind: 'wild' | 'trainer';
  enemy: Creature[];
  trainerId?: string;
  music?: TrackId;
  onEnd: (r: BattleResult) => void;
}

const ENEMY_POS = { x: 700, y: 250 };
const PLAYER_POS = { x: 250, y: 432 };

class Hud {
  root: Phaser.GameObjects.Container;
  private g: Phaser.GameObjects.Graphics;
  private name: Phaser.GameObjects.Text;
  private lvl: Phaser.GameObjects.Text;
  private hpText?: Phaser.GameObjects.Text;
  private status: Phaser.GameObjects.Text;
  shownHp = 0;
  max = 1;
  xpFrac = 0;
  balls: Phaser.GameObjects.Image[] = [];

  constructor(private scene: Phaser.Scene, x: number, y: number, private player: boolean) {
    const w = 370, h = player ? 112 : 86;
    this.root = scene.add.container(x, y).setDepth(50);
    this.root.add(panel(scene, 0, 0, w, h));
    this.g = scene.add.graphics();
    this.name = text(scene, 20, 12, '', 24);
    this.lvl = text(scene, w - 20, 14, '', 20, C.accent).setOrigin(1, 0);
    this.status = text(scene, 20, h - 34, '', 16, C.bad);
    this.root.add([this.g, this.name, this.lvl, this.status]);
    if (player) {
      this.hpText = text(scene, w - 20, 66, '', 18, C.text).setOrigin(1, 0);
      this.root.add(this.hpText);
    }
  }

  set(c: Creature) {
    this.name.setText(displayName(c));
    this.lvl.setText(`Lv ${c.level}`);
    this.max = maxHp(c);
    this.shownHp = c.hp;
    const cur = xpForLevel(c.level), next = xpForLevel(c.level + 1);
    this.xpFrac = Math.min(1, (c.xp - cur) / Math.max(1, next - cur));
    this.setStatus(c.status, c.hp);
    this.draw();
  }

  setStatus(s: Creature['status'], hp = 1) {
    if (hp <= 0) return this.status.setText('');
    this.status.setText(s ? STATUS_INFO[s].short : '').setColor(s ? `#${STATUS_INFO[s].color.toString(16).padStart(6, '0')}` : C.text);
  }

  draw() {
    const g = this.g;
    g.clear();
    const x = 120, y = 50, w = 230;
    const frac = Math.max(0, this.shownHp / this.max);
    g.fillStyle(0x0a0812, 1).fillRoundedRect(x - 44, y - 3, w + 48, 18, 6);
    g.fillStyle(0x3a3050, 1).fillRoundedRect(x, y, w, 12, 5);
    if (frac > 0) {
      g.fillStyle(hpColor(frac), 1).fillRoundedRect(x, y, Math.max(5, w * frac), 12, 5);
      g.fillStyle(0xffffff, 0.3).fillRect(x + 3, y + 2, Math.max(0, w * frac - 6), 3);
    }
    g.fillStyle(0xffb46b, 1).fillRect(x - 38, y + 1, 30, 10);
    g.fillStyle(0x1a1424, 1).fillRect(x - 34, y + 3, 22, 6);
    if (this.player) {
      this.hpText!.setText(`${Math.ceil(this.shownHp)} / ${this.max}`);
      g.fillStyle(0x0a0812, 1).fillRect(20, 96, 330, 7);
      g.fillStyle(0x6ac8ff, 1).fillRect(20, 96, 330 * this.xpFrac, 7);
    }
  }

  tweenHp(to: number, ms: number): Promise<void> {
    return new Promise((r) => this.scene.tweens.add({ targets: this, shownHp: to, duration: ms, onUpdate: () => this.draw(), onComplete: () => { this.draw(); r(); } }));
  }

  tweenXp(to: number, ms: number): Promise<void> {
    return new Promise((r) => this.scene.tweens.add({ targets: this, xpFrac: to, duration: ms, onUpdate: () => this.draw(), onComplete: () => r() }));
  }
}

export class BattleScene extends Phaser.Scene {
  private data0!: BattleSceneData;
  battle!: Battle;
  private sprites: [Phaser.GameObjects.Image, Phaser.GameObjects.Image] = [] as unknown as [Phaser.GameObjects.Image, Phaser.GameObjects.Image];
  private huds!: [Hud, Hud];
  private msg!: Phaser.GameObjects.Text;
  private msgBox!: Phaser.GameObjects.Graphics;
  private speed = 1;
  private ending = false;
  private trainerSprite?: Phaser.GameObjects.Sprite;

  constructor() {
    super('Battle');
  }

  init(data: BattleSceneData) {
    this.data0 = data;
  }

  create() {
    const d = this.data0;
    this.ending = false;
    this.speed = settings.battleSpeed;
    const st = session.state;
    const tr = d.trainerId ? TRAINERS[d.trainerId] : undefined;
    this.battle = new Battle({
      kind: d.kind, player: st.party, enemy: d.enemy, rng: session.rng, bag: st.bag,
      ai: tr?.ai ?? 0, trainerName: tr?.name, enemyItems: tr?.items,
    });
    this.drawBackground(getMap(st.map).kind, st.map);
    this.sprites = [
      this.add.image(PLAYER_POS.x, PLAYER_POS.y, 'cb_kindlet').setOrigin(0.5, 1).setScale(3.4).setVisible(false).setDepth(20),
      this.add.image(ENEMY_POS.x, ENEMY_POS.y, 'cf_kindlet').setOrigin(0.5, 1).setScale(2.9).setVisible(false).setDepth(19),
    ];
    this.huds = [new Hud(this, 560, 300, true), new Hud(this, 30, 30, false)];
    this.huds[0].root.setVisible(false);
    this.huds[1].root.setVisible(false);
    this.msgBox = this.add.graphics().setDepth(60);
    this.msgBox.fillStyle(0x000000, 0.35).fillRect(0, H - 128, W, 128);
    this.msgBox.fillStyle(C.panel, 1).fillRect(0, H - 124, W, 124);
    this.msgBox.fillStyle(C.edge, 1).fillRect(0, H - 124, W, 4);
    this.msg = text(this, 36, H - 100, '', 26, C.text, { wordWrap: { width: 520 }, lineSpacing: 6 }).setDepth(61);
    if (d.kind === 'trainer' && tr) {
      this.trainerSprite = this.add.sprite(W + 100, ENEMY_POS.y, `char_${tr.look}`, charFrame('down', 0)).setOrigin(0.5, 1).setScale(8).setDepth(18);
      this.tweens.add({ targets: this.trainerSprite, x: ENEMY_POS.x, duration: 500, ease: 'Cubic.out' });
    }
    this.cameras.main.fadeIn(300);
    input.clear();
    void this.run();
  }

  private drawBackground(kind: string, mapId: string) {
    const g = this.add.graphics().setDepth(0);
    let top = 0x8fd0ff, bottom = 0xd8f4c8, ground = 0x7ac85a, ground2 = 0x5aa848;
    if (kind === 'forest') { top = 0x2a4a3a; bottom = 0x6a9a6a; ground = 0x3a7a4a; ground2 = 0x2a5a3a; }
    if (kind === 'cave') { top = 0x141020; bottom = 0x3a2a4a; ground = 0x4a4058; ground2 = 0x3a3048; }
    if (mapId === 'warden_hall') { top = 0x2a0e14; bottom = 0x8a3a2a; ground = 0xb8a890; ground2 = 0x8a7a64; }
    if (kind === 'interior' && mapId !== 'warden_hall') { top = 0xe8d8b8; bottom = 0xf8ecd8; ground = 0xc8a06a; ground2 = 0xa8804a; }
    g.fillGradientStyle(top, top, bottom, bottom, 1).fillRect(0, 0, W, H);
    // distant hills / stalactites
    g.fillStyle(Phaser.Display.Color.ValueToColor(bottom).darken(15).color, 1);
    for (let x = 0; x < W; x += 6) g.fillRect(x, 240 + Math.sin(x / 70) * 18 + Math.sin(x / 23) * 6, 6, 200);
    g.fillStyle(ground, 1).fillRect(0, 330, W, H);
    // platforms
    const plat = (x: number, y: number, rx: number, ry: number) => {
      g.fillStyle(ground2, 1).fillEllipse(x, y + 6, rx * 2, ry * 2);
      g.fillStyle(Phaser.Display.Color.ValueToColor(ground).lighten(12).color, 1).fillEllipse(x, y, rx * 2, ry * 2);
    };
    plat(ENEMY_POS.x, ENEMY_POS.y - 6, 150, 34);
    plat(PLAYER_POS.x, PLAYER_POS.y - 4, 180, 40);
    if (kind === 'forest' && !settings.reducedMotion) {
      this.add.particles(0, 0, 'drop', { x: { min: 0, max: W }, y: -10, lifespan: 800, speedY: 600, speedX: -100, quantity: 2, frequency: 20, alpha: 0.4, tint: 0xbfd8ff }).setDepth(5);
    }
  }

  private ms(n: number) {
    return n / this.speed;
  }

  private wait(n: number) {
    return new Promise<void>((r) => this.time.delayedCall(this.ms(n), r));
  }

  /** Show a message; waits for A/tap or a short timeout. */
  private async say(str: string) {
    this.msg.setText('');
    const cps = [35, 70, 140, 100000][settings.textSpeed] * this.speed;
    let shown = 0;
    input.clear();
    await new Promise<void>((resolve) => {
      let hold = 0;
      let tapped = false;
      const onTap = () => (tapped = true);
      this.input.once('pointerdown', onTap);
      const tick = (_t: number, dt: number) => {
        const advance = input.pressed('a') || input.isDown('b') || tapped;
        if (shown < str.length) {
          shown = advance ? str.length : Math.min(str.length, shown + (cps * dt) / 1000);
          this.msg.setText(str.slice(0, Math.floor(shown)));
          if (advance) { input.consume('a'); tapped = false; this.input.once('pointerdown', onTap); }
          return;
        }
        hold += dt;
        if (advance || hold > this.ms(700 + str.length * 18)) {
          input.consume('a');
          this.events.off('update', tick);
          this.input.off('pointerdown', onTap);
          resolve();
        }
      };
      this.events.on('update', tick);
    });
  }

  private async run() {
    const intro = this.battle.start();
    await this.play(intro);
    while (!this.battle.over) {
      if (this.battle.awaitingSwitch) {
        const i = await partyMenu(this, { mode: 'force', title: 'Choose your next creature', activeIndex: this.battle.active[0] });
        await this.play(this.battle.forceSwitch(i));
        continue;
      }
      const action = await this.chooseAction();
      if (!action) continue;
      await this.play(this.battle.turn(action));
    }
  }

  private async chooseAction(): Promise<PlayerAction | null> {
    const me = this.battle.mon(0);
    this.msg.setText(`What will ${displayName(me)} do?`);
    const choice = await this.grid(['Fight', 'Bag', 'Team', this.battle.kind === 'wild' ? 'Run' : '—'], 560, H - 116, 190, 50, [true, true, true, this.battle.kind === 'wild']);
    if (choice === 0) {
      const usable = me.moves.some((m) => m.pp > 0);
      if (!usable) return { kind: 'move', index: 0 };
      const mi = await this.moveMenu(me);
      return mi < 0 ? null : { kind: 'move', index: mi };
    }
    if (choice === 1) {
      const r = await bagMenu(this, 'battle', this.battle.kind, this.battle.active[0]);
      return r ? { kind: 'item', item: r.item, target: r.target } : null;
    }
    if (choice === 2) {
      const i = await partyMenu(this, { mode: 'switch', title: 'Switch to...', activeIndex: this.battle.active[0] });
      return i < 0 ? null : { kind: 'switch', index: i };
    }
    if (choice === 3) return { kind: 'run' };
    return null;
  }

  /** 2x2 grid of buttons. Returns index or -1 on cancel. */
  private grid(labels: string[], x: number, y: number, bw: number, bh: number, enabled: boolean[], cancel = false, colors?: number[], sub?: string[]): Promise<number> {
    const objs: Phaser.GameObjects.GameObject[] = [];
    let sel = 0;
    const g = this.add.graphics().setDepth(70);
    objs.push(g);
    const draw = () => {
      g.clear();
      labels.forEach((_, i) => {
        const bx = x + (i % 2) * (bw + 10), by = y + Math.floor(i / 2) * (bh + 8);
        const col = colors?.[i] ?? C.panel2;
        g.fillStyle(i === sel ? 0xffa25a : 0x000000, i === sel ? 1 : 0.4).fillRoundedRect(bx - 2, by - 2, bw + 4, bh + 4, 10);
        g.fillStyle(enabled[i] ? col : 0x2a2438, 1).fillRoundedRect(bx, by, bw, bh, 9);
        g.fillStyle(0xffffff, 0.12).fillRoundedRect(bx + 3, by + 3, bw - 6, bh / 2 - 3, 6);
      });
    };
    labels.forEach((l, i) => {
      const bx = x + (i % 2) * (bw + 10), by = y + Math.floor(i / 2) * (bh + 8);
      const t = text(this, bx + bw / 2, by + (sub ? bh / 2 - 9 : bh / 2), l, sub ? 20 : 22, enabled[i] ? C.text : '#6a6080').setOrigin(0.5).setDepth(71);
      objs.push(t);
      if (sub?.[i]) objs.push(text(this, bx + bw / 2, by + bh / 2 + 13, sub[i], 14, '#e8e0f0').setOrigin(0.5).setDepth(71));
      const z = this.add.zone(bx, by, bw, bh).setOrigin(0).setInteractive({ useHandCursor: true }).setDepth(72);
      z.on('pointerdown', () => { if (enabled[i]) { sel = i; pick(i); } });
      objs.push(z);
    });
    draw();
    let pick: (i: number) => void = () => {};
    return new Promise((resolve) => {
      const done = (i: number) => { this.events.off('update', tick); objs.forEach((o) => o.destroy()); resolve(i); };
      pick = (i) => { audio.sfx('confirm'); done(i); };
      const tick = () => {
        const n = labels.length;
        const move = (to: number) => { if (to >= 0 && to < n && to !== sel) { sel = to; audio.sfx('select'); draw(); } };
        if (input.pressed('left') && sel % 2 === 1) move(sel - 1);
        if (input.pressed('right') && sel % 2 === 0) move(sel + 1);
        if (input.pressed('up') && sel >= 2) move(sel - 2);
        if (input.pressed('down') && sel < 2) move(sel + 2);
        if (input.pressed('a')) { input.consume('a'); if (enabled[sel]) pick(sel); else audio.sfx('error'); }
        if (input.pressed('b') && cancel) { input.consume('b'); audio.sfx('cancel'); done(-1); }
      };
      this.events.on('update', tick);
    });
  }

  private async moveMenu(me: Creature): Promise<number> {
    const foe = this.battle.mon(1);
    const labels = [0, 1, 2, 3].map((i) => (me.moves[i] ? getMove(me.moves[i].id).name : '—'));
    const enabled = [0, 1, 2, 3].map((i) => !!me.moves[i] && me.moves[i].pp > 0);
    const colors = [0, 1, 2, 3].map((i) => (me.moves[i] ? TYPE_INFO[getMove(me.moves[i].id).type].dark : C.panel2));
    const sub = [0, 1, 2, 3].map((i) => {
      const s = me.moves[i];
      if (!s) return '';
      const mv = getMove(s.id);
      const eff = mv.category === 'status' ? '' : effectiveness(mv.type, getSpecies(foe.species).types);
      const hint = eff === '' ? 'status' : eff === 0 ? 'no effect' : eff > 1 ? 'super!' : eff < 1 ? 'weak' : '';
      return `${TYPE_INFO[mv.type].name}  ${s.pp}/${s.maxPp}${hint ? '  · ' + hint : ''}`;
    });
    this.msg.setText('');
    return this.grid(labels, 30, H - 116, 445, 50, enabled, true, colors, sub);
  }

  // ---------- event playback ----------
  private async play(events: BattleEvent[]) {
    for (const e of events) await this.playOne(e);
  }

  private spriteFor(side: Side) {
    return this.sprites[side];
  }

  private async playOne(e: BattleEvent) {
    const b = this.battle;
    switch (e.t) {
      case 'text':
        return this.say(e.text);
      case 'switchIn': {
        const c = b.party[e.side][e.index];
        const sp = this.spriteFor(e.side);
        if (e.side === 1) session.markSeen(c.species);
        if (e.side === 1 && this.trainerSprite) {
          const ts = this.trainerSprite;
          this.trainerSprite = undefined;
          this.tweens.add({ targets: ts, x: W + 120, duration: this.ms(400), onComplete: () => ts.destroy() });
        }
        sp.setTexture(`${e.side === 0 ? 'cb' : 'cf'}_${c.species}`).setVisible(true).setAlpha(1).clearTint();
        const baseScale = e.side === 0 ? 3.4 : 2.9;
        sp.setScale(0.2);
        this.burst(sp.x, sp.y - 60, 'sparkle', 0xffd08a, 14);
        this.huds[e.side].set(c);
        this.huds[e.side].root.setVisible(true);
        await new Promise<void>((r) => this.tweens.add({ targets: sp, scale: baseScale, duration: this.ms(320), ease: 'Back.out', onComplete: () => r() }));
        audio.cry(c.species);
        if (e.side === 1 && b.kind === 'wild' && !settings.reducedMotion) this.tweens.add({ targets: sp, y: sp.y - 10, yoyo: true, duration: 150, repeat: 1 });
        return this.wait(250);
      }
      case 'recall': {
        const sp = this.spriteFor(e.side);
        await new Promise<void>((r) => this.tweens.add({ targets: sp, scale: 0.1, alpha: 0, duration: this.ms(260), onComplete: () => r() }));
        sp.setVisible(false);
        return;
      }
      case 'move':
        return this.animateMove(e.side, e.moveType, e.category, e.move);
      case 'damage': {
        const sp = this.spriteFor(e.side);
        const hud = this.huds[e.side];
        if (!e.self || e.amount > 0) {
          audio.sfx(e.eff > 1 ? 'superhit' : e.eff < 1 ? 'weakhit' : 'hit');
          if (!settings.reducedMotion) {
            sp.setTintFill(0xffffff);
            this.time.delayedCall(this.ms(70), () => sp.clearTint());
            this.time.delayedCall(this.ms(140), () => sp.setTintFill(0xffffff));
            this.time.delayedCall(this.ms(210), () => sp.clearTint());
            this.tweens.add({ targets: sp, x: sp.x + (e.side === 1 ? 10 : -10), yoyo: true, repeat: 2, duration: this.ms(50) });
            if (e.crit || e.eff > 1) this.cameras.main.shake(this.ms(220), 0.008);
          }
          this.damageNumber(sp.x, sp.y - (e.side === 0 ? 220 : 180), e.amount, e.crit, e.eff);
        }
        await hud.tweenHp(e.hp, this.ms(Math.min(900, 250 + e.amount * 12)));
        return this.wait(120);
      }
      case 'heal': {
        const sp = this.spriteFor(e.side);
        audio.sfx('heal');
        this.burst(sp.x, sp.y - 80, 'sparkle', 0x9fffb0, 12);
        return this.huds[e.side].tweenHp(e.hp, this.ms(500));
      }
      case 'miss': {
        const target = this.spriteFor(e.side === 0 ? 1 : 0);
        const t = text(this, target.x, target.y - 200, 'MISS', 26, C.dim).setOrigin(0.5).setDepth(80);
        this.tweens.add({ targets: t, y: t.y - 30, alpha: 0, duration: this.ms(700), onComplete: () => t.destroy() });
        return;
      }
      case 'status': {
        const c = b.mon(e.side);
        this.huds[e.side].setStatus(e.status, c.hp);
        if (e.status) {
          const sp = this.spriteFor(e.side);
          this.burst(sp.x, sp.y - 80, 'orb', STATUS_INFO[e.status].color, 16);
          audio.sfx('statdown');
        }
        return this.wait(150);
      }
      case 'stat': {
        const sp = this.spriteFor(e.side);
        audio.sfx(e.delta > 0 ? 'statup' : 'statdown');
        if (!settings.reducedMotion) {
          for (let i = 0; i < 10; i++) {
            const a = this.add.image(sp.x - 60 + Math.random() * 120, sp.y - (e.delta > 0 ? 20 : 200) + Math.random() * 40, 'px').setScale(3, 8).setTint(e.delta > 0 ? 0xffa25a : 0x6aa0ff).setDepth(40).setAlpha(0.9);
            this.tweens.add({ targets: a, y: a.y + (e.delta > 0 ? -150 : 150), alpha: 0, duration: this.ms(600), delay: i * 30, onComplete: () => a.destroy() });
          }
        }
        return this.wait(300);
      }
      case 'faint': {
        const sp = this.spriteFor(e.side);
        const c = b.mon(e.side);
        audio.cry(c.species, 0.6);
        audio.sfx('faint');
        this.huds[e.side].setStatus(null, 0);
        await new Promise<void>((r) => this.tweens.add({ targets: sp, y: sp.y + 60, alpha: 0, duration: this.ms(500), ease: 'Quad.in', onComplete: () => r() }));
        sp.setVisible(false).setY(e.side === 0 ? PLAYER_POS.y : ENEMY_POS.y);
        if (e.side === 0) this.huds[0].root.setVisible(false);
        return;
      }
      case 'throw':
        return this.animateThrow(e.item);
      case 'capture':
        return this.animateCapture(e.shakes, e.success);
      case 'xp': {
        if (e.index !== b.active[0]) return;
        const c = b.party[0][e.index];
        const cur = xpForLevel(c.level), next = xpForLevel(c.level + 1);
        // if the creature levelled up, fill the bar first; levelUp events reset it
        const frac = Math.min(1, (c.xp - cur) / Math.max(1, next - cur));
        audio.sfx('select');
        return this.huds[0].tweenXp(frac > this.huds[0].xpFrac ? frac : 1, this.ms(500));
      }
      case 'levelUp': {
        audio.sfx('levelup');
        if (e.index === b.active[0]) {
          const c = b.party[0][e.index];
          const hud = this.huds[0];
          hud.set(c);
          this.burst(this.sprites[0].x, this.sprites[0].y - 100, 'star', 0xffe070, 14);
        }
        return this.wait(200);
      }
      case 'learned':
        return;
      case 'learnPrompt':
        return this.learnPrompt(b.party[0][e.index], e.move);
      case 'needSwitch':
        return;
      case 'end':
        return this.finish(e.result);
    }
  }

  private damageNumber(x: number, y: number, amount: number, crit: boolean, eff: number) {
    if (amount <= 0) return;
    const color = crit ? '#ffe070' : eff > 1 ? '#ffb46b' : eff < 1 ? '#c8c0d8' : '#ffffff';
    const t = text(this, x + Phaser.Math.Between(-20, 20), y, `${amount}${crit ? '!' : ''}`, crit ? 40 : 32, color, { stroke: '#2a1424', strokeThickness: 6 }).setOrigin(0.5).setDepth(90);
    this.tweens.add({ targets: t, y: y - 50, alpha: { from: 1, to: 0 }, scale: { from: 1.3, to: 1 }, duration: this.ms(900), ease: 'Cubic.out', onComplete: () => t.destroy() });
  }

  private burst(x: number, y: number, tex: string, tint: number, count: number, cfg: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig = {}) {
    if (settings.reducedMotion) count = Math.ceil(count / 4);
    const p = this.add.particles(x, y, tex, {
      speed: { min: 80, max: 260 }, angle: { min: 0, max: 360 }, lifespan: this.ms(650), scale: { start: 2.2, end: 0.4 },
      alpha: { start: 1, end: 0 }, tint, emitting: false, ...cfg,
    }).setDepth(45);
    p.explode(count);
    this.time.delayedCall(1500, () => p.destroy());
  }

  private async animateMove(side: Side, type: MoveType, category: string, moveId: string) {
    void moveId;
    const user = this.spriteFor(side);
    const target = this.spriteFor(side === 0 ? 1 : 0);
    const col = TYPE_INFO[type].color;
    const tx = target.x, ty = target.y - (side === 0 ? 90 : 110);
    if (category === 'status') {
      this.burst(user.x, user.y - 90, 'sparkle', col, 18, { speed: { min: 40, max: 140 } });
      audio.sfx('statup');
      return this.wait(400);
    }
    // lunge
    if (!settings.reducedMotion) {
      const dx = side === 0 ? 40 : -40, dy = side === 0 ? -20 : 15;
      this.tweens.add({ targets: user, x: user.x + dx, y: user.y + dy, yoyo: true, duration: this.ms(category === 'physical' ? 120 : 200), ease: 'Quad.out' });
    }
    await this.wait(category === 'physical' ? 120 : 160);
    const s = settings.reducedMotion ? 0.4 : 1;
    switch (type) {
      case 'ember':
        this.burst(tx, ty + 40, 'flame', col, 26 * s, { speedY: { min: -320, max: -120 }, speedX: { min: -90, max: 90 }, angle: undefined, tint: [0xff5a2a, 0xffa040, 0xffe070] as unknown as number });
        break;
      case 'tide':
        this.burst(tx, ty, 'orb', col, 24 * s, { gravityY: 500, scale: { start: 1.4, end: 0.3 }, tint: [0x3fa7ff, 0x9fd8ff, 0xffffff] as unknown as number });
        break;
      case 'sprout':
        this.burst(tx, ty, 'leaf', col, 22 * s, { rotate: { min: 0, max: 360 }, speed: { min: 120, max: 300 }, tint: [0x6fd64a, 0xb0f070] as unknown as number });
        break;
      case 'gale': {
        if (!settings.reducedMotion) for (let i = 0; i < 3; i++) {
          const r = this.add.image(tx, ty, 'ring').setTint(0xe0ffff).setDepth(45).setScale(0.5).setAlpha(0.9);
          this.tweens.add({ targets: r, scale: 6, alpha: 0, angle: 180, duration: this.ms(600), delay: i * 90, onComplete: () => r.destroy() });
        }
        this.burst(tx, ty, 'px', 0xffffff, 18 * s, { speed: { min: 200, max: 400 } });
        break;
      }
      case 'stone':
        this.burst(tx, ty - 140, 'rock', col, 18 * s, { gravityY: 900, speed: { min: 20, max: 120 }, angle: { min: 60, max: 120 }, lifespan: this.ms(800), scale: { start: 2.5, end: 1.5 } });
        break;
      case 'spark': {
        this.burst(tx, ty, 'bolt', col, 10 * s, { speed: { min: 40, max: 160 }, lifespan: this.ms(350), scale: { start: 2.5, end: 1.5 } });
        if (!settings.reducedMotion) this.cameras.main.flash(this.ms(120), 255, 240, 150);
        break;
      }
      case 'shade':
        this.burst(tx, ty, 'orb', col, 26 * s, { speed: { min: -220, max: -60 }, scale: { start: 0.5, end: 2.2 }, tint: [0x8a5cd6, 0x2a1a4a] as unknown as number });
        break;
      case 'fae':
        this.burst(tx, ty, 'star', col, 24 * s, { rotate: { min: 0, max: 360 }, tint: [0xff8fd0, 0xffffff, 0xffe0f0] as unknown as number });
        break;
      default:
        this.burst(tx, ty, 'star', 0xffffff, 14 * s, { speed: { min: 150, max: 300 }, lifespan: this.ms(300) });
    }
    await this.wait(260);
  }

  private stone?: Phaser.GameObjects.Image;

  private async animateThrow(item: string) {
    audio.sfx('throw');
    const s = this.add.image(PLAYER_POS.x + 40, PLAYER_POS.y - 160, item).setScale(3).setDepth(30);
    this.stone = s;
    const target = this.sprites[1];
    const start = { x: s.x, y: s.y };
    const end = { x: target.x, y: target.y - 90 };
    const o = { t: 0 };
    await new Promise<void>((r) => this.tweens.add({
      targets: o, t: 1, duration: this.ms(520),
      onUpdate: () => { s.setPosition(Phaser.Math.Linear(start.x, end.x, o.t), Phaser.Math.Linear(start.y, end.y, o.t) - Math.sin(o.t * Math.PI) * 140); s.setAngle(o.t * 720); },
      onComplete: () => r(),
    }));
    s.setAngle(0);
    this.burst(end.x, end.y, 'sparkle', 0xffd08a, 16);
    audio.sfx('door');
    target.setTintFill(0xffb46b);
    await new Promise<void>((r) => this.tweens.add({ targets: target, scale: 0.05, x: end.x, y: end.y + 20, duration: this.ms(300), onComplete: () => r() }));
    target.setVisible(false);
    await new Promise<void>((r) => this.tweens.add({ targets: s, y: ENEMY_POS.y - 20, duration: this.ms(300), ease: 'Bounce.out', onComplete: () => r() }));
  }

  private async animateCapture(shakes: number, success: boolean) {
    const s = this.stone!;
    for (let i = 0; i < shakes; i++) {
      await this.wait(350);
      audio.sfx('shake');
      await new Promise<void>((r) => this.tweens.add({ targets: s, angle: { from: -22, to: 22 }, yoyo: true, duration: this.ms(130), repeat: 0, onComplete: () => { s.setAngle(0); r(); } }));
    }
    await this.wait(400);
    const target = this.sprites[1];
    if (success) {
      audio.sfx('caught');
      this.burst(s.x, s.y, 'star', 0xffe070, 24);
      s.setTint(0xb0a0c0);
      await this.wait(800);
      return;
    }
    // breaks free
    audio.sfx('door');
    s.destroy();
    this.stone = undefined;
    target.clearTint().setVisible(true).setPosition(ENEMY_POS.x, ENEMY_POS.y);
    this.burst(ENEMY_POS.x, ENEMY_POS.y - 60, 'sparkle', 0xffffff, 16);
    await new Promise<void>((r) => this.tweens.add({ targets: target, scale: 2.9, duration: this.ms(250), ease: 'Back.out', onComplete: () => r() }));
  }

  private async learnPrompt(c: Creature, moveId: string) {
    const mv = getMove(moveId);
    const nm = displayName(c);
    await this.say(`${nm} wants to learn ${mv.name}. But ${nm} already knows four moves.`);
    const items = [...c.moves.map((m) => ({ label: getMove(m.id).name, right: `${TYPE_INFO[getMove(m.id).type].name} · ${getMove(m.id).power || '—'}` })), { label: `Don't learn ${mv.name}`, right: '' }];
    this.msg.setText(`Forget which move for ${mv.name}? (${TYPE_INFO[mv.type].name} · power ${mv.power || '—'})`);
    const menu = new ListMenu(this, W / 2 - 260, 40, 520, items, { title: `Replace a move with ${mv.name}`, depth: 200 });
    const i = await menu.open();
    menu.destroy();
    if (i < 0 || i === 4) return this.say(`${nm} did not learn ${mv.name}.`);
    const old = getMove(c.moves[i].id).name;
    learnMove(c, moveId, i);
    audio.sfx('levelup');
    await this.say(`1, 2... Poof! ${nm} forgot ${old} and learned ${mv.name}!`);
  }

  private async finish(result: BattleResult) {
    if (this.ending) return;
    this.ending = true;
    const st = session.state;
    const d = this.data0;
    if (result === 'win') {
      st.stats.battlesWon++;
      audio.playMusic('victory');
      if (d.kind === 'trainer' && d.trainerId) {
        const tr = TRAINERS[d.trainerId];
        const sprite = this.add.sprite(W + 100, ENEMY_POS.y, `char_${tr.look}`, charFrame('down', 0)).setOrigin(0.5, 1).setScale(8).setDepth(18);
        this.tweens.add({ targets: sprite, x: ENEMY_POS.x, duration: this.ms(400) });
        for (const line of tr.defeat) await this.say(line);
        const last = d.enemy[d.enemy.length - 1];
        const money = tr.reward * last.level;
        st.money += money;
        await this.say(`${st.playerName} got ${money} embers for winning!`);
      }
    }
    if (result === 'caught' && this.battle.caught) {
      const c = this.battle.caught;
      const isNew = !st.caught.includes(c.species);
      c.status = c.status === 'drowsy' ? null : c.status;
      const where = session.addCreature(c);
      st.stats.bonded++;
      audio.playMusic('victory');
      if (isNew) await this.say(`${displayName(c)}'s data was added to the Wildlog!`);
      if (where === 'storage') await this.say(`Your team is full, so ${displayName(c)} was sent to storage.`);
    }
    session.tidyBag();
    // clear battle-only state
    for (const c of st.party) if (c.status === 'dazed') c.status = null;
    await this.wait(200);
    this.cameras.main.fadeOut(this.ms(350));
    await new Promise<void>((r) => this.cameras.main.once('camerafadeoutcomplete', () => r()));
    d.onEnd(result);
  }
}
