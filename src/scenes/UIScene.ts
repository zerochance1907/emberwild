import Phaser from 'phaser';
import { audio } from '../audio/audio';
import type { MapDef } from '../data/maps';
import { displayName } from '../engine/creature';
import { session, formatTime } from '../game/session';
import { settings } from '../game/settings';
import { C, DialogBox, H, ListMenu, panel, text, W, ask as askFn } from '../ui/kit';
import { bagMenu, partyMenu, pickStarter, saveMenu, shopMenu, storageMenu, wildlogMenu } from '../ui/menus';
import { openSettings } from '../ui/settingsMenu';
import type { OverworldScene } from './OverworldScene';

/** Screen-space layer above the overworld: dialogue, menus, lighting and weather. */
export class UIScene extends Phaser.Scene {
  dialog!: DialogBox;
  private tint!: Phaser.GameObjects.Rectangle;
  private dark!: Phaser.GameObjects.RenderTexture;
  private glow!: Phaser.GameObjects.Image;
  private rain?: Phaser.GameObjects.Particles.ParticleEmitter;
  private map?: MapDef;
  private banner?: Phaser.GameObjects.Container;
  private nextBolt = 0;
  private boltFlash?: Phaser.GameObjects.Rectangle;
  private wipe?: Phaser.GameObjects.Graphics;

  constructor() {
    super('UI');
  }

  create() {
    this.tint = this.add.rectangle(0, 0, W, H, 0x000000, 0).setOrigin(0).setDepth(10);
    this.dark = this.add.renderTexture(0, 0, W, H).setOrigin(0).setDepth(11).setVisible(false);
    this.glow = this.make.image({ key: 'glow', add: false });
    this.dialog = new DialogBox(this, 900);
  }

  private get world(): OverworldScene {
    return this.scene.get('Overworld') as OverworldScene;
  }

  enterMap(map: MapDef, showBanner = true) {
    const changed = this.map?.id !== map.id;
    this.map = map;
    this.rain?.destroy();
    this.rain = undefined;
    if (map.weather && !settings.reducedMotion) {
      const storm = map.weather === 'storm';
      this.rain = this.add.particles(0, 0, 'drop', {
        x: { min: -100, max: W + 260 }, y: -20, lifespan: 900, speedY: { min: 520, max: 680 }, speedX: storm ? -320 : -120,
        quantity: storm ? 5 : 3, frequency: 16, alpha: { start: 0.55, end: 0.2 }, tint: 0xbfd8ff, rotate: storm ? 26 : 12, scaleY: { min: 0.8, max: 1.4 },
      }).setDepth(12);
    }
    this.nextBolt = this.time.now + 3000;
    if (showBanner && changed && map.kind !== 'interior') this.showBanner(map.name);
  }

  private showBanner(name: string) {
    this.banner?.destroy();
    const c = this.add.container(20, -70).setDepth(800);
    const t = text(this, 24, 14, name, 26, C.text);
    c.add([panel(this, 0, 0, t.width + 48, 60), t]);
    this.banner = c;
    this.tweens.add({ targets: c, y: 18, duration: 300, ease: 'Back.out', hold: 1800, yoyo: true, onComplete: () => c.destroy() });
  }

  update() {
    const map = this.map;
    if (!map) return;
    // day / night
    if (map.kind === 'interior' || map.kind === 'cave') this.tint.setAlpha(0);
    else {
      const h = session.state.clock / 60;
      let color = 0x000000, a = 0;
      if (h >= 19 || h < 5) { color = 0x14184a; a = 0.42; }
      else if (h >= 17) { color = 0x8a3a2a; a = ((h - 17) / 2) * 0.28; }
      else if (h < 7) { color = 0x4a3a6a; a = ((7 - h) / 2) * 0.3; }
      if (map.weather === 'rain') { color = 0x1a2440; a = Math.max(a, 0.25); }
      if (map.weather === 'storm') { color = 0x14182e; a = Math.max(a, 0.38); }
      this.tint.setFillStyle(color, 1).setAlpha(a);
    }
    // lightning on stormy maps
    if (map.weather === 'storm' && this.time.now > this.nextBolt) {
      this.nextBolt = this.time.now + 4000 + Math.random() * 7000;
      audio.sfx('thunder');
      if (!settings.reducedMotion) {
        this.boltFlash?.destroy();
        const r = this.add.rectangle(0, 0, W, H, 0xe8f0ff, 0.55).setOrigin(0).setDepth(13);
        this.boltFlash = r;
        this.tweens.add({ targets: r, alpha: 0, duration: 380, ease: 'Quad.out', onComplete: () => r.destroy() });
      }
    }
    // cave darkness with a light around the player
    if (map.dark) {
      const w = this.world;
      const cam = w.cameras.main;
      const sx = (w.player.x + 8 - cam.worldView.x) * cam.zoom;
      const sy = (w.player.y + 10 - cam.worldView.y) * cam.zoom;
      const lantern = session.flag('quest_lantern_done') || (session.state.bag.glow_lantern ?? 0) > 0;
      const r = (lantern ? 300 : 150) * (1 + Math.sin(this.time.now / 300) * 0.02);
      this.dark.setVisible(true).clear().fill(0x05030a, 0.96);
      this.glow.setDisplaySize(r * 2, r * 2);
      this.dark.erase(this.glow, sx, sy);
    } else this.dark.setVisible(false);
  }

