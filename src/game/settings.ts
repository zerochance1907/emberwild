export type Action = 'up' | 'down' | 'left' | 'right' | 'a' | 'b' | 'menu' | 'run';
export const ACTIONS: Action[] = ['up', 'down', 'left', 'right', 'a', 'b', 'menu', 'run'];
export const ACTION_LABEL: Record<Action, string> = {
  up: 'Up', down: 'Down', left: 'Left', right: 'Right', a: 'Confirm / Talk', b: 'Back', menu: 'Menu', run: 'Run (hold)',
};

export interface Settings {
  musicVol: number; // 0..10
  sfxVol: number; // 0..10
  textSpeed: 0 | 1 | 2 | 3; // slow, normal, fast, instant
  battleSpeed: 1 | 2;
  reducedMotion: boolean;
  touch: 'auto' | 'on' | 'off';
  keys: Record<Action, string[]>;
}

export const DEFAULT_KEYS: Record<Action, string[]> = {
  up: ['ArrowUp', 'KeyW'],
  down: ['ArrowDown', 'KeyS'],
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  a: ['KeyZ', 'Space', 'Enter'],
  b: ['KeyX', 'Backspace'],
  menu: ['Escape', 'KeyM'],
  run: ['ShiftLeft', 'ShiftRight'],
};

const KEY = 'emberwild.settings';

function defaults(): Settings {
  const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  return { musicVol: 6, sfxVol: 7, textSpeed: 1, battleSpeed: 1, reducedMotion: reduce, touch: 'auto', keys: structuredClone(DEFAULT_KEYS) };
}

export function loadSettings(): Settings {
  const d = defaults();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return d;
    const s = JSON.parse(raw) as Partial<Settings>;
    return { ...d, ...s, keys: { ...d.keys, ...(s.keys ?? {}) } };
  } catch {
    return d;
  }
}

export function saveSettings(s: Settings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage may be unavailable */
  }
}

export const settings: Settings = loadSettings();

export function keyLabel(code: string): string {
  return code.replace(/^Key/, '').replace(/^Digit/, '').replace('Arrow', '').replace('Left', ' L').replace('Right', ' R');
}
