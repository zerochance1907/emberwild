import Phaser from 'phaser';
import { audio } from '../audio/audio';
import { getSpecies } from '../data/creatures';
import { getMove } from '../data/moves';
import { displayName, evolve, learnMove, type Creature } from '../engine/creature';
import { input } from '../game/input';
import { session } from '../game/session';
import { settings } from '../game/settings';
import { C, DialogBox, H, ListMenu, text, W } from '../ui/kit';

export class EvolutionScene extends Phaser.Scene {
  private c!: Creature;
  private onDone!: () => void;

  constructor() {
    super('Evolution');
  }

  init(d: { creature: Creature; onDone: () => void }) {
    this.c = d.creature;
    this.onDone = d.onDone;
  }

  create() {
    void this.run();
  }

  private async run() {
    const c = this.c;
    const from = c.species;
    const to = c.pendingEvolution!;
    const g = this.add.graphics();
    g.fillGradientStyle(0x1a1030, 0x1a1030, 0x3a2050, 0x3a2050, 1).fillRect(0, 0, W, H);
    const rays = this.add.graphics().setPosition(W / 2, 220).setAlpha(0.25);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      rays.fillStyle(0xffd08a, 1).fillTriangle(0, 0, Math.cos(a) * 600, Math.sin(a) * 600, Math.cos(a + 0.18) * 600, Math.sin(a + 0.18) * 600);
    }
    if (!settings.reducedMotion) this.tweens.add({ targets: rays, angle: 360, duration: 20000, repeat: -1 });
    const oldImg = this.add.image(W / 2, 220, `cf_${from}`).setScale(3.5);
    const newImg = this.add.image(W / 2, 220, `cf_${to}`).setScale(3.5).setAlpha(0);
    const box = new DialogBox(this, 100);
    audio.stopMusic();
    audio.cry(from);
    await box.say(`What? ${displayName(c)} is evolving!`, undefined, true);
    box.hide();
    audio.sfx('evolve');
    oldImg.setTintFill(0xffffff);
    newImg.setTintFill(0xffffff);
    let cancelled = false;
    // alternate silhouettes, faster and faster
    const steps = settings.reducedMotion ? 4 : 16;
    for (let i = 0; i < steps; i++) {
      const dur = Math.max(60, 420 - i * 24);
      const showNew = i % 2 === 0;
      await new Promise<void>((r) => this.tweens.add({ targets: [oldImg, newImg], alpha: (t: Phaser.GameObjects.Image) => ((t === newImg) === showNew ? 1 : 0), scale: showNew ? 3.7 : 3.4, duration: dur, onComplete: () => r() }));
      if (input.isDown('b') && i < steps - 4) { cancelled = true; break; }
    }
    if (cancelled) {
      newImg.setAlpha(0);
      oldImg.setAlpha(1).clearTint();
      c.pendingEvolution = undefined;
      await box.say(`Huh? ${displayName(c)} stopped evolving.`);
      box.destroy();
      this.onDone();
      return;
    }
    const flash = this.add.rectangle(0, 0, W, H, 0xffffff, 1).setOrigin(0);
    oldImg.setAlpha(0);
    newImg.setAlpha(1).clearTint().setScale(3.5);
    this.tweens.add({ targets: flash, alpha: 0, duration: 700 });
    const p = this.add.particles(W / 2, 220, 'star', { speed: { min: 120, max: 380 }, lifespan: 1000, scale: { start: 2, end: 0 }, tint: [0xffe070, 0xffffff, 0xffa25a], emitting: false });
    p.explode(settings.reducedMotion ? 8 : 40);
    const oldName = displayName(c);
    const res = evolve(c, to);
    session.markCaught(to);
    audio.cry(to);
    audio.playMusic('victory');
    text(this, W / 2, 360, getSpecies(to).name, 34, C.accent).setOrigin(0.5);
    await box.say(`Congratulations! ${oldName} evolved into ${getSpecies(to).name}!`);
    for (const mv of res.newMoves) {
      if (learnMove(c, mv)) await box.say(`${displayName(c)} learned ${getMove(mv).name}!`);
      else {
        const items = [...c.moves.map((m) => ({ label: getMove(m.id).name })), { label: `Don't learn ${getMove(mv).name}` }];
        await box.say(`${displayName(c)} wants to learn ${getMove(mv).name}, but already knows four moves.`);
        const menu = new ListMenu(this, W / 2 - 220, 40, 440, items, { title: 'Forget which move?', depth: 200 });
        const i = await menu.open();
        menu.destroy();
        if (i >= 0 && i < 4) {
          learnMove(c, mv, i);
          await box.say(`${displayName(c)} learned ${getMove(mv).name}!`);
        }
      }
    }
    box.destroy();
    session.autosave();
    this.onDone();
  }
}
