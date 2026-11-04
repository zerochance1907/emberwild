import Phaser from 'phaser';
import { audio } from './audio/audio';
import { input } from './game/input';
import { BattleScene } from './scenes/BattleScene';
import { BootScene } from './scenes/BootScene';
import { EndScene } from './scenes/EndScene';
import { EvolutionScene } from './scenes/EvolutionScene';
import { OverworldScene } from './scenes/OverworldScene';
import { TitleScene } from './scenes/TitleScene';
import { TouchScene } from './scenes/TouchScene';
import { UIScene } from './scenes/UIScene';
import { installDebug } from './game/debug';
import { H, W } from './ui/kit';

input.attach();
const unlock = () => audio.unlock();
window.addEventListener('pointerdown', unlock);
window.addEventListener('keydown', unlock);
window.addEventListener('touchstart', unlock);

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: W,
  height: H,
  backgroundColor: '#0b0912',
  pixelArt: true,
  roundPixels: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { activePointers: 4, gamepad: false },
  audio: { noAudio: true },
  scene: [BootScene, TitleScene, OverworldScene, UIScene, BattleScene, EvolutionScene, EndScene, TouchScene],
});

game.events.on(Phaser.Core.Events.PRE_STEP, (_t: number, dt: number) => input.update(dt));
document.getElementById('boot')?.remove();
installDebug(game);
