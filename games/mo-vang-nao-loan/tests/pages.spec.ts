import { expect, test } from '@playwright/test';
import type { Page, TestInfo } from '@playwright/test';
import type { Entry, MineEvent, Scenario, Treasure } from '../src/mine.js';

const base = '/ai-game-studio/';
const game = base + 'games/mo-vang-nao-loan/index.html';
type Snapshot = {
  screen: string;
  time: number;
  remaining: number;
  earnings: number;
  wallet: number;
  angle: number;
  phase: string;
  target?: string;
  canCut: boolean;
  treasure: Treasure[];
  entry: Entry;
  effects: { potion: number; magnet: number };
  events: MineEvent[];
  frameSamples: number[];
};
declare global {
  interface Window {
    mineDiagnostics: () => Snapshot;
  }
}

const seeds = { 'an-tien': 1, 'vat-pham': 1234, da: 1600 } as const;
async function instrument(page: Page, seed?: keyof typeof seeds) {
  const fixture = seed ? {
    title: 'Tám giây cuối ca',
    intro: 'Còn 8 giây và thiếu 200 vàng. Kéo hai cục vàng nhỏ, hoặc thử vận may với rương sâu.',
    guide: 'Hai cục vàng nhỏ, mỗi cục +100. Rương sâu có thể cho +350, vật phẩm hoặc đá.',
    duration: 8,
    earnings: 400,
    seed: seeds[seed],
    treasure: [
      { id: 'safe-left', kind: 'small', x: 352, y: 307, radius: 18 },
      { id: 'safe-right', kind: 'small', x: 495, y: 304, radius: 18 },
      { id: 'chest', kind: 'chest', x: 420, y: 493, radius: 24 },
    ],
  } satisfies Scenario & { title: string; intro: string; guide: string } : undefined;
  await page.route('**/mo-vang-nao-loan/bootstrap.js', (route) => route.fulfill({
    contentType: 'text/javascript',
    body: "import { startGame } from './main.js';\nstartGame(" + JSON.stringify({ diagnostics: true, fixture }) + ");",
  }));
  await page.goto(game);
}

function read(page: Page) {
  return page.evaluate(() => window.mineDiagnostics());
}

function audit(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', (response) => { if (!response.ok() && response.status() >= 400) errors.push(response.status() + ' ' + response.url()); });
  page.on('requestfailed', (request) => {
    if (request.failure()?.errorText !== 'net::ERR_ABORTED') errors.push(request.url() + ' ' + request.failure()?.errorText);
  });
  return errors;
}

async function start(page: Page) {
  await page.getByRole('button', { name: 'Bắt đầu', exact: true }).click();
}

async function waitAim(page: Page, id: string, after = 0) {
  await page.waitForFunction(({ id, after }) => {
    const state = window.mineDiagnostics();
    return state.phase === 'aim' && state.time >= after && state.treasure.some((item) =>
      item.id === id && Math.abs(state.angle - Math.atan2(item.x - 420, item.y - 108)) <= .022);
  }, { id, after }, { timeout: 8_000 });
}

async function castAt(page: Page, id: string, touch = false, after = 0) {
  await waitAim(page, id, after);
  if (touch) {
    const field = await page.locator('canvas').boundingBox();
    expect(field).not.toBeNull();
    await page.touchscreen.tap(field!.x + field!.width * .5, field!.y + field!.height * .55);
  } else await page.keyboard.press('Space');
  await page.waitForFunction((id) => window.mineDiagnostics().events.some((event) =>
    event.action === 'bank' && event.target === id), id, { timeout: 8_000 });
}

