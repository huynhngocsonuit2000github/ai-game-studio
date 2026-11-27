import { execFileSync } from 'node:child_process';
import { cp, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));
const temporary = await mkdtemp(join(import.meta.dirname, '.build-'));
try {
  const compiler = fileURLToPath(import.meta.resolve('typescript/bin/tsc'));
  execFileSync(process.execPath, [compiler, '-p', 'tsconfig.json', '--outDir', temporary], { stdio: 'inherit' });
  await cp('public', temporary, { recursive: true });
  await cp('index.html', join(temporary, 'index.html'));
  await cp('assets/runtime/art/cover.webp', join(temporary, 'cover.webp'));

  const tuning = await readJson('design/TUNING.json');
  const raincourt = tuning.levels.find(({ id }) => id === 'raincourt');
  const cards = tuning.plants.filter(({ id }) => raincourt.cardIds.includes(id));
  const hostileIds = new Set(raincourt.waves.flatMap(({ groups }) => groups.map(({ enemy }) => enemy)));
  const hostiles = tuning.enemies.filter(({ id }) => hostileIds.has(id));
  const layout = await readJson('assets/runtime/art/layout.json');
  const arena = layout.arenas.raincourt;
  const sprites = Object.fromEntries([...cards, ...hostiles].map(({ id }) => [id, layout.sprites[id]]));
  await writeFile(join(temporary, 'content.json'), JSON.stringify({
    level: raincourt, cards, hostiles, arena, sprites,
    preparationSeconds: tuning.preparationSeconds,
    baselinePayoutSeconds: tuning.baselinePayoutSeconds,
    rerouteCooldownSeconds: tuning.rerouteCooldownSeconds,
  }));
  for (const name of [arena.boardAsset, 'campaign-card.webp', ...Object.values(sprites).map(({ asset }) => asset)]) {
    await cp(join('assets/runtime/art', name), join(temporary, 'art', name));
  }
  await cp('assets/runtime/audio', join(temporary, 'audio'), {
    recursive: true,
    filter: (path) => !/\/(pod|valve-lock)\.ogg$/.test(path),
  });
  await rm('dist', { recursive: true, force: true });
  await rename(temporary, 'dist');
} finally {
  await rm(temporary, { recursive: true, force: true });
}
