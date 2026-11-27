import { expect, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const base = '/ai-game-studio/';
const artifact = fileURLToPath(new URL('../../../deployment/dist', import.meta.url));

test('starts Normal from the assembled library and keeps both public routes playable', async ({ page }, info) => {
  const faults: string[] = [];
  page.on('pageerror', error => faults.push(error.message));
  page.on('response', response => {
    if (response.status() >= 400) faults.push(`${response.status()} ${response.url()}`);
  });
  const games = [
    { id: 'monster-survivor', start: 'Survival' },
    { id: 'forest-adventure', start: 'Play' },
  ];
  const manifest = JSON.parse(readFileSync(artifact + '/release-manifest.json', 'utf8'));
  expect(manifest.games.map((game: { id: string }) => game.id)).toEqual(expect.arrayContaining(games.map(game => game.id)));

  for (const game of games) {
    await page.goto(base);
    const results = page.getByRole('list', { name: 'Game results' });
    await results.locator(`a[href="#/games/${game.id}"]`).click();
    const cover = page.locator(`.detail-art img[src="./games/${game.id}/cover.webp"]`);
    await expect(cover).toBeVisible();
    await cover.evaluate(image => (image as HTMLImageElement).decode());
    await page.getByRole('link', { name: /^(Play preview|Play Now)$/ }).click();
    const direct = `${base}games/${game.id}/index.html`;
    await expect(page).toHaveURL(direct);
    await page.getByRole('button', { name: game.start, exact: true }).click();
    if (game.id === 'monster-survivor') {
      await expect(page.locator('#health')).toHaveText('100 / 100 HP');
      await expect(page.locator('#ward-info')).toContainText('Rites 0/2');
      await page.keyboard.down('ArrowUp');
      await page.keyboard.press('Space');
      await expect(page.locator('#dash-state')).toHaveText(/Dash [\d.]+ s/);
      await page.keyboard.up('ArrowUp');
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: 'Quit', exact: true }).click();
      await page.getByRole('heading', { name: 'Quit this run?' }).waitFor();
      await page.getByRole('button', { name: 'Quit', exact: true }).click();
      await page.getByRole('link', { name: /Game Library/ }).click();
    } else {
      await expect(page.getByText('Heartseeds 0/3', { exact: true })).toBeVisible();
      await page.keyboard.press('Escape');
      await page.getByRole('link', { name: 'Back to Studio' }).click();
    }
    await expect(page).toHaveURL(`${base}#/`);
    await expect(page.getByRole('heading', { name: 'Game Library', level: 1 })).toBeVisible();
    expect((await page.goto(direct))?.status()).toBe(200);
    await expect(page.getByRole('button', { name: game.start, exact: true })).toBeVisible();
  }
  expect(faults).toEqual([]);

  // The Studio workflow archives this test output on PRs. Package the verified
  // static site before merge so the Producer can play this exact candidate.
  const archive = info.outputPath('monster-survivor-g4-preview.tar.gz');
  execFileSync('tar', ['-czf', archive, '--transform', 's|^\\.|ai-game-studio|', '-C', artifact, '.']);
  writeFileSync(info.outputPath('tested-commit.txt'), execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }));
});
