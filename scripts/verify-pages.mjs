import { lstatSync, readFileSync, readdirSync } from 'node:fs';
import process from 'node:process';
import { URL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { parseRegistry, publicGames } from '../portal/src/registry.ts';

const dist = new URL('../deployment/dist/', import.meta.url);
const registry = JSON.parse(readFileSync(new URL('../registry/games.json', import.meta.url), 'utf8'));
const games = publicGames(parseRegistry(registry));
const manifest = JSON.parse(readFileSync(new URL('release-manifest.json', dist), 'utf8'));
if (!isDeepStrictEqual(manifest.games, games.map(({ id, entry, version }) => ({ id, entry, version })))) {
  throw new Error('Pages manifest does not match the released catalog.');
}
for (const game of games) {
  for (const path of [game.entry, game.cover]) {
    if (path !== null && !lstatSync(new URL(path, dist), { throwIfNoEntry: false })?.isFile()) {
      throw new Error(`Pages artifact is missing the released asset: ${path}`);
    }
  }
}

const html = readFileSync(new URL('index.html', dist), 'utf8');
const assetPaths = [...html.matchAll(/(?:src|href)="(\.\/[^"]+)"/g)].map((match) => match[1]);
const urls = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((match) => match[1]);
if (assetPaths.length === 0 || assetPaths.length !== urls.length) {
  throw new Error('Pages index must reference site-relative assets.');
}
for (const assetPath of assetPaths) {
  const asset = new URL(assetPath, dist);
  if (!asset.href.startsWith(dist.href)) {
    throw new Error(`Pages asset is outside the artifact: ${assetPath}`);
  }
  readFileSync(asset);
}

const files = readdirSync(dist, { recursive: true });
if (files.some((file) => file === 'fixtures' || file.startsWith('fixtures/'))) {
  throw new Error('Development fixture files are present in the Pages artifact.');
}
for (const file of files.filter((file) => !file.startsWith('games/') && /\.(?:js|html)$/.test(file))) {
  if (/Navigation Fixture|fixtures\/navigation/.test(readFileSync(new URL(file, dist), 'utf8'))) {
    throw new Error(`Development fixture content in Pages artifact: ${file}`);
  }
}
process.stdout.write(`Verified Pages index and ${assetPaths.length} site-relative assets.\n`);
