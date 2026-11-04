import Phaser from 'phaser';
import { audio } from '../audio/audio';
import { charFrame } from '../art/characters';
import { LEGEND } from '../art/tiles';
import { mapLayer, TILE } from '../art/tileset';
import { TILESET } from '../art/textures';
import { getItem } from '../data/items';
import { getMap, type MapDef, type NpcDef } from '../data/maps';
import { TRAINERS } from '../data/trainers';
import type { Dir } from '../engine/save';
import { input } from '../game/input';
import { runScript, trainerEncounter } from '../game/scripts';
import { session } from '../game/session';
import { settings } from '../game/settings';
import type { BattleResult } from '../engine/battle';
import type { BattleSceneData } from './BattleScene';
import type { UIScene } from './UIScene';

const DX: Record<Dir, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const OPP: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' };
const WALK_MS = 220;
const RUN_MS = 125;
const Y_OFF = -4;

export interface NpcRt {
  def: NpcDef;
  x: number;
  y: number;
  dir: Dir;
  sprite: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Image;
  home: { x: number; y: number };
  nextWander: number;
  hidden: boolean;
  moving: boolean;
}

export class OverworldScene extends Phaser.Scene {
  map!: MapDef;
  ui!: UIScene;
  player!: Phaser.GameObjects.Sprite;
  private playerShadow!: Phaser.GameObjects.Image;
  private grassOver!: Phaser.GameObjects.Image;
  npcs: NpcRt[] = [];
  private objects = new Map<string, Phaser.GameObjects.Sprite>();
  private itemSprites = new Map<string, Phaser.GameObjects.Image>();
  private layer!: Phaser.Tilemaps.TilemapLayer;
  private animCells: { x: number; y: number; frames: number[] }[] = [];
  private animFrame = 0;
  private animTimer = 0;
  /** Player tile + movement state */
  px = 0;
  py = 0;
  dir: Dir = 'down';
  private moving = false;
  private moveFrom = { x: 0, y: 0 };
  private moveTo = { x: 0, y: 0 };
  private moveT = 0;
  private moveDur = WALK_MS;
  private jumping = false;
  private stepParity = 0;
  private turnHold = 0;
  busy = false;
  private stepsSinceBattle = 0;
  private hiddenTwinkle = 0;
  private transitioning = false;

  constructor() {
    super('Overworld');
  }

