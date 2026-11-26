import { execFileSync } from 'node:child_process';
import {
  copyFileSync, existsSync, lstatSync, mkdirSync, mkdtempSync,
  readFileSync, readdirSync, renameSync, rmSync, writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { parseRegistry, publicGames } from '../portal/src/registry.ts';

function copyStaticTree(source, target) {
  if (!lstatSync(source).isDirectory()) throw new Error(`Expected a static output directory: ${source}`);
  mkdirSync(target, { recursive: true });
  for (const file of readdirSync(source, { withFileTypes: true })) {
    if (file.name.startsWith('.')) throw new Error(`Hidden path in static output: ${file.name}`);
    const input = join(source, file.name);
    const output = join(target, file.name);
    if (file.isDirectory()) copyStaticTree(input, output);
    else if (file.isFile()) copyFileSync(input, output);
    else throw new Error(`Static output must contain only regular files and directories: ${input}`);
  }
}

export function requirePublishedGames(games, previouslyPublished) {
  const entries = new Map(games.map((game) => [game.id, game.entry]));
  for (const game of previouslyPublished) {
    if (game.status === 'development') continue;
    if (entries.get(game.id) !== game.entry) {
      throw new Error(`Previously published game must preserve its entry: ${game.id} (${game.entry})`);
    }
  }
}

export function assemblePages({ root, registry, output, buildGame, previouslyPublished = [] }) {
  const games = publicGames(parseRegistry(registry));
  requirePublishedGames(games, previouslyPublished);

  for (const game of games) {
    const namespace = `games/${game.id}/`;
    if (!game.entry?.startsWith(namespace) || !game.entry.endsWith('.html') ||
        (game.cover !== null && !game.cover.startsWith(namespace))) {
      throw new Error(`Published paths must be inside ${namespace} and the entry must be HTML.`);
    }
  }

  mkdirSync(dirname(output), { recursive: true });
  const temporary = mkdtempSync(join(dirname(output), '.pages-'));
  const staged = join(temporary, 'site');
  const previous = join(temporary, 'previous');
  let replaced = false;
  try {
    copyStaticTree(join(root, 'portal/dist'), staged);
    for (const reserved of ['games', 'build-sha.txt', 'release-manifest.json']) {
      if (existsSync(join(staged, reserved))) throw new Error(`Portal output uses reserved path: ${reserved}`);
    }
    for (const game of games) {
      const source = join(root, 'games', game.id);
      if (!lstatSync(source).isDirectory()) throw new Error(`Expected game directory: ${source}`);
      buildGame(source);
      copyStaticTree(join(source, 'dist'), join(staged, 'games', game.id));
      for (const path of [game.entry, game.cover]) {
        if (path !== null && !lstatSync(join(staged, path), { throwIfNoEntry: false })?.isFile()) {
          throw new Error(`Published game asset is missing: ${path}`);
        }
      }
    }
    writeFileSync(join(staged, 'release-manifest.json'), JSON.stringify({
      games: games.map(({ id, entry, version }) => ({ id, entry, version })),
    }, null, 2) + '\n');

    if (existsSync(output)) renameSync(output, previous);
    try {
      renameSync(staged, output);
      replaced = true;
    } catch (error) {
      if (existsSync(previous)) renameSync(previous, output);
      throw error;
    }
  } finally {
    if (replaced || !existsSync(previous)) rmSync(temporary, { recursive: true, force: true });
  }
}

if (import.meta.main) {
  const root = resolve(import.meta.dirname, '..');
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' });
  const base = process.env.STUDIO_PAGES_BASE_SHA ?? git('rev-parse', 'HEAD').trim();
  // Main history is conservative: retain anything previously eligible to publish.
  if (!/^[a-f0-9]{40}$/.test(base)) throw new Error('Expected a full Pages base commit SHA.');
  const previous = git('log', '--first-parent', '--format=%H', base, '--', 'registry/games.json').trim().split('\n').filter(Boolean)
      .flatMap((sha) => publicGames(parseRegistry(JSON.parse(git('show', `${sha}:registry/games.json`)))));

  assemblePages({
    root,
    registry: JSON.parse(readFileSync(join(root, 'registry/games.json'), 'utf8')),
    output: join(root, 'deployment/dist'),
    previouslyPublished: previous,
    buildGame: (cwd) => execFileSync('pnpm', ['run', 'build'], { cwd, stdio: 'inherit' }),
  });
  process.stdout.write('Assembled the full Pages site in deployment/dist.\n');
}
