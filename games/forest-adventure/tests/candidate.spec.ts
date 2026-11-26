import { expect, test } from '@playwright/test';
import { SAVE_KEY } from '../src/save.ts';

const candidate = Boolean(process.env.FOREST_CAMPAIGN_SITE);
const game = '/ai-game-studio/games/forest-adventure/index.html';

test.skip(!candidate, 'The campaign media and settings are only in the local review build.');

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
  const response = page.waitForResponse(event => /fernlight-theme-[^/]+\.m4a$/.test(event.url()));
  await page.route(/fernlight-theme-[^/]+\.ogg$/, route => route.fulfill({ status: 200, body: 'Invalid audio' }));
  await page.route(/bg-near-[^/]+\.webp$/, route => route.abort());
  await page.goto(game);
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Fernlight Trail playfield' })).toBeFocused();
  expect((await response).ok()).toBe(true);
  await page.keyboard.down('ArrowRight');
  await expect(page.locator('#fireflies')).toHaveText('Fireflies 1/8');
  await page.keyboard.up('ArrowRight');
});
