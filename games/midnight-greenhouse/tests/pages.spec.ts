import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import process from "node:process";
import { fileURLToPath, URL } from "node:url";
import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { observeWebAudio } from './audio-observer.mjs';

const root = '/ai-game-studio/';
const game = root + 'games/midnight-greenhouse/index.html';
function clientErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (entry) => { if (entry.type() === 'error') errors.push(entry.text()); });
  page.on('response', (response) => { if (response.status() >= 400) errors.push(response.status() + ' ' + response.url()); });
  return errors;
}

async function start(page: Page) {
  await page.getByRole('button', { name: 'Vào nhà kính' }).click();
  await page.getByRole('button', { name: 'Chọn Sân Mưa' }).click();
  await page.getByRole('button', { name: 'Bắt đầu ca trực' }).click();
  await expect(page.getByRole('button', { name: /Tưới luống 1/ })).toBeVisible();
}

test('temporary catalog launch, keyboard placement, water, explicit pause and portal return', async ({ page }) => {
  const errors = clientErrors(page);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(root);
  await page.getByRole('link', { name: /Nhà Kính Sau Nửa Đêm/ }).click();
  await page.getByRole('link', { name: 'Play preview' }).click();
  await expect(page).toHaveURL(game);
  await start(page);
  await page.keyboard.press('2');
  const first = page.getByRole('button', { name: /Luống 1, ô 1/ });
  await first.focus();
  await page.keyboard.press('ArrowRight');
  const second = page.getByRole('button', { name: /Luống 1, ô 2/ });
  await expect(second).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(second).toHaveAccessibleName(/Dương Xỉ Nảy/);
  await expect(page.locator('#stock strong')).toHaveText('85');

  await page.getByRole('button', { name: /Tưới luống 2/ }).click();
  await expect(page.getByRole('button', { name: /Tưới luống 2/ })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: /Tưới luống 3/ }).click();
  await expect(page.getByRole('button', { name: /Tưới luống 3/ })).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('button', { name: 'Tạm dừng' }).click();
  const before = await page.locator('#time').innerText();
  await page.waitForTimeout(1150);
  await expect(page.locator('#time')).toHaveText(before);
  await page.getByRole('dialog').getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  await expect(page.locator('#time')).not.toHaveText(before);
  await page.getByRole('link', { name: 'Thư viện game (Game Library)', exact: true }).click();
  await page.getByRole('link', { name: 'Về thư viện game', exact: true }).click();
  await expect(page).toHaveURL(/\/ai-game-studio\/#\/$/);
  expect(errors).toEqual([]);
});

test('direct route has tappable outer lanes, rotate hint and persistent audio settings', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const errors = clientErrors(page);
  try {
    await page.goto(game);
    await start(page);
    const forecast = await page.locator('#threat').boundingBox();
    const board = await page.locator('#board').boundingBox();
    expect(forecast).not.toBeNull();
    expect(board).not.toBeNull();
    expect(forecast!.y + forecast!.height).toBeLessThan(board!.y);
    expect(board!.y + board!.height).toBeLessThan(391);
    for (const lane of [1, 4]) {
      const valve = await page.getByRole('button', { name: new RegExp('Tưới luống ' + lane) }).boundingBox();
      expect(valve!.width).toBeGreaterThanOrEqual(44);
      expect(valve!.height).toBeGreaterThanOrEqual(44);
    }
    await page.getByRole('button', { name: /Tưới luống 4/ }).tap();
    await expect(page.locator('.valve[aria-pressed=true]')).toHaveCount(1);
    await page.getByRole('button', { name: /Bình Hứng Mưa/ }).tap();
    await page.getByRole('button', { name: /Luống 1, ô 8/ }).tap();
    await expect(page.getByRole('button', { name: /Luống 1, ô 8/ })).toHaveAccessibleName(/Bình Hứng Mưa/);
    await page.getByRole('button', { name: 'Tháo cây' }).tap();
    await page.getByRole('button', { name: /Luống 1, ô 8/ }).tap();
    await expect(page.locator('#stock strong')).toHaveText('116');
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByText(/Xoay ngang màn hình/)).toBeVisible();
    await page.getByRole('button', { name: 'Cài đặt' }).tap();
    await page.getByLabel('Tắt tiếng').check();
    await page.getByLabel('Giảm chuyển động').check();
    await page.getByRole('button', { name: 'Xong' }).tap();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Chiến dịch' })).toBeVisible();
    await page.getByRole('button', { name: 'Cài đặt' }).tap();
    await expect(page.getByLabel('Tắt tiếng')).toBeChecked();
    await expect(page.getByLabel('Giảm chuyển động')).toBeChecked();
    expect(errors).toEqual([]);
  } finally { await context.close(); }
});

