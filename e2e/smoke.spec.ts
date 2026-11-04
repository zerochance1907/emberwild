import { expect, test } from '@playwright/test';

type Ew = {
  scenes(): string[];
  player(): { x: number; y: number; map: string; busy: boolean; moving: boolean } | null;
  giveStarter(species?: string, level?: number): void;
  wildBattle(species: string, level: number): Promise<string>;
};
declare global {
  interface Window { __ew: Ew }
}

test('boots, starts a new game, walks, and finishes a battle without errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('./');
  await expect.poll(() => page.evaluate(() => window.__ew?.scenes() ?? []), { timeout: 20_000 }).toContain('Title');

  // Title -> New Game -> intro text -> pick the first name
  await page.keyboard.press('Enter');
  const player = () => page.evaluate(() => window.__ew.player());
  for (let i = 0; i < 60; i++) {
    const p = await player();
    if (p && !p.busy && !p.moving) break;
    await page.keyboard.press('Enter');
    await page.waitForTimeout(400);
  }
  const start = await player();
  expect(start?.map).toBe('home');

  // Walk with the real keyboard
  await page.keyboard.down('ArrowLeft');
  await page.waitForTimeout(700);
  await page.keyboard.up('ArrowLeft');
  await expect.poll(async () => (await player())?.x, { timeout: 5000 }).toBeLessThan(start!.x);

  // Get a partner and enter a wild battle
  await page.evaluate(() => {
    window.__ew.giveStarter('kindlet', 8);
    void window.__ew.wildBattle('mossgrub', 2);
  });
  await expect.poll(() => page.evaluate(() => window.__ew.scenes()), { timeout: 10_000 }).toContain('Battle');

  // Press Confirm repeatedly: picks Fight -> first move until the wild creature faints (or we flee)
  for (let i = 0; i < 120; i++) {
    const scenes = await page.evaluate(() => window.__ew.scenes());
    if (!scenes.includes('Battle')) break;
    await page.keyboard.press('Enter');
    await page.waitForTimeout(250);
  }
  await expect.poll(() => page.evaluate(() => window.__ew.scenes()), { timeout: 15_000 }).not.toContain('Battle');
  expect(await page.evaluate(() => window.__ew.scenes())).toContain('Overworld');
  expect(errors).toEqual([]);
});
