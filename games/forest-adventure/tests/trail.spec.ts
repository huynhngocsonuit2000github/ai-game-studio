import { expect, test, type Page } from '@playwright/test';
import { STEP_MS } from '../src/session.ts';
import registry from '../../../registry/games.json' with { type: 'json' };
import { EXPANSION_SAVE_KEY } from '../src/save.ts';
import { expansionLevels, levels } from '../src/level.ts';
import replays from '../features/exp-10-trails/layouts/TRAIL_REPLAYS.json' with { type: 'json' };
import { oak, willow } from './campaign-routes.ts';

const released = registry.games.some(game => game.id === 'forest-adventure' && game.status === 'released');

// Capture the upper fork, the still-locked portal, and the canopy route.
const routeEvidenceTicks: Record<string, number> = { 'trail-02': 96, 'trail-06': 616, 'trail-08': 456 };

const prefix = '/ai-game-studio/';
const detail = `${prefix}#/games/forest-adventure`;
const game = `${prefix}games/forest-adventure/index.html`;
const coverPath = `${prefix}games/forest-adventure/cover.webp`;

// Use an exact 60 Hz frame source for the campaign routes. This controls
// elapsed time only. The browser still receives real keyboard events and
// Phaser runs its normal scene, simulation and rendering on each frame.
async function fixedFrameSource(page: Page) {
  await page.evaluate(() => {
    let timestamp = 0;
    let id = 0;
    const pending = new Map<number, FrameRequestCallback>();
    requestAnimationFrame(time => { timestamp = time; });
    window.requestAnimationFrame = callback => {
      pending.set(++id, callback);
      return id;
    };
    window.cancelAnimationFrame = request => { pending.delete(request); };
    Object.assign(window, { advanceTrailFrames: (ticks: number, interval: number) => {
      for (let tick = 0; tick < ticks; tick++) {
        timestamp += interval;
        const callbacks = [...pending.values()];
        pending.clear();
        for (const callback of callbacks) callback(timestamp);
      }
    } });
  });
  await page.clock.runFor(32);
  return (count: number) => page.evaluate(({ count, interval }) => {
    (window as unknown as { advanceTrailFrames: (ticks: number, step: number) => void })
      .advanceTrailFrames(count, interval);
  }, { count, interval: STEP_MS });
}

function watchErrors(page: Page, canceledCatalogCover?: string) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`${message.text()} ${message.location().url}`);
  });
  page.on('requestfailed', (request) => {
    const failure = request.failure()?.errorText;
    const pathname = new URL(request.url()).pathname;
    if (failure === 'net::ERR_ABORTED' && (pathname.endsWith('/favicon.png') || pathname === canceledCatalogCover)) return;
    errors.push(`${failure} ${request.url()}`);
  });
  page.on('response', (response) => {
    if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
  });
  return errors;
}

