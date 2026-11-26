import { expect, test } from '@playwright/test';

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`loads the empty catalog at ${viewport.width}px under /studio/`, async ({ page }, testInfo) => {
    const failures: string[] = [];
    page.on('pageerror', (error) => failures.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning') failures.push(`${message.text()} ${message.location().url}`);
    });
    page.on('requestfailed', (request) => failures.push(request.url()));
    page.on('response', (response) => {
      if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`);
    });

    await page.setViewportSize(viewport);
    const loaded = await page.goto('/studio/', { waitUntil: 'load' });
    expect(loaded?.status()).toBe(200);
    await expect(page).toHaveTitle('Game Library | AI Game Studio');
    await expect(page.getByRole('heading', { name: 'Game Library', level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'No games available yet' })).toBeVisible();
    await expect(page.getByRole('listitem')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width);
    expect(failures).toEqual([]);

    await page.screenshot({ path: testInfo.outputPath('catalog.png') });
  });
}