  create() {
    const st = session.state;
    this.map = getMap(st.map);
    this.npcs = [];
    this.objects.clear();
    this.itemSprites.clear();
    this.busy = false;
    this.moving = false;
    this.transitioning = false;
    this.px = st.x;
    this.py = st.y;
    this.dir = st.dir;

    if (!this.scene.isActive('UI')) this.scene.launch('UI');
    this.ui = this.scene.get('UI') as UIScene;
    this.scene.bringToTop('UI');
    this.scene.bringToTop('Touch');

    // tilemap
    const { base, anim } = mapLayer(this.map, TILESET);
    this.animCells = anim;
    const tm = this.make.tilemap({ data: base, tileWidth: TILE, tileHeight: TILE });
    const ts = tm.addTilesetImage('tiles', 'tiles', TILE, TILE, 0, 0)!;
    this.layer = tm.createLayer(0, ts, 0, 0)!;
    this.layer.setDepth(0);

    // items
    for (const it of this.map.items) {
      if (it.hidden || session.flag(`item_${it.id}`)) continue;
      const img = this.add.image(it.x * TILE + 8, it.y * TILE + 9, 'item_ball').setDepth(it.y * 10 + 2);
      this.itemSprites.set(it.id, img);
    }
    // objects
    for (const o of this.map.objects ?? []) {
      const key = o.kind === 'lantern' ? 'lantern' : 'thorns';
      const sp = this.add.sprite(o.x * TILE, o.y * TILE, key, o.kind === 'lantern' ? 0 : undefined).setOrigin(0).setDepth(o.y * 10 + 3);
      this.objects.set(o.id, sp);
    }
    this.refreshObjects();

    // npcs
    for (const def of this.map.npcs) {
      const sprite = this.add.sprite(def.x * TILE, def.y * TILE + Y_OFF, `char_${def.look}`, charFrame(def.dir, 0)).setOrigin(0);
      const shadow = this.add.image(def.x * TILE + 8, def.y * TILE + 14, 'shadow').setAlpha(0.25);
      this.npcs.push({ def, x: def.x, y: def.y, dir: def.dir, sprite, shadow, home: { x: def.x, y: def.y }, nextWander: this.time.now + 2000 + Math.random() * 3000, hidden: false, moving: false });
    }
    this.refreshNpcs();

    // player
    this.playerShadow = this.add.image(0, 0, 'shadow').setAlpha(0.3);
    this.player = this.add.sprite(this.px * TILE, this.py * TILE + Y_OFF, 'char_player', charFrame(this.dir, 0)).setOrigin(0);
    this.grassOver = this.add.image(0, 0, 'grass_over').setOrigin(0).setVisible(false);
    this.syncPlayer();

    // camera
    const cam = this.cameras.main;
    cam.setZoom(3);
    const mw = this.map.rows[0].length * TILE, mh = this.map.rows.length * TILE;
    const vw = cam.width / 3, vh = cam.height / 3;
    const bx = mw < vw ? (mw - vw) / 2 : 0, by = mh < vh ? (mh - vh) / 2 : 0;
    cam.setBounds(bx, by, Math.max(mw, vw), Math.max(mh, vh));
    cam.startFollow(this.player, true, settings.reducedMotion ? 1 : 0.14, settings.reducedMotion ? 1 : 0.14, -8, -8);
    cam.setBackgroundColor(this.map.kind === 'cave' ? '#0a0810' : this.map.kind === 'interior' ? '#120e18' : '#1a3a1a');
    cam.fadeIn(220);

    this.ui.enterMap(this.map);
    audio.playMusic(this.map.music);
    audio.setAmbience(this.map.weather === 'rain' ? 'rain' : null);

    this.events.once('shutdown', () => this.ui.dialog?.hide());
    this.events.on('wake', () => {
      input.clear();
      this.ui.enterMap(this.map, false);
      audio.playMusic(this.map.music);
      audio.setAmbience(this.map.weather === 'rain' ? 'rain' : null);
    });

    // A scripted arrival (e.g. new game intro) can be queued by flags.
    if (!session.flag('introDone')) void this.run('intro');
  }

  // ---------- helpers ----------
  tileAt(x: number, y: number): string | undefined {
    return this.map.rows[y]?.[x];
  }

  private syncPlayer() {
    const x = this.player.x, y = this.player.y - Y_OFF;
    this.player.setDepth(Math.floor((y + 15) / TILE) * 10 + 5);
    this.playerShadow.setPosition(x + 8, y + 14).setDepth(this.player.depth - 1);
    const t = this.tileAt(Math.round(x / TILE), Math.round(y / TILE));
    const inGrass = t === ',' && !this.jumping;
    this.grassOver.setVisible(inGrass).setPosition(Math.round(x / TILE) * TILE, Math.round(y / TILE) * TILE).setDepth(this.player.depth + 1);
  }

  npcAt(x: number, y: number): NpcRt | undefined {
    return this.npcs.find((n) => !n.hidden && n.x === x && n.y === y);
  }

  npc(id: string): NpcRt | undefined {
    return this.npcs.find((n) => n.def.id === id);
  }

  private objectBlocks(x: number, y: number): boolean {
    for (const o of this.map.objects ?? []) {
      if (o.x !== x || o.y !== y) continue;
      if (o.kind === 'lantern') return true;
      if (o.kind === 'thorns' && !session.flag('ww_thorns_gone')) return true;
    }
    return false;
  }

  isBlocked(x: number, y: number, forNpc = false): boolean {
    const t = this.tileAt(x, y);
    if (t === undefined) return true;
    if (LEGEND[t].solid) return true;
    if (this.npcAt(x, y)) return true;
    if (!forNpc && this.px === x && this.py === y) return false;
    if (forNpc && this.px === x && this.py === y) return true;
    if (this.objectBlocks(x, y)) return true;
    if ([...this.itemSprites.keys()].some((id) => { const it = this.map.items.find((i) => i.id === id)!; return it.x === x && it.y === y; })) return true;
    if (forNpc && (t === ',' || t === 'D' || t === 'M')) return true;
    return false;
  }