async function measure(page: Page, testInfo: TestInfo, path: string, control: string, errors: string[]) {
  const state = await read(page);
  expect(errors).toEqual([]);
  const sorted = [...state.frameSamples].sort((a, b) => a - b);
  const medianFrame = sorted[Math.floor(sorted.length / 2)];
  const metrics = {
    path, control, viewport: page.viewportSize(), browser: page.context().browser()?.version(),
    medianFrameMs: Math.round(medianFrame * 100) / 100,
    frameCount: sorted.length,
    events: state.events.map((event) => ({ ...event, time: Number(event.time.toFixed(4)) })),
    consoleAndNetworkErrors: errors,
  };
  await testInfo.attach('timing', { body: JSON.stringify(metrics, null, 2), contentType: 'application/json' });
  process.stdout.write(JSON.stringify(metrics) + '\n');
  return { state, medianFrame };
}

for (const fps of [60, 30]) {
  for (const route of ['safe', 'chest'] as const) {
    test(`${route} route at ${fps} fps`, async ({ browser }, testInfo) => {
      const touch = fps === 30;
      const context = await browser.newContext({
        viewport: touch ? { width: 390, height: 844 } : { width: 1366, height: 768 },
        hasTouch: touch,
        isMobile: touch,
        deviceScaleFactor: 1,
      });
      if (touch) {
        await context.addInitScript(() => {
          const native = window.requestAnimationFrame.bind(window);
          window.requestAnimationFrame = (callback) => native(() => native(callback));
        });
      }
      const page = await context.newPage();
      try {
        const errors = audit(page);
        await instrument(page, 'an-tien');
        await start(page);
        await expect(page.locator('#fixture-guide')).toContainText('Rương sâu');
        if (route === 'safe') {
          await castAt(page, 'safe-left', touch);
          await castAt(page, 'safe-right', touch);
        } else if (touch) {
          const field = (await page.locator('canvas').boundingBox())!;
          await page.waitForFunction(() => window.mineDiagnostics().time > .11);
          await page.touchscreen.tap(field.x + field.width * .5, field.y + field.height * .55);
        } else {
          await page.waitForFunction(() => window.mineDiagnostics().time > .11);
          await page.keyboard.press('Space');
        }
        await expect(page.getByRole('heading', { name: 'Quầy tiếp tế' })).toBeVisible();
        const { state, medianFrame } = await measure(page, testInfo, route + '-' + fps, touch ? 'touch' : 'Space', errors);
        expect(medianFrame).toBeGreaterThan(fps === 60 ? 14 : 28);
        expect(medianFrame).toBeLessThan(fps === 60 ? 20 : 39);
        const banks = state.events.filter((event) => event.action === 'bank');
        const last = banks.at(-1)!;
        if (route === 'safe') {
          expect(banks.map(({ target, value }) => [target, value])).toEqual([['safe-left', 100], ['safe-right', 100]]);
          expect(last.time).toBeGreaterThanOrEqual(6);
          expect(last.time).toBeLessThanOrEqual(7.5);
        } else {
          expect(banks.map(({ roll, value }) => [roll, value])).toEqual([['cash', 350]]);
          expect(last.time).toBeGreaterThanOrEqual(5);
          expect(last.time).toBeLessThanOrEqual(7);
        }
        expect(state.events.at(-1)).toMatchObject({ action: 'result', time: 8, passed: true });
        if (touch && route === 'safe') {
          const exit = page.getByRole('button', { name: 'Bỏ qua · Tập lại Mỏ 1' });
          await expect(exit).toBeInViewport();
          const horizontalFit = await page.locator('.slate').evaluate((node) => node.getBoundingClientRect().right <= innerWidth);
          expect(horizontalFit).toBe(true);
          await page.screenshot({ path: testInfo.outputPath('mobile-shop.png'), fullPage: true });
          const targets = await page.locator('.shop-target').evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().height));
          expect(Math.min(...targets)).toBeGreaterThanOrEqual(44);
          await exit.tap();
          await expect(page.locator('#shift')).toContainText('TẬP LẠI');
        }
      } finally {
        await context.close();
      }
    });
  }
}

