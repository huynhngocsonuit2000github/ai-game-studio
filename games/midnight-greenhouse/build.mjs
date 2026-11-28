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
  const layout = await readJson('assets/runtime/art/layout.json');
  const media = new Set(['campaign-card.webp']);
  const campaign = Object.fromEntries(tuning.levels.map((level) => {
    const cards = tuning.plants.filter(({ id }) => level.cardIds.includes(id));
    const hostileIds = new Set(level.waves.flatMap(({ groups }) => groups.map(({ enemy }) => enemy)));
    const hostiles = tuning.enemies.filter(({ id }) => hostileIds.has(id));
    const arena = layout.arenas[level.id];
    const sprites = Object.fromEntries([...cards, ...hostiles].map(({ id }) => [id, layout.sprites[id]]));
    media.add(arena.boardAsset);
    for (const { asset } of Object.values(sprites)) media.add(asset);
    return [level.id, {
      level, cards, hostiles, arena, sprites,
      preparationSeconds: tuning.preparationSeconds,
      baselinePayoutSeconds: tuning.baselinePayoutSeconds,
      rerouteCooldownSeconds: tuning.rerouteCooldownSeconds,
    }];
  }));
  await writeFile(join(temporary, 'content.json'), JSON.stringify(campaign));
  for (const name of media) {
    await cp(join('assets/runtime/art', name), join(temporary, 'art', name));
  }
  await cp('assets/runtime/audio', join(temporary, 'audio'), { recursive: true });
  await rm('dist', { recursive: true, force: true });
  await rename(temporary, 'dist');
} finally {
  await rm(temporary, { recursive: true, force: true });
}
