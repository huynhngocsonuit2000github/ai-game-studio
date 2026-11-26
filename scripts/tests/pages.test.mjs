import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import process from 'node:process';
import { assemblePages } from '../assemble-pages.mjs';
import { validateScope } from '../check-change-scope.mjs';

const game = (id, overrides = {}) => ({
  id, title: id, description: 'Synthetic test data', engine: 'other',
  status: 'released', entry: `games/${id}/index.html`, cover: null,
  version: '1.0.0', visibility: 'public', ...overrides,
});
const registry = (...games) => ({ schemaVersion: 1, games });
const put = (path, value) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, value);
};
const read = (path) => readFileSync(path, 'utf8');

test('assembles every public release, excludes development and rehearses a rollback', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'studio-release-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const output = join(root, 'deployment/dist');
  const alpha = game('alpha');
  const beta = game('beta', { cover: 'games/beta/assets/cover.txt' });
  const candidate = game('alpha', { version: '2.0.0' });
  const hidden = game('draft', { status: 'development', visibility: 'development' });
  const builds = [];
  const buildGame = (cwd) => builds.push(cwd);

  put(join(root, 'portal/dist/index.html'), 'Portal');
  put(join(root, 'games/alpha/dist/index.html'), 'Alpha previous');
  put(join(root, 'games/beta/dist/index.html'), 'Beta');
  put(join(root, 'games/beta/dist/assets/cover.txt'), 'Cover');
  const publish = (next, previouslyPublished = [alpha, beta]) => {
    assemblePages({ root, registry: next, output, buildGame, previouslyPublished });
  };

  publish(registry(alpha, beta, hidden));
  assert.deepEqual(builds, ['alpha', 'beta'].map((id) => join(root, 'games', id)));
  assert.equal(read(join(output, 'index.html')), 'Portal');
  assert.equal(read(join(output, 'games/beta/assets/cover.txt')), 'Cover');
  assert.throws(() => read(join(output, 'games/draft/index.html')), { code: 'ENOENT' });
  const before = read(join(output, 'release-manifest.json'));
  assert.equal(JSON.parse(before).games.length, 2);

  assert.throws(() => publish(registry(alpha)), /preserve its entry: beta/);
  assert.throws(() => publish(registry(alpha, game('beta', { entry: 'games/beta/missing.html' }))), /preserve its entry: beta/);
  assert.throws(() => publish(registry(alpha, game('beta', { cover: 'games/beta/missing.png' }))), /asset is missing/);
  assert.equal(read(join(output, 'release-manifest.json')), before);

  put(join(root, 'games/alpha/dist/index.html'), 'Alpha candidate');
  publish(registry(candidate, beta));
  assert.equal(read(join(output, 'games/alpha/index.html')), 'Alpha candidate');
  assert.equal(read(join(output, 'games/beta/index.html')), 'Beta');

  put(join(root, 'games/alpha/dist/index.html'), 'Alpha previous');
  publish(registry(alpha, beta), [candidate, beta]);
  assert.equal(read(join(output, 'games/alpha/index.html')), 'Alpha previous');
  assert.equal(read(join(output, 'games/beta/index.html')), 'Beta');
  assert.equal(read(join(output, 'release-manifest.json')), before);
});

test('rejects namespace escapes and symlinks before replacing the previous site', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'studio-release-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const output = join(root, 'deployment/dist');
  put(join(output, 'index.html'), 'Previously verified portal');
  put(join(root, 'portal/dist/index.html'), 'New portal');
  put(join(root, 'games/alpha/dist/index.html'), 'Game');
  const publish = (entry) => assemblePages({ root, output, registry: registry(entry), buildGame() {} });

  assert.throws(() => publish(game('alpha', { entry: 'games/beta/index.html' })), /inside games\/alpha/);
  symlinkSync(join(root, 'portal/dist/index.html'), join(root, 'games/alpha/dist/shared.html'));
  assert.throws(() => publish(game('alpha')), /regular files and directories/);
  assert.equal(read(join(output, 'index.html')), 'Previously verified portal');
});

