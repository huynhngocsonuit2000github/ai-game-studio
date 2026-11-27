import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

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
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
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