test('gesture-unlocked rain, music and delayed combat effects survive a pause and respect mute', async ({ browser }) => {
  test.setTimeout(60_000);
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await context.addInitScript(observeWebAudio);
  const page = await context.newPage();
  const errors = clientErrors(page);
  try {
    await page.goto(game);
    await start(page);
    await page.getByRole('button', { name: /Lan Sét/ }).click();
    await page.getByRole('button', { name: /Luống 2, ô 8/ }).click();
    await page.getByRole('button', { name: /Tưới luống 2/ }).click();
    const isPlaying = (cue: string) => page.waitForFunction((name) => {
      const running = (window as unknown as { greenhouseAudio: { starts: { url?: string; context: AudioContext; time: number }[] } }).greenhouseAudio;
      return running.starts.some(({ url, context, time }) =>
        url?.endsWith('/' + name + '.ogg') && context.state === 'running' && context.currentTime - time > 0.01);
    }, cue, { timeout: 43_000 });
    await isPlaying('ambient-rain');
    await isPlaying('music-watch');
    await page.getByRole('button', { name: 'Tạm dừng' }).click();
    await page.waitForFunction(() => {
      const { master } = (window as unknown as { greenhouseAudio: { master: GainNode } }).greenhouseAudio;
      return master.context.state === 'suspended';
    });
    await page.getByRole('dialog').getByRole('button', { name: 'Tiếp tục', exact: true }).click();
    await isPlaying('shock');
    await page.getByRole('button', { name: 'Cài đặt' }).click();
    await page.getByLabel('Tắt tiếng').check();
    await page.getByRole('button', { name: 'Xong' }).click();
    await page.waitForFunction(() => {
      const { master } = (window as unknown as { greenhouseAudio: { master: GainNode } }).greenhouseAudio;
      return master.gain.value === 0;
    });
    expect(errors).toEqual([]);
  } finally { await context.close(); }
});

test('keeps a legacy S03 result, unlocks only contiguous wins and loads the correct arena decks', async ({ page }) => {
  const errors = clientErrors(page);
  await page.goto(game);
  await page.evaluate(() => localStorage.setItem('midnight-greenhouse.progress.v1', JSON.stringify({
    version: 1, raincourt: { stars: 3, fastest: 429.5 }, 'lightning-dome': { stars: 3, fastest: 40 },
  })));
  await page.reload();
  await expect(page.getByRole('button', { name: 'Chơi lại Sân Mưa' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Chọn Hầm Bơm' })).toBeVisible();
  await expect(page.locator('[data-stage=lightning-dome]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Chọn Hầm Bơm' }).click();
  await page.getByRole('button', { name: 'Bắt đầu ca trực' }).click();
  await expect(page.locator('[data-arena=pump-gallery]')).toBeVisible();
  await expect(page.locator('.seed-card')).toHaveCount(5);
  await expect(page.getByRole('button', { name: /Rêu Thành/ })).toBeVisible();
  await page.evaluate(() => {
    const value = JSON.parse(localStorage.getItem('midnight-greenhouse.progress.v1') ?? '{}');
    value['pump-gallery'] = { stars: 2, fastest: 449 };
    delete value['lightning-dome'];
    localStorage.setItem('midnight-greenhouse.progress.v1', JSON.stringify(value));
  });
  await page.reload();
  await page.getByRole('button', { name: 'Chọn Đài Chớp' }).click();
  await page.getByRole('button', { name: 'Bắt đầu ca trực' }).click();
  await expect(page.locator('[data-arena=lightning-dome]')).toBeVisible();
  await expect(page.locator('.seed-card')).toHaveCount(6);
  await page.keyboard.press('6');
  await expect(page.getByRole('button', { name: /Lựu Cầu Chì/ })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: /Luống 2, ô 3/ }).click();
  await expect(page.getByRole('button', { name: /Luống 2, ô 3/ })).toHaveAccessibleName(/Lựu Cầu Chì/);
  expect(errors).toEqual([]);
});

test('corrupt progress and denied writes keep the opening playable without unlocking later stages', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('midnight-greenhouse.progress.v1', '{broken');
    Storage.prototype.setItem = () => { throw new DOMException('Denied', 'SecurityError'); };
  });
  await page.goto(game);
  await page.getByRole('button', { name: 'Cài đặt' }).click();
  await page.getByLabel('Tắt tiếng').check();
  await expect(page.getByText(/Trình duyệt đang chặn lưu/)).toBeVisible();
  await page.getByRole('button', { name: 'Xong' }).click();
  await start(page);
  await expect(page.locator('.seed-card')).toHaveCount(4);
});

// The temporary catalog worktree is removed by Studio after this suite.
// Preserve the standalone playtest build in the workflow's browser-evidence paths.
test.afterAll(async () => {
  const { GITHUB_ACTIONS, GITHUB_WORKSPACE, GITHUB_EVENT_PATH } = process.env;
  if (GITHUB_ACTIONS !== 'true' || !GITHUB_WORKSPACE || !GITHUB_EVENT_PATH) return;
  const gameDirectory = fileURLToPath(new URL('../', import.meta.url));
  const gameBuild = resolve(gameDirectory, '../../deployment/dist/games/midnight-greenhouse');
  const artifact = resolve(GITHUB_WORKSPACE,
    'games/midnight-greenhouse/test-results/pages-browser/midnight-greenhouse-campaign.zip');
  execFileSync(process.execPath, [resolve(gameDirectory, 'tests/playtest-artifact.mjs'),
    gameBuild, artifact, GITHUB_EVENT_PATH], { cwd: gameDirectory, stdio: 'inherit' });
});
