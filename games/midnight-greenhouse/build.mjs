import { execFileSync } from 'node:child_process';
import { cp, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
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
  await cp('assets/runtime/art/retro/cover.webp', join(temporary, 'cover.webp'));

  const tuning = await readJson('design/TUNING.json');
  const layout = await readJson('assets/runtime/art/retro/layout.json');
  const atlasPath = 'retro/motion-library/atlas.json';
  const atlas = await readJson(`assets/runtime/art/${atlasPath}`);
  const guide = await readJson('design/retro/FIELD_GUIDE_VI.json');
  const media = new Set(['retro/campaign-card.webp', atlasPath,
    ...['bell', 'flag', 'heart', 'hoe', 'seed', 'valve'].map((id) => `retro/icons/${id}.webp`)]);
  const ids = (entries) => entries.map(({ id }) => id);
  assert.deepEqual(ids(tuning.levels), ['raincourt', 'pump-gallery', 'lightning-dome']);
  assert.deepEqual(ids(tuning.plants), ['pitcher', 'fern', 'bramble', 'orchid', 'moss', 'pod']);
  assert.deepEqual(ids(tuning.enemies), ['walker', 'courier', 'porter', 'raincoat', 'mender', 'keeper']);
  const equalIds = (first, second) => assert.deepEqual([...first].sort(), [...second].sort());
  assert.equal(tuning.schemaVersion, 1);
  assert.equal(guide.schemaVersion, 1);
  assert.equal(guide.locale, 'vi');
  assert.equal(atlas.schemaVersion, 2);
  assert.equal(atlas.tickRate, 30);
  equalIds(ids(guide.plants), ids(tuning.plants));
  equalIds(ids(guide.enemies), ids(tuning.enemies));
  assert.equal(guide.skills.length, 5);
  const entries = [...guide.plants, ...guide.enemies, ...guide.skills];
  const entryIds = new Set(ids(entries));
  assert.equal(entryIds.size, entries.length);
  for (const entry of entries) assert.ok(entry.related.every((id) => entryIds.has(id)));
  equalIds(Object.keys(atlas.units), [...ids(tuning.plants), ...ids(tuning.enemies)]);
  for (const [id, unit] of Object.entries(atlas.units)) {
    const [w, h] = unit.cell;
    const [x, y] = unit.anchorPx;
    const [width, height] = unit.atlasSize;
    assert.ok(w > 0 && h > 0 && width % w === 0 && height % h === 0 && x >= 0 && x < w && y >= 0 && y < h);
    assert.equal(unit.source, layout.sprites[id].asset);
    assert.equal(unit.columns, width / w);
    if (tuning.enemies.some((enemy) => enemy.id === id)) {
      assert.ok(unit.feet?.length === 2 && unit.feet.every((foot) => foot >= -x && foot < w - x));
    }
    const occupied = new Set();
    for (const clip of Object.values(unit.clips)) {
      assert.ok(Number.isInteger(clip.firstFrame) && clip.firstFrame >= 0);
      assert.ok(Number.isInteger(clip.frameCount) && clip.frameCount > 0
        && clip.firstFrame + clip.frameCount <= unit.columns * height / h);
      assert.ok(Number.isInteger(clip.durationTicks) && clip.durationTicks > 0 && typeof clip.loop === 'boolean');
      assert.ok(Number.isInteger(clip.reducedFrame) && clip.reducedFrame >= 0 && clip.reducedFrame < clip.frameCount);
      for (let frame = clip.firstFrame; frame < clip.firstFrame + clip.frameCount; frame++) {
        assert.ok(!occupied.has(frame), `${id} has overlapping atlas frames`);
        occupied.add(frame);
      }
    }
    media.add(unit.asset);
    media.add(unit.source);
  }
  let bosses = 0;
  for (const level of tuning.levels) {
    let previous = -1;
    for (const [index, wave] of level.waves.entries()) {
      assert.ok(wave.number === index + 1 && wave.atSeconds > previous && wave.announceLeadSeconds >= 0);
      previous = wave.atSeconds;
      for (const group of wave.groups) {
        assert.ok(group.offsetSeconds >= 0 && group.gapSeconds >= 0 && Number.isInteger(group.count) && group.count > 0);
        assert.ok(Number.isInteger(group.lane) && group.lane >= 1 && group.lane <= tuning.laneCount);
        assert.ok(ids(tuning.enemies).includes(group.enemy));
        if (group.enemy === 'keeper') {
          assert.equal(level.id, 'lightning-dome');
          bosses += group.count;
        }
      }
    }
    const ends = new Map();
    for (const fault of level.faults) {
      assert.ok(level.waterEnabled && fault.warningSeconds >= 0 && fault.closedSeconds > 0);
      assert.ok(fault.lane >= 1 && fault.lane <= tuning.laneCount);
      assert.ok(fault.atSeconds - fault.warningSeconds >= (ends.get(fault.lane) ?? 0));
      ends.set(fault.lane, fault.atSeconds + fault.closedSeconds);
    }
    assert.ok(level.cardIds.every((id) => ids(tuning.plants).includes(id)));
    for (const [id, unlock] of Object.entries(level.cardUnlocks)) {
      assert.ok(level.cardIds.includes(id) && level.waves.some(({ number }) => unlock.wave === number) && unlock.trigger === 'announcement');
    }
  }
  assert.equal(bosses, 1);
  const entriesWithStats = (entries, stats) => entries.map((entry) => ({
    ...entry, stats: stats.find(({ id }) => id === entry.id), portrait: layout.sprites[entry.id].asset,
  }));
  await writeFile(join(temporary, 'guide.json'), JSON.stringify({
    ...guide, plants: entriesWithStats(guide.plants, tuning.plants), enemies: entriesWithStats(guide.enemies, tuning.enemies),
    drops: tuning.drops, bell: tuning.bell, rerouteCooldownSeconds: tuning.rerouteCooldownSeconds,
  }));
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
      drops: tuning.drops, bell: tuning.bell,
      rerouteCooldownSeconds: tuning.rerouteCooldownSeconds,
    }];
  }));
  await writeFile(join(temporary, 'content.json'), JSON.stringify(campaign));
  for (const name of media) {
    await cp(join('assets/runtime/art', name), join(temporary, 'art', name));
  }
  for (const name of ['retro/courtyard', 'retro/rush', 'retro/collect', 'retro/shield-chip', 'retro/bell', 'retro/unlock',
    'plant', 'fern', 'root', 'shock', 'water', 'warning', 'breach', 'victory', 'defeat', 'pod', 'valve-lock']) {
    await cp(`assets/runtime/audio/${name}.ogg`, join(temporary, `audio/${name}.ogg`));
  }
  await rm('dist', { recursive: true, force: true });
  await rename(temporary, 'dist');
} finally {
  await rm(temporary, { recursive: true, force: true });
}