  refreshNpcs() {
    for (const n of this.npcs) {
      const d = n.def;
      const hide = (d.showIf && !session.flag(d.showIf)) || (d.hideIf && session.flag(d.hideIf));
      n.hidden = !!hide;
      n.sprite.setVisible(!hide);
      n.shadow.setVisible(!hide);
      this.placeNpc(n);
    }
  }

  placeNpc(n: NpcRt) {
    n.sprite.setPosition(n.x * TILE, n.y * TILE + Y_OFF).setDepth(n.y * 10 + 5).setFrame(charFrame(n.dir, 0));
    n.shadow.setPosition(n.x * TILE + 8, n.y * TILE + 14).setDepth(n.y * 10 + 4);
  }

  refreshObjects() {
    for (const o of this.map.objects ?? []) {
      const sp = this.objects.get(o.id);
      if (!sp) continue;
      if (o.kind === 'lantern') sp.setFrame(session.flag(`lit_${o.id}`) ? 1 : 0);
      if (o.kind === 'thorns') sp.setVisible(!session.flag('ww_thorns_gone'));
    }
  }

  removeItemSprite(id: string) {
    this.itemSprites.get(id)?.destroy();
    this.itemSprites.delete(id);
  }

  setPlayerFacing(d: Dir) {
    this.dir = d;
    this.player.setFrame(charFrame(d, 0));
  }

  // ---------- main loop ----------
  update(time: number, dt: number) {
    session.state.playTimeMs += dt;
    session.state.clock = (session.state.clock + dt / 1000) % 1440;
    this.animTimer += dt;
    if (this.animTimer > 450) {
      this.animTimer = 0;
      this.animFrame ^= 1;
      for (const c of this.animCells) this.layer.putTileAt(c.frames[this.animFrame % c.frames.length], c.x, c.y);
    }
    this.hiddenTwinkle += dt;
    if (this.hiddenTwinkle > 3800) {
      this.hiddenTwinkle = 0;
      this.twinkleHidden();
    }
    this.updateNpcs(time);
    if (this.moving) {
      this.advanceMove(dt);
      return;
    }
    if (this.busy || this.transitioning) return;

    if (input.pressed('menu')) {
      input.consume('menu');
      void this.withBusy(() => this.ui.pauseMenu());
      return;
    }
    if (input.pressed('a')) {
      input.consume('a');
      void this.interact();
      return;
    }
    const d = input.heldDir();
    if (!d) {
      this.turnHold = 0;
      return;
    }
    if (d !== this.dir) {
      this.setPlayerFacing(d);
      this.turnHold = 0;
      return;
    }
    this.turnHold += dt;
    if (this.turnHold < 60 && !input.isDown('run')) return;
    this.tryStep(d);
  }

  private twinkleHidden() {
    for (const it of this.map.items) {
      if (!it.hidden || session.flag(`item_${it.id}`)) continue;
      const s = this.add.image(it.x * TILE + 8, it.y * TILE + 6, 'sparkle').setDepth(9999).setAlpha(0);
      this.tweens.add({ targets: s, alpha: 0.9, scale: { from: 0.4, to: 1 }, yoyo: true, duration: 380, onComplete: () => s.destroy() });
    }
  }

  private updateNpcs(time: number) {
    if (this.busy) return;
    for (const n of this.npcs) {
      if (!n.def.wander || n.hidden || n.moving || time < n.nextWander) continue;
      n.nextWander = time + 1800 + Math.random() * 3500;
      const d = Phaser.Math.RND.pick<Dir>(['up', 'down', 'left', 'right']);
      const [dx, dy] = DX[d];
      const nx = n.x + dx, ny = n.y + dy;
      n.dir = d;
      n.sprite.setFrame(charFrame(d, 0));
      if (Math.abs(nx - n.home.x) > 2 || Math.abs(ny - n.home.y) > 2 || this.isBlocked(nx, ny, true)) continue;
      void this.walkNpc(n, d);
    }
  }

