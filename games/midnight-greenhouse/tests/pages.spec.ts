import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath, URL } from 'node:url';
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

const tile = (page: Page, lane: number, column: number) => page.getByRole('button', { name: new RegExp(`Luống ${lane}, ô ${column}(?:,|$)`) });

async function start(page: Page) {
  await page.getByRole('button', { name: 'Chơi', exact: true }).click();
  await expect(page.locator('[data-arena=raincourt]')).toBeVisible();
}

test('public catalog launches one-click Sân Mưa, keyboard planting, pause and catalog return', async ({ page }) => {
  const errors = clientErrors(page);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(root);
  await page.getByRole('link', { name: /Nhà Kính Sau Nửa Đêm/ }).click();
  await page.getByRole('link', { name: 'Play preview' }).click();
  await expect(page).toHaveURL(game);
  await start(page);
  await expect(page.locator('#time')).toHaveText('Chuẩn bị · 6 giây');
  await expect(page.locator('.valve')).toHaveCount(0);
  await expect(page.locator('.tile')).toHaveCount(32);
  await expect(page.locator('[data-card=orchid]')).toHaveAccessibleName(/Mở khi báo đợt 3/);
  await page.keyboard.press('1');
  await tile(page, 2, 3).focus();
  await page.keyboard.press('ArrowRight');
  const fourth = tile(page, 2, 4);
  await expect(fourth).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(fourth).toHaveAccessibleName(/Dương Xỉ Nảy/);
  await expect(page.locator('#stock strong')).toHaveText('70');
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

test('touch lands on outer tiles and valves, and settings survive reload', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const errors = clientErrors(page);
  try {
    await page.goto(game);
    await page.getByRole('button', { name: 'Chơi', exact: true }).tap();
    const board = await page.locator('#board').boundingBox();
    expect(board!.y + board!.height).toBeLessThan(391);
    for (const lane of [1, 2, 3, 4]) {
      for (const column of [1, 8]) {
        const edge = tile(page, lane, column);
        const bounds = (await edge.boundingBox())!;
        expect(bounds.width).toBeGreaterThanOrEqual(44);
        expect(bounds.height).toBeGreaterThanOrEqual(44);
        expect(await edge.evaluate((node) => {
          const { x, y, width, height } = node.getBoundingClientRect();
          return document.elementFromPoint(x + width / 2, y + height * 0.8) === node;
        })).toBe(true);
      }
    }
    await page.locator('[data-card=pitcher]').tap();
    await tile(page, 1, 8).tap();
    await expect(tile(page, 1, 8)).toHaveAccessibleName(/Bình Hứng Mưa/);
    await page.getByRole('button', { name: 'Tháo cây' }).tap();
    await tile(page, 1, 8).tap();
    await expect(page.locator('#stock strong')).toHaveText('102');
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByText(/Xoay ngang màn hình/)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
    await page.getByRole('button', { name: 'Cài đặt' }).tap();
    await page.getByLabel('Tắt tiếng').check();
    await page.getByLabel('Giảm chuyển động').check();
    await page.getByRole('button', { name: 'Xong' }).tap();
    await page.reload();
    await page.getByRole('button', { name: 'Cài đặt' }).tap();
    await expect(page.getByLabel('Tắt tiếng')).toBeChecked();
    await expect(page.getByLabel('Giảm chuyển động')).toBeChecked();
    expect(errors).toEqual([]);
  } finally { await context.close(); }
});

test('actual tokens support pointer, key and auto credit without planting through a token', async ({ page }) => {
  test.setTimeout(57_000);
  const errors = clientErrors(page);
  await page.goto(game);
  await start(page);
  const seed = page.locator('[data-card=fern]');
  await seed.click();
  const first = page.getByRole('button', { name: 'Thu 28 Ánh Hạt', exact: true });
  await first.waitFor({ timeout: 20_000 });
  await first.click();
  await expect(page.locator('#stock strong')).toHaveText('168');
  await expect(seed).toHaveAttribute('aria-pressed', 'true');
  await expect(tile(page, 2, 2)).toHaveAccessibleName(/trống/);
  await tile(page, 2, 3).click();
  await expect(tile(page, 2, 3)).toHaveAccessibleName(/Dương Xỉ Nảy/);
  await first.waitFor({ timeout: 17_000 });
  await page.keyboard.press('s');
  await expect(page.locator('#stock strong')).toHaveText('126');
  await first.waitFor({ timeout: 17_000 });
  await expect(page.locator('#stock strong')).toHaveText('154', { timeout: 6000 });
  expect(errors).toEqual([]);
});

test('gesture-unlocked retro music and real Fern cue pause, resume and mute', async ({ browser }) => {
  test.setTimeout(45_000);
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await context.addInitScript(observeWebAudio);
  const page = await context.newPage();
  const errors = clientErrors(page);
  try {
    await page.goto(game);
    await start(page);
    await page.locator('[data-card=fern]').click();
    await tile(page, 2, 4).click();
    const isPlaying = (cue: string) => page.waitForFunction((name) => {
      const running = (window as unknown as { greenhouseAudio: { starts: { url?: string; context: AudioContext; time: number }[] } }).greenhouseAudio;
      return running.starts.some(({ url, context, time }) =>
        url?.endsWith('/' + name + '.ogg') && context.state === 'running' && context.currentTime - time > 0.01);
    }, cue, { timeout: 20_000 });
    await isPlaying('courtyard');
    await page.getByRole('button', { name: 'Tạm dừng' }).click();
    await page.waitForFunction(() => {
      const { master } = (window as unknown as { greenhouseAudio: { master: GainNode } }).greenhouseAudio;
      return master.context.state === 'suspended';
    });
    await page.getByRole('dialog').getByRole('button', { name: 'Tiếp tục', exact: true }).click();
    await isPlaying('fern');
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

test('legacy save unlocks only contiguous wins and later decks honor stage abilities', async ({ page }) => {
  const errors = clientErrors(page);
  await page.goto(game);
  const legacy = JSON.stringify({
    version: 1, raincourt: { stars: 3, fastest: 429.5 }, 'lightning-dome': { stars: 3, fastest: 40 },
  });
  await page.evaluate((value) => localStorage.setItem('midnight-greenhouse.progress.v1', value), legacy);
  await page.reload();
  await page.getByRole('button', { name: 'Chọn màn' }).click();
  await expect(page.getByText('Kỷ lục cũ')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Chơi lại Sân Mưa' })).toBeVisible();
  await expect(page.locator('[data-stage=lightning-dome]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Chơi Hầm Bơm' }).click();
  await expect(page.locator('.seed-card')).toHaveCount(5);
  await expect(page.locator('[data-card=moss]')).toBeVisible();
  await page.getByRole('button', { name: /Tưới luống 4/ }).click();
  await expect(page.locator('.valve[aria-pressed=true]')).toHaveCount(1);
  await expect(page.getByRole('button', { name: /Tưới luống 1/ })).toHaveAccessibleName(/Van hồi/);
  expect(await page.evaluate(() => localStorage.getItem('midnight-greenhouse.progress.v1'))).toBe(legacy);
  await page.evaluate(() => localStorage.setItem('midnight-greenhouse.retro.progress.v1',
    JSON.stringify({ version: 1, 'pump-gallery': { stars: 2, fastest: 290 } })));
  await page.reload();
  await page.getByRole('button', { name: 'Chơi', exact: true }).click();
  await expect(page.locator('[data-arena=lightning-dome]')).toBeVisible();
  await expect(page.locator('.seed-card')).toHaveCount(6);
  await page.keyboard.press('6');
  await expect(page.locator('[data-card=pod]')).toHaveAttribute('aria-pressed', 'true');
  await tile(page, 2, 3).click();
  await expect(tile(page, 2, 3)).toHaveAccessibleName(/Lựu Cầu Chì/);
  expect(errors).toEqual([]);
});

test('denied storage and corrupted saves keep the opening playable', async ({ page }) => {
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

test('Vietnamese guide browses, filters, preserves spoilers and returns to a frozen paused match', async ({ page }) => {
  const errors = clientErrors(page);
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(game);
  await expect(page.getByRole('button', { name: 'Chơi', exact: true })).toBeVisible();
  expect(requests.some((url) => url.includes('motion/') || url.endsWith('/guide.json'))).toBe(false);
  await page.locator('#title-guide').click();
  await expect(page.getByRole('heading', { name: 'Sổ tay Nhà Kính' })).toBeVisible();
  await expect(page.locator('.guide-entry')).toHaveCount(6);
  await expect(page.getByText('50 Ánh Hạt', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Quái', exact: true }).click();
  await page.getByRole('searchbox').fill('ao mua');
  await expect(page.locator('.guide-entry')).toHaveCount(1);
  await expect(page.getByRole('heading', { name: 'Áo Mưa' })).toBeVisible();
  await page.getByRole('searchbox').clear();
  await page.locator('[data-guide-id=porter]').click();
  await expect(page.locator('#guide-detail')).toContainText('Dương Xỉ');
  await page.locator('[data-guide-id=keeper]').click();
  await expect(page.locator('#guide-detail img')).toHaveCount(0);
  expect(requests.some((url) => url.endsWith('keeper.webp') || url.endsWith('keeper-motion.webp'))).toBe(false);
  await page.getByRole('button', { name: 'Hiện chi tiết boss' }).click();
  await page.getByRole('button', { name: 'Xem chuyển động' }).click();
  await expect(page.locator('#guide-clip')).toBeVisible();
  await page.locator('#guide-clip').selectOption('signal');
  await page.getByRole('button', { name: 'Dừng' }).click();
  expect(requests.filter((url) => url.endsWith('-motion.webp')).length).toBe(1);
  await page.getByRole('button', { name: 'Kỹ năng', exact: true }).click();
  await expect(page.locator('.guide-entry')).toHaveCount(5);
  await expect(page.locator('#guide-detail')).toContainText('Trồng và tháo cây');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await page.locator('#guide-back').click();
  await expect(page.locator('#title-guide')).toBeFocused();
  await page.locator('#choose-stage').click();
  await page.locator('#map-guide').click();
  await page.locator('#guide-back').click();
  await expect(page.locator('#map-guide')).toBeFocused();
  await page.setViewportSize({ width: 844, height: 390 });
  await page.locator('[data-stage=raincourt]').click();
  await page.locator('#pause').click();
  const status = await page.locator('#time').innerText();
  const stock = await page.locator('#stock strong').innerText();
  await page.locator('#pause-guide').click();
  await expect(page.getByRole('heading', { name: 'Sổ tay Nhà Kính' })).toBeVisible();
  await page.waitForTimeout(1350);
  await page.locator('#guide-back').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('#time')).toHaveText(status);
  await expect(page.locator('#stock strong')).toHaveText(stock);
  await page.locator('#resume').click();
  await expect(page.locator('#time')).not.toHaveText(status);
  expect(errors).toEqual([]);
});

test('guide deep entry resolves safely with the project-subpath route', async ({ page }) => {
  await page.goto(game + '#so-tay/enemies/raincoat');
  await expect(page.getByRole('heading', { name: 'Áo Mưa' })).toBeVisible();
  await page.goBack().catch(() => null);
  await page.goto(game + '#so-tay/enemies/raincoat');
  await page.locator('#guide-back').click();
  await expect(page.getByRole('button', { name: 'Chơi', exact: true })).toBeVisible();
  await expect(page).toHaveURL(game);
});

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

test('the battlefield fills desktop viewports and preserves combat through fullscreen, resize and DPR changes', async ({ page }) => {
  const errors = clientErrors(page);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto(game);
  await start(page);
  const board = page.locator('#board');
  const canvas = board.locator('canvas');
  async function checkLayout(width: number, height: number) {
    const bounds = (await board.boundingBox())!;
    expect(bounds.width).toBeGreaterThanOrEqual(width === 1920 ? 1480 : width * 0.77);
    expect(bounds.height).toBeGreaterThanOrEqual(height === 1080 ? 850 : height * 0.79);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    const edges = await board.locator('.tiles').evaluateAll((rows) => rows.flatMap((row) =>
      [row.firstElementChild!, row.lastElementChild!].map((cell) => {
        const { x, y, width, height } = cell.getBoundingClientRect();
        return document.elementFromPoint(x + width / 2, y + height * 0.8) === cell;
      })));
    expect(edges).toEqual(Array(8).fill(true));
  }
  await checkLayout(1920, 1080);
  await page.keyboard.press('1');
  const planted = tile(page, 2, 4);
  await planted.click();
  await expect(planted).toHaveAccessibleName(/Dương Xỉ Nảy/);
  await expect(page.locator('#time')).toHaveText(/Ca trực/, { timeout: 10_000 });
  expect(await page.evaluate(() => document.fullscreenEnabled)).toBe(true);
  await page.getByRole('button', { name: 'Toàn màn hình', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Thoát toàn màn hình' })).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => page.evaluate(() => document.fullscreenElement === document.documentElement)).toBe(true);
  await page.getByRole('button', { name: 'Thoát toàn màn hình' }).click();
  await expect(page.getByRole('button', { name: 'Toàn màn hình', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await page.setViewportSize({ width: 1280, height: 720 });
  await checkLayout(1280, 720);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 2560, height: 1440, deviceScaleFactor: 3, mobile: false });
  await checkLayout(2560, 1440);
  await expect.poll(() => canvas.evaluate((node: HTMLCanvasElement) => ({
    dpr: devicePixelRatio, scaled: node.width > node.clientWidth, capped: node.width * node.height <= 6_000_000,
  }))).toEqual({ dpr: 3, scaled: true, capped: true });
  await page.locator('[data-card=pitcher]').click();
  await tile(page, 4, 8).click();
  await expect(tile(page, 4, 8)).toHaveAccessibleName(/Bình Hứng Mưa/);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await checkLayout(1920, 1080);
  await expect(planted).toHaveAccessibleName(/Dương Xỉ Nảy/);
  await expect(tile(page, 4, 8)).toHaveAccessibleName(/Bình Hứng Mưa/);
  await expect(page.locator('#time')).toHaveText(/Ca trực/);
  expect(errors).toEqual([]);
});

test('unsupported fullscreen explains the windowed fallback while combat stays usable', async ({ page }) => {
  const errors = clientErrors(page);
  await page.addInitScript(() => Object.defineProperty(document, 'fullscreenEnabled', { value: false }));
  await page.goto(game);
  await start(page);
  await page.getByRole('button', { name: 'Toàn màn hình', exact: true }).click();
  await expect(page.locator('#fullscreen-status')).toHaveText(/vừa cửa sổ/);
  await page.locator('[data-card=fern]').click();
  await tile(page, 2, 4).click();
  await expect(tile(page, 2, 4)).toHaveAccessibleName(/Dương Xỉ Nảy/);
  expect(errors).toEqual([]);
});

test('a planted Fern uses changing live atlas poses, and reduced motion still shows its attack pose', async ({ browser }) => {
  for (const reducedMotion of ['no-preference', 'reduce'] as const) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, reducedMotion });
    try {
      const page = await context.newPage();
      const errors = clientErrors(page);
      await page.addInitScript(() => {
        const frames = new Set<string>();
        const bodyAngles = { idle: [0, 0], windup: 0, fire: 0 };
        Object.defineProperty(window, '__fernProbe', { get: () => ({ frames: [...frames], bodyAngles }) });
        const draw = CanvasRenderingContext2D.prototype.drawImage;
        CanvasRenderingContext2D.prototype.drawImage = function (this: CanvasRenderingContext2D, image: CanvasImageSource, ...args: number[]) {
          if (this.canvas.closest('#board') && image instanceof HTMLImageElement
            && image.src.endsWith('/fern-motion.webp') && args.length === 8 && this.globalAlpha > 0.99) {
            const row = args[1] / args[3];
            frames.add(`${row}:${args[0] / args[2]}`);
            const matrix = this.getTransform();
            const lean = matrix.c === 0 ? 0 : -matrix.c / matrix.a;
            if (row === 0) {
              bodyAngles.idle[0] = Math.min(bodyAngles.idle[0], lean);
              bodyAngles.idle[1] = Math.max(bodyAngles.idle[1], lean);
            } else if (row === 1) bodyAngles.windup = Math.min(bodyAngles.windup, lean);
            else if (row === 2) bodyAngles.fire = Math.max(bodyAngles.fire, lean);
          }
          Reflect.apply(draw, this, [image, ...args]);
        };
      });
      await page.goto(game);
      await start(page);
      await page.locator('[data-card=fern]').click();
      await tile(page, 2, 4).click();
      await expect(tile(page, 2, 4)).toHaveAccessibleName(/Dương Xỉ Nảy/);
      const probe = () => page.evaluate(() => (window as Window & {
        __fernProbe: { frames: string[]; bodyAngles: { idle: number[]; windup: number; fire: number } };
      }).__fernProbe);
      const frames = async () => (await probe()).frames;
      if (reducedMotion === 'no-preference') {
        await expect.poll(async () => (await frames()).filter((cell) => cell.startsWith('0:')).length).toBeGreaterThan(2);
        await expect.poll(async () => (await frames()).filter((cell) => cell.startsWith('2:')).length,
          { timeout: 15_000 }).toBeGreaterThan(1);
        expect((await frames()).some((cell) => cell.startsWith('1:'))).toBe(true);
        const { bodyAngles } = await probe();
        expect(bodyAngles.idle[1] - bodyAngles.idle[0]).toBeGreaterThan(.25);
        expect(bodyAngles.windup).toBeLessThan(-.2);
        expect(bodyAngles.fire).toBeGreaterThan(.35);
      } else {
        await expect.poll(frames, { timeout: 15_000 }).toEqual(['0:2', '1:2', '2:2']);
        expect((await probe()).bodyAngles).toEqual({ idle: [0, 0], windup: 0, fire: 0 });
      }
      expect(errors).toEqual([]);
    } finally { await context.close(); }
  }
});
