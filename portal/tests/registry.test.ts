import { describe, expect, it } from 'vitest';
import catalog from '../../registry/games.json';
import { developmentGames, parseRegistry, publicGames } from '../src/registry';

const game = {
  id: 'sample-game',
  title: 'Sample Game',
  description: 'Registry test fixture',
  engine: 'other',
  status: 'released',
  entry: 'games/sample-game/index.html',
  cover: null,
  version: '1.0.0',
  visibility: 'public',
};

function registry(...games: unknown[]) {
  return { schemaVersion: 1, games };
}

describe('registry', () => {
  it('validates the real registry and the empty catalog', () => {
    expect(parseRegistry(catalog)).toEqual(catalog);
    expect(parseRegistry(registry()).games).toEqual([]);
  });

  it.each([null, [], { schemaVersion: 2, games: [] }, { schemaVersion: 1, games: {} }])(
    'rejects a malformed catalog (%j)',
    (input) => expect(() => parseRegistry(input)).toThrow(),
  );

  it.each(['Invalid', 'two--words', '../game', 'studio'])('rejects ID %s', (id) => {
    expect(() => parseRegistry(registry({ ...game, id }))).toThrow(/\.id/);
  });

  it('rejects duplicate IDs and entry paths', () => {
    expect(() => parseRegistry(registry(game, game))).toThrow(/Duplicate game ID/);
    expect(() => parseRegistry(registry(game, { ...game, id: 'second' }))).toThrow(/Duplicate game entry/);
  });

  it.each([
    '/absolute.html', '../index.html', 'games/../index.html', 'games/./index.html',
    '//example.com/index.html', 'https://example.com/index.html', 'games\\index.html',
    'games/%2e%2e/index.html', 'games/index.html?x=1', 'games//index.html', 'games/index.html#fragment',
  ])('rejects unsafe entry and cover path %s', (path) => {
    expect(() => parseRegistry(registry({ ...game, entry: path }))).toThrow(/\.entry/);
    expect(() => parseRegistry(registry({ ...game, cover: path }))).toThrow(/\.cover/);
  });

  it.each([
    ['engine', 'unknown'], ['visibility', 'private'], ['status', 'live'],
    ['title', ' '], ['version', 1], ['description', undefined], ['entry', null],
  ])('rejects invalid %s', (field, value) => {
    expect(() => parseRegistry(registry({ ...game, [field]: value }))).toThrow(field);
  });

  it('lists public releases and playable opt-in previews without duplicating local entries', () => {
    const preview = { ...game, id: 'preview', status: 'development', entry: 'games/preview/index.html' };
    const hidden = { ...preview, id: 'private-candidate', entry: 'games/private/index.html', visibility: 'development' };
    const unbuilt = { ...preview, id: 'unbuilt', entry: null };
    const planned = { ...game, id: 'planned', entry: null, status: 'planned' };
    const parsed = parseRegistry(registry(
      game, preview, hidden, unbuilt, planned,
    ));
    expect(publicGames(parsed)).toEqual([game, preview]);
    expect(developmentGames(parsed)).toEqual([hidden, unbuilt, planned]);
  });
});

describe('library metadata', () => {
  it('validates optional metadata without changing legacy entries', () => {
    expect(parseRegistry(registry(game)).games[0]).toEqual(game);
    const metadata = { categories: [' Puzzle ', 'Adventure'], dimension: '2D', featured: true, milestone: 'Playable slice' };
    expect(parseRegistry(registry({ ...game, ...metadata })).games[0]).toMatchObject({
      ...metadata,
      categories: ['Puzzle', 'Adventure'],
    });
  });

  it.each([
    ['categories', ['Puzzle', 'puzzle']],
    ['categories', [' ']],
    ['dimension', '4D'],
    ['featured', 'true'],
    ['milestone', ''],
  ])('rejects invalid %s', (field, value) => {
    expect(() => parseRegistry(registry({ ...game, [field as string]: value }))).toThrow(field as string);
  });
});
