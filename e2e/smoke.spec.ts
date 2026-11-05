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