  async ask(q: string, options: string[], name?: string) {
    return askFn(this, this.dialog, q, options, name);
  }

  async flash(color: number, ms: number) {
    const r = this.add.rectangle(0, 0, W, H, color, 0).setOrigin(0).setDepth(850);
    await new Promise<void>((res) => this.tweens.add({ targets: r, alpha: settings.reducedMotion ? 0.4 : 0.8, yoyo: true, duration: ms / 2, onComplete: () => res() }));
    r.destroy();
  }

  /** Stripe wipe into battle. */
  async battleTransition() {
    this.wipe?.destroy();
    const g = this.add.graphics().setDepth(2000);
    this.wipe = g;
    if (settings.reducedMotion) {
      g.fillStyle(0x000000, 1).fillRect(0, 0, W, H).setAlpha(0);
      await new Promise<void>((r) => this.tweens.add({ targets: g, alpha: 1, duration: 300, onComplete: () => r() }));
      return;
    }
    await this.flash(0xffffff, 200);
    const obj = { t: 0 };
    await new Promise<void>((r) => this.tweens.add({
      targets: obj, t: 1, duration: 520, ease: 'Quad.in',
      onUpdate: () => {
        g.clear().fillStyle(0x0b0912, 1);
        for (let i = 0; i < 12; i++) {
          const y = (i * H) / 12;
          const w = W * Math.min(1, obj.t * 1.5 - i * 0.04);
          if (w > 0) g.fillRect(i % 2 ? W - w : 0, y, w, H / 12 + 1);
        }
      },
      onComplete: () => r(),
    }));
  }

  clearTransition() {
    this.wipe?.destroy();
    this.wipe = undefined;
  }

  async pauseMenu() {
    audio.sfx('confirm');
    const st = session.state;
    let start = 0;
    for (;;) {
      const hours = Math.floor(st.clock / 60), mins = Math.floor(st.clock % 60);
      const info = panel(this, W - 330, 40, 300, 150).setDepth(1000);
      const sigils = (session.flag('beatWarden') ? 1 : 0) + (session.flag('beatMaren') ? 1 : 0);
      const eggs = st.eggs.length ? `  ·  ${st.eggs.length} egg${st.eggs.length > 1 ? 's' : ''}` : '';
      const lines = text(this, W - 306, 58, `${st.playerName}  ·  ${sigils} Sigil${sigils === 1 ? '' : 's'}\n${st.money} embers${eggs}\nTime ${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}  ·  Played ${formatTime(st.playTimeMs)}`, 19, C.text, { lineSpacing: 8 }).setDepth(1001);
      const items = [
        { label: 'Team', enabled: st.party.length > 0 },
        { label: 'Bag' },
        { label: 'Wildlog', enabled: !!st.bag.wildlog },
        { label: 'Save' },
        { label: 'Settings' },
        { label: 'Quit to title' },
        { label: 'Close' },
      ];
      const menu = new ListMenu(this, W - 330, 200, 300, items, { start, rowH: 42 });
      const i = await menu.open();
      menu.destroy();
      info.destroy();
      lines.destroy();
      start = Math.max(0, i);
      if (i < 0 || i === 6) return;
      if (i === 0) await partyMenu(this, { mode: 'view' });
      if (i === 1) await bagMenu(this, 'field');
      if (i === 2) await wildlogMenu(this);
      if (i === 3) await saveMenu(this);
      if (i === 4) await openSettings(this);
      if (i === 5) {
        const c = await this.ask('Return to the title screen? Your progress is autosaved.', ['Yes', 'No']);
        if (c === 0) {
          session.autosave();
          this.scene.stop('Overworld');
          this.scene.stop();
          this.scene.start('Title');
          return;
        }
      }
    }
  }

  storageMenu() { return storageMenu(this); }
  shopMenu(stock: string) { return shopMenu(this, stock); }
  pickStarter() { return pickStarter(this); }

  /** Runs evolution scenes for any creature that is waiting to evolve. */
  async runEvolutions() {
    for (const c of session.state.party) {
      if (!c.pendingEvolution || c.hp <= 0) continue;
      await new Promise<void>((resolve) => {
        this.scene.launch('Evolution', { creature: c, onDone: () => resolve() });
        this.scene.bringToTop('Evolution');
      });
      this.scene.stop('Evolution');
      audio.playMusic(this.map?.music ?? 'town');
    }
  }

  async endChapter(chapter = 1) {
    this.dialog.hide();
    await new Promise<void>((r) => { this.cameras.main.fadeOut(1200); this.cameras.main.once('camerafadeoutcomplete', () => r()); });
    this.scene.stop('Overworld');
    this.scene.stop();
    this.scene.start('End', { chapter });
  }

  /** Utility for scripts: name of lead creature. */
  leadName() {
    const i = session.firstHealthy();
    return i >= 0 ? displayName(session.state.party[i]) : '';
  }
}