  walkNpc(n: NpcRt, d: Dir, ms = 260): Promise<void> {
    const [dx, dy] = DX[d];
    n.dir = d;
    n.x += dx;
    n.y += dy;
    n.moving = true;
    return new Promise((resolve) => {
      let f = 1;
      const anim = this.time.addEvent({ delay: ms / 2, repeat: 1, callback: () => n.sprite.setFrame(charFrame(d, (f++ % 2) + 1)) });
      n.sprite.setFrame(charFrame(d, 1));
      this.tweens.add({
        targets: n.sprite, x: n.x * TILE, y: n.y * TILE + Y_OFF, duration: ms,
        onUpdate: () => {
          n.shadow.setPosition(n.sprite.x + 8, n.sprite.y - Y_OFF + 14);
          n.sprite.setDepth(Math.floor((n.sprite.y - Y_OFF + 15) / TILE) * 10 + 5);
        },
        onComplete: () => {
          anim.remove();
          n.moving = false;
          this.placeNpc(n);
          resolve();
        },
      });
    });
  }

  get isMoving() {
    return this.moving || this.transitioning;
  }

  /** Used by automated tests: face a direction and take one step. */
  debugStep(d: Dir): boolean {
    if (this.moving || this.busy || this.transitioning) return false;
    this.setPlayerFacing(d);
    this.tryStep(d);
    return true;
  }

  private tryStep(d: Dir) {
    const [dx, dy] = DX[d];
    const nx = this.px + dx, ny = this.py + dy;
    const w = this.map.rows[0].length, h = this.map.rows.length;
    // map edges -> connections
    if (nx < 0 || ny < 0 || nx >= w || ny >= h) {
      const side = nx < 0 ? 'west' : nx >= w ? 'east' : ny < 0 ? 'north' : 'south';
      const c = this.map.connections?.[side];
      if (!c) return this.bump();
      const t = getMap(c.map);
      const tx = side === 'east' ? 0 : side === 'west' ? t.rows[0].length - 1 : this.px + c.offset;
      const ty = side === 'north' ? t.rows.length - 1 : side === 'south' ? 0 : this.py + c.offset;
      this.changeMap(c.map, tx, ty, d, false);
      return;
    }
    const t = this.tileAt(nx, ny)!;
    if (LEGEND[t].ledge) {
      if (d === 'down' && !this.isBlocked(nx, ny + 1)) return this.startMove(d, 2, true);
      return this.bump();
    }
    if (this.isBlocked(nx, ny)) return this.bump();
    this.startMove(d, 1, false);
  }

  private lastBump = 0;
  private bump() {
    if (this.time.now - this.lastBump > 350) {
      audio.sfx('bump');
      this.lastBump = this.time.now;
    }
    this.player.setFrame(charFrame(this.dir, 0));
  }

  private startMove(d: Dir, tiles: number, jump: boolean) {
    const [dx, dy] = DX[d];
    this.moving = true;
    this.jumping = jump;
    this.moveFrom = { x: this.px, y: this.py };
    this.moveTo = { x: this.px + dx * tiles, y: this.py + dy * tiles };
    this.moveT = 0;
    this.moveDur = jump ? 380 : input.isDown('run') ? RUN_MS : WALK_MS;
    this.stepParity ^= 1;
    if (jump) audio.sfx('ledge');
  }

  private advanceMove(dt: number) {
    this.moveT += dt;
    const k = Math.min(1, this.moveT / this.moveDur);
    const x = Phaser.Math.Linear(this.moveFrom.x, this.moveTo.x, k) * TILE;
    let y = Phaser.Math.Linear(this.moveFrom.y, this.moveTo.y, k) * TILE + Y_OFF;
    if (this.jumping) y -= Math.sin(k * Math.PI) * 10;
    this.player.setPosition(x, y);
    const walkFrame = k < 0.5 ? 1 + this.stepParity : 0;
    this.player.setFrame(charFrame(this.dir, this.jumping ? 0 : walkFrame));
    this.syncPlayer();
    if (this.jumping) this.playerShadow.setPosition(x + 8, Phaser.Math.Linear(this.moveFrom.y, this.moveTo.y, k) * TILE + 14);
    if (k < 1) return;
    this.moving = false;
    this.jumping = false;
    this.px = this.moveTo.x;
    this.py = this.moveTo.y;
    this.player.setPosition(this.px * TILE, this.py * TILE + Y_OFF);
    this.syncPlayer();
    const st = session.state;
    st.x = this.px;
    st.y = this.py;
    st.dir = this.dir;
    st.stats.steps++;
    this.stepsSinceBattle++;
    this.onStepEnd();
  }

