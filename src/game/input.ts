import { ACTIONS, settings, type Action } from './settings';

/**
 * Unified input: keyboard (remappable), gamepad and on-screen touch buttons
 * all feed the same action states. Call `update()` once per frame.
 */
class InputHub {
  private keysDown = new Set<string>();
  private pressedQueue = new Set<Action>();
  private justNow = new Set<Action>();
  private virtual = new Set<Action>();
  private padPrev = new Set<Action>();
  private padNow = new Set<Action>();
  private repeatTimer: Partial<Record<Action, number>> = {};
  /** When set, the next key press is captured (for remapping) instead of acting. */
  captureNext: ((code: string) => void) | null = null;
  lastDevice: 'keyboard' | 'touch' | 'pad' = 'keyboard';
  anyPressListeners: (() => void)[] = [];

  attach() {
    window.addEventListener('keydown', (e) => {
      if (this.captureNext) {
        e.preventDefault();
        const cb = this.captureNext;
        this.captureNext = null;
        cb(e.code);
        return;
      }
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      const act = this.actionFor(e.code);
      if (act) e.preventDefault();
      if (!e.repeat) {
        this.keysDown.add(e.code);
        if (act) this.pressedQueue.add(act);
      }
      this.lastDevice = 'keyboard';
      this.anyPressListeners.forEach((f) => f());
    });
    window.addEventListener('keyup', (e) => this.keysDown.delete(e.code));
    window.addEventListener('blur', () => this.keysDown.clear());
  }

  actionFor(code: string): Action | null {
    for (const a of ACTIONS) if (settings.keys[a].includes(code)) return a;
    return null;
  }

  setVirtual(a: Action, down: boolean) {
    if (down && !this.virtual.has(a)) this.pressedQueue.add(a);
    if (down) this.virtual.add(a);
    else this.virtual.delete(a);
    this.lastDevice = 'touch';
    if (down) this.anyPressListeners.forEach((f) => f());
  }

  private pollPad() {
    this.padPrev = this.padNow;
    this.padNow = new Set();
    const pads = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : [];
    for (const p of pads) {
      if (!p) continue;
      const b = (i: number) => !!p.buttons[i]?.pressed;
      const ax = p.axes[0] ?? 0, ay = p.axes[1] ?? 0;
      if (b(12) || ay < -0.5) this.padNow.add('up');
      if (b(13) || ay > 0.5) this.padNow.add('down');
      if (b(14) || ax < -0.5) this.padNow.add('left');
      if (b(15) || ax > 0.5) this.padNow.add('right');
      if (b(0)) this.padNow.add('a');
      if (b(1)) this.padNow.add('b');
      if (b(9) || b(8)) this.padNow.add('menu');
      if (b(2) || b(5) || b(7)) this.padNow.add('run');
    }
    for (const a of this.padNow) if (!this.padPrev.has(a)) {
      this.pressedQueue.add(a);
      this.lastDevice = 'pad';
      this.anyPressListeners.forEach((f) => f());
    }
  }

  /** Called at the start of every game step. */
  update(dt: number) {
    this.pollPad();
    this.justNow = this.pressedQueue;
    this.pressedQueue = new Set();
    // auto-repeat for menu navigation
    for (const a of ['up', 'down', 'left', 'right'] as Action[]) {
      if (this.isDown(a)) {
        const t = (this.repeatTimer[a] ?? -350) + dt;
        if (t >= 90) {
          this.repeatTimer[a] = 0;
          this.justNow.add(a);
        } else this.repeatTimer[a] = t;
      } else this.repeatTimer[a] = -350;
    }
  }

  isDown(a: Action): boolean {
    if (this.virtual.has(a) || this.padNow.has(a)) return true;
    for (const k of settings.keys[a]) if (this.keysDown.has(k)) return true;
    return false;
  }

  /** True on the frame an action was pressed (with auto-repeat for directions). */
  pressed(a: Action): boolean {
    return this.justNow.has(a);
  }

  /** Consume a press so other handlers this frame don't see it. */
  consume(a: Action) {
    this.justNow.delete(a);
  }

  clear() {
    this.justNow.clear();
    this.pressedQueue.clear();
  }

  heldDir(): 'up' | 'down' | 'left' | 'right' | null {
    for (const d of ['up', 'down', 'left', 'right'] as const) if (this.isDown(d)) return d;
    return null;
  }
}

export const input = new InputHub();
