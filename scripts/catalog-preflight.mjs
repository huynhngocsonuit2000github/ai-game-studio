import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import process from 'node:process';
import { parseRegistry, publicGames } from '../portal/src/registry.ts';

const root = resolve(import.meta.dirname, '..');
const registryPath = 'registry/games.json';
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' });
const base = process.env.STUDIO_PAGES_BASE_SHA;
if (!/^[a-f0-9]{40}$/.test(base ?? '')) throw new Error('Set STUDIO_PAGES_BASE_SHA to the full base commit SHA.');

const registry = parseRegistry(readJson(join(root, registryPath)));
const publicIds = new Set(publicGames(registry).map(({ id }) => id));
const changedIds = new Set(git('diff', '--name-only', '-z', base, 'HEAD', '--', 'games/')
  .split('\0').map((path) => /^games\/([a-z0-9]+(?:-[a-z0-9]+)*)\//.exec(path)?.[1]).filter(Boolean));
const candidates = new Map();
for (const id of changedIds) {
  if (publicIds.has(id)) continue; // The canonical job already exercises public games.
  const existing = registry.games.find((game) => game.id === id);
  if (existing?.status === 'archived') continue;
  const directory = join(root, 'games', id);
  const packagePath = join(directory, 'package.json');
  if (!existsSync(packagePath)) continue;
  const pkg = readJson(packagePath);
  if (!pkg.scripts?.build) continue;
  const previewPath = join(directory, 'catalog-preview.json');
  const preview = existsSync(previewPath) ? readJson(previewPath) : {};
  candidates.set(id, {
    title: pkg.name ?? id,
    description: pkg.description ?? `Catalog preflight for ${id}`,
    engine: 'other',
    cover: null,
    version: pkg.version ?? '0.0.0',
    ...existing,
    ...preview,
    entry: preview.entry ?? existing?.entry ?? `games/${id}/index.html`,
    id,
    status: 'development',
    visibility: 'public',
  });
}

if (candidates.size === 0) {
  process.stdout.write('No changed private playable games need catalog preflight.\n');
} else {
  const temporary = mkdtempSync(join(tmpdir(), 'studio-catalog-preflight-'));
  const checkout = join(temporary, 'checkout');
  let checkedOut = false;
  try {
    const overlay = parseRegistry({
      schemaVersion: registry.schemaVersion,
      games: [...registry.games.map((game) => candidates.get(game.id) ?? game),
        ...[...candidates.values()].filter(({ id }) => !registry.games.some((game) => game.id === id))],
    });
    process.stdout.write(`Preflighting ${[...candidates.keys()].join(', ')} in a temporary Pages catalog.\n`);

    git('worktree', 'add', '--detach', checkout, 'HEAD');
    checkedOut = true;
    writeFileSync(join(checkout, registryPath), JSON.stringify(overlay, null, 2) + '\n');
    const env = { ...process.env, STUDIO_PAGES_BASE_PATH: '/ai-game-studio/', STUDIO_TEST_ASSEMBLED_PAGES: '1' };
    const run = (command, ...args) => execFileSync(command, args, { cwd: checkout, env, stdio: 'inherit' });
    run('pnpm', 'install', '--frozen-lockfile', '--prefer-offline');
    run('pnpm', 'build');
    run('pnpm', 'assemble:pages');
    run('pnpm', 'verify:pages');
    run('node', 'scripts/game-state.mjs');
    run('pnpm', 'exec', 'playwright', 'test');
    run('node', 'scripts/test-pages-games.mjs');
  } finally {
    if (checkedOut) git('worktree', 'remove', '--force', checkout);
    rmSync(temporary, { recursive: true, force: true });
  }
}
