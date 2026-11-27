import { expect, test } from '@playwright/test';
import { execFile } from 'node:child_process';
import {
  cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync,
} from 'node:fs';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, extname, join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { createServer as createViteServer } from 'vite';
import type { ViteDevServer } from 'vite';

const execute = promisify(execFile);
const repo = resolve(import.meta.dirname, '../..');
const sitePath = '/ai-game-studio/';
const published = [
  { id: 'onboarding-alpha', title: 'Onboarding Alpha', asset: 'Alpha ready' },
  { id: 'onboarding-beta', title: 'Onboarding Beta', asset: 'Beta ready' },
];
const draft = { id: 'onboarding-draft', title: 'Unpublished test marker', asset: 'Draft ready' };

function write(path: string, contents: string) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents);
}

function createPackage(root: string, game: typeof draft) {
  const directory = join(root, 'games', game.id);
  write(join(directory, 'package.json'), JSON.stringify({
    name: `@studio/${game.id}`, private: true, scripts: { build: 'node build.mjs' },
  }));
  write(join(directory, 'build.mjs'), "import { cpSync } from 'node:fs';\ncpSync('src', 'dist', { recursive: true });\n");
  write(join(directory, 'src/index.html'), `<!doctype html>
<html lang="en"><meta charset="utf-8"><title>${game.title}</title>
<link rel="icon" href="data:,">
<h1>${game.title}</h1><button>Play</button><p role="status"></p>
<a href="../../#/">Return to Game Library</a><script type="module" src="./game.js"></script></html>`);
  write(join(directory, 'src/game.js'), `
const button = document.querySelector('button');
const status = document.querySelector('[role="status"]');
button.addEventListener('click', async () => {
  const asset = await fetch(new URL('./message.txt', import.meta.url));
  if (!asset.ok) throw new Error('Game asset is unavailable');
  status.textContent = await asset.text();
});
`);
  write(join(directory, 'src/message.txt'), game.asset);
}

function catalogEntry(game: typeof draft, released: boolean) {
  return {
    id: game.id,
    title: game.title,
    description: 'Synthetic onboarding regression',
    engine: 'other',
    status: released ? 'released' : 'development',
    entry: `games/${game.id}/index.html`,
    cover: game.id === published[0]?.id ? `games/${game.id}/cover.webp` : null,
    dimension: game.id === published[0]?.id ? '2D' : '3D',
    categories: [game.id === published[0]?.id ? 'Puzzle' : 'Adventure'],
    featured: game.id === published[0]?.id,
    ...(!released ? { milestone: 'Playable test milestone' } : {}),
    version: '1.0.0',
    visibility: released ? 'public' : 'development',
  };
}

const contentTypes: Record<string, string> = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.txt': 'text/plain', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp',
};

