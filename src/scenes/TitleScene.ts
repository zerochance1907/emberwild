import Phaser from 'phaser';
import { audio } from '../audio/audio';
import { input } from '../game/input';
import { session, formatTime } from '../game/session';
import { latestSlot, newGameState, readSlot, SLOT_KEYS, importSave, type GameState } from '../engine/save';
import { C, DialogBox, H, ListMenu, text, toast, W, ask } from '../ui/kit';
import { openSettings } from '../ui/settingsMenu';
import { getMap } from '../data/maps';

const NAMES = ['Wren', 'Sol', 'Juno', 'Ash-Lee', 'Rowe', 'Kai', 'Nell', 'Tamsin'];

export class TitleScene extends Phaser.Scene {
  private busy = false;

  constructor() {
    super('Title');
  }

  create() {
    this.busy = false;
    audio.playMusic('title');
    audio.setAmbience(null);
    this.cameras.main.fadeIn(400);
    // backdrop: dusk gradient, hills and drifting embers
    const g = this.add.graphics();
    g.fillGradientStyle(0x1a1030, 0x1a1030, 0x6a2a4a, 0x8a3a3a, 1);
    g.fillRect(0, 0, W, H);
    g.fillStyle(0x2a1a3a, 1);
    for (let x = 0; x <= W; x += 8) g.fillRect(x, 380 + Math.sin(x / 90) * 30, 8, H);
    g.fillStyle(0x1a1028, 1);
    for (let x = 0; x <= W; x += 8) g.fillRect(x, 430 + Math.sin(x / 60 + 2) * 20, 8, H);
    for (let i = 0; i < 40; i++) {
      const s = this.add.image(Math.random() * W, H + Math.random() * 200, 'px').setTint(Phaser.Math.RND.pick([0xffa040, 0xff6a2a, 0xffd06a])).setScale(Phaser.Math.Between(1, 3));
      this.tweens.add({ targets: s, y: -20, x: `+=${Phaser.Math.Between(-80, 80)}`, alpha: { from: 1, to: 0.2 }, duration: Phaser.Math.Between(5000, 11000), repeat: -1, delay: Math.random() * 6000 });
    }
    // creatures on the hill
    const trio = ['kindlet', 'puddlop', 'sprigling'];
    trio.forEach((id, i) => {
      const pos = [[150, 470], [W / 2, 300], [810, 470]][i];
      const img = this.add.image(pos[0], pos[1], `cf_${id}`).setScale(i === 1 ? 1.6 : 2.6).setOrigin(0.5, 1);
      if (i === 0) img.setFlipX(true);
      this.tweens.add({ targets: img, y: pos[1] - 7, yoyo: true, repeat: -1, duration: 900 + i * 150, ease: 'Sine.inOut' });
    });
    // logo
    const logo = text(this, W / 2, 110, 'EMBERWILD', 96, '#ffd08a', { stroke: '#5a1a1a', strokeThickness: 12, shadow: { offsetX: 0, offsetY: 8, color: '#000a', blur: 0, fill: true } }).setOrigin(0.5);
    logo.setLetterSpacing?.(6);
    this.tweens.add({ targets: logo, scale: 1.03, yoyo: true, repeat: -1, duration: 1600, ease: 'Sine.inOut' });
    text(this, W / 2, 182, 'A creature-bonding adventure  ·  Chapter One: The Cinder Sigil', 20, C.dim).setOrigin(0.5);
    text(this, W - 12, H - 10, 'v0.1 · original game', 14, C.dim).setOrigin(1, 1);

    void this.mainMenu();
  }

  private async mainMenu() {
    for (;;) {
      const latest = latestSlot(localStorage);
      const items = [
        { label: 'Continue', enabled: !!latest, right: latest ? `${latest.state.playerName} · ${formatTime(latest.state.playTimeMs)}` : '' },
        { label: 'New Game' },
        { label: 'Load / Import' },
        { label: 'Settings' },
      ];
      const menu = new ListMenu(this, W / 2 - 190, 314, 380, items, { cancelable: false, start: latest ? 0 : 1, rowH: 42 });
      const i = await menu.open();
      menu.destroy();
      if (i === 0 && latest) return this.begin(latest.state);
      if (i === 1) {
        if (await this.newGame()) return;
      }
      if (i === 2) {
        const st = await this.loadMenu();
        if (st) return this.begin(st);
      }
      if (i === 3) await openSettings(this);
    }
  }

  private async newGame(): Promise<boolean> {
    const box = new DialogBox(this);
    const latest = latestSlot(localStorage);
    if (latest) {
      const c = await ask(this, box, 'Start a new adventure? Your autosave will be replaced when you next save.', ['Start fresh', 'Go back']);
      if (c !== 0) { box.destroy(); return false; }
    }
    await box.say(['Welcome to Emberwild, a land where people and creatures share a spark.', 'Before we begin... what should we call you?']);
    const names = [...NAMES.map((n) => ({ label: n })), { label: 'Type a name...' }];
    const m = new ListMenu(this, W / 2 - 150, 40, 300, names, { title: 'Your name', rows: 9, rowH: 38 });
    const pick = await m.open();
    m.destroy();
    if (pick < 0) { box.destroy(); return false; }
    let name = NAMES[pick] ?? '';
    if (pick === NAMES.length) {
      const typed = window.prompt('Your name (max 10 characters):', 'Wren');
      name = (typed ?? '').trim().slice(0, 10) || 'Wren';
    }
    await box.say([`${name}! What a fine name.`, 'Your story begins in the quiet village of Hollowbrook...']);
    box.destroy();
    this.begin(newGameState(name));
    return true;
  }

  private async loadMenu(): Promise<GameState | null> {
    const labels = ['Autosave', 'Slot 1', 'Slot 2', 'Slot 3'];
    const states = SLOT_KEYS.map((k) => readSlot(localStorage, k));
    const items = states.map((s, i) => ({
      label: labels[i], enabled: !!s,
      right: s ? `${s.playerName} · ${getMap(s.map).name} · ${formatTime(s.playTimeMs)}` : 'empty',
    }));
    items.push({ label: 'Import save code', enabled: true, right: '' });
    const m = new ListMenu(this, W / 2 - 300, 250, 600, items, { title: 'Load game' });
    const i = await m.open();
    m.destroy();
    if (i < 0) return null;
    if (i === 4) {
      const code = window.prompt('Paste your Emberwild save code:');
      if (!code) return null;
      try {
        return importSave(code);
      } catch (e) {
        toast(this, (e as Error).message, 2500);
        return null;
      }
    }
    return states[i];
  }

  private begin(state: GameState) {
    if (this.busy) return;
    this.busy = true;
    input.clear();
    session.start(state);
    audio.sfx('confirm');
    this.cameras.main.fadeOut(400);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Overworld'));
  }
}
