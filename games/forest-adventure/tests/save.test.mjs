import assert from 'node:assert/strict';
import { test } from 'node:test';
import { EXPANSION_SAVE_KEY, SAVE_KEY, SaveStore, parseSave } from '../src/save.ts';

const ids = ['fernlight-trail', 'willow-run', 'lantern-oak'];
const clear = (ticks, fireflies) => ({ ticks, fireflies, deaths: 0, flawless: true });

test('save decoding sanitizes settings, ignores unknown or skipped levels, and resets a future schema', () => {
  const parsed = parseSave({
    schemaVersion: 1,
    unlockedLevelIds: [ids[2], 'unknown'],
    bestByLevel: { [ids[0]]: { ticks: 17, fireflies: 9 }, [ids[2]]: { ticks: 17, fireflies: 4 } },
    settings: { master: 10, music: -7, sfx: Infinity, muted: 'true' },
  }, ids, true);
  assert.deepEqual(parsed.unlockedLevelIds, ids.slice(0, 1));
  assert.deepEqual(parsed.bestByLevel, {});
  assert.deepEqual(parsed.settings, { master: 1, music: 0, sfx: .85, muted: false, reducedMotion: true });
  assert.deepEqual(parseSave({ ...parsed, schemaVersion: 2, unlockedLevelIds: ids }, ids, false),
    parseSave(null, ids, false));
});

test('replay records time and fireflies independently and persists only level records and settings', () => {
  const values = new Map();
  const storage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const save = new SaveStore(ids, false, () => storage);
  save.record(ids[0], clear(200, 8), ids[1]);
  save.record(ids[0], clear(160, 3), ids[1]);
  const restored = new SaveStore(ids, false, () => storage);
  assert.deepEqual(restored.data.unlockedLevelIds, ids.slice(0, 2));
  assert.deepEqual(restored.data.bestByLevel[ids[0]], { ticks: 160, fireflies: 8 });
  assert.deepEqual(Object.keys(JSON.parse(values.get(SAVE_KEY))), [
    'schemaVersion', 'unlockedLevelIds', 'bestByLevel', 'settings',
  ]);
});

test('write failure preserves progress in the current tab', () => {
  const storage = { getItem: () => null, setItem() { throw new Error('Storage full'); } };
  const save = new SaveStore(ids, false, () => storage);
  save.record(ids[0], clear(200, 8), ids[1]);
  assert.equal(save.unavailable, true);
  assert.deepEqual(save.data.unlockedLevelIds, ids.slice(0, 2));
});

const chapter = ['trail-01', 'trail-02', 'trail-03'];
const campaignIds = [...ids, ...chapter];

function expansionSave(legacyBytes, expansionBytes) {
  const values = new Map([[SAVE_KEY, legacyBytes], [EXPANSION_SAVE_KEY, expansionBytes]]);
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const open = () => new SaveStore(campaignIds, false, () => storage, ids);
  return { open, values };
}

test('imports completed legacy progress once and keeps the original bytes for rollback', () => {
  const raw = JSON.stringify({
    schemaVersion: 1,
    unlockedLevelIds: [...ids, ...chapter],
    bestByLevel: { [ids[0]]: { ticks: 54, fireflies: 8 }, [ids[2]]: { ticks: 830, fireflies: 2 } },
    settings: { master: .4, muted: true, reducedMotion: true },
  }, null, 2);
  const { open, values } = expansionSave(raw);
  const save = open();
  assert.deepEqual(save.data.unlockedLevelIds, [...ids, chapter[0]]);
  assert.deepEqual(save.data.bestByLevel[ids[2]], { ticks: 830, fireflies: 2 });
  assert.deepEqual(save.data.settings, { master: .4, music: .75, sfx: .85, muted: true, reducedMotion: true });
  save.record(chapter[0], clear(800, 8), chapter[1]);
  save.record(chapter[0], clear(790, 6), chapter[1]);
  assert.deepEqual(open().data.bestByLevel[chapter[0]], { ticks: 790, fireflies: 8 });
  assert.deepEqual(open().data.unlockedLevelIds, [...ids, ...chapter.slice(0, 2)]);
  assert.equal(values.get(SAVE_KEY), raw);

  values.set(SAVE_KEY, '{}');
  assert.deepEqual(open().data, save.data);
});

test('an unlocked Lantern Oak needs a valid clear before the new trails unlock', () => {
  for (const legacy of [
    { unlockedLevelIds: ids },
    { unlockedLevelIds: ids, bestByLevel: { [ids[2]]: { ticks: 0, fireflies: 8 } } },
  ]) {
    const { open, values } = expansionSave(JSON.stringify({ schemaVersion: 1, ...legacy }), '{broken');
    const save = open();
    assert.deepEqual(save.data.unlockedLevelIds, ids);
    assert.ok(values.get(EXPANSION_SAVE_KEY));
    save.record(ids[2], clear(912, 3), chapter[0]);
    assert.deepEqual(open().data.unlockedLevelIds, [...ids, chapter[0]]);
  }
});

test('expansion starts on Fernlight with missing or corrupt saves and works when storage is blocked', () => {
  for (const raw of [undefined, '{broken']) {
    const save = expansionSave(raw, raw).open();
    assert.deepEqual(save.data.unlockedLevelIds, [ids[0]]);
    assert.deepEqual(save.data.bestByLevel, {});
  }
  const save = new SaveStore(campaignIds, false, () => { throw new Error('Storage blocked'); }, ids);
  save.record(ids[0], clear(200, 8), ids[1]);
  assert.deepEqual(save.data.unlockedLevelIds, ids.slice(0, 2));
  assert.equal(save.unavailable, true);
});
