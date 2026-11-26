import { expect, test, type Page } from '@playwright/test';
import { STEP_MS } from '../src/session.ts';

const prefix = '/ai-game-studio/';
const detail = `${prefix}#/games/forest-adventure`;
const game = `${prefix}games/forest-adventure/index.html`;

function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`${message.text()} ${message.location().url}`);
  });
  page.on('requestfailed', (request) => {
    const failure = request.failure()?.errorText;
    if (failure === 'net::ERR_ABORTED' && request.url().endsWith('/favicon.png')) return;
    errors.push(`${failure} ${request.url()}`);
  });
  page.on('response', (response) => {
    if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
  });
  return errors;
}

test('launches from the development catalog, clears by keyboard and returns to Studio', async ({ page }, testInfo) => {
  const errors = watchErrors(page);
  const media: string[] = [];
  page.on('response', (response) => {
    if (/\.(png|webp|json)$/.test(response.url())) media.push(new URL(response.url()).pathname);
  });
  await page.clock.install();
  await page.goto(detail);
  await expect(page.getByRole('heading', { name: 'Forest Adventure 2D' })).toBeVisible();
  await expect(page.locator('img[src$="/cover.webp"]')).toBeVisible();
  await page.getByRole('link', { name: 'Play preview' }).click();
  await expect(page).toHaveURL(game);
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeFocused();
  expect([...new Set(media.filter((path) => path.endsWith('/cover.webp')))]).toEqual([
    `${prefix}games/forest-adventure/cover.webp`,
  ]);
  const runtimeMedia = media.filter((path) => path.includes('/games/forest-adventure/assets/'));
  expect(new Set(runtimeMedia).size).toBe(12);
  expect(runtimeMedia.every((path) => path.startsWith(prefix))).toBe(true);

  // Advance an emulated frame clock while sending actual browser keyboard events.
  // The route uses just the supported controls. Geometry and game state are never injected.
  await page.clock.pauseAt(await page.evaluate(() => Date.now()) + 250);
  await page.keyboard.press('Enter');
  await expect(page.locator('#playfield')).toBeFocused();
  await page.keyboard.press('KeyP');
  await expect(page.getByRole('button', { name: 'Resume' })).toBeFocused();
  await page.clock.runFor(3200);
  await page.keyboard.press('Enter');
  let ticks = 0;
  let clock = 0;
  let activeDirection: string | null = null;
  let jumpHeld = false;
  async function travel(count: number, direction = 1, jump = false) {
    const key = direction === 0 ? null : direction > 0 ? 'ArrowRight' : 'ArrowLeft';
    if (key !== activeDirection) {
      if (activeDirection) await page.keyboard.up(activeDirection);
      if (key) await page.keyboard.down(key);
      activeDirection = key;
    }
    if (jump !== jumpHeld) {
      if (jump) await page.keyboard.down('Space');
      else await page.keyboard.up('Space');
      jumpHeld = jump;
    }
    ticks += count;
    const until = Math.ceil(ticks * STEP_MS / 16) * 16;
    await page.clock.runFor(until - clock);
    clock = until;
  }

  // First step, first gap, then the beetle approach and Seed 1.
  await travel(41); await travel(44, 1, true); await travel(14, 0); await travel(11);
  await travel(44, 1, true); await travel(1);
  await travel(39, 1, true); await travel(54);
  await expect(page.locator('#seeds')).toHaveText('Heartseeds 1/3');
  await expect(page.locator('#fireflies')).toHaveText('Fireflies 4/8');
  await page.screenshot({ path: testInfo.outputPath('fernlight-trail.png') });

  // Jump the second gap and climb the optional high route. Drop and head left
  // to collect Seed 2 and touch the checkpoint from the lower path.
  await travel(12); await travel(46, 1, true); await travel(2);
  await travel(44, 1, true); await travel(2); await travel(40, 1, true);
  await travel(25); await travel(65, -1);
  await expect(page.locator('#seeds')).toHaveText('Heartseeds 2/3');
  await expect(page.locator('#fireflies')).toHaveText('Fireflies 6/8');
  await expect(page.getByRole('status')).toHaveText('Checkpoint lit.');
  await page.screenshot({ path: testInfo.outputPath('lantern-checkpoint.png') });

  // Cross the bramble then intentionally miss the last jump.
  await travel(48); await travel(40, 1, true); await travel(1); await travel(32, 1, true);
  await travel(35); await travel(30, 0);
  await expect(page.locator('#hint')).toHaveText('Back to the lantern');
  await travel(25, 0);
  await expect(page.locator('#hint')).toHaveText('');
  await expect(page.locator('#hearts')).toHaveText('Hearts 3/3');
  await expect(page.locator('#seeds')).toHaveText('Heartseeds 2/3');

  // A short jump collects the firefly over the brambles. Cross the last gap and
  // intentionally jump over Seed 3 before approaching the closed portal.
  await travel(36); await travel(40, 1, true); await travel(1);
  await travel(1, 1, true); await travel(47); await travel(44, 1, true);
  await travel(17); await travel(44, 1, true); await travel(78);
  await travel(5, 0);
  await expect(page.locator('#hint')).toHaveText('Heartseeds needed: 1');
  await expect(page.locator('#fireflies')).toHaveText('Fireflies 8/8');
  await page.screenshot({ path: testInfo.outputPath('closed-gate.png') });

  // Backtracking collects the skipped seed. Return to the open portal and finish.
  await travel(110, -1);
  await expect(page.locator('#seeds')).toHaveText('Heartseeds 3/3');
  await travel(99);
  await expect(page.locator('#hint')).toHaveText('Portal open. Reach the gate.');
  await page.screenshot({ path: testInfo.outputPath('open-gate.png') });
  await travel(42);
  await expect(page.getByRole('heading', { name: 'Trail cleared' })).toBeVisible();
  await expect(page.getByText(/20\.\d s · 8\/8 fireflies · 1 fall or defeat/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Replay' })).toBeFocused();
  await page.screenshot({ path: testInfo.outputPath('trail-cleared.png') });
  await page.keyboard.up('ArrowRight');

  await page.clock.resume();
  await page.getByRole('link', { name: 'Back to Studio' }).click();
  await expect(page).toHaveURL(`${prefix}#/`);
  await expect(page.getByRole('heading', { name: 'Game Library' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('direct entry, resize, explicit pause and ten confirmed restarts', async ({ page }) => {
  const errors = watchErrors(page);
  expect((await page.goto(game))?.status()).toBe(200);
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await page.setViewportSize({ width: 960, height: 540 });
  await expect(page.locator('canvas')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(960);
  await page.locator('canvas').click();
  await expect(page.locator('#playfield')).toBeFocused();

  await page.keyboard.down('KeyD');
  await expect(page.locator('#fireflies')).toHaveText('Fireflies 1/8');
  await page.keyboard.press('Escape');
  await page.keyboard.up('KeyD');
  await expect(page.getByRole('heading', { name: 'Paused' })).toBeVisible();
  const paused = await page.locator('canvas').evaluate((canvas) => (canvas as HTMLCanvasElement).toDataURL());
  await page.clock.install();
  await page.clock.runFor(1500);
  expect(await page.locator('canvas').evaluate((canvas) => (canvas as HTMLCanvasElement).toDataURL())).toBe(paused);
  await page.keyboard.press('Enter');
  await expect(page.locator('#playfield')).toBeFocused();

  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(page.getByRole('button', { name: 'Resume' })).toBeFocused();
  for (let attempt = 0; attempt < 10; attempt++) {
    if (attempt > 0) await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await page.keyboard.press('KeyR');
    await expect(page.getByRole('heading', { name: 'Restart trail?' })).toBeVisible();
    await page.getByRole('button', { name: 'Start over' }).click();
    await expect(page.locator('#playfield')).toBeFocused();
    await expect(page.locator('#hearts')).toHaveText('Hearts 3/3');
    await expect(page.locator('#seeds')).toHaveText('Heartseeds 0/3');
    await expect(page.locator('#fireflies')).toHaveText('Fireflies 0/8');
  }
  await expect(page.locator('canvas')).toHaveCount(1);
  expect(errors).toEqual([]);
});
