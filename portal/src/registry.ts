const engines = ['phaser', 'three', 'other'] as const;
const statuses = ['planned', 'development', 'released', 'archived'] as const;
const dimensions = ['2D', '3D'] as const;
const visibilities = ['development', 'public'] as const;
const gameId = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const pathSegment = /^[A-Za-z0-9._-]+$/;

function record(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${field} must be an object`);
  }
  return value as Record<string, unknown>;
}

function requiredText(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${field} must be a nonempty string`);
  }
  return value;
}

function choice<T extends string>(value: unknown, choices: readonly T[], field: string): T {
  const match = choices.find((candidate) => candidate === value);
  if (match === undefined) {
    throw new Error(`${field} must be one of: ${choices.join(', ')}`);
  }
  return match;
}

function relativePath(value: unknown, field: string): string | null {
  if (value === null) return null;

  const path = requiredText(value, field);
  if (!path.split('/').every((part) => pathSegment.test(part) && part !== '.' && part !== '..')) {
    throw new Error(`${field} must be a relative site path with safe segments`);
  }
  return path;
}

function parseCategories(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.length > 8) {
    throw new Error(`${field} must be an array of up to eight category names`);
  }
  const names = value.map((name: unknown) => requiredText(name, field).trim());
  if (names.some((name) => name.length > 40) ||
      new Set(names.map((name) => name.toLowerCase())).size !== names.length) {
    throw new Error(`${field} must contain distinct category names of up to 40 characters`);
  }
  return names;
}

function parseGame(value: unknown, index: number) {
  const field = `games[${index}]`;
  const game = record(value, field);
  const id = requiredText(game.id, `${field}.id`);
  if (!gameId.test(id) || id === 'studio') {
    throw new Error(`${field}.id must be an unreserved lowercase kebab-case ID`);
  }

  const entry = relativePath(game.entry, `${field}.entry`);
  const status = choice(game.status, statuses, `${field}.status`);
  if (status === 'released' && entry === null) {
    throw new Error(`${field}.entry is required for released games`);
  }

  if (game.featured !== undefined && typeof game.featured !== 'boolean') {
    throw new Error(`${field}.featured must be boolean`);
  }

  return {
    id,
    title: requiredText(game.title, `${field}.title`),
    description: requiredText(game.description, `${field}.description`),
    engine: choice(game.engine, engines, `${field}.engine`),
    status,
    entry,
    cover: relativePath(game.cover, `${field}.cover`),
    version: requiredText(game.version, `${field}.version`),
    visibility: choice(game.visibility, visibilities, `${field}.visibility`),
    ...(game.categories === undefined ? {} : { categories: parseCategories(game.categories, `${field}.categories`) }),
    ...(game.dimension === undefined ? {} : { dimension: choice(game.dimension, dimensions, `${field}.dimension`) }),
    ...(game.featured === undefined ? {} : { featured: game.featured }),
    ...(game.milestone === undefined ? {} : { milestone: requiredText(game.milestone, `${field}.milestone`).trim() }),
  };
}

export function parseRegistry(value: unknown) {
  const catalog = record(value, 'Registry');
  if (catalog.schemaVersion !== 1 || !Array.isArray(catalog.games)) {
    throw new Error('Registry requires schemaVersion 1 and a games array');
  }

  const ids = new Set<string>();
  const entries = new Set<string>();
  const games = catalog.games.map((value: unknown, index) => {
    const game = parseGame(value, index);
    if (ids.has(game.id)) throw new Error(`Duplicate game ID: ${game.id}`);

    if (game.entry !== null) {
      if (entries.has(game.entry)) throw new Error(`Duplicate game entry: ${game.entry}`);
      entries.add(game.entry);
    }
    ids.add(game.id);
    return game;
  });

  return { schemaVersion: 1 as const, games };
}

type Registry = ReturnType<typeof parseRegistry>;

function isPublicGame(game: Registry['games'][number]) {
  return game.visibility === 'public' && game.entry !== null &&
    (game.status === 'released' || game.status === 'development');
}

export function publicGames(registry: Registry) {
  return registry.games.filter(isPublicGame);
}

export function developmentGames(registry: Registry) {
  return registry.games.filter((game) =>
    (game.status === 'development' || game.status === 'planned') && !isPublicGame(game));
}