for (const [seed, roll, value] of [['vat-pham', 'supply', 0], ['da', 'rock', 15]] as const) {
  test(`failed chest gamble with ${roll}`, async ({ page }, testInfo) => {
    const errors = audit(page);
    await instrument(page, seed);
    await start(page);
    await page.waitForFunction(() => window.mineDiagnostics().time > .11);
    await page.keyboard.press('Space');
    await expect(page.getByRole('heading', { name: 'Hết giờ!' })).toBeVisible();
    const { state } = await measure(page, testInfo, seed, 'Space', errors);
    expect(state.events.filter((event) => event.action === 'bank')).toEqual([
      expect.objectContaining({ target: 'chest', roll, value }),
    ]);
    expect(state.events.at(-1)).toMatchObject({ action: 'result', time: 8, passed: false });
    if (seed !== 'da') return;
    await page.getByRole('button', { name: 'Thử lại' }).click();
    expect((await read(page)).treasure.map(({ id }) => id)).toEqual(['safe-left', 'safe-right', 'chest']);
    await expect(page.locator('#wallet')).toHaveText('400 vàng');
    await page.waitForFunction(() => window.mineDiagnostics().time > .11);
    await page.keyboard.press('Space');
    await page.waitForFunction(() => window.mineDiagnostics().events.some(({ action }) => action === 'bank'));
    expect((await read(page)).events.find(({ action }) => action === 'bank')).toMatchObject({ roll: 'rock', value: 15 });
  });
}

test('a loaded hook at timeout never credits the delivery', async ({ page }) => {
  const errors = audit(page);
  await instrument(page, 'an-tien');
  await start(page);
  await waitAim(page, 'safe-left', 5.6);
  await page.keyboard.press('Space');
  await expect(page.getByRole('heading', { name: 'Hết giờ!' })).toBeVisible();
  const state = await read(page);
  expect(state.events).toEqual([
    expect.objectContaining({ action: 'cast' }),
    expect.objectContaining({ action: 'latch', target: 'safe-left' }),
    { action: 'result', time: 8, passed: false },
  ]);
  expect(state.phase).toBe('reel');
  expect(state.wallet).toBe(400);
  expect(errors).toEqual([]);
});