test('clears the whole campaign by keyboard from the Studio catalog and returns to Studio', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  // The portal can replace its cover element on navigation. Check the decoded
  // image and the HTTP response separately from canceled image requests.
  const errors = watchErrors(page, coverPath);
  const media: string[] = [];
  page.on('response', (response) => {
    if (/\.(png|webp|json)$/.test(response.url())) media.push(new URL(response.url()).pathname);
  });
  await page.clock.install();
  await page.goto(detail);
  await expect(page.getByRole('heading', { name: 'Forest Adventure 2D' })).toBeVisible();
  await expect(page.getByText(released ? 'Released' : 'In Development', { exact: true })).toBeVisible();
  await expect(page.locator('img[src$="/cover.webp"]')).toBeVisible();
  await page.locator('img[src$="/cover.webp"]').evaluate((node: HTMLImageElement) => node.decode());
  await page.getByRole('link', { name: released ? 'Play Now' : 'Play preview' }).click();
  await expect(page).toHaveURL(game);
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeFocused();
  const cover = await page.request.get(coverPath);
  expect(cover.ok()).toBe(true);
  expect(cover.headers()['content-type']).toBe('image/webp');
  const runtimeMedia = media.filter((path) => path.includes('/games/forest-adventure/assets/'));
  expect(new Set(runtimeMedia).size).toBeGreaterThanOrEqual(12);
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
  let advance = async (count: number) => {
    ticks += count;
    const until = Math.ceil(ticks * STEP_MS / 16) * 16;
    await page.clock.runFor(until - clock);
    clock = until;
  };
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
    await advance(count);
  }

  // First step, first gap, then the beetle approach and Seed 1.
  await page.screenshot({ path: testInfo.outputPath('trail-start.png') });
  await travel(41); await travel(14, 1, true);
  await page.screenshot({ path: testInfo.outputPath('trail-jump.png') });
  await travel(30, 1, true); await travel(14, 0); await travel(11);
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
  await expect(page.getByRole('button', { name: 'Next Trail' })).toBeFocused();
  await page.screenshot({ path: testInfo.outputPath('trail-cleared.png') });
  await page.keyboard.up('ArrowRight');
  activeDirection = null;

  advance = await fixedFrameSource(page);
  const progress = () => page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{}'), EXPANSION_SAVE_KEY);
  expect((await progress()).unlockedLevelIds).toEqual(['fernlight-trail', 'willow-run']);
  await page.getByRole('button', { name: 'Next Trail' }).click();
  await expect(page.locator('#chapter-name')).toHaveText('Willow Run');
  for (const [index, segment] of willow.entries()) {
    await travel(...segment);
    if (index === 14) {
      await expect(page.getByRole('status')).toHaveText('Checkpoint lit.');
      await page.screenshot({ path: testInfo.outputPath('willow-run.png') });
    }
  }
  await travel(24);
  await expect(page.getByRole('heading', { name: 'Trail cleared' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Next Trail' })).toBeFocused();
  await expect(page.getByText(/8\/8 fireflies/).first()).toBeVisible();
  expect((await progress()).unlockedLevelIds).toEqual(['fernlight-trail', 'willow-run', 'lantern-oak']);
  await page.keyboard.up('ArrowRight');
  activeDirection = null;
  await page.getByRole('button', { name: 'Next Trail' }).click();
  await expect(page.locator('#chapter-name')).toHaveText('Lantern Oak');
  for (const [index, segment] of oak.entries()) {
    await travel(...segment);
    if (index === 30) {
      await expect(page.getByRole('status')).toHaveText('Checkpoint lit.');
      await page.screenshot({ path: testInfo.outputPath('lantern-oak.png') });
    }
  }
  await travel(32);
  await expect(page.getByRole('heading', { name: 'The Lantern Oak wakes' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Next Trail' })).toBeFocused();
  await page.screenshot({ path: testInfo.outputPath('oak-finale.png') });
  expect((await progress()).bestByLevel['lantern-oak'].fireflies).toBe(8);
  await page.keyboard.up('ArrowRight');
  activeDirection = null;

  for (const level of expansionLevels) {
    const replay = replays.runs.find(({ levelId }) => levelId === level.id);
    if (!replay) throw new Error(`Missing replay for ${level.id}`);
    await test.step(`Clear ${level.name} by keyboard`, async () => {
      await page.getByRole('button', { name: 'Next Trail' }).click();
      await expect(page.getByRole('region', { name: `${level.name} playfield` })).toBeFocused();
      const ids = levels.slice(0, levels.indexOf(level) + 1).map(({ id }) => id);
      expect((await progress()).unlockedLevelIds).toEqual(ids);
      let elapsed = 0;
      const captureAt = routeEvidenceTicks[level.id];
      for (const [action, repeats] of replay.runsOfActions) {
        if (typeof action !== 'string' || typeof repeats !== 'number') throw new Error('Invalid replay action');
        const direction = action.startsWith('L') ? -1 : action.startsWith('R') ? 1 : 0;
        const edge = action.endsWith('J') || action.endsWith('P');
        const jump = action.endsWith('J') || action.endsWith('H');
        for (let repeat = 0; repeat < repeats; repeat++) {
          if (edge && jumpHeld) {
            await page.keyboard.up('Space');
            jumpHeld = false;
          }
          if (action.endsWith('P')) {
            await page.keyboard.down('Space');
            await page.keyboard.up('Space');
          }
          await travel(replays.ticksPerAction, direction, jump);
          elapsed += replays.ticksPerAction;
          if (elapsed === captureAt) {
            if (level.id === 'trail-06') await expect(page.locator('#hint')).toHaveText('Heartseeds needed: 1');
            await page.screenshot({ path: testInfo.outputPath(`${level.id}-route.jpg`), quality: 85 });
          }
        }
      }
      if (activeDirection) await page.keyboard.up(activeDirection);
      if (jumpHeld) await page.keyboard.up('Space');
      activeDirection = null;
      jumpHeld = false;
      const last = level === expansionLevels.at(-1);
      await expect(page.getByRole('heading', { name: last ? 'Forest Adventure complete' : 'Trail cleared' })).toBeVisible();
      await expect(page.locator('#seeds')).toHaveText('Heartseeds 3/3');
      await expect(page.getByText(/8\/8 fireflies · 0 falls or defeats/)).toBeVisible();
      expect((await progress()).bestByLevel[level.id]).toEqual({ ticks: replay.tickCount, fireflies: 8 });
      await expect(page.getByRole('button', { name: 'Next Trail' })).toHaveCount(Number(!last));
      await page.screenshot({ path: testInfo.outputPath(`${level.id}-cleared.png`) });
    });
  }
  const completed = await progress();
  expect(levels).toHaveLength(13);
  expect(Object.keys(completed.bestByLevel)).toEqual(levels.map(({ id }) => id));
  await page.getByRole('button', { name: 'Replay' }).click();
  await expect(page.locator('#seeds')).toHaveText('Heartseeds 0/3');
  expect(await progress()).toEqual(completed);
  await page.clock.resume();
  await page.reload();
  await page.getByRole('button', { name: 'Choose a trail' }).click();
  const choices = page.getByRole('dialog').getByRole('button');
  await expect(choices).toHaveText([...levels.map(({ name }) => name), 'Title screen']);
  await page.getByRole('button', { name: 'Fernlight Trail', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Fernlight Trail playfield' })).toBeFocused();
  await expect(page.locator('#seeds')).toHaveText('Heartseeds 0/3');
  expect(await progress()).toEqual(completed);
  await page.reload();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.locator('#chapter-name')).toHaveText(expansionLevels.at(-1)!.name);
  await expect(page.locator('#seeds')).toHaveText('Heartseeds 0/3');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'Paused' })).toBeVisible();
  await page.waitForLoadState('networkidle');

  await page.getByRole('link', { name: 'Back to Studio' }).click();
  await expect(page).toHaveURL(`${prefix}#/`);
  await expect(page.getByRole('heading', { name: 'Game Library' })).toBeVisible();
  const libraryCover = page.getByRole('list', { name: 'Game results' }).locator('img[src$="/cover.webp"]');
  await expect(libraryCover).toBeVisible();
  await libraryCover.evaluate((node: HTMLImageElement) => node.decode());
  await page.waitForLoadState('networkidle');
  expect(errors).toEqual([]);
});

test('direct entry, resize, explicit pause and ten confirmed restarts', async ({ page }, testInfo) => {
  const errors = watchErrors(page);
  expect((await page.goto(game))?.status()).toBe(200);
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await page.setViewportSize({ width: 960, height: 540 });
  await expect(page.locator('canvas')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(960);
  await page.screenshot({ path: testInfo.outputPath('fernlight-960.png') });
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
