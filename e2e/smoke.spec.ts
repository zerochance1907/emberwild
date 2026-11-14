import { expect, test, type Page } from '@playwright/test';

type Ew = {
  scenes(): string[];
  player(): { x: number; y: number; map: string; busy: boolean; moving: boolean } | null;
  state(): { version: number; map: string; flags: Record<string, boolean>; party: { species: string }[]; surfing: boolean };
  giveStarter(species?: string, level?: number): void;
  wildBattle(species: string, level: number): Promise<string>;
  warp(map: string, x: number, y: number): void;
  step(dir: 'up' | 'down' | 'left' | 'right'): boolean;
};
declare global {
  interface Window { __ew: Ew }
}

function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}

const player = (page: Page) => page.evaluate(() => window.__ew.player());

async function idle(page: Page) {
  await expect.poll(async () => { const p = await player(page); return !!p && !p.busy && !p.moving; }, { timeout: 15_000 }).toBe(true);
}

/** Title -> New Game -> intro text -> pick the first name, until the player can move. */
async function newGame(page: Page) {
  await page.goto('./');
  await expect.poll(() => page.evaluate(() => window.__ew?.scenes() ?? []), { timeout: 20_000 }).toContain('Title');
  await page.keyboard.press('Enter');
  for (let i = 0; i < 60; i++) {
    const p = await player(page);
    if (p && !p.busy && !p.moving) break;
    await page.keyboard.press('Enter');
    await page.waitForTimeout(400);
  }
}

/** Press Confirm through a battle until it ends. */
async function finishBattle(page: Page) {
  await expect.poll(() => page.evaluate(() => window.__ew.scenes()), { timeout: 10_000 }).toContain('Battle');
  for (let i = 0; i < 160; i++) {
    const scenes = await page.evaluate(() => window.__ew.scenes());
    if (!scenes.includes('Battle')) break;
    await page.keyboard.press('Enter');
    await page.waitForTimeout(250);
  }
  await expect.poll(() => page.evaluate(() => window.__ew.scenes()), { timeout: 15_000 }).not.toContain('Battle');
  expect(await page.evaluate(() => window.__ew.scenes())).toContain('Overworld');
}

test('boots, starts a new game, walks, and finishes a battle without errors', async ({ page }) => {
  const errors = trackErrors(page);
  await newGame(page);
  const start = await player(page);
  expect(start?.map).toBe('home');

  // Walk with the real keyboard
  await page.keyboard.down('ArrowLeft');
  await page.waitForTimeout(700);
  await page.keyboard.up('ArrowLeft');
  await expect.poll(async () => (await player(page))?.x, { timeout: 5000 }).toBeLessThan(start!.x);

  // Get a partner and enter a wild battle; pressing Confirm picks Fight -> first move until it ends
  await page.evaluate(() => {
    window.__ew.giveStarter('kindlet', 8);
    void window.__ew.wildBattle('mossgrub', 2);
  });
  await finishBattle(page);
  expect(errors).toEqual([]);
});

test('warps into the Brinemark Coast, walks, rides a gale lane and battles a new creature', async ({ page }) => {
  const errors = trackErrors(page);
  await newGame(page);
  // Level 8 so the first move is an attack (pressing Confirm always picks it)
  await page.evaluate(() => window.__ew.giveStarter('kindlet', 8));

  // Gullhaven: arrive and walk east along the harbour road with the keyboard
  await page.evaluate(() => window.__ew.warp('gullhaven', 10, 7));
  await expect.poll(async () => (await player(page))?.map, { timeout: 10_000 }).toBe('gullhaven');
  await idle(page);
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(900);
  await page.keyboard.up('ArrowRight');
  await expect.poll(async () => (await player(page))?.x, { timeout: 5000 }).toBeGreaterThan(10);
  await idle(page);

  // Stormcrest Ridge: step into a gale lane and get carried to its far end
  await page.evaluate(() => window.__ew.warp('stormridge', 5, 17));
  await expect.poll(async () => (await player(page))?.map, { timeout: 10_000 }).toBe('stormridge');
  await idle(page);
  await page.evaluate(() => window.__ew.step('up'));
  await idle(page);
  await page.evaluate(() => window.__ew.step('up'));
  await expect.poll(async () => { const p = await player(page); return p && !p.moving ? `${p.map}:${p.x},${p.y}` : ''; }, { timeout: 10_000 }).toBe('stormridge:32,15');

  // Mirefen Marsh: a wild battle against a Chapter Two creature
  await page.evaluate(() => window.__ew.warp('mirefen', 10, 6));
  await expect.poll(async () => (await player(page))?.map, { timeout: 10_000 }).toBe('mirefen');
  await idle(page);
  await page.evaluate(() => { void window.__ew.wildBattle('bogbloop', 2); });
  await finishBattle(page);
  expect(errors).toEqual([]);
});