test('normal mine via the catalog, shop scan, save, practice items and replay', async ({ page }, testInfo) => {
  const errors = audit(page);
  await page.goto(base);
  await page.getByText('Mỏ Vàng Náo Loạn', { exact: true }).first().click();
  const launch = page.locator('a[href*="games/mo-vang-nao-loan/index.html"]');
  await expect(launch).toBeVisible();
  const actualEntry = await launch.getAttribute('href');
  expect(new URL(actualEntry!, page.url()).pathname).toBe(game);
  await launch.click();
  await expect(page).toHaveTitle('Mỏ Vàng Náo Loạn');
  await expect(page.locator('#clock')).toHaveText('75,0 s');
  await start(page);
  await page.waitForTimeout(155);
  await page.keyboard.press('Space');
  await expect(page.locator('#wallet')).toHaveText('100 vàng');
  await instrument(page);
  await expect(page.locator('#wallet')).toHaveText('0 vàng');
  await expect(page.locator('#clock')).toHaveText('75,0 s');
  await page.getByRole('button', { name: 'Tắt âm thanh' }).click();
  await page.getByRole('button', { name: 'Giảm chuyển động' }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Bật âm thanh' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Bật chuyển động trang trí' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Bật âm thanh' }).click();
  await page.getByRole('button', { name: 'Bật chuyển động trang trí' }).click();
  await start(page);
  await expect(page.getByRole('button', { name: 'Thả móc' })).toBeInViewport();
  await page.screenshot({ path: testInfo.outputPath('mine-one.png') });
  await page.locator('canvas').screenshot({ path: testInfo.outputPath('mine-cover.png') });
  for (const id of ['gold-1', 'gold-7', 'gold-8', 'gold-3']) await castAt(page, id);
  expect((await read(page)).earnings).toBe(640);
  await expect(page.locator('#shortfall')).toHaveText('Đủ chỉ tiêu');
  await expect(page.getByRole('heading', { name: 'Quầy tiếp tế' })).toBeVisible({ timeout: 80_000 });
  const { state } = await measure(page, testInfo, 'normal-mine', 'Space', errors);
  expect(state.events.at(-1)).toMatchObject({ action: 'result', time: 75, passed: true });
  await expect(page.locator('#wallet')).toHaveText('640 vàng');
  await expect(page.locator('#buy-scissors')).toHaveClass(/scanned/);
  await page.keyboard.down('Space');
  await page.keyboard.down('Space');
  await page.keyboard.up('Space');
  await expect(page.locator('#wallet')).toHaveText('580 vàng');
  await page.locator('#buy-potion').click();
  await page.locator('#buy-magnet').click();
  await expect(page.locator('#wallet')).toHaveText('350 vàng');
  await page.reload();
  await expect(page.locator('#wallet')).toHaveText('350 vàng');
  await expect(page.locator('#shortfall')).toHaveText('Đủ chỉ tiêu');
  await expect(page.locator('#stock-magnet')).toHaveText('Có 1 · Đã bật');
  await expect(page.locator('#stock-potion')).toHaveText('Có 1 · Đã bật');
  await expect(page.locator('#stock-scissors')).toHaveText('Có 1');
  await page.locator('#buy-potion').click();
  await expect(page.locator('#wallet')).toHaveText('210 vàng');
  await page.locator('#buy-potion').click();
  await expect(page.locator('#wallet')).toHaveText('70 vàng');
  await page.locator('#buy-potion').click();
  await expect(page.locator('#wallet')).toHaveText('70 vàng');
  await expect(page.locator('#shop-status')).toHaveText('Ví vàng chưa đủ để mua món này.');
  await page.screenshot({ path: testInfo.outputPath('desktop-shop.png') });
  await page.getByRole('button', { name: 'Bỏ qua · Tập lại Mỏ 1' }).click();
  await expect(page.locator('#shift')).toContainText('TẬP LẠI');
  await expect(page.locator('#wallet')).toHaveText('70 vàng');
  await expect(page.locator('#shortfall')).toHaveText('600 vàng');
  await waitAim(page, 'gold-1', .12);
  await page.keyboard.press('Space');
  await expect(page.locator('#effects')).toContainText('Thuốc');
  await expect(page.locator('#effects')).toContainText('Nam châm');
  await expect(page.getByRole('button', { name: 'Cắt dây', exact: true })).toBeVisible();
  await page.keyboard.press('Space');
  const cut = (await read(page)).events.at(-1)!;
  expect(cut).toMatchObject({ action: 'cut', target: 'gold-1' });
  await expect(page.locator('#wallet')).toHaveText('70 vàng');
  await castAt(page, 'gold-1', false, cut.time + .11);
  await expect(page.locator('#wallet')).toHaveText('170 vàng');
  await page.reload();
  await expect(page.locator('#wallet')).toHaveText('70 vàng');
  await expect(page.locator('#shortfall')).toHaveText('600 vàng');
  await page.getByRole('button', { name: 'Chơi lại từ đầu' }).click();
  await expect(page.locator('#wallet')).toHaveText('0 vàng');
  await page.getByRole('link', { name: 'Về thư viện trò chơi' }).click();
  await expect(page).toHaveURL(new RegExp(base + '#/$'));
  expect(errors).toEqual([]);
});

test('hiding the game pauses the clock and a fresh Space resumes', async ({ page }) => {
  await instrument(page, 'an-tien');
  await start(page);
  await page.waitForFunction(() => window.mineDiagnostics().time > .2);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.getByRole('heading', { name: 'Tạm dừng' })).toBeVisible();
  const { time } = await read(page);
  await expect(page.locator('#clock')).toHaveText(/7,[0-9] s/);
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    Reflect.deleteProperty(document, 'hidden');
    document.dispatchEvent(new Event('visibilitychange'));
  });
  expect((await read(page)).time).toBe(time);
  await page.keyboard.press('Space');
  await page.waitForFunction((time) => window.mineDiagnostics().time > time, time);
});