test('isolates game changes even if a PR touches studio tooling or renames across games', () => {
  assert.equal(validateScope(['portal/src/main.tsx']), 'studio');
  assert.equal(validateScope(['games/alpha/src/main.ts', 'games/alpha/README.md']), 'alpha');
  assert.throws(() => validateScope(['games/alpha/src/main.ts', 'games/beta/src/main.ts']), /one game/);
  assert.throws(() => validateScope(['games/alpha/src/main.ts', '.github/workflows/scope.yml']), /one game/);
  assert.throws(() => validateScope(['games/Alpha/src/main.ts']), /Invalid game scope/);
});

test('allows only registry edits authorized by the trusted base', () => {
  const alpha = game('alpha');
  const beta = game('beta');
  const paths = ['games/alpha/src/main.ts', 'registry/games.json'];
  const prior = () => JSON.stringify(registry(alpha, beta));
  const titled = () => JSON.stringify(registry({ ...alpha, title: 'Alpha update' }, beta));
  assert.equal(validateScope(paths, prior, titled, { registryFields: { alpha: ['title'] } }), 'alpha');
  assert.throws(() => validateScope(paths, prior, titled, {}), /outside the trusted grant/);
  assert.throws(() => validateScope(paths, prior, () => JSON.stringify(registry(alpha,
    { ...beta, title: 'Unexpected change' })), { registryFields: { alpha: ['title'] } }), /all other entries/);
  assert.throws(() => validateScope(paths, prior, () => JSON.stringify(registry(
    { ...alpha, visibility: 'development' }, beta)), { registryFields: { alpha: ['visibility'] } }), /outside the trusted grant/);
  assert.throws(() => validateScope(paths, prior, () => JSON.stringify(registry(
    { ...alpha, extra: 'Unexpected field' }, beta)), {}), /outside the trusted grant/);
});

test('requires an exact trusted commit and path set for Studio exceptions', () => {
  const paths = ['games/alpha/package.json', 'pnpm-lock.yaml'];
  const policy = { approvedHeads: { approved: [...paths].reverse() } };
  assert.equal(validateScope(paths, null, null, policy, 'approved'), 'approved Studio exception');
  assert.throws(() => validateScope(paths, null, null, policy, 'another'), /one game/);
  assert.throws(() => validateScope([...paths, 'games/beta/package.json'], null, null, policy, 'approved'), /exact changed paths/);
});

test('checks a real Git diff and treats a cross-game rename as two paths', (t) => {
  const cwd = mkdtempSync(join(tmpdir(), 'studio-scope-'));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  const commit = (message) => {
    git('add', '--all');
    git('-c', 'user.name=Studio Test', '-c', 'user.email=test@example.test', 'commit', '-m', message);
    return git('rev-parse', 'HEAD');
  };
  const check = (base, head) => spawnSync(process.execPath, [
    join(import.meta.dirname, '../check-change-scope.mjs'), base, head,
  ], { cwd, encoding: 'utf8' });

  git('init');
  put(join(cwd, 'studio/production/registry-scope.json'), '{}');
  put(join(cwd, 'games/alpha/game.txt'), 'alpha');
  const base = commit('base');
  put(join(cwd, 'games/alpha/notes.txt'), 'notes');
  const gameHead = commit('game change');
  const accepted = check(base, gameHead);
  assert.equal(accepted.status, 0, accepted.stderr);
  assert.match(accepted.stdout, /Verified alpha scope/);
  mkdirSync(join(cwd, 'games/beta'));
  git('mv', 'games/alpha/game.txt', 'games/beta/game.txt');
  const rejected = check(base, commit('cross-game move'));
  assert.equal(rejected.status, 1);
  assert.match(rejected.stderr, /one game directory/);
});