test('continues a Chapter One (version 1) save', async ({ page }) => {
  const errors = trackErrors(page);
  const v1 = {
    version: 1, playerName: 'Wren', rivalStarter: 'puddlop', starter: 'kindlet', map: 'cindervale', x: 22, y: 7, dir: 'right',
    party: [{ uid: 'a', species: 'pyrolynx', level: 15, xp: 2700, hp: 40, ivs: { hp: 10, atk: 10, def: 10, spa: 10, spd: 10, spe: 10 }, moves: [{ id: 'scratch', pp: 35, maxPp: 35 }], status: null, statusTurns: 0 }],
    storage: [], bag: { bond_stone: 3, wildlog: 1 }, money: 2400,
    flags: { introDone: true, gotStarter: true, beatWarden: true }, seen: ['kindlet'], caught: ['kindlet'], defeatedTrainers: [],
    lastHearth: { map: 'hearth_cv', x: 6, y: 3 }, clock: 600, playTimeMs: 4_000_000,
    stats: { steps: 3000, battlesWon: 40, wildEncounters: 30, bonded: 4 }, savedAt: Date.now(),
  };
  await page.addInitScript((save) => { window.localStorage.setItem('emberwild.auto', save); }, JSON.stringify(v1));
  await page.goto('./');
  await expect.poll(() => page.evaluate(() => window.__ew?.scenes() ?? []), { timeout: 20_000 }).toContain('Title');
  await page.keyboard.press('Enter'); // Continue
  await expect.poll(async () => (await player(page))?.map, { timeout: 10_000 }).toBe('cindervale');
  const st = await page.evaluate(() => window.__ew.state());
  expect(st.version).toBe(2);
  expect(st.surfing).toBe(false);
  expect(st.party[0].species).toBe('pyrolynx');
  // The east gate is open after beating Corra: walk off the east edge onto Saltwind Road
  await idle(page);
  await page.keyboard.down('ArrowRight');
  await expect.poll(async () => (await player(page))?.map, { timeout: 15_000 }).toBe('route3');
  await page.keyboard.up('ArrowRight');
  expect(errors).toEqual([]);
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });

  /** Tap a point given in the game's own 960x540 coordinates. */
  async function tapGame(page: Page, gx: number, gy: number, holdMs = 60) {
    const box = (await page.locator('canvas').boundingBox())!;
    const x = box.x + (gx / 960) * box.width, y = box.y + (gy / 540) * box.height;
    await page.touchscreen.tap(x, y);
    await page.waitForTimeout(holdMs);
  }

  test('the opening can be played with touch alone', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto('./');
    await expect.poll(() => page.evaluate(() => window.__ew?.scenes() ?? []), { timeout: 20_000 }).toContain('Title');
    // the whole canvas fits on the screen
    const box = (await page.locator('canvas').boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(844 + 1);
    expect(box.y + box.height).toBeLessThanOrEqual(390 + 1);
    // A button: New Game, then through the intro until the player can move
    for (let i = 0; i < 80; i++) {
      const p = await player(page);
      if (p && !p.busy && !p.moving) break;
      await tapGame(page, 960 - 90, 540 - 140, 350);
    }
    await idle(page);
    // hold the D-pad: the player should walk
    const before = (await player(page))!;
    const pad = (await page.locator('canvas').boundingBox())!;
    const px = (gx: number) => pad.x + (gx / 960) * pad.width, py = (gy: number) => pad.y + (gy / 540) * pad.height;
    const cdp = await page.context().newCDPSession(page);
    let moved = false;
    for (const [dx, dy] of [[0, 58], [58, 0], [-58, 0], [0, -58]]) {
      const pt = { x: px(120 + dx), y: py(540 - 120 + dy) };
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [pt] });
      await page.waitForTimeout(700);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await idle(page);
      const now = (await player(page))!;
      if (now.x !== before.x || now.y !== before.y) { moved = true; break; }
    }
    expect(moved, 'holding the D-pad moves the player').toBe(true);
    expect(errors).toEqual([]);
  });
});
