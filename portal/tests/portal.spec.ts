import { expect, test } from '@playwright/test';

const pagesBase = process.env.STUDIO_PAGES_BASE_PATH ?? '/studio/';

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`loads the empty catalog at ${viewport.width}px under ${pagesBase}`, async ({ page }, testInfo) => {
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
    const loaded = await page.goto(pagesBase, { waitUntil: 'load' });
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

test('production handles direct links to unknown, malformed and development-only IDs', async ({ page }, testInfo) => {
  for (const id of ['missing-game', 'Invalid%20ID', 'navigation-fixture']) {
    await page.goto(`${pagesBase}#/games/${id}`);
    await expect(page.getByRole('heading', { name: 'Game not found' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Launch game' })).toHaveCount(0);
  }

  await page.screenshot({ path: testInfo.outputPath('unavailable.png') });
  await page.getByRole('link', { name: 'Back to Game Library' }).click();
  await expect(page.getByRole('heading', { name: 'Game Library', level: 1 })).toBeFocused();
  await expect(page.getByRole('heading', { name: 'No games available yet' })).toBeVisible();
});

test('development catalog launches a standalone game and returns to the library', async ({ page }, testInfo) => {
  const failures: string[] = [];
  page.on('pageerror', (error) => failures.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') failures.push(message.text());
  });
  page.on('requestfailed', (request) => {
    const error = request.failure()?.errorText;
    // Chromium cancels the previous document's favicon when leaving a page.
    if (error === 'net::ERR_ABORTED' && request.url().endsWith('/favicon.png')) return;
    failures.push(`${error} ${request.url()}`);
  });
  page.on('response', (response) => {
    if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`);
  });

  const library = 'http://127.0.0.1:4174/studio-dev/';
  await page.goto(library);
  await page.getByRole('link', { name: 'Navigation Fixture' }).click();
  await expect(page).toHaveURL(`${library}#/games/navigation-fixture`);
  await expect(page.getByRole('heading', { name: 'Navigation Fixture' })).toBeFocused();
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Game Library' })).toBeVisible();
  await page.goForward();
  await page.reload();
  await expect(page).toHaveTitle('Navigation Fixture | AI Game Studio');
  await page.screenshot({ path: testInfo.outputPath('detail.png') });
  await page.getByRole('link', { name: 'Launch game' }).click();
  await expect(page).toHaveURL(`${library}fixtures/navigation/index.html`);
  await expect(page).toHaveTitle('Navigation Fixture');
  await page.getByRole('button', { name: 'Circle' }).click();
  await expect(page.getByRole('status')).toHaveText('Try again.');
  await page.getByRole('button', { name: 'Square' }).click();
  await expect(page.getByRole('status')).toHaveText('Solved!');
  await page.screenshot({ path: testInfo.outputPath('fixture.png') });
  await page.getByRole('link', { name: 'Return to Game Library' }).click();
  await expect(page).toHaveURL(`${library}#/`);
  await expect(page.getByRole('link', { name: 'Navigation Fixture' })).toBeVisible();
  expect(failures).toEqual([]);
});
