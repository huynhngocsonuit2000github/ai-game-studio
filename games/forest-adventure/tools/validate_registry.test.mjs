import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { URL } from 'node:url';
import { developmentGames, parseRegistry, publicGames } from '../../../portal/src/registry.ts';
import { validateScope } from '../../../scripts/check-change-scope.mjs';

function readJson(relativePath) {
  return JSON.parse(readFileSync(new URL(relativePath, import.meta.url), 'utf8'));
}

const draft = readJson('../production/registry-entry.draft.json');
const registry = readJson('../../../registry/games.json');
const policy = readJson('../../../studio/production/registry-scope.json');
const withDraft = {
  ...registry,
  games: [...registry.games.filter((game) => game.id !== draft.id), draft],
};
const standalone = (game) => ({ schemaVersion: 1, games: [game] });

test('the draft uses the canonical game ID with no entry or cover', () => {
  const game = parseRegistry(withDraft).games.find(({ id }) => id === 'forest-adventure');
  assert.equal(game.engine, 'phaser');
  assert.equal(game.status, 'development');
  assert.equal(game.visibility, 'development');
  assert.equal(game.entry, null);
  assert.equal(game.cover, null);
});

test('the development draft appears only in the development catalog', () => {
  const catalog = parseRegistry(withDraft);
  assert.ok(developmentGames(catalog).some(({ id }) => id === draft.id));
  assert.ok(publicGames(catalog).every(({ id }) => id !== draft.id));
});

test('the planned project-relative release paths are accepted by the parser', () => {
  const entry = 'games/forest-adventure/index.html';
  const cover = 'games/forest-adventure/cover.webp';
  const catalog = parseRegistry(standalone({ ...draft, status: 'released', visibility: 'public', entry, cover }));
  assert.equal(publicGames(catalog)[0].entry, entry);
  assert.equal(publicGames(catalog)[0].cover, cover);
});

test('a release without an entry is rejected', () => {
  assert.throws(() => parseRegistry(standalone({ ...draft, status: 'released' })), /entry is required/);
});

test('duplicate IDs are rejected', () => {
  assert.throws(() => parseRegistry({ ...withDraft, games: [...withDraft.games, draft] }), /Duplicate game ID/);
});

test('traversal in entry and cover paths is rejected', () => {
  for (const field of ['entry', 'cover']) {
    assert.throws(() => parseRegistry(standalone({ ...draft, [field]: '../index.html' })), /safe segments/);
  }
});

test('a game PR cannot add its own registry entry under ordinary scope rules', () => {
  const before = { ...withDraft, games: withDraft.games.filter(({ id }) => id !== draft.id) };
  const changed = ['games/forest-adventure/production/PROGRESS.md', 'registry/games.json'];
  assert.throws(
    () => validateScope(changed, () => JSON.stringify(before), () => JSON.stringify(withDraft), policy),
    /preserve the registry contract and entry order/,
  );
});