  private onStepEnd() {
    const t = this.tileAt(this.px, this.py)!;
    if (t === ',') this.rustle();
    // warps
    const warp = this.map.warps.find((w) => w.x === this.px && w.y === this.py);
    if (warp) {
      audio.sfx('door');
      this.changeMap(warp.to, warp.tx, warp.ty, warp.dir ?? this.dir, true);
      return;
    }
    // triggers
    for (const tr of this.map.triggers ?? []) {
      if (this.px >= tr.x && this.px < tr.x + (tr.w ?? 1) && this.py >= tr.y && this.py < tr.y + (tr.h ?? 1)) {
        void this.run(tr.script);
        return;
      }
    }
    // trainers
    if (this.checkTrainers()) return;
    // wild encounters
    const enc = this.map.encounters;
    if (enc && LEGEND[t].encounter && this.stepsSinceBattle > 2 && session.state.party.some((c) => c.hp > 0)) {
      if (session.rng.chance(enc.rate)) {
        const total = enc.table.reduce((a, e) => a + e.weight, 0);
        let r = session.rng.next() * total;
        const e = enc.table.find((en) => (r -= en.weight) < 0) ?? enc.table[0];
        const lvl = session.rng.int(e.min, e.max);
        void this.withBusy(() => this.wildBattle(e.species, lvl));
      }
    }
  }

  private rustle() {
    if (settings.reducedMotion) return;
    for (let i = 0; i < 4; i++) {
      const p = this.add.image(this.px * TILE + 4 + Math.random() * 8, this.py * TILE + 10, 'leaf').setTint(0x6cc757).setScale(0.6).setDepth(this.player.depth + 2);
      this.tweens.add({ targets: p, x: p.x + (Math.random() - 0.5) * 16, y: p.y - 6 - Math.random() * 6, alpha: 0, duration: 380, onComplete: () => p.destroy() });
    }
  }

  private checkTrainers(): boolean {
    for (const n of this.npcs) {
      const tid = n.def.trainer;
      if (!tid || n.hidden || session.state.defeatedTrainers.includes(n.def.id)) continue;
      const [dx, dy] = DX[n.dir];
      const range = n.def.sight ?? 3;
      for (let i = 1; i <= range; i++) {
        const x = n.x + dx * i, y = n.y + dy * i;
        if (x === this.px && y === this.py) {
          void this.withBusy(() => trainerEncounter(this, n, tid));
          return true;
        }
        const t = this.tileAt(x, y);
        if (t === undefined || LEGEND[t].solid || this.npcAt(x, y)) break;
      }
    }
    return false;
  }

  /** Runs async work with player control disabled. */
  async withBusy<T>(fn: () => Promise<T>): Promise<T> {
    this.busy = true;
    try {
      return await fn();
    } finally {
      this.busy = false;
      input.clear();
    }
  }

  run(script: string, npc?: NpcRt) {
    return this.withBusy(() => runScript(this, script, npc));
  }

