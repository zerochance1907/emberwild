import Phaser from 'phaser';
import { audio } from '../audio/audio';
import { charFrame } from '../art/characters';
import { LEGEND } from '../art/tiles';
import { mapLayer, TILE } from '../art/tileset';
import { TILESET } from '../art/textures';
import { getItem } from '../data/items';
import { getMap, type EncounterEntry, type MapDef, type NpcDef } from '../data/maps';
import { daycareStep } from '../engine/daycare';
import { moveRoamer, ROAM_ENCOUNTER, ROAM_FLEE, roamerHere } from '../engine/roamer';
import { flooded } from '../engine/traverse';
import { createCreature, displayName } from '../engine/creature';
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
  private tideCells: { x: number; y: number; frames: number[] }[] = [];
  private board!: Phaser.GameObjects.Image;
  /** Being carried along by a wind gust or a water current. */
  private sliding = false;
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
    this.animCells = anim.filter((c) => !LEGEND[this.map.rows[c.y][c.x]].tide);
    this.tideCells = anim.filter((c) => LEGEND[this.map.rows[c.y][c.x]].tide);
    this.sliding = false;
    const tm = this.make.tilemap({ data: base, tileWidth: TILE, tileHeight: TILE });
    const ts = tm.addTilesetImage('tiles', 'tiles', TILE, TILE, 0, 0)!;
    this.layer = tm.createLayer(0, ts, 0, 0)!;
    this.layer.setDepth(0);
    this.refreshTide();
    // Can't still be on the Driftboard if we arrived on land.
    if (st.surfing && !LEGEND[this.tileAt(this.px, this.py) ?? '.']?.water) st.surfing = false;

    // items
    for (const it of this.map.items) {
      if (it.hidden || session.flag(`item_${it.id}`)) continue;
      const img = this.add.image(it.x * TILE + 8, it.y * TILE + 9, 'item_ball').setDepth(it.y * 10 + 2);
      this.itemSprites.set(it.id, img);
    }
    // objects
    for (const o of this.map.objects ?? []) {
      const framed = o.kind === 'lantern' || o.kind === 'valve' || o.kind === 'lens';
      const sp = this.add.sprite(o.x * TILE, o.y * TILE, o.kind, framed ? 0 : undefined).setOrigin(0).setDepth(o.y * 10 + 3);
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
    this.board = this.add.image(0, 0, 'driftboard').setOrigin(0).setVisible(false);
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
    cam.setBackgroundColor(this.map.kind === 'cave' ? '#0a0810' : this.map.kind === 'interior' || this.map.kind === 'ruins' ? '#120e18' : this.map.kind === 'ridge' ? '#2a2a3a' : '#1a3a1a');
    cam.fadeIn(220);

    this.ui.enterMap(this.map);
    audio.playMusic(this.map.music);
    audio.setAmbience(this.map.weather ?? null);

    this.events.once('shutdown', () => this.ui.dialog?.hide());
    this.events.on('wake', () => {
      input.clear();
      this.ui.enterMap(this.map, false);
      audio.playMusic(this.map.music);
      audio.setAmbience(this.map.weather ?? null);
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
    const surf = session.state.surfing;
    this.playerShadow.setPosition(x + 8, y + 14).setDepth(this.player.depth - 1).setVisible(!surf);
    this.board.setVisible(surf).setPosition(x, y + 3 + Math.sin(this.time.now / 260)).setDepth(this.player.depth - 1);
    const t = this.tileAt(Math.round(x / TILE), Math.round(y / TILE));
    const inGrass = (t === ',' || t === 'r') && !this.jumping;
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
      if (o.kind !== 'thorns') return true;
      if (o.kind === 'thorns' && !session.flag('ww_thorns_gone')) return true;
    }
    return false;
  }

  isBlocked(x: number, y: number, forNpc = false): boolean {
    const t = this.tileAt(x, y);
    if (t === undefined) return true;
    const spec = LEGEND[t];
    const surfable = spec.water && session.state.surfing && !forNpc;
    if (spec.solid && !surfable) return true;
    if (spec.tide && flooded(t, this.lowTide)) return true;
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

  /** Low tide in this map (toggled by valves). */
  get lowTide(): boolean {
    return session.flag(`lowtide_${this.map.id}`);
  }

  /** Swaps the tide pool tiles to match the current tide. */
  refreshTide() {
    const f = this.lowTide ? 1 : 0;
    for (const c of this.tideCells) this.layer.putTileAt(c.frames[f], c.x, c.y);
  }

  refreshObjects() {
    for (const o of this.map.objects ?? []) {
      const sp = this.objects.get(o.id);
      if (!sp) continue;
      if (o.kind === 'valve') sp.setFrame(this.lowTide ? 1 : 0);
      if (o.kind === 'lens') sp.setFrame(session.flag('lensOff') ? 1 : 0);
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
    if (session.state.surfing && !this.moving) this.syncPlayer();
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

  private startMove(d: Dir, tiles: number, jump: boolean, dur?: number) {
    const [dx, dy] = DX[d];
    this.moving = true;
    this.jumping = jump;
    this.moveFrom = { x: this.px, y: this.py };
    this.moveTo = { x: this.px + dx * tiles, y: this.py + dy * tiles };
    this.moveT = 0;
    this.moveDur = dur ?? (jump ? 380 : input.isDown('run') || session.state.surfing ? RUN_MS : WALK_MS);
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
    this.player.setFrame(charFrame(this.dir, this.jumping || this.sliding || session.state.surfing ? 0 : walkFrame));
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
    const st = session.state;
    // gusts and currents carry the player along
    const push = LEGEND[t].push;
    if (push) {
      const [dx, dy] = DX[push];
      if (!this.isBlocked(this.px + dx, this.py + dy)) {
        if (!this.sliding) audio.sfx(LEGEND[t].family === 'gust' ? 'gust' : 'splash');
        this.sliding = true;
        this.startMove(push, 1, false, 95);
        return;
      }
    }
    this.sliding = false;
    // hop off the Driftboard onto land
    if (st.surfing && !LEGEND[t].water) {
      st.surfing = false;
      audio.sfx('splash');
      this.syncPlayer();
    }
    this.daycareTick();
    if (t === ',' || t === 'r') this.rustle();
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
    const onWater = st.surfing && LEGEND[t].water;
    const enc = onWater ? this.map.surf : LEGEND[t].encounter ? this.map.encounters : undefined;
    if (enc && this.stepsSinceBattle > 2 && st.party.some((c) => c.hp > 0)) {
      if (session.rng.chance(enc.rate)) {
        if (!onWater && roamerHere(st.roamer, this.map.id) && session.rng.chance(ROAM_ENCOUNTER)) {
          void this.withBusy(() => this.roamerBattle());
          return;
        }
        const e = this.pickEncounter(enc.table);
        void this.withBusy(() => this.wildBattle(e.species, session.rng.int(e.min, e.max), onWater));
      }
    }
  }

  pickEncounter(table: EncounterEntry[]): EncounterEntry {
    const total = table.reduce((a, e) => a + e.weight, 0);
    let r = session.rng.next() * total;
    return table.find((en) => (r -= en.weight) < 0) ?? table[0];
  }

  /** Day-care creatures train and carried eggs hatch as you walk. */
  private daycareTick() {
    const st = session.state;
    if (!st.daycare.mons.length && !st.eggs.length) return;
    const r = daycareStep(st.daycare, st.eggs, session.rng);
    if (!r.hatched?.length) return;
    void this.withBusy(async () => {
      for (const c of r.hatched!) {
        await this.ui.dialog.say('Oh? Your egg is wobbling...');
        await this.ui.flash(0xffffff, 500);
        audio.cry(c.species);
        const where = session.addCreature(c);
        c.caughtAt = 'egg';
        await this.ui.dialog.say(`It hatched into a ${displayName(c)}!${where === 'storage' ? ' It was sent to storage.' : ''}`);
      }
      session.autosave();
    });
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
        if (t === undefined || (LEGEND[t].solid && !LEGEND[t].water) || this.npcAt(x, y)) break;
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
    if (obj?.kind === 'valve') return this.run('valve');
    if (obj?.kind === 'lens') return this.run('lens');
    // water: fish or paddle out
    if (t !== undefined && LEGEND[t].water && !this.map.noSurf) return this.withBusy(() => this.waterAction(fx, fy));
    if (obj?.kind === 'thorns' && !session.flag('ww_thorns_gone')) return this.withBusy(() => this.ui.dialog.say(['A wall of thorny brambles, humming with an eerie light.', 'Maybe the forest lanterns have something to do with it...']));
    // signs and terminals
    const sign = this.map.signs.find((s) => s.x === fx && s.y === fy);
    if (t === 'p' && this.map.id.startsWith('hearth')) return this.withBusy(() => this.ui.storageMenu());
    if (t === 'h') return this.withBusy(() => this.ui.dialog.say('The Hearth\'s healing brazier glows warmly.'));
    if (sign && sign.text.length) return this.withBusy(() => this.ui.dialog.say(sign.text));
  }

  /** Facing water: cast a Lure Reed and/or ride the Driftboard. */
  private async waterAction(fx: number, fy: number) {
    const st = session.state;
    const canFish = (st.bag.lure_reed ?? 0) > 0 && !!this.map.fishing?.length;
    const canSurf = (st.bag.driftboard ?? 0) > 0 && !st.surfing && !this.npcAt(fx, fy);
    if (!canFish && !canSurf) {
      if (!st.surfing) await this.ui.dialog.say('The water is deep and dark. You\'d need something to float on.');
      return;
    }
    const opts = [...(canFish ? ['Fish'] : []), ...(canSurf ? ['Paddle out'] : []), 'Leave it'];
    const c = await this.ui.ask('The water ripples gently.', opts);
    const pick = opts[c];
    if (pick === 'Fish') return this.fish(fx, fy);
    if (pick === 'Paddle out') return this.mountBoard(fx, fy);
  }

  private async mountBoard(fx: number, fy: number) {
    const st = session.state;
    await this.ui.dialog.say(`${st.playerName} launched the Driftboard!`);
    st.surfing = true;
    audio.sfx('splash');
    const d = this.dir;
    this.px = fx;
    this.py = fy;
    st.x = fx;
    st.y = fy;
    await new Promise<void>((r) => this.tweens.add({ targets: this.player, x: fx * TILE, y: fy * TILE + Y_OFF, duration: 260, onUpdate: () => this.syncPlayer(), onComplete: () => r() }));
    this.setPlayerFacing(d);
    this.syncPlayer();
  }

  /** Fishing: wait for a bite, then press Confirm while the "!" is up. */
  private async fish(fx: number, fy: number) {
    audio.sfx('throw');
    const bob = this.add.image(fx * TILE + 8, fy * TILE + 8, 'bobber').setDepth(9998);
    const bobT = this.tweens.add({ targets: bob, y: bob.y + 1.5, yoyo: true, repeat: -1, duration: 420 });
    input.clear();
    const waitMs = 900 + session.rng.next() * 2200;
    const bite = session.rng.chance(85);
    const outcome = await new Promise<'early' | 'none' | 'miss' | 'hooked'>((resolve) => {
      let t = 0;
      let biting = false;
      let emote: Phaser.GameObjects.Image | undefined;
      const window = settings.reducedMotion ? 1300 : 900;
      const tick = (_t: number, dt: number) => {
        t += dt;
        const pressed = input.pressed('a') || input.pressed('b');
        if (pressed) input.consume('a');
        if (!biting) {
          if (pressed) return done('early');
          if (t >= waitMs) {
            if (!bite) return done('none');
            biting = true;
            t = 0;
            audio.sfx('exclaim');
            bobT.stop();
            bob.y += 3;
            emote = this.add.image(this.player.x + 8, this.player.y - 2, 'emote').setOrigin(0.5, 1).setDepth(9999);
          }
          return;
        }
        if (pressed) return done('hooked');
        if (t > window) done('miss');
      };
      const done = (r: 'early' | 'none' | 'miss' | 'hooked') => {
        this.events.off('update', tick);
        emote?.destroy();
        resolve(r);
      };
      this.events.on('update', tick);
    });
    bobT.stop();
    bob.destroy();
    if (outcome === 'early') return this.ui.dialog.say('You reeled in too early...');
    if (outcome === 'none') return this.ui.dialog.say('Not even a nibble...');
    if (outcome === 'miss') return this.ui.dialog.say('It got away!');
    await this.ui.dialog.say('Something\'s on the line!');
    const e = this.pickEncounter(this.map.fishing!);
    await this.wildBattle(e.species, session.rng.int(e.min, e.max), true);
  }

  /** Change map with a fade. */
  changeMap(mapId: string, x: number, y: number, dir: Dir, autosave: boolean) {
    if (this.transitioning) return;
    this.transitioning = true;
    const st = session.state;
    if (mapId !== st.map) moveRoamer(st.roamer, session.rng);
    if (!LEGEND[getMap(mapId).rows[y]?.[x] ?? '.']?.water) st.surfing = false;
    st.map = mapId;
    st.x = x;
    st.y = y;
    st.dir = dir;
    if (autosave) session.autosave();
    this.cameras.main.fadeOut(180, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.restart());
  }

  // ---------- battles ----------
  async wildBattle(species: string, level: number, water = false): Promise<BattleResult> {
    const wild = session.makeCreature(species, level);
    session.state.stats.wildEncounters++;
    return this.battle({ kind: 'wild', enemy: [wild], water });
  }

  /** The roaming creature: its HP carries over between meetings and it bolts quickly. */
  async roamerBattle(): Promise<BattleResult> {
    const st = session.state;
    const r = st.roamer;
    const c = createCreature(r.species, r.level, session.rng);
    if (r.hp > 0) c.hp = Math.min(c.hp, r.hp);
    session.state.stats.wildEncounters++;
    const result = await this.battle({ kind: 'wild', enemy: [c], fleeChance: ROAM_FLEE, music: 'admin' });
    if (result === 'caught') r.caught = true;
    else if (result === 'win') { r.hp = -1; moveRoamer(r, session.rng); }
    else { r.hp = c.hp; moveRoamer(r, session.rng); }
    session.autosave();
    return result;
  }

  /** Plays the encounter transition and runs a battle. */
  async battle(data: Omit<BattleSceneData, 'onEnd'>): Promise<BattleResult> {
    const st0 = session.state;
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
    if (result === 'lose' && data.canLose) {
      session.healParty();
      st0.surfing = false;
    } else if (result === 'lose') {
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
    st.surfing = false;
    session.autosave();
    this.scene.restart();
  }
}
