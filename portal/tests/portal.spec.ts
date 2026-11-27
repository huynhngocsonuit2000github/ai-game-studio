import { expect, test } from '@playwright/test';
import registry from '../../registry/games.json' with { type: 'json' };
import { parseRegistry, publicGames } from '../src/registry';

const expectedGames = publicGames(parseRegistry(registry));

const pagesBase = process.env.STUDIO_PAGES_BASE_PATH ?? '/studio/';

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`loads the production catalog at ${viewport.width}px under ${pagesBase}`, async ({ page }, testInfo) => {
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
    await expect(page.getByRole('listitem')).toHaveCount(expectedGames.length);
    if (expectedGames.length === 0) {
      await expect(page.getByRole('heading', { name: 'No games available yet' })).toBeVisible();
    } else {
      for (const game of expectedGames) {
        await expect(page.getByRole('list', { name: 'Game results' }).locator(`a[href="#/games/${game.id}"]`)).toHaveText(game.title);
      }
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width);
    expect(failures).toEqual([]);

    await page.screenshot({ path: testInfo.outputPath('catalog.png'), fullPage: true });
  });
}

test('production handles direct links to unknown, malformed and development-only IDs', async ({ page }, testInfo) => {
  for (const id of ['', 'Invalid%20ID', 'navigation-fixture']) {
    await page.goto(`${pagesBase}#/games/${id}`);
    await expect(page.getByRole('heading', { name: 'Game not found' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Play Now|Play preview/ })).toHaveCount(0);
  }

  await page.screenshot({ path: testInfo.outputPath('unavailable.png') });
  await page.getByRole('link', { name: 'Back to Game Library' }).click();
  await expect(page.getByRole('heading', { name: 'Game Library', level: 1 })).toBeFocused();
  await expect(page.getByRole('listitem')).toHaveCount(expectedGames.length);
});

for (const game of expectedGames.filter(({ status }) => status === 'development')) {
  test(`launches the ${game.id} preview and returns to the catalog`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('response', (response) => {
      if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
    });

    await page.goto(pagesBase);
    await page.getByRole('list', { name: 'Game results' }).locator(`a[href="#/games/${game.id}"]`).click();
    await expect(page.getByRole('heading', { name: game.title, level: 1 })).toBeVisible();
    await expect(page.getByText('In Development', { exact: true })).toBeVisible();
    if (game.cover) {
      const cover = page.locator('.detail-art img');
      await expect(cover).toBeVisible();
      await expect.poll(() => cover.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
    }

    const entry = `${pagesBase}${game.entry}`;
    await page.getByRole('link', { name: 'Play preview' }).click();
    await expect(page).toHaveURL(entry);
    expect((await page.goto(entry))?.status()).toBe(200);
    await page.getByRole('link', { name: /Back to Studio|Game Library/i }).click();
    await expect(page).toHaveURL(`${pagesBase}#/`);
    await expect(page.getByRole('heading', { name: 'Game Library' })).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test('launches the Forest Adventure public preview from the assembled site', async ({ page }) => {
  const preview = expectedGames.find(({ id }) => id === 'forest-adventure');
  test.skip(!preview || preview.status !== 'development', 'Forest Adventure public preview is inactive');
  if (!preview) throw new Error('Missing preview registry entry');

  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
  });

  await page.goto(pagesBase);
  await page.getByRole('list', { name: 'Game results' }).getByRole('link', { name: preview.title }).click();
  await expect(page).toHaveURL(`${pagesBase}#/games/${preview.id}`);
  await expect(page.getByRole('link', { name: 'Play preview' })).toBeVisible();
  await expect(page.getByText('In Development', { exact: true })).toBeVisible();
  const cover = page.locator('.detail-art img[src="./games/forest-adventure/cover.webp"]');
  await expect(cover).toBeVisible();
  await expect.poll(() => cover.evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await page.getByRole('link', { name: 'Play preview' }).click();
  await expect(page).toHaveURL(`${pagesBase}${preview.entry}`);
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Heartseeds 0/3', { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('link', { name: 'Back to Studio' }).click();
  await expect(page).toHaveURL(`${pagesBase}#/`);
  await expect(page.getByRole('heading', { name: 'Game Library' })).toBeVisible();
  expect(errors).toEqual([]);
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
  await page.getByRole('list', { name: 'Game results' }).locator('a[href="#/games/navigation-fixture"]').click();
  await expect(page).toHaveURL(`${library}#/games/navigation-fixture`);
  await expect(page.getByRole('heading', { name: 'Navigation Fixture', level: 1 })).toBeFocused();
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Game Library' })).toBeVisible();
  await page.goForward();
  await page.reload();
  await expect(page).toHaveTitle('Navigation Fixture | AI Game Studio');
  await expect(page.getByText('In Development')).toBeVisible();
  await expect(page.getByText('Navigation smoke test')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('detail.png') });
  await page.getByRole('link', { name: /Play Now|Play preview/ }).click();
  await expect(page).toHaveURL(`${library}fixtures/navigation/index.html`);
  await expect(page).toHaveTitle('Navigation Fixture');
  await page.getByRole('button', { name: 'Circle' }).click();
  await expect(page.getByRole('status')).toHaveText('Try again.');
  await page.getByRole('button', { name: 'Square' }).click();
  await expect(page.getByRole('status')).toHaveText('Solved!');
  await page.screenshot({ path: testInfo.outputPath('fixture.png') });
  await page.getByRole('link', { name: 'Return to Game Library' }).click();
  await expect(page).toHaveURL(`${library}#/`);
  await expect(page.getByRole('list', { name: 'Game results' }).locator('a[href="#/games/navigation-fixture"]')).toBeVisible();
  expect(failures).toEqual([]);
});
