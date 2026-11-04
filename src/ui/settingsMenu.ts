import Phaser from 'phaser';
import { audio } from '../audio/audio';
import { input } from '../game/input';
import { ACTIONS, ACTION_LABEL, DEFAULT_KEYS, keyLabel, saveSettings, settings, type Action } from '../game/settings';
import { C, H, ListMenu, panel, text, W, type MenuItem } from './kit';

const SPEEDS = ['Slow', 'Normal', 'Fast', 'Instant'];

function items(): MenuItem[] {
  return [
    { label: 'Music volume', right: '◀ ' + '■'.repeat(settings.musicVol) + '□'.repeat(10 - settings.musicVol) + ' ▶' },
    { label: 'Sound volume', right: '◀ ' + '■'.repeat(settings.sfxVol) + '□'.repeat(10 - settings.sfxVol) + ' ▶' },
    { label: 'Text speed', right: `◀ ${SPEEDS[settings.textSpeed]} ▶` },
    { label: 'Battle speed', right: `◀ ${settings.battleSpeed === 2 ? 'Fast' : 'Normal'} ▶` },
    { label: 'Reduced motion', right: `◀ ${settings.reducedMotion ? 'On' : 'Off'} ▶` },
    { label: 'Touch controls', right: `◀ ${settings.touch === 'auto' ? 'Auto' : settings.touch === 'on' ? 'Always' : 'Hidden'} ▶` },
    { label: 'Remap keys...' },
    { label: 'Done' },
  ];
}

function change(i: number, dir: number) {
  const clamp = (v: number) => Math.max(0, Math.min(10, v));
  if (i === 0) settings.musicVol = clamp(settings.musicVol + dir);
  if (i === 1) settings.sfxVol = clamp(settings.sfxVol + dir);
  if (i === 2) settings.textSpeed = ((settings.textSpeed + dir + 4) % 4) as 0 | 1 | 2 | 3;
  if (i === 3) settings.battleSpeed = settings.battleSpeed === 1 ? 2 : 1;
  if (i === 4) settings.reducedMotion = !settings.reducedMotion;
  if (i === 5) {
    const order = ['auto', 'on', 'off'] as const;
    settings.touch = order[(order.indexOf(settings.touch) + (dir > 0 ? 1 : 2)) % 3];
  }
  audio.applyVolume();
  audio.sfx('select');
  saveSettings(settings);
}

export async function openSettings(scene: Phaser.Scene, depth = 1500) {
  const shade = scene.add.rectangle(0, 0, W, H, 0x000000, 0.55).setOrigin(0).setDepth(depth - 1).setScrollFactor(0).setInteractive();
  const hint = text(scene, W / 2, H - 28, '◀ ▶ to change  ·  tap a row to cycle', 16, C.dim).setOrigin(0.5).setDepth(depth).setScrollFactor(0);
  let start = 0;
  for (;;) {
    const menu = new ListMenu(scene, W / 2 - 300, 40, 600, items(), { title: 'Settings', rows: 8, depth, start, onKey: (i, k) => { change(i, k === 'left' ? -1 : 1); menu.setItems(items()); } });
    menu.root.setScrollFactor(0);
    const i = await menu.open();
    start = Math.max(0, i);
    menu.destroy();
    if (i < 0 || i === 7) break;
    if (i === 6) await remapKeys(scene, depth);
    else change(i, 1);
  }
  shade.destroy();
  hint.destroy();
}

async function remapKeys(scene: Phaser.Scene, depth: number) {
  const list = (): MenuItem[] => [
    ...ACTIONS.map((a) => ({ label: ACTION_LABEL[a], right: settings.keys[a].map(keyLabel).join(' / ') })),
    { label: 'Reset to defaults' },
  ];
  let start = 0;
  for (;;) {
    const menu = new ListMenu(scene, W / 2 - 320, 30, 640, list(), { title: 'Remap keys (choose an action, then press a key)', rows: 9, depth: depth + 1, start, rowH: 38, size: 20 });
    menu.root.setScrollFactor(0);
    const i = await menu.open();
    menu.destroy();
    if (i < 0) return;
    start = i;
    if (i === ACTIONS.length) {
      settings.keys = structuredClone(DEFAULT_KEYS);
      saveSettings(settings);
      continue;
    }
    const a = ACTIONS[i] as Action;
    const bg = panel(scene, W / 2 - 220, H / 2 - 50, 440, 100).setDepth(depth + 5).setScrollFactor(0);
    const t = text(scene, W / 2, H / 2, `Press a key for "${ACTION_LABEL[a]}"`, 22).setOrigin(0.5).setDepth(depth + 6).setScrollFactor(0);
    const code = await new Promise<string>((r) => (input.captureNext = r));
    bg.destroy();
    t.destroy();
    if (code === 'Escape' && a !== 'menu') continue;
    // remove from other actions so keys stay unique
    for (const other of ACTIONS) settings.keys[other] = settings.keys[other].filter((k) => k !== code);
    settings.keys[a] = [code, ...settings.keys[a].filter((k) => k !== code)].slice(0, 2);
    saveSettings(settings);
    input.clear();
  }
}
