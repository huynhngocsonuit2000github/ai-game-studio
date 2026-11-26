import { expect, test } from '@playwright/test';
import registry from '../../../registry/games.json' with { type: 'json' };
import { SAVE_KEY } from '../src/save.ts';

const campaign = Boolean(process.env.FOREST_CAMPAIGN_SITE) ||
  registry.games.some(game => game.id === 'forest-adventure' && game.status === 'released');
const game = '/ai-game-studio/games/forest-adventure/index.html';

test.skip(!campaign, 'This build only contains the S01 preview media.');

test('recovers from a missing required texture and supports keyboard settings', async ({ page }, testInfo) => {
  const asset = /\/assets\/bg-fernlight-[^/]+\.webp$/;
  await page.route(asset, route => route.abort());
  await page.goto(game);
  await expect(page.getByRole('heading', { name: 'Trail could not load' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Retry' })).toBeFocused();
  await page.unroute(asset);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeFocused();
  await page.setViewportSize({ width: 960, height: 540 });
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Settings' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('slider', { name: 'Master volume' })).toBeFocused();
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('checkbox', { name: 'Mute audio' })).toBeFocused();
  await page.keyboard.press('Space');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('checkbox', { name: 'Reduced motion' })).toBeFocused();
  await page.keyboard.press('Space');
  await page.screenshot({ path: testInfo.outputPath('settings-960.png') });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Settings' })).toBeFocused();
  await page.reload();
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByRole('slider', { name: 'Master volume' })).toHaveValue('1');
  await expect(page.getByRole('checkbox', { name: 'Mute audio' })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: 'Reduced motion' })).toBeChecked();
});

test('corrupt and unavailable storage retain a playable first trail', async ({ page }) => {
  await page.goto(game);
  await page.evaluate(key => localStorage.setItem(key, '{broken'), SAVE_KEY);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeFocused();
  await expect(page.getByRole('button', { name: 'Continue' })).toHaveCount(0);
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Blocked', 'SecurityError'); } });
  });
  await page.reload();
  await expect(page.getByText('Progress and settings can only be kept until this tab reloads.')).toBeVisible();
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Fernlight Trail playfield' })).toBeFocused();
  await page.keyboard.down('ArrowRight');
  await expect(page.locator('#fireflies')).toHaveText('Fireflies 1/8');
  await page.keyboard.up('ArrowRight');
});

test('unlocks decoded Web Audio after Play and applies pause, mute and resume', async ({ page }) => {
  await page.addInitScript(() => {
    const sources: AudioBufferSourceNode[] = [];
    const gains: GainNode[] = [];
    const createSource = AudioContext.prototype.createBufferSource;
    const createGain = AudioContext.prototype.createGain;
    AudioContext.prototype.createBufferSource = function () {
      const source = createSource.call(this);
      sources.push(source);
      return source;
    };
    AudioContext.prototype.createGain = function () {
      const gain = createGain.call(this);
      gains.push(gain);
      return gain;
    };
    Object.assign(window, { audioProbe: () => ({
      state: gains[0]?.context.state,
      master: gains[0]?.gain.value,
      score: gains[3]?.gain.value,
      loops: sources.filter(source => source.loop).map(source => source.loopEnd),
    }) });
  });
  const readAudio = () => page.evaluate(() => (window as unknown as {
    audioProbe(): { state: string; master: number; score: number; loops: number[] };
  }).audioProbe());
  await page.goto(game);
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeFocused();
  expect((await readAudio()).loops).toEqual([]);
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await readAudio()).state).toBe('running');
  await expect.poll(async () => (await readAudio()).loops.sort((a, b) => a - b)).toEqual([12, 35.55555555555556]);
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await readAudio()).score).toBeLessThan(.04);
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('checkbox', { name: 'Mute audio' }).check();
  expect((await readAudio()).master).toBe(0);
  await page.getByRole('checkbox', { name: 'Mute audio' }).uncheck();
  expect((await readAudio()).master).toBeCloseTo(.7);
  await page.getByRole('button', { name: 'Done' }).click();
  await page.getByRole('button', { name: 'Resume' }).click();
  await expect.poll(async () => (await readAudio()).score).toBeGreaterThan(.96);
  expect((await readAudio()).loops).toHaveLength(2);
});

test('uses AAC after a Vorbis decode failure and skips optional foliage when unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...args) {
      start.apply(this, args);
      if (this.loop && this.loopEnd > 30) document.documentElement.dataset.themeDecoded = 'true';
    };
  });
  const response = page.waitForResponse(event => /fernlight-theme-[^/]+\.m4a$/.test(event.url()));
  await page.route(/fernlight-theme-[^/]+\.ogg$/, route => route.fulfill({ status: 200, body: 'Invalid audio' }));
  await page.route(/bg-near-[^/]+\.webp$/, route => route.abort());
  await page.goto(game);
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Fernlight Trail playfield' })).toBeFocused();
  expect((await response).ok()).toBe(true);
  await expect(page.locator('html')).toHaveAttribute('data-theme-decoded', 'true');
  await page.keyboard.down('ArrowRight');
  await expect(page.locator('#fireflies')).toHaveText('Fireflies 1/8');
  await page.keyboard.up('ArrowRight');
});

test('retries a deferred backdrop, keeps saved progress and fits the supported desktop sizes', async ({ page }, testInfo) => {
  const backdrop = /\/bg-willow-[^/]+\.webp$/;
  await page.addInitScript(key => {
    localStorage.setItem(key, JSON.stringify({
      schemaVersion: 1, unlockedLevelIds: ['fernlight-trail', 'willow-run'],
      bestByLevel: { 'fernlight-trail': { ticks: 1100, fireflies: 8 } },
    }));
  }, SAVE_KEY);
  await page.route(backdrop, route => route.abort());
  await page.goto(game);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'Trail could not load' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Retry' })).toBeFocused();
  await page.unroute(backdrop);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('region', { name: 'Willow Run playfield' })).toBeFocused();
  await expect(page.locator('#seeds')).toHaveText('Heartseeds 0/3');

  for (const [width, height] of [[960, 540], [1366, 768], [1920, 1080]] as const) {
    await page.setViewportSize({ width, height });
    const pause = page.getByRole('button', { name: 'Pause', exact: true });
    await expect(pause).toBeInViewport({ ratio: 1 });
    await expect(page.locator('#fireflies')).toBeInViewport({ ratio: 1 });
    await expect.poll(async () => {
      const bounds = await page.locator('canvas').boundingBox();
      return Math.round(bounds?.width ?? 0);
    }).toBeLessThanOrEqual(width);
    await page.screenshot({ path: testInfo.outputPath(`willow-${width}.png`) });
  }
  await expect(page.locator('canvas')).toHaveCount(1);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByText('Play with a keyboard in landscape.').first()).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Resume' })).toBeFocused();
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? '{}').bestByLevel, SAVE_KEY))
    .toEqual({ 'fernlight-trail': { ticks: 1100, fireflies: 8 } });
});
