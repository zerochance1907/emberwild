import Phaser from 'phaser';
import { generateTextures } from '../art/textures';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    generateTextures(this);
    this.scene.launch('Touch');
    this.scene.start('Title');
  }
}
