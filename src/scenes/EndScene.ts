import Phaser from 'phaser';
import { audio } from '../audio/audio';
import { displayName } from '../engine/creature';
import { input } from '../game/input';
import { formatTime, session } from '../game/session';
import { C, H, panel, text, W } from '../ui/kit';

/** Chapter-end screen with the player's stats. */
export class EndScene extends Phaser.Scene {
  constructor() {
    super('End');
  }

  create() {
    const st = session.state;
    audio.playMusic('ending');
    audio.setAmbience(null);
    this.cameras.main.fadeIn(1200);
    const g = this.add.graphics();
    g.fillGradientStyle(0x14102a, 0x14102a, 0x5a2a3a, 0x7a3a2a, 1).fillRect(0, 0, W, H);
    for (let i = 0; i < 50; i++) {
      const s = this.add.image(Math.random() * W, H + Math.random() * 300, 'px').setTint(Phaser.Math.RND.pick([0xffa040, 0xffd06a, 0xff6a2a])).setScale(Phaser.Math.Between(1, 3));
      this.tweens.add({ targets: s, y: -20, duration: Phaser.Math.Between(6000, 12000), repeat: -1, delay: Math.random() * 6000 });
    }
    text(this, W / 2, 56, 'CHAPTER ONE COMPLETE', 44, '#ffd08a', { stroke: '#5a1a1a', strokeThickness: 8 }).setOrigin(0.5);
    text(this, W / 2, 104, 'The Cinder Sigil is yours. The Hollow Veil\'s shadow grows long...', 20, C.dim).setOrigin(0.5);
    panel(this, 80, 140, 380, 320);
    const lines = [
      ['Trainer', st.playerName],
      ['Play time', formatTime(st.playTimeMs)],
      ['Steps taken', String(st.stats.steps)],
      ['Battles won', String(st.stats.battlesWon)],
      ['Creatures seen', `${st.seen.length} / 18`],
      ['Creatures bonded', `${st.caught.length} / 18`],
      ['Embers', String(st.money)],
    ];
    lines.forEach(([k, v], i) => {
      text(this, 106, 166 + i * 40, k, 20, C.dim);
      text(this, 434, 166 + i * 40, v, 20).setOrigin(1, 0);
    });
    panel(this, 500, 140, 380, 320);
    text(this, 524, 160, 'Your team', 22, C.accent);
    st.party.forEach((c, i) => {
      const x = 540 + (i % 3) * 112, y = 230 + Math.floor(i / 3) * 120;
      const img = this.add.image(x + 20, y, `ci_${c.species}`).setScale(2);
      this.tweens.add({ targets: img, y: y - 6, yoyo: true, repeat: -1, duration: 700 + i * 90, ease: 'Sine.inOut' });
      text(this, x + 20, y + 40, `${displayName(c)}`, 15).setOrigin(0.5);
      text(this, x + 20, y + 58, `Lv ${c.level}`, 14, C.dim).setOrigin(0.5);
    });
    const t = text(this, W / 2, H - 50, 'Thanks for playing Emberwild!  ·  Press Confirm to return to the title', 18, C.text).setOrigin(0.5);
    this.tweens.add({ targets: t, alpha: 0.4, yoyo: true, repeat: -1, duration: 900 });
    this.time.delayedCall(1500, () => {
      const go = () => { this.scene.start('Title'); };
      this.input.once('pointerdown', go);
      this.events.on('update', () => { if (input.pressed('a')) go(); });
    });
  }
}