  private async interact() {
    const [dx, dy] = DX[this.dir];
    let fx = this.px + dx, fy = this.py + dy;
    let t = this.tileAt(fx, fy);
    if (t === 'C') { fx += dx; fy += dy; t = this.tileAt(fx, fy); } // talk across counters
    const n = this.npcAt(fx, fy);
    if (n) {
      if (!n.moving) {
        n.dir = OPP[this.dir];
        n.sprite.setFrame(charFrame(n.dir, 0));
      }
      const d = n.def;
      if (d.trainer && !session.state.defeatedTrainers.includes(d.id)) return this.withBusy(() => trainerEncounter(this, n, d.trainer!));
      if (d.trainer) {
        const tr = TRAINERS[d.trainer];
        return this.withBusy(() => this.ui.dialog.say(tr.after ?? tr.defeat, tr.name));
      }
      if (d.script) return this.run(d.script, n);
      if (d.text) return this.withBusy(() => this.ui.dialog.say(d.text!));
      return;
    }
    // items
    const it = this.map.items.find((i) => i.x === fx && i.y === fy && !session.flag(`item_${i.id}`));
    if (it) {
      return this.withBusy(async () => {
        session.setFlag(`item_${it.id}`);
        this.removeItemSprite(it.id);
        session.giveItem(it.item, it.qty);
        audio.sfx('item');
        const name = getItem(it.item).name;
        await this.ui.dialog.say(`${session.state.playerName} found ${it.qty > 1 ? `${it.qty} ${name}s` : `a ${name}`}!`);
        if (it.item === 'glow_lantern') await this.ui.dialog.say('An old lantern with a moth etched on the glass. Someone must be missing it...');
      });
    }
    // objects
    const obj = (this.map.objects ?? []).find((o) => o.x === fx && o.y === fy);
    if (obj?.kind === 'lantern') return this.run('lantern:' + obj.id);
    if (obj?.kind === 'thorns' && !session.flag('ww_thorns_gone')) return this.withBusy(() => this.ui.dialog.say(['A wall of thorny brambles, humming with an eerie light.', 'Maybe the forest lanterns have something to do with it...']));
    // signs and terminals
    const sign = this.map.signs.find((s) => s.x === fx && s.y === fy);
    if (t === 'p' && this.map.id.startsWith('hearth')) return this.withBusy(() => this.ui.storageMenu());
    if (t === 'h') return this.withBusy(() => this.ui.dialog.say('The Hearth\'s healing brazier glows warmly.'));
    if (sign && sign.text.length) return this.withBusy(() => this.ui.dialog.say(sign.text));
  }

  /** Change map with a fade. */
  changeMap(mapId: string, x: number, y: number, dir: Dir, autosave: boolean) {
    if (this.transitioning) return;
    this.transitioning = true;
    const st = session.state;
    st.map = mapId;
    st.x = x;
    st.y = y;
    st.dir = dir;
    if (autosave) session.autosave();
    this.cameras.main.fadeOut(180, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.restart());
  }

  // ---------- battles ----------
  async wildBattle(species: string, level: number): Promise<BattleResult> {
    const wild = session.makeCreature(species, level);
    session.state.stats.wildEncounters++;
    return this.battle({ kind: 'wild', enemy: [wild] });
  }

  /** Plays the encounter transition and runs a battle. */
  async battle(data: Omit<BattleSceneData, 'onEnd'>): Promise<BattleResult> {
    this.stepsSinceBattle = 0;
    audio.sfx('encounter');
    audio.playMusic(data.music ?? (data.kind === 'wild' ? 'battle' : 'trainer'));
    await this.ui.battleTransition();
    const result = await new Promise<BattleResult>((resolve) => {
      this.scene.sleep('UI');
      this.scene.launch('Battle', { ...data, onEnd: (r: BattleResult) => resolve(r) } satisfies BattleSceneData);
      this.scene.sleep();
      this.scene.bringToTop('Touch');
    });
    this.scene.stop('Battle');
    this.scene.wake('UI');
    this.scene.wake();
    this.ui.clearTransition();
    if (result === 'lose') {
      await this.blackout();
    } else {
      await this.ui.runEvolutions();
      session.autosave();
    }
    return result;
  }

  private async blackout() {
    const st = session.state;
    const lost = Math.floor(st.money / 2);
    st.money -= lost;
    session.healParty();
    await this.ui.dialog.say([`${st.playerName} has no healthy creatures left!`, `${st.playerName} dropped ${lost} embers and hurried back to safety...`]);
    st.map = st.lastHearth.map;
    st.x = st.lastHearth.x;
    st.y = st.lastHearth.y;
    st.dir = 'down';
    session.autosave();
    this.scene.restart();
  }
}