test('onboards isolated game packages and plays them from the assembled Pages site', async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  const root = mkdtempSync(join(tmpdir(), 'studio-onboarding-'));
  const env = { ...process.env };
  // The fixture creates its own Git history.
  delete env.STUDIO_PAGES_BASE_SHA;
  async function run(command: string, args: string[]) {
    try {
      await execute(command, args, { cwd: root, env, timeout: 45_000 });
    } catch (error) {
      const output = error as { stdout?: string; stderr?: string };
      throw new Error(`${command} ${args.join(' ')} failed:\n${output.stdout ?? ''}${output.stderr ?? ''}`, { cause: error });
    }
  }
  const output = join(root, 'deployment/dist');
  const routes = new Map<string, string>();
  const server = createServer((request, response) => {
    const path = new URL(request.url ?? '/', 'http://localhost').pathname;
    const file = routes.get(path);
    if (file === undefined) {
      response.writeHead(404).end();
    } else {
      response.writeHead(200, { 'Content-Type': contentTypes[extname(file)] ?? 'application/octet-stream' });
      response.end(readFileSync(file));
    }
  });

  let developmentServer: ViteDevServer | undefined;
  try {
    for (const file of [
      '.npmrc', '.node-version', 'package.json', 'pnpm-workspace.yaml', 'pnpm-lock.yaml',
      'portal/package.json', 'portal/index.html', 'portal/src', 'portal/public',
      'portal/vite.config.ts', 'portal/preview-builds.ts', 'portal/tsconfig.json', 'registry/games.json',
      'scripts/assemble-pages.mjs', 'scripts/verify-pages.mjs',
    ]) {
      cpSync(join(repo, file), join(root, file), { recursive: true });
    }
    await run('git', ['init', '--quiet']);
    await run('git', ['add', 'registry/games.json']);
    await run('git', [
      '-c', 'user.name=Studio Test', '-c', 'user.email=test@example.test',
      'commit', '--quiet', '-m', 'Record the empty production registry',
    ]);

    for (const game of [...published, draft]) createPackage(root, game);
    cpSync(join(repo, 'portal/src/assets/library-hero.webp'), join(root, 'games/onboarding-alpha/src/cover.webp'));
    write(join(root, 'registry/games.json'), JSON.stringify({
      schemaVersion: 1,
      games: [...published.map((game) => catalogEntry(game, true)), catalogEntry(draft, false)],
    }));
    await run('pnpm', ['install', '--prefer-offline', '--lockfile-only', '--no-frozen-lockfile']);
    await run('pnpm', ['install', '--prefer-offline', '--frozen-lockfile']);

    for (const game of published) {
      await run('pnpm', ['--dir', `games/${game.id}`, 'run', 'build']);
      expect(readFileSync(join(root, 'games', game.id, 'dist/message.txt'), 'utf8')).toBe(game.asset);
      for (const sibling of published.filter((other) => other.id !== game.id)) {
        expect(existsSync(join(root, 'games', sibling.id, 'dist'))).toBe(false);
      }
      rmSync(join(root, 'games', game.id, 'dist'), { recursive: true });
    }

    await run('pnpm', ['build']);
    await run('pnpm', ['assemble:pages']);
    await run('pnpm', ['verify:pages']);
    expect(existsSync(join(root, 'games', draft.id, 'dist'))).toBe(false);
    for (const file of readdirSync(output, { recursive: true, withFileTypes: true })) {
      if (file.isFile()) {
        const path = join(file.parentPath, file.name);
        routes.set(sitePath + path.slice(output.length + 1), path);
      }
    }
    routes.set(sitePath, join(output, 'index.html'));

    await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
    const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('response', (response) => {
      if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
    });

    await page.goto(origin + sitePath);
    await expect(page.getByRole('heading', { name: 'Game Library' })).toBeVisible();
    await expect(page.getByRole('listitem')).toHaveCount(2);
    await expect(page.getByRole('region', { name: 'Featured game' }).getByRole('heading', { name: 'Onboarding Alpha' })).toBeVisible();
    const cover = page.getByRole('listitem').filter({ hasText: 'Onboarding Alpha' }).locator('img');
    await expect.poll(() => cover.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
    await expect(page.getByText('Released', { exact: true })).toHaveCount(2);
    await page.getByRole('searchbox', { name: 'Search games' }).fill('  Beta  ');
    await expect(page.getByRole('listitem')).toHaveCount(1);
    await page.getByRole('combobox', { name: 'Category' }).selectOption('puzzle');
    await expect(page.getByRole('heading', { name: 'No matching games' })).toBeVisible();
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await page.getByRole('button', { name: '2D', exact: true }).click();
    await expect(page.getByRole('listitem')).toHaveText(/Onboarding Alpha/);
    await page.getByRole('button', { name: '3D', exact: true }).click();
    await expect(page.getByRole('listitem')).toHaveText(/Onboarding Beta/);
    await page.getByRole('combobox', { name: 'Category' }).selectOption('adventure');
    await expect(page.getByRole('listitem')).toHaveCount(1);
    await page.getByRole('combobox', { name: 'Category' }).selectOption('');
    await page.getByRole('button', { name: 'All', exact: true }).click();
    await page.screenshot({ path: testInfo.outputPath('synthetic-catalog.png'), fullPage: true });
    const desktop = page.viewportSize();
    if (!desktop) throw new Error('Expected a desktop viewport');
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
    await expect(page.getByRole('listitem')).toHaveCount(2);
    await page.screenshot({ path: testInfo.outputPath('synthetic-mobile.png'), fullPage: true });
    await page.setViewportSize(desktop);
    await expect(page.getByText(draft.title)).toHaveCount(0);
    const excluded = await page.request.get(`${origin}${sitePath}games/${draft.id}/index.html`);
    expect(excluded.status()).toBe(404);
    for (const [path, file] of routes) {
      if (path.endsWith('.js')) expect(readFileSync(file, 'utf8')).not.toContain(draft.title);
    }

    for (const game of published) {
      await page.getByRole('link', { name: game.title }).click();
      await expect(page.getByRole('heading', { name: game.title, level: 1 })).toBeVisible();
      if (game.id === published[0]?.id) {
        await page.screenshot({ path: testInfo.outputPath('released-detail.png'), fullPage: true });
      }
      await page.getByRole('link', { name: 'Play Now' }).click();
      const entry = `${origin}${sitePath}games/${game.id}/index.html`;
      await expect(page).toHaveURL(entry);
      await page.getByRole('button', { name: 'Play' }).click();
      await expect(page.getByRole('status')).toHaveText(game.asset);
      expect((await page.goto(entry))?.status()).toBe(200);
      await page.getByRole('link', { name: 'Return to Game Library' }).click();
      await expect(page.getByRole('heading', { name: 'Game Library' })).toBeVisible();
    }
    expect(errors).toEqual([]);
    await run('pnpm', ['--dir', `games/${draft.id}`, 'run', 'build']);
    developmentServer = await createViteServer({
      root: join(root, 'portal'),
      base: '/preview/',
      server: { host: '127.0.0.1', port: 0 },
      configFile: join(root, 'portal/vite.config.ts'),
      logLevel: 'error',
    });
    await developmentServer.listen();
    const devOrigin = `http://127.0.0.1:${(developmentServer.httpServer?.address() as AddressInfo).port}`;
    await page.goto(`${devOrigin}/preview/#/games/${draft.id}`);
    await expect(page.getByRole('heading', { name: draft.title })).toBeVisible();
    await expect(page.getByText('In Development')).toBeVisible();
    await expect(page.getByText('Playable test milestone')).toBeVisible();
    await page.getByRole('link', { name: 'Play preview' }).click();
    await page.getByRole('button', { name: 'Play' }).click();
    await expect(page.getByRole('status')).toHaveText(draft.asset);
    await page.getByRole('link', { name: 'Return to Game Library' }).click();
    await expect(page).toHaveURL(`${devOrigin}/preview/#/`);
    await expect(page.getByRole('heading', { name: 'Game Library' })).toBeVisible();
    expect(errors).toEqual([]);
  } finally {
    await developmentServer?.close();
    if (server.listening) {
      server.closeAllConnections();
      await new Promise<void>((done) => server.close(() => done()));
    }
    rmSync(root, { recursive: true, force: true });
  }
});
